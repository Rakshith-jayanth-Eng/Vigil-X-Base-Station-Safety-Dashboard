import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  WorkerNode,
  WorkerState,
  SafetyEvent,
  BaseStationStatus,
  RawPacket,
  MotionState,
  ManDownStep,
  EventSeverity,
} from '../types';
import { alarmManager } from '../utils/audio';
import { parsePacketLine } from '../utils/packetParser';
import {
  processPacketAgainstWorker,
  DEFAULT_GAS_THRESHOLD,
  DEFAULT_IMMOBILITY_TIMEOUT,
} from '../logic/safetyEngine';

interface SafetyContextType {
  workers: WorkerNode[];
  selectedWorkerId: string | null;
  setSelectedWorkerId: (id: string | null) => void;
  baseStation: BaseStationStatus;
  events: SafetyEvent[];
  criticalAlerts: { worker: WorkerNode; reason: string; eventType: string; time: string }[];
  
  // Actions
  acknowledgeAlert: (workerId: string) => void;
  requestResetWorker: (workerId: string) => void;
  confirmResetWorker: (workerId: string) => void;
  cancelResetModal: () => void;
  pendingResetWorkerId: string | null;
  
  // Hardware & Mode controls
  setMode: (mode: 'DEMO' | 'LIVE') => void;
  toggleBaseStationPower: () => void;
  toggleLoraLink: () => void;
  toggleAudioAlarm: () => void;
  
  // Serial interface
  connectSerial: () => Promise<void>;
  disconnectSerial: () => Promise<void>;
  serialLogs: string[];
  injectRawPacket: (line: string) => { success: boolean; message: string };
  
  // Simulation triggers
  simulateScenario: (scenario: 'normal' | 'gas_hazard' | 'possible_fall' | 'man_down' | 'compound_hazard' | 'sensor_fault' | 'offline' | 'recovery', workerId?: string) => void;
  autoSimulate: boolean;
  toggleAutoSimulate: () => void;
  
  // Event log controls
  clearEvents: () => void;
  exportEvents: (format: 'json' | 'csv') => void;
  
  // Settings
  updateWorkerThreshold: (workerId: string, threshold: number) => void;
  updateImmobilityTimeout: (workerId: string, timeoutSec: number) => void;
}

const SafetyContext = createContext<SafetyContextType | null>(null);

const INITIAL_WORKERS: WorkerNode[] = [
  {
    id: 'WORKER_01',
    displayName: 'Worker 01 - Lead Scaffolder',
    assignedZone: 'Underground Vault 4B',
    state: 'NORMAL',
    gasValue: 318,
    gasThreshold: 500,
    gasState: 'SAFE',
    motionState: 'MOVING',
    accel: { x: -0.18, y: 0.94, z: 0.22 },
    gyro: { x: 12, y: -4, z: 8 },
    manDownStep: 'NORMAL',
    immobilitySeconds: 0,
    immobilityTimeout: 10,
    rssi: -82,
    snr: 8.4,
    packetCount: 142,
    lastPacketTime: Date.now() - 3000,
    lastPacketFormatted: new Date(Date.now() - 3000).toTimeString().slice(0, 8),
    batteryMv: 3820,
    gps: {
      lat: 37.7749,
      lng: -122.4194,
      hasFix: false, // In underground environment
      satellites: 2,
      accuracyMeters: 45,
    },
    isAcknowledged: false,
  },
  {
    id: 'WORKER_02',
    displayName: 'Worker 02 - Pipe Inspector',
    assignedZone: 'Conduit B - Wet Well',
    state: 'NORMAL',
    gasValue: 345,
    gasThreshold: 500,
    gasState: 'SAFE',
    motionState: 'MOVING',
    accel: { x: 0.05, y: 0.98, z: 0.12 },
    gyro: { x: -3, y: 6, z: 1 },
    manDownStep: 'NORMAL',
    immobilitySeconds: 0,
    immobilityTimeout: 10,
    rssi: -89,
    snr: 6.8,
    packetCount: 138,
    lastPacketTime: Date.now() - 7000,
    lastPacketFormatted: new Date(Date.now() - 7000).toTimeString().slice(0, 8),
    batteryMv: 3740,
    gps: {
      lat: 37.7752,
      lng: -122.4188,
      hasFix: false,
      satellites: 0,
      accuracyMeters: 80,
    },
    isAcknowledged: false,
  },
  {
    id: 'WORKER_03',
    displayName: 'Worker 03 - Structural Welder',
    assignedZone: 'Shaft 2 - Deep Gallery',
    state: 'NORMAL',
    gasValue: 290,
    gasThreshold: 500,
    gasState: 'SAFE',
    motionState: 'STATIONARY',
    accel: { x: 0.01, y: 0.99, z: 0.03 },
    gyro: { x: 0, y: 1, z: -1 },
    manDownStep: 'NORMAL',
    immobilitySeconds: 0,
    immobilityTimeout: 10,
    rssi: -94,
    snr: 5.2,
    packetCount: 115,
    lastPacketTime: Date.now() - 11000,
    lastPacketFormatted: new Date(Date.now() - 11000).toTimeString().slice(0, 8),
    batteryMv: 3680,
    gps: {
      lat: 37.7745,
      lng: -122.4202,
      hasFix: false,
      satellites: 1,
      accuracyMeters: 60,
    },
    isAcknowledged: false,
  },
];

const INITIAL_EVENTS: SafetyEvent[] = [
  {
    id: 'evt-init-1',
    timestamp: new Date(Date.now() - 120000).toTimeString().slice(0, 8),
    timeMs: Date.now() - 120000,
    workerId: 'BASE_STATION',
    workerName: 'Base Station',
    eventType: 'CONNECTION',
    severity: 'INFO',
    description: 'SX1278 LoRa Receiver initialized at 433.00 MHz, BW 125kHz, SF7, CR 4/5',
    category: 'system',
  },
  {
    id: 'evt-init-2',
    timestamp: new Date(Date.now() - 90000).toTimeString().slice(0, 8),
    timeMs: Date.now() - 90000,
    workerId: 'WORKER_01',
    workerName: 'Worker 01',
    eventType: 'NORMAL',
    severity: 'INFO',
    description: 'Telemetry heartbeat received. MQ-2 raw ADC: 318, Motion: ACTIVE, RSSI: -82 dBm',
    gasValue: 318,
    rssi: -82,
    category: 'connection',
  },
  {
    id: 'evt-init-3',
    timestamp: new Date(Date.now() - 60000).toTimeString().slice(0, 8),
    timeMs: Date.now() - 60000,
    workerId: 'WORKER_02',
    workerName: 'Worker 02',
    eventType: 'NORMAL',
    severity: 'INFO',
    description: 'Telemetry heartbeat received. MQ-2 raw ADC: 345, Motion: ACTIVE, RSSI: -89 dBm',
    gasValue: 345,
    rssi: -89,
    category: 'connection',
  },
];

export const SafetySystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workers, setWorkers] = useState<WorkerNode[]>(INITIAL_WORKERS);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [events, setEvents] = useState<SafetyEvent[]>(INITIAL_EVENTS);
  const [pendingResetWorkerId, setPendingResetWorkerId] = useState<string | null>(null);
  const [autoSimulate, setAutoSimulate] = useState<boolean>(true);
  const [serialLogs, setSerialLogs] = useState<string[]>([
    '[BOOT] Vigil-X Base Station Engine Ready',
    '[LORA] SX1278 SPI interface active (NSS=10, DIO0=2, RST=9)',
    '[SERIAL] Bridge listening at 115200 baud',
  ]);

  const [baseStation, setBaseStation] = useState<BaseStationStatus>({
    isOnline: true,
    loraLinkConnected: true,
    serialConnected: false,
    serialPortName: null,
    baudRate: 115200,
    mode: 'DEMO',
    lastPacketTime: Date.now(),
    totalPacketsReceived: 395,
    uptimeSeconds: 4320,
    audioAlarmEnabled: true,
    offlineTimeoutSeconds: 30, // mark worker offline after 30s without packet
  });

  // Reference for Web Serial port and reader
  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const isReadingSerialRef = useRef<boolean>(false);

  // Helper to add safety events
  const addEvent = useCallback((event: Omit<SafetyEvent, 'id' | 'timeMs'>) => {
    const newEvt: SafetyEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timeMs: Date.now(),
    };
    setEvents((prev) => [newEvt, ...prev].slice(0, 500)); // Keep last 500 events
  }, []);

  // Append serial log line
  const logSerial = useCallback((msg: string) => {
    setSerialLogs((prev) => [msg, ...prev].slice(0, 200));
  }, []);

  // System uptime clock
  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setBaseStation((prev) => ({
        ...prev,
        uptimeSeconds: prev.uptimeSeconds + 1,
      }));
    }, 1000);
    return () => clearInterval(uptimeInterval);
  }, []);

  // Immobility countdown timer for POSSIBLE_FALL verification & OFFLINE detection
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();

      setWorkers((prevWorkers) =>
        prevWorkers.map((w) => {
          let updated = { ...w };

          // 1. Man-down verification progression (when Arduino reports possible fall / stationary timer)
          if (updated.state === 'POSSIBLE_FALL' && updated.manDownStep === 'IMMOBILITY_TIMER') {
            const nextSec = updated.immobilitySeconds + 0.5;
            if (nextSec >= updated.immobilityTimeout) {
              // Timeout reached -> Arduino triggers MAN_DOWN
              updated = {
                ...updated,
                state: 'MAN_DOWN',
                manDownStep: 'MAN_DOWN',
                motionState: 'IMMOBILE',
                immobilitySeconds: updated.immobilityTimeout,
                isAcknowledged: false,
              };
              addEvent({
                timestamp: new Date().toTimeString().slice(0, 8),
                workerId: updated.id,
                workerName: updated.displayName,
                eventType: 'MAN_DOWN',
                severity: 'CRITICAL',
                description: `CRITICAL: Fall verified. Worker immobile for ${updated.immobilityTimeout}s without recovery.`,
                category: 'man-down',
              });
              if (baseStation.audioAlarmEnabled) {
                alarmManager.startCriticalAlarm();
              }
            } else {
              updated.immobilitySeconds = nextSec;
            }
          }

          // 2. Offline check: if time since last packet exceeds timeout and not already offline
          const timeSincePacketSec = (now - updated.lastPacketTime) / 1000;
          if (timeSincePacketSec > baseStation.offlineTimeoutSeconds && updated.state !== 'OFFLINE') {
            // Note: Section 24: "Distinguish COMMUNICATION FAILURE from WORKER EMERGENCY"
            updated = {
              ...updated,
              state: 'OFFLINE',
            };
            addEvent({
              timestamp: new Date().toTimeString().slice(0, 8),
              workerId: updated.id,
              workerName: updated.displayName,
              eventType: 'OFFLINE',
              severity: 'WARNING',
              description: `Communication lost. No LoRa packet received for ${Math.round(timeSincePacketSec)}s.`,
              category: 'connection',
            });
          }

          return updated;
        })
      );
    }, 500);

    return () => clearInterval(timer);
  }, [baseStation.offlineTimeoutSeconds, baseStation.audioAlarmEnabled, addEvent]);

  // Handle incoming packet (from Demo or Live Serial)
  const processIncomingPacket = useCallback(
    (raw: RawPacket) => {
      const now = Date.now();
      const timeStr = new Date().toTimeString().slice(0, 8);

      setBaseStation((prev) => ({
        ...prev,
        lastPacketTime: now,
        totalPacketsReceived: prev.totalPacketsReceived + 1,
      }));

      setWorkers((prevWorkers) => {
        const existingIndex = prevWorkers.findIndex((w) => w.id === raw.workerId);
        let targetWorker: WorkerNode;

        if (existingIndex >= 0) {
          targetWorker = { ...prevWorkers[existingIndex] };
        } else {
          // Dynamic new worker registration
          targetWorker = {
            id: raw.workerId,
            displayName: `Worker ${raw.workerId.replace('WORKER_', '')}`,
            assignedZone: 'Industrial Zone Alpha',
            state: 'NORMAL',
            gasValue: isNaN(raw.gas) ? 300 : raw.gas,
            gasThreshold: DEFAULT_GAS_THRESHOLD,
            gasState: 'SAFE',
            motionState: raw.imuState || 'MOVING',
            accel: raw.accel || { x: 0, y: 1, z: 0 },
            gyro: raw.gyro || { x: 0, y: 0, z: 0 },
            manDownStep: 'NORMAL',
            immobilitySeconds: 0,
            immobilityTimeout: DEFAULT_IMMOBILITY_TIMEOUT,
            rssi: raw.rssi ?? -85,
            snr: raw.snr ?? 7.0,
            packetCount: 0,
            lastPacketTime: now,
            lastPacketFormatted: timeStr,
            isAcknowledged: false,
          };
        }

        const { updatedWorker, newEvents, shouldTriggerAlarm, alarmType } =
          processPacketAgainstWorker(targetWorker, raw, now, timeStr);

        for (const evt of newEvents) {
          addEvent(evt);
        }

        if (shouldTriggerAlarm && baseStation.audioAlarmEnabled) {
          if (alarmType === 'CRITICAL') {
            alarmManager.startCriticalAlarm();
          } else if (alarmType === 'WARNING') {
            alarmManager.playWarningBeep();
          }
        } else if (alarmType === 'RECOVERY') {
          // Stop audio alarm if no other workers are in emergency
          const othersInCritical = prevWorkers.some(
            (w) => w.id !== raw.workerId && ['MAN_DOWN', 'GAS_HAZARD', 'COMPOUND_HAZARD'].includes(w.state)
          );
          if (!othersInCritical) {
            alarmManager.stopAlarm();
          }
        }

        if (existingIndex >= 0) {
          const next = [...prevWorkers];
          next[existingIndex] = updatedWorker;
          return next;
        } else {
          return [...prevWorkers, updatedWorker];
        }
      });
    },
    [baseStation.audioAlarmEnabled, addEvent]
  );

  // Auto-simulation ticker for demo mode (generates subtle telemetry fluctuations)
  useEffect(() => {
    if (!autoSimulate || baseStation.mode !== 'DEMO' || !baseStation.isOnline || !baseStation.loraLinkConnected) {
      return;
    }

    const interval = setInterval(() => {
      // Pick random worker to send realistic heartbeat
      setWorkers((prev) => {
        if (prev.length === 0) return prev;
        const randomWorker = prev[Math.floor(Math.random() * prev.length)];
        
        // If worker is in emergency, do not randomly overwrite unless it's normal telemetry
        if (
          randomWorker.state === 'MAN_DOWN' ||
          randomWorker.state === 'GAS_HAZARD' ||
          randomWorker.state === 'POSSIBLE_FALL' ||
          randomWorker.state === 'COMPOUND_HAZARD'
        ) {
          // Just update RF and small jitter
          const gasJitter = Math.floor(Math.random() * 8) - 4;
          const packet: RawPacket = {
            workerId: randomWorker.id,
            event:
              randomWorker.state === 'COMPOUND_HAZARD'
                ? 'COMPOUND_HAZARD'
                : randomWorker.state === 'GAS_HAZARD'
                ? 'GAS_HAZARD'
                : randomWorker.state === 'MAN_DOWN'
                ? 'MAN_DOWN'
                : 'POSSIBLE_FALL',
            gas: Math.max(100, randomWorker.gasValue + gasJitter),
            imuState: randomWorker.motionState,
            accel: randomWorker.accel,
            gyro: randomWorker.gyro,
            rssi: -80 + Math.floor(Math.random() * 12) - 6,
            snr: +(7.5 + (Math.random() * 1.5 - 0.75)).toFixed(1),
          };
          processIncomingPacket(packet);
          return prev;
        }

        // Random normal packet
        const gasBase = 310 + Math.floor(Math.random() * 45);
        const moving = Math.random() > 0.3;
        const packet: RawPacket = {
          workerId: randomWorker.id,
          event: 'NORMAL',
          gas: gasBase,
          imuState: moving ? 'MOVING' : 'STATIONARY',
          accel: moving
            ? {
                x: +(-0.2 + (Math.random() * 0.4 - 0.2)).toFixed(2),
                y: +(0.92 + (Math.random() * 0.15 - 0.05)).toFixed(2),
                z: +(0.15 + (Math.random() * 0.2 - 0.1)).toFixed(2),
              }
            : { x: 0.02, y: 0.99, z: 0.04 },
          gyro: moving
            ? {
                x: Math.floor(Math.random() * 20 - 10),
                y: Math.floor(Math.random() * 20 - 10),
                z: Math.floor(Math.random() * 20 - 10),
              }
            : { x: 0, y: 0, z: 0 },
          rssi: -82 + Math.floor(Math.random() * 10) - 5,
          snr: +(8.0 + (Math.random() * 1.2 - 0.6)).toFixed(1),
        };
        processIncomingPacket(packet);
        return prev;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [autoSimulate, baseStation.mode, baseStation.isOnline, baseStation.loraLinkConnected, processIncomingPacket]);

  // Simulation scenarios
  const simulateScenario = useCallback(
    (
      scenario: 'normal' | 'gas_hazard' | 'possible_fall' | 'man_down' | 'compound_hazard' | 'sensor_fault' | 'offline' | 'recovery',
      workerId = 'WORKER_01'
    ) => {
      const timeStr = new Date().toTimeString().slice(0, 8);

      if (scenario === 'normal') {
        processIncomingPacket({
          workerId,
          event: 'NORMAL',
          gas: 315,
          imuState: 'MOVING',
          accel: { x: -0.15, y: 0.96, z: 0.2 },
          gyro: { x: 8, y: -2, z: 4 },
          rssi: -81,
          snr: 8.5,
        });
        logSerial(`[SIM] Injected NORMAL packet for ${workerId}`);
      } else if (scenario === 'gas_hazard') {
        processIncomingPacket({
          workerId,
          event: 'GAS_HAZARD',
          gas: 742, // Exceeds 500 threshold
          imuState: 'MOVING',
          accel: { x: -0.05, y: 0.98, z: 0.15 },
          gyro: { x: 4, y: 3, z: -1 },
          rssi: -79,
          snr: 9.1,
        });
        logSerial(`[SIM] Injected GAS_HAZARD packet for ${workerId} (MQ-2: 742, Threshold: 500)`);
      } else if (scenario === 'possible_fall') {
        processIncomingPacket({
          workerId,
          event: 'POSSIBLE_FALL',
          gas: 320,
          imuState: 'POSSIBLE_FALL',
          accel: { x: 2.85, y: -0.42, z: 0.88 }, // Impact acceleration spike
          gyro: { x: 85, y: -120, z: 45 },
          rssi: -84,
          snr: 7.9,
        });
        logSerial(`[SIM] Injected POSSIBLE_FALL spike for ${workerId} (Verification timer started)`);
      } else if (scenario === 'man_down') {
        processIncomingPacket({
          workerId,
          event: 'MAN_DOWN',
          gas: 328,
          imuState: 'IMMOBILE',
          accel: { x: 0.02, y: 0.08, z: 0.99 }, // Horizontal on ground
          gyro: { x: 0, y: 0, z: 0 },
          rssi: -87,
          snr: 7.2,
        });
        logSerial(`[SIM] Injected confirmed MAN_DOWN alert for ${workerId}`);
      } else if (scenario === 'compound_hazard') {
        processIncomingPacket({
          workerId,
          event: 'COMPOUND_HAZARD',
          gas: 760, // Toxic gas reading
          imuState: 'IMMOBILE',
          accel: { x: 0.02, y: 0.05, z: 0.99 },
          gyro: { x: 0, y: 0, z: 0 },
          rssi: -85,
          snr: 7.5,
        });
        logSerial(`[SIM] Injected COMPOUND_HAZARD (Man-Down + Gas) for ${workerId}`);
      } else if (scenario === 'sensor_fault') {
        processIncomingPacket({
          workerId,
          event: 'SENSOR_FAULT',
          gas: NaN, // Corrupted/disconnected sensor ADC
          imuState: 'MOVING',
          sensorFault: true,
          rssi: -85,
          snr: 7.5,
        });
        logSerial(`[SIM] Injected SENSOR_FAULT for ${workerId}`);
      } else if (scenario === 'offline') {
        // Mark worker offline by rolling back last packet time
        setWorkers((prev) =>
          prev.map((w) =>
            w.id === workerId
              ? {
                  ...w,
                  state: 'OFFLINE',
                  lastPacketTime: Date.now() - 45000,
                }
              : w
          )
        );
        addEvent({
          timestamp: timeStr,
          workerId,
          workerName: `Worker ${workerId.replace('WORKER_', '')}`,
          eventType: 'OFFLINE',
          severity: 'WARNING',
          description: `Worker ${workerId} timed out. RF carrier lost.`,
          category: 'connection',
        });
        logSerial(`[SIM] Forced ${workerId} to OFFLINE (timeout simulated)`);
      } else if (scenario === 'recovery') {
        processIncomingPacket({
          workerId,
          event: 'NORMAL',
          gas: 310,
          imuState: 'MOVING',
          accel: { x: -0.12, y: 0.98, z: 0.18 },
          gyro: { x: 10, y: -5, z: 6 },
          rssi: -80,
          snr: 8.6,
        });
        logSerial(`[SIM] Injected RECOVERY / SAFE packet for ${workerId}`);
      }
    },
    [processIncomingPacket, addEvent, logSerial]
  );

  // Manual raw packet injection (supports pasting Arduino serial output)
  const injectRawPacket = useCallback(
    (line: string) => {
      const res = parsePacketLine(line);
      logSerial(`[INPUT] ${line}`);
      if (res.success && res.packet) {
        processIncomingPacket(res.packet);
        logSerial(`[PARSED] OK: Worker=${res.packet.workerId}, Event=${res.packet.event}, Gas=${res.packet.gas}`);
        return { success: true, message: `Parsed packet from ${res.packet.workerId} (${res.packet.event})` };
      } else {
        logSerial(`[ERROR] Failed to parse: ${res.error}`);
        return { success: false, message: res.error || 'Syntax error' };
      }
    },
    [processIncomingPacket, logSerial]
  );

  // Alert acknowledgement (operator acknowledged, does NOT change worker hardware state)
  const acknowledgeAlert = useCallback(
    (workerId: string) => {
      const timeStr = new Date().toTimeString().slice(0, 8);
      alarmManager.playAcknowledgeChime();

      setWorkers((prev) =>
        prev.map((w) =>
          w.id === workerId
            ? {
                ...w,
                isAcknowledged: true,
                acknowledgedAt: timeStr,
                acknowledgedBy: 'BASE_OPERATOR_1',
              }
            : w
        )
      );

      const target = workers.find((w) => w.id === workerId);
      addEvent({
        timestamp: timeStr,
        workerId,
        workerName: target?.displayName || workerId,
        eventType: 'ACKNOWLEDGED',
        severity: 'INFO',
        description: `Alert acknowledged by operator. Emergency state on node remains active until cleared or recovered.`,
        category: 'system',
      });
      logSerial(`[ACK] Alert acknowledged for ${workerId} by BASE_OPERATOR_1`);
    },
    [workers, addEvent, logSerial]
  );

  // Request reset modal
  const requestResetWorker = useCallback((workerId: string) => {
    setPendingResetWorkerId(workerId);
  }, []);

  const cancelResetModal = useCallback(() => {
    setPendingResetWorkerId(null);
  }, []);

  // Confirm manual reset for prototype testing
  const confirmResetWorker = useCallback(
    (workerId: string) => {
      const timeStr = new Date().toTimeString().slice(0, 8);
      alarmManager.stopAlarm();

      setWorkers((prev) =>
        prev.map((w) =>
          w.id === workerId
            ? {
                ...w,
                state: 'NORMAL',
                manDownStep: 'NORMAL',
                gasState: 'SAFE',
                gasValue: 310,
                gasHazardTimestamp: undefined,
                gasSensorFault: false,
                imuFault: false,
                immobilitySeconds: 0,
                isAcknowledged: false,
                acknowledgedAt: undefined,
              }
            : w
        )
      );

      const target = workers.find((w) => w.id === workerId);
      addEvent({
        timestamp: timeStr,
        workerId,
        workerName: target?.displayName || workerId,
        eventType: 'RESET',
        severity: 'INFO',
        description: `Manual operator reset confirmed. Node state reset to NORMAL for prototype testing.`,
        category: 'system',
      });
      logSerial(`[RESET] Manual operator override reset for ${workerId}`);
      setPendingResetWorkerId(null);
    },
    [workers, addEvent, logSerial]
  );

  // Web Serial API implementation
  const connectSerial = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      logSerial('[SERIAL ERROR] Web Serial API not supported in this browser. Use Chrome/Edge or manual packet injector.');
      addEvent({
        timestamp: new Date().toTimeString().slice(0, 8),
        workerId: 'BASE_STATION',
        workerName: 'Base Station',
        eventType: 'CONNECTION',
        severity: 'WARNING',
        description: 'Web Serial API unavailable in current browser. Use Chrome/Edge or the Raw Packet Injector.',
        category: 'connection',
      });
      return;
    }

    try {
      setBaseStation((prev) => ({ ...prev, serialPortName: 'Connecting...' }));
      const navSerial = (navigator as any).serial;
      const port = await navSerial.requestPort();
      await port.open({ baudRate: baseStation.baudRate });

      serialPortRef.current = port;
      isReadingSerialRef.current = true;

      setBaseStation((prev) => ({
        ...prev,
        serialConnected: true,
        serialPortName: 'USB Serial (Active)',
        mode: 'LIVE',
      }));

      logSerial(`[SERIAL] Connected to port at ${baseStation.baudRate} baud.`);
      addEvent({
        timestamp: new Date().toTimeString().slice(0, 8),
        workerId: 'BASE_STATION',
        workerName: 'Base Station',
        eventType: 'CONNECTION',
        severity: 'INFO',
        description: `Web Serial bridge connected at ${baseStation.baudRate} baud. LIVE MODE active.`,
        category: 'connection',
      });

      // Continuous reader stream
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      serialReaderRef.current = reader;

      let buffer = '';

      (async () => {
        try {
          while (isReadingSerialRef.current) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += value;
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const cleaned = line.replace('\r', '').trim();
                if (cleaned) {
                  const res = parsePacketLine(cleaned);
                  if (res.success && res.packet) {
                    processIncomingPacket(res.packet);
                  }
                  logSerial(`[SERIAL RX] ${cleaned}`);
                }
              }
            }
          }
        } catch (err: any) {
          logSerial(`[SERIAL ERR] Stream disconnected: ${err?.message || err}`);
        } finally {
          reader.releaseLock();
        }
      })();
    } catch (err: any) {
      logSerial(`[SERIAL] Connection cancelled or failed: ${err?.message || err}`);
      setBaseStation((prev) => ({
        ...prev,
        serialConnected: false,
        serialPortName: null,
      }));
    }
  }, [baseStation.baudRate, processIncomingPacket, logSerial, addEvent]);

  const disconnectSerial = useCallback(async () => {
    try {
      isReadingSerialRef.current = false;
      if (serialReaderRef.current) {
        await serialReaderRef.current.cancel().catch(() => {});
      }
      if (serialPortRef.current) {
        await serialPortRef.current.close().catch(() => {});
        serialPortRef.current = null;
      }
      setBaseStation((prev) => ({
        ...prev,
        serialConnected: false,
        serialPortName: null,
      }));
      logSerial('[SERIAL] Disconnected.');
    } catch (err: any) {
      logSerial(`[SERIAL] Disconnect error: ${err?.message || err}`);
    }
  }, [logSerial]);

  // Mode and toggle helpers
  const setMode = useCallback((mode: 'DEMO' | 'LIVE') => {
    setBaseStation((prev) => ({ ...prev, mode }));
  }, []);

  const toggleBaseStationPower = useCallback(() => {
    setBaseStation((prev) => {
      const next = !prev.isOnline;
      alarmManager.stopAlarm();
      return { ...prev, isOnline: next };
    });
  }, []);

  const toggleLoraLink = useCallback(() => {
    setBaseStation((prev) => ({ ...prev, loraLinkConnected: !prev.loraLinkConnected }));
  }, []);

  const toggleAudioAlarm = useCallback(() => {
    setBaseStation((prev) => {
      const next = !prev.audioAlarmEnabled;
      alarmManager.setMuted(!next);
      return { ...prev, audioAlarmEnabled: next };
    });
  }, []);

  const toggleAutoSimulate = useCallback(() => {
    setAutoSimulate((prev) => !prev);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const exportEvents = useCallback(
    (format: 'json' | 'csv') => {
      let content = '';
      let mimeType = 'text/plain';
      let filename = `vigil-x-events-${Date.now()}`;

      if (format === 'json') {
        content = JSON.stringify(events, null, 2);
        mimeType = 'application/json';
        filename += '.json';
      } else {
        const headers = ['Timestamp', 'WorkerID', 'WorkerName', 'Event', 'Severity', 'GasRaw', 'RSSI', 'Description'];
        const rows = events.map((e) => [
          `"${e.timestamp}"`,
          `"${e.workerId}"`,
          `"${e.workerName}"`,
          `"${e.eventType}"`,
          `"${e.severity}"`,
          e.gasValue ?? '',
          e.rssi ?? '',
          `"${e.description.replace(/"/g, '""')}"`,
        ]);
        content = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
        mimeType = 'text/csv';
        filename += '.csv';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [events]
  );

  const updateWorkerThreshold = useCallback((workerId: string, threshold: number) => {
    setWorkers((prev) =>
      prev.map((w) => (w.id === workerId ? { ...w, gasThreshold: threshold } : w))
    );
  }, []);

  const updateImmobilityTimeout = useCallback((workerId: string, timeoutSec: number) => {
    setWorkers((prev) =>
      prev.map((w) => (w.id === workerId ? { ...w, immobilityTimeout: timeoutSec } : w))
    );
  }, []);

  // Compute active critical alerts
  const criticalAlerts = workers
    .filter((w) => ['MAN_DOWN', 'GAS_HAZARD', 'POSSIBLE_FALL', 'COMPOUND_HAZARD'].includes(w.state))
    .map((w) => {
      let reason = 'Hazard detected';
      if (w.state === 'COMPOUND_HAZARD') reason = `🚨 DUAL HAZARD: Worker UNCONSCIOUS (MAN DOWN) in TOXIC GAS environment (MQ-2 ADC: ${w.gasValue})!`;
      else if (w.state === 'MAN_DOWN') reason = 'Fall detected + prolonged immobility';
      else if (w.state === 'GAS_HAZARD') reason = `Gas sensor value (${w.gasValue}) exceeded threshold (${w.gasThreshold})`;
      else if (w.state === 'POSSIBLE_FALL') reason = 'Abnormal impact motion detected · Monitoring immobility timer';

      return {
        worker: w,
        reason,
        eventType: w.state,
        time: w.lastPacketFormatted,
      };
    });

  return (
    <SafetyContext.Provider
      value={{
        workers,
        selectedWorkerId,
        setSelectedWorkerId,
        baseStation,
        events,
        criticalAlerts,
        acknowledgeAlert,
        requestResetWorker,
        confirmResetWorker,
        cancelResetModal,
        pendingResetWorkerId,
        setMode,
        toggleBaseStationPower,
        toggleLoraLink,
        toggleAudioAlarm,
        connectSerial,
        disconnectSerial,
        serialLogs,
        injectRawPacket,
        simulateScenario,
        autoSimulate,
        toggleAutoSimulate,
        clearEvents,
        exportEvents,
        updateWorkerThreshold,
        updateImmobilityTimeout,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};

export const useSafetySystem = () => {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafetySystem must be used within SafetySystemProvider');
  return ctx;
};
