import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  WorkerNode,
  SafetyEvent,
  BaseStationStatus,
  RawPacket,
  IncidentReportBundle,
  TelemetryPoint,
} from '../types';
import { alarmManager } from '../utils/audio';
import { parsePacketLine } from '../utils/packetParser';
import {
  processPacketAgainstWorker,
  DEFAULT_GAS_THRESHOLD,
  DEFAULT_IMMOBILITY_TIMEOUT,
  MAX_TELEMETRY_HISTORY,
} from '../logic/safetyEngine';
import { db, collection, doc, setDoc } from '../config/firebase';
import { KNOWN_HAZARDOUS_GASES } from '../services/pubchemService';

interface SafetyContextType {
  workers: WorkerNode[];
  selectedWorkerId: string | null;
  setSelectedWorkerId: (id: string | null) => void;
  baseStation: BaseStationStatus;
  events: SafetyEvent[];
  criticalAlerts: { worker: WorkerNode; reason: string; eventType: string; time: string }[];
  snoozeRemaining: number;
  
  // Actions
  acknowledgeAlert: (workerId: string, note?: string) => void;
  snoozeActiveAlarm: (durationSeconds?: number) => void;
  cancelAlarmSnooze: () => void;
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
  
  // Simulation presets & triggers
  simulateScenario: (
    scenario:
      | 'normal'
      | 'gas_hazard'
      | 'possible_fall'
      | 'man_down'
      | 'compound_hazard'
      | 'sensor_fault'
      | 'offline'
      | 'recovery'
      | 'radio_fade'
      | 'burst_stress',
    workerId?: string
  ) => void;
  autoSimulate: boolean;
  toggleAutoSimulate: () => void;
  
  // Event log controls & Auditing
  clearEvents: () => void;
  exportAuditBundle: (format: 'json' | 'csv') => void;
  
  // Settings
  updateWorkerThreshold: (workerId: string, threshold: number) => void;
  updateImmobilityTimeout: (workerId: string, timeoutSec: number) => void;
}

const SafetyContext = createContext<SafetyContextType | null>(null);

function generateInitialHistory(baseGas: number, rssi: number): TelemetryPoint[] {
  const points: TelemetryPoint[] = [];
  const now = Date.now();
  for (let i = 15; i >= 0; i--) {
    const timeMs = now - i * 3000;
    const timeStr = new Date(timeMs).toTimeString().slice(0, 8);
    const gasJitter = Math.floor(Math.sin(i) * 12) + (Math.random() > 0.5 ? 4 : -4);
    points.push({
      timestamp: timeStr,
      timeMs,
      gasValue: Math.max(100, baseGas + gasJitter),
      motionMag: 1.0 + +(Math.random() * 0.15 - 0.05).toFixed(3),
      batteryMv: 3820 - i * 2,
      rssi: rssi + Math.floor(Math.random() * 6 - 3),
      state: 'NORMAL',
    });
  }
  return points;
}

const INITIAL_WORKERS: WorkerNode[] = [
  {
    id: 'WORKER_01',
    displayName: 'Worker 01 - Lead Scaffolder',
    assignedZone: 'Underground Vault 4B',
    state: 'NORMAL',
    gasValue: 318,
    gasThreshold: 500,
    gasState: 'SAFE',
    peakGasValue: 340,
    twaGasValue: 318,
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
    telemetryHistory: generateInitialHistory(318, -82),
    gps: {
      lat: 37.7749,
      lng: -122.4194,
      hasFix: false,
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
    peakGasValue: 360,
    twaGasValue: 345,
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
    telemetryHistory: generateInitialHistory(345, -89),
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
    peakGasValue: 305,
    twaGasValue: 290,
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
    telemetryHistory: generateInitialHistory(290, -94),
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
  const [snoozeRemaining, setSnoozeRemaining] = useState<number>(0);
  const [serialLogs, setSerialLogs] = useState<string[]>([
    '[BOOT] Vigil-X Base Station Engine v2.0 Ready',
    '[LORA] SX1278 SPI interface active (NSS=10, DIO0=2, RST=9)',
    '[SERIAL] Bridge listening at 115200 baud',
    '[SYNC] Local-first audit persistence online',
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
    offlineTimeoutSeconds: 30,
    alarmSnoozeSeconds: 60,
    activeAlarmSnoozedUntil: null,
  });

  const serialPortRef = useRef<any>(null);
  const serialReaderRef = useRef<any>(null);
  const isReadingSerialRef = useRef<boolean>(false);

  // Sync to Firestore (asynchronous, non-blocking with local fallback)
  const persistEventToFirestore = useCallback(async (evt: SafetyEvent) => {
    try {
      if (typeof window === 'undefined') return;
      const alertCollection = collection(db, 'safety_alerts');
      const docRef = doc(alertCollection, evt.id);
      await setDoc(docRef, {
        workerId: evt.workerId,
        alertType: evt.eventType === 'GAS_HAZARD' || evt.eventType === 'MAN_DOWN' ? evt.eventType : 'NONE',
        timestamp: evt.timeMs,
        createdBy: 'system',
        severity: evt.severity,
        description: evt.description,
        gasValue: evt.gasValue ?? null,
      });
    } catch {
      // Offline mode or permissions fallback
    }
  }, []);

  // Helper to add safety events
  const addEvent = useCallback(
    (event: Omit<SafetyEvent, 'id' | 'timeMs'>) => {
      const nowMs = Date.now();
      const newEvt: SafetyEvent = {
        ...event,
        id: `evt-${nowMs}-${Math.random().toString(36).substring(2, 7)}`,
        timeMs: nowMs,
      };
      setEvents((prev) => [newEvt, ...prev].slice(0, 500));

      if (['CRITICAL', 'WARNING'].includes(event.severity) || event.eventType === 'ACKNOWLEDGED') {
        persistEventToFirestore(newEvt);
      }
    },
    [persistEventToFirestore]
  );

  const logSerial = useCallback((msg: string) => {
    setSerialLogs((prev) => [msg, ...prev].slice(0, 200));
  }, []);

  // Track Snooze Countdown Clock
  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = alarmManager.getSnoozeRemainingSeconds();
      setSnoozeRemaining(remaining);
      setBaseStation((prev) => ({
        ...prev,
        activeAlarmSnoozedUntil: remaining > 0 ? Date.now() + remaining * 1000 : null,
      }));
    }, 500);
    return () => clearInterval(timer);
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

          // 1. Man-down verification progression
          if (updated.state === 'POSSIBLE_FALL' && updated.manDownStep === 'IMMOBILITY_TIMER') {
            const nextSec = updated.immobilitySeconds + 0.5;
            if (nextSec >= updated.immobilityTimeout) {
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
              if (baseStation.audioAlarmEnabled && !alarmManager.isSnoozed()) {
                alarmManager.startCriticalAlarm();
              }
            } else {
              updated.immobilitySeconds = nextSec;
            }
          }

          // 2. Offline check
          const timeSincePacketSec = (now - updated.lastPacketTime) / 1000;
          if (timeSincePacketSec > baseStation.offlineTimeoutSeconds && updated.state !== 'OFFLINE') {
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
            if (baseStation.audioAlarmEnabled) {
              alarmManager.playOfflineAlert();
            }
          }

          return updated;
        })
      );
    }, 500);

    return () => clearInterval(timer);
  }, [baseStation.offlineTimeoutSeconds, baseStation.audioAlarmEnabled, addEvent]);

  // Handle incoming packet
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
          targetWorker = {
            id: raw.workerId,
            displayName: `Worker ${raw.workerId.replace('WORKER_', '')}`,
            assignedZone: 'Industrial Zone Alpha',
            state: 'NORMAL',
            gasValue: isNaN(raw.gas) ? 300 : raw.gas,
            gasThreshold: DEFAULT_GAS_THRESHOLD,
            gasState: 'SAFE',
            peakGasValue: isNaN(raw.gas) ? 300 : raw.gas,
            twaGasValue: isNaN(raw.gas) ? 300 : raw.gas,
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
            telemetryHistory: [],
            isAcknowledged: false,
          };
        }

        const { updatedWorker, newEvents, shouldTriggerAlarm, alarmType } =
          processPacketAgainstWorker(targetWorker, raw, now, timeStr);

        for (const evt of newEvents) {
          addEvent(evt);
        }

        if (shouldTriggerAlarm && baseStation.audioAlarmEnabled) {
          if (alarmType === 'CRITICAL' && !alarmManager.isSnoozed()) {
            alarmManager.startCriticalAlarm();
          } else if (alarmType === 'WARNING' && !alarmManager.isSnoozed()) {
            alarmManager.playWarningBeep();
          }
        } else if (alarmType === 'RECOVERY') {
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

  // Auto-simulation ticker for demo mode
  useEffect(() => {
    if (!autoSimulate || baseStation.mode !== 'DEMO' || !baseStation.isOnline || !baseStation.loraLinkConnected) {
      return;
    }

    const interval = setInterval(() => {
      setWorkers((prev) => {
        if (prev.length === 0) return prev;
        const randomWorker = prev[Math.floor(Math.random() * prev.length)];

        if (
          randomWorker.state === 'MAN_DOWN' ||
          randomWorker.state === 'GAS_HAZARD' ||
          randomWorker.state === 'POSSIBLE_FALL' ||
          randomWorker.state === 'COMPOUND_HAZARD'
        ) {
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
      scenario:
        | 'normal'
        | 'gas_hazard'
        | 'possible_fall'
        | 'man_down'
        | 'compound_hazard'
        | 'sensor_fault'
        | 'offline'
        | 'recovery'
        | 'radio_fade'
        | 'burst_stress',
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
          gas: 742,
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
          accel: { x: 2.85, y: -0.42, z: 0.88 },
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
          accel: { x: 0.02, y: 0.08, z: 0.99 },
          gyro: { x: 0, y: 0, z: 0 },
          rssi: -87,
          snr: 7.2,
        });
        logSerial(`[SIM] Injected confirmed MAN_DOWN alert for ${workerId}`);
      } else if (scenario === 'compound_hazard') {
        // Compound hazard: toxic gas + fall/immobility + radio fade
        processIncomingPacket({
          workerId,
          event: 'COMPOUND_HAZARD',
          gas: 795,
          imuState: 'IMMOBILE',
          accel: { x: 0.02, y: 0.05, z: 0.99 },
          gyro: { x: 0, y: 0, z: 0 },
          rssi: -108,
          snr: 1.5,
        });
        logSerial(`[SIM] Injected COMPOUND_HAZARD (Gas Leak + Man Down + Radio Fade) for ${workerId}`);
      } else if (scenario === 'radio_fade') {
        setWorkers((prev) =>
          prev.map((w) =>
            w.id === workerId
              ? {
                  ...w,
                  rssi: -115,
                  snr: -4.2,
                }
              : w
          )
        );
        addEvent({
          timestamp: timeStr,
          workerId,
          workerName: `Worker ${workerId.replace('WORKER_', '')}`,
          eventType: 'CONNECTION',
          severity: 'WARNING',
          description: `LoRa RF link degraded for ${workerId}: RSSI dropped to -115 dBm, SNR: -4.2 dB.`,
          rssi: -115,
          category: 'connection',
        });
        logSerial(`[SIM] Simulated RF carrier fade for ${workerId} (-115 dBm)`);
      } else if (scenario === 'burst_stress') {
        // High-density multi-worker burst
        ['WORKER_01', 'WORKER_02', 'WORKER_03'].forEach((id, idx) => {
          setTimeout(() => {
            processIncomingPacket({
              workerId: id,
              event: 'NORMAL',
              gas: 300 + idx * 25,
              imuState: 'MOVING',
              accel: { x: 0.1, y: 0.95, z: 0.2 },
              rssi: -82 - idx * 4,
            });
          }, idx * 100);
        });
        logSerial('[SIM] Injected rapid multi-worker telemetry burst stress test');
      } else if (scenario === 'sensor_fault') {
        processIncomingPacket({
          workerId,
          event: 'SENSOR_FAULT',
          gas: NaN,
          imuState: 'MOVING',
          sensorFault: true,
          rssi: -85,
          snr: 7.5,
        });
        logSerial(`[SIM] Injected SENSOR_FAULT for ${workerId}`);
      } else if (scenario === 'offline') {
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

  // Manual raw packet injection
  const injectRawPacket = useCallback(
    (line: string) => {
      const res = parsePacketLine(line);
      logSerial(`[INPUT] ${line}`);
      if (res.ok && res.data) {
        processIncomingPacket(res.data);
        logSerial(`[PARSED] OK: Worker=${res.data.workerId}, Event=${res.data.event}, Gas=${res.data.gas}`);
        return { success: true, message: `Parsed packet from ${res.data.workerId} (${res.data.event})` };
      } else {
        logSerial(`[ERROR] Failed to parse: ${res.error}`);
        return { success: false, message: res.error || 'Syntax error' };
      }
    },
    [processIncomingPacket, logSerial]
  );

  // Operator acknowledgment
  const acknowledgeAlert = useCallback(
    (workerId: string, note?: string) => {
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
        description: `Alert acknowledged by operator.${note ? ` Note: "${note}"` : ''} Emergency status on node persists until physical clearance.`,
        category: 'system',
        operatorNote: note,
      });
      logSerial(`[ACK] Alert acknowledged for ${workerId} by BASE_OPERATOR_1`);
    },
    [workers, addEvent, logSerial]
  );

  // 60-Second Snooze
  const snoozeActiveAlarm = useCallback(
    (durationSeconds = 60) => {
      alarmManager.snoozeAlarm(durationSeconds);
      setSnoozeRemaining(durationSeconds);
      const timeStr = new Date().toTimeString().slice(0, 8);
      addEvent({
        timestamp: timeStr,
        workerId: 'BASE_STATION',
        workerName: 'Base Station',
        eventType: 'SNOOZED',
        severity: 'INFO',
        description: `Alarm audio snoozed for ${durationSeconds} seconds by operator. Auto-rearm active.`,
        category: 'system',
      });
      logSerial(`[SNOOZE] Audio alarms muted for ${durationSeconds}s`);
    },
    [addEvent, logSerial]
  );

  const cancelAlarmSnooze = useCallback(() => {
    alarmManager.cancelSnooze();
    setSnoozeRemaining(0);
    logSerial('[SNOOZE] Alarm snooze canceled by operator.');
  }, [logSerial]);

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

      const textDecoder = new TextDecoderStream();
      port.readable.pipeTo(textDecoder.writable).catch(() => {});
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
                  if (res.ok && res.data) {
                    processIncomingPacket(res.data);
                  }
                  logSerial(`[SERIAL RX] ${cleaned}`);
                }
              }
            }
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          logSerial(`[SERIAL ERR] Stream disconnected: ${msg}`);
        } finally {
          reader.releaseLock();
        }
      })();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logSerial(`[SERIAL] Connection cancelled or failed: ${msg}`);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logSerial(`[SERIAL] Disconnect error: ${msg}`);
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

  // Comprehensive JSON and CSV audit bundle with chemical data
  const exportAuditBundle = useCallback(
    (format: 'json' | 'csv') => {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-');
      let content = '';
      let mimeType = 'text/plain';
      let filename = `vigil-x-audit-bundle-${dateStr}`;

      const activeEmergencies = workers.filter((w) =>
        ['MAN_DOWN', 'GAS_HAZARD', 'POSSIBLE_FALL', 'COMPOUND_HAZARD'].includes(w.state)
      ).length;

      const loadedChemicals = Object.keys(KNOWN_HAZARDOUS_GASES);

      if (format === 'json') {
        const bundle: IncidentReportBundle = {
          generatedAt: now.toISOString(),
          stationId: 'VIGILX-BASE-ALPHA',
          mode: baseStation.mode,
          summary: {
            totalWorkers: workers.length,
            activeEmergencies,
            totalPackets: baseStation.totalPacketsReceived,
            uptimeSeconds: baseStation.uptimeSeconds,
          },
          workers,
          events,
          chemicalAdvisorySummary: {
            gasProfilesLoaded: loadedChemicals,
            dispatchedTimestamp: now.toISOString(),
          },
        };
        content = JSON.stringify(bundle, null, 2);
        mimeType = 'application/json';
        filename += '.json';
      } else {
        // CSV with metadata header + tabular events + worker status summary
        const metaLines = [
          '# VIGIL-X INCIDENT COMPLIANCE AUDIT REPORT',
          `# GeneratedAt: ${now.toISOString()}`,
          `# Station: VIGILX-BASE-ALPHA`,
          `# Mode: ${baseStation.mode}`,
          `# ActiveEmergencies: ${activeEmergencies}`,
          `# MonitoredChemicals: "${loadedChemicals.join('; ')}"`,
          '',
          'SECTION: EVENT_LOG',
          'Timestamp,TimeMs,WorkerID,WorkerName,EventType,Severity,Category,GasValue,RSSI,OperatorNote,Description',
        ];

        const eventRows = events.map((e) => [
          `"${e.timestamp}"`,
          e.timeMs,
          `"${e.workerId}"`,
          `"${e.workerName}"`,
          `"${e.eventType}"`,
          `"${e.severity}"`,
          `"${e.category}"`,
          e.gasValue ?? '',
          e.rssi ?? '',
          `"${(e.operatorNote || '').replace(/"/g, '""')}"`,
          `"${e.description.replace(/"/g, '""')}"`,
        ]);

        const workerSummaryLines = [
          '',
          'SECTION: WORKER_STATUS_SUMMARY',
          'WorkerID,DisplayName,Zone,State,GasADC,GasThreshold,GasState,PeakGas,TWAGas,MotionState,RSSI,SNR,BatteryMv,Acknowledged',
          ...workers.map((w) =>
            [
              `"${w.id}"`,
              `"${w.displayName}"`,
              `"${w.assignedZone}"`,
              `"${w.state}"`,
              w.gasValue,
              w.gasThreshold,
              `"${w.gasState}"`,
              w.peakGasValue ?? w.gasValue,
              w.twaGasValue ?? w.gasValue,
              `"${w.motionState}"`,
              w.rssi,
              w.snr,
              w.batteryMv ?? '',
              w.isAcknowledged ? 'YES' : 'NO',
            ].join(',')
          ),
        ];

        content = [...metaLines, ...eventRows.map((r) => r.join(',')), ...workerSummaryLines].join('\n');
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
    [workers, events, baseStation]
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
  const criticalAlerts = useMemo(
    () =>
      workers
        .filter((w) => ['MAN_DOWN', 'GAS_HAZARD', 'POSSIBLE_FALL', 'COMPOUND_HAZARD'].includes(w.state))
        .map((w) => {
          let reason = 'Hazard detected';
          if (w.state === 'COMPOUND_HAZARD')
            reason = `🚨 DUAL HAZARD: Worker UNCONSCIOUS (MAN DOWN) in TOXIC GAS environment (MQ-2 ADC: ${w.gasValue})!`;
          else if (w.state === 'MAN_DOWN') reason = 'Fall verified · Prolonged immobility sustained';
          else if (w.state === 'GAS_HAZARD')
            reason = `Gas sensor reading (${w.gasValue}) exceeded threshold (${w.gasThreshold})`;
          else if (w.state === 'POSSIBLE_FALL')
            reason = 'Abnormal impact motion detected · Immobility timer active';

          return {
            worker: w,
            reason,
            eventType: w.state,
            time: w.lastPacketFormatted,
          };
        }),
    [workers]
  );

  const contextValue = useMemo<SafetyContextType>(
    () => ({
      workers,
      selectedWorkerId,
      setSelectedWorkerId,
      baseStation,
      events,
      criticalAlerts,
      snoozeRemaining,
      acknowledgeAlert,
      snoozeActiveAlarm,
      cancelAlarmSnooze,
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
      exportAuditBundle,
      updateWorkerThreshold,
      updateImmobilityTimeout,
    }),
    [
      workers,
      selectedWorkerId,
      baseStation,
      events,
      criticalAlerts,
      snoozeRemaining,
      acknowledgeAlert,
      snoozeActiveAlarm,
      cancelAlarmSnooze,
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
      exportAuditBundle,
      updateWorkerThreshold,
      updateImmobilityTimeout,
    ]
  );

  return <SafetyContext.Provider value={contextValue}>{children}</SafetyContext.Provider>;
};

export const useSafetySystem = () => {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error('useSafetySystem must be used within SafetySystemProvider');
  return ctx;
};
