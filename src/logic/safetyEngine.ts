import { WorkerNode, RawPacket, SafetyEvent, WorkerState, MotionState, ManDownStep, AccelData, GyroData } from '../types';

export const DEFAULT_GAS_THRESHOLD = 500;
export const DEFAULT_GAS_HYSTERESIS = 15; // 15 ADC units deadband to prevent fluctuation flapping
export const MIN_VALID_ADC = 0;
export const MAX_VALID_ADC = 1023;
export const DEFAULT_IMMOBILITY_TIMEOUT = 10; // seconds

export interface GasEvaluationResult {
  gasState: 'SAFE' | 'HAZARD';
  gasSensorFault: boolean;
  statusDescription: string;
}

/**
 * Evaluates raw MQ-2 analog reading with range checking, boundary precision, and hysteresis deadband.
 */
export function evaluateGasReading(
  reading: number | null | undefined,
  threshold: number = DEFAULT_GAS_THRESHOLD,
  previousState: 'SAFE' | 'HAZARD' = 'SAFE',
  hysteresis: number = DEFAULT_GAS_HYSTERESIS
): GasEvaluationResult {
  // Check for invalid, NaN, null, or out-of-range sensor readings
  if (reading === null || reading === undefined || isNaN(reading)) {
    return {
      gasState: 'SAFE',
      gasSensorFault: true,
      statusDescription: 'SENSOR FAULT: Missing or invalid MQ-2 sensor reading',
    };
  }

  // Check hardware physical ADC limits (10-bit ADC: 0 - 1023)
  if (reading < MIN_VALID_ADC || reading > MAX_VALID_ADC) {
    return {
      gasState: 'SAFE',
      gasSensorFault: true,
      statusDescription: `SENSOR FAULT: Reading ${reading} outside valid 10-bit ADC range (0-1023)`,
    };
  }

  // Hysteresis calculation:
  // If previously SAFE: trigger HAZARD when reading >= threshold (exact equal is HAZARD)
  // If previously HAZARD: stay in HAZARD until reading drops below (threshold - hysteresis)
  const clearThreshold = Math.max(MIN_VALID_ADC, threshold - hysteresis);

  if (previousState === 'SAFE') {
    if (reading >= threshold) {
      return {
        gasState: 'HAZARD',
        gasSensorFault: false,
        statusDescription: `HAZARD: MQ-2 sensor reading ${reading} exceeded safety threshold ${threshold}`,
      };
    } else {
      return {
        gasState: 'SAFE',
        gasSensorFault: false,
        statusDescription: 'SAFE: Gas reading within normal range',
      };
    }
  } else {
    // Currently in HAZARD
    if (reading < clearThreshold) {
      return {
        gasState: 'SAFE',
        gasSensorFault: false,
        statusDescription: `RECOVERY: Gas reading ${reading} dropped safely below hysteresis threshold ${clearThreshold}`,
      };
    } else {
      return {
        gasState: 'HAZARD',
        gasSensorFault: false,
        statusDescription: `HAZARD PERSISTS: Gas reading ${reading} remains above safe recovery threshold ${clearThreshold}`,
      };
    }
  }
}

/**
 * Calculates 3D vector magnitude: sqrt(x^2 + y^2 + z^2)
 */
export function vectorMagnitude(v: { x: number; y: number; z: number }): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Checks if MPU6050 IMU motion indicates active human movement
 */
export function isMotionActive(accel: AccelData, gyro?: GyroData): boolean {
  const accelMag = vectorMagnitude(accel);
  const deltaG = Math.abs(accelMag - 1.0); // Deviation from 1G gravity
  
  let gyroMag = 0;
  if (gyro) {
    gyroMag = vectorMagnitude(gyro);
  }

  // Motion detected if acceleration deviates by >0.25g from rest OR angular velocity >20 deg/s
  return deltaG > 0.25 || gyroMag > 20;
}

export interface EngineResult {
  updatedWorker: WorkerNode;
  newEvents: SafetyEvent[];
  shouldTriggerAlarm: boolean;
  alarmType: 'CRITICAL' | 'WARNING' | 'RECOVERY' | null;
}

/**
 * Primary state transition engine. Processes incoming packets against worker node.
 */
export function processPacketAgainstWorker(
  worker: WorkerNode,
  packet: RawPacket,
  nowMs: number = Date.now(),
  timeStr: string = new Date(nowMs).toTimeString().slice(0, 8)
): EngineResult {
  const updated: WorkerNode = { ...worker };
  const newEvents: SafetyEvent[] = [];
  let shouldTriggerAlarm = false;
  let alarmType: 'CRITICAL' | 'WARNING' | 'RECOVERY' | null = null;

  const prevState = worker.state;
  const prevGasState = worker.gasState;

  // 1. Update Telemetry Metadata
  updated.lastPacketTime = nowMs;
  updated.lastPacketFormatted = timeStr;
  updated.packetCount += 1;
  if (typeof packet.rssi === 'number') updated.rssi = packet.rssi;
  if (typeof packet.snr === 'number') updated.snr = packet.snr;
  if (typeof packet.batteryMv === 'number') updated.batteryMv = packet.batteryMv;
  if (packet.lat !== undefined && packet.lng !== undefined) {
    updated.gps = {
      lat: packet.lat,
      lng: packet.lng,
      hasFix: true,
      satellites: updated.gps?.satellites ?? 4,
      accuracyMeters: updated.gps?.accuracyMeters ?? 15,
    };
  }

  if (packet.accel) updated.accel = packet.accel;
  if (packet.gyro) updated.gyro = packet.gyro;
  if (packet.imuState) updated.motionState = packet.imuState;

  // 2. Evaluate Gas Reading with Range Check & Hysteresis
  const gasEval = evaluateGasReading(
    packet.gas,
    updated.gasThreshold,
    prevGasState,
    DEFAULT_GAS_HYSTERESIS
  );
  updated.gasValue = packet.gas;
  updated.gasState = gasEval.gasState;
  updated.gasSensorFault = gasEval.gasSensorFault;

  if (gasEval.gasSensorFault) {
    newEvents.push({
      id: `evt-${nowMs}-gasfault`,
      timestamp: timeStr,
      timeMs: nowMs,
      workerId: updated.id,
      workerName: updated.displayName,
      eventType: 'SENSOR_FAULT',
      severity: 'WARNING',
      description: `WARNING: ${gasEval.statusDescription}`,
      category: 'gas',
    });
  }

  if (updated.gasState === 'HAZARD') {
    if (!updated.gasHazardTimestamp) {
      updated.gasHazardTimestamp = timeStr;
    }
    if (prevGasState !== 'HAZARD') {
      newEvents.push({
        id: `evt-${nowMs}-gashazard`,
        timestamp: timeStr,
        timeMs: nowMs,
        workerId: updated.id,
        workerName: updated.displayName,
        eventType: 'GAS_HAZARD',
        severity: 'CRITICAL',
        description: `CRITICAL ALERT: MQ-2 sensor reading ${packet.gas} exceeded safety threshold ${updated.gasThreshold}.`,
        gasValue: packet.gas,
        category: 'gas',
      });
      shouldTriggerAlarm = true;
      alarmType = 'CRITICAL';
      updated.isAcknowledged = false;
    }
  } else {
    // Gas recovered or remained safe
    if (prevGasState === 'HAZARD') {
      updated.gasHazardTimestamp = undefined;
      newEvents.push({
        id: `evt-${nowMs}-gasrec`,
        timestamp: timeStr,
        timeMs: nowMs,
        workerId: updated.id,
        workerName: updated.displayName,
        eventType: 'RECOVERY',
        severity: 'INFO',
        description: `Gas cleared. MQ-2 sensor reading ${packet.gas} dropped below safe threshold.`,
        gasValue: packet.gas,
        category: 'gas',
      });
    }
  }

  // 3. Fall & Motion State Interpretation
  let isManDown = false;
  let isPossibleFall = false;

  if (packet.event === 'MAN_DOWN' || packet.event === 'COMPOUND_HAZARD') {
    isManDown = true;
    updated.manDownStep = 'MAN_DOWN';
    updated.motionState = 'IMMOBILE';
    updated.immobilitySeconds = updated.immobilityTimeout;

    if (prevState !== 'MAN_DOWN' && prevState !== 'COMPOUND_HAZARD') {
      updated.isAcknowledged = false;
      newEvents.push({
        id: `evt-${nowMs}-mandown`,
        timestamp: timeStr,
        timeMs: nowMs,
        workerId: updated.id,
        workerName: updated.displayName,
        eventType: 'MAN_DOWN',
        severity: 'CRITICAL',
        description: `CRITICAL ALERT: Arduino verified MAN DOWN (Fall + sustained immobility).`,
        category: 'man-down',
      });
      shouldTriggerAlarm = true;
      alarmType = 'CRITICAL';
    }
  } else if (packet.event === 'POSSIBLE_FALL') {
    isPossibleFall = true;
    updated.manDownStep = 'IMMOBILITY_TIMER';
    if (prevState !== 'POSSIBLE_FALL') {
      updated.immobilitySeconds = 0;
      updated.fallDetectedTime = nowMs;
      newEvents.push({
        id: `evt-${nowMs}-fall`,
        timestamp: timeStr,
        timeMs: nowMs,
        workerId: updated.id,
        workerName: updated.displayName,
        eventType: 'POSSIBLE_FALL',
        severity: 'WARNING',
        description: `WARNING: High impact motion detected on MPU6050. Immobility timer started.`,
        category: 'man-down',
      });
      shouldTriggerAlarm = true;
      alarmType = 'WARNING';
    }
  } else if (packet.event === 'NORMAL') {
    // Normal / Recovery packet from Arduino
    if (['MAN_DOWN', 'POSSIBLE_FALL', 'COMPOUND_HAZARD'].includes(prevState)) {
      newEvents.push({
        id: `evt-${nowMs}-rec`,
        timestamp: timeStr,
        timeMs: nowMs,
        workerId: updated.id,
        workerName: updated.displayName,
        eventType: 'RECOVERY',
        severity: 'INFO',
        description: `Worker motion recovered. State returned to NORMAL.`,
        category: 'man-down',
      });
      alarmType = 'RECOVERY';
    }
    updated.manDownStep = 'NORMAL';
    updated.immobilitySeconds = 0;
  }

  // 4. Compound Emergency Synthesis
  // If BOTH Gas Hazard AND Man Down are active -> COMPOUND_HAZARD (most critical condition)
  if (updated.gasState === 'HAZARD' && (isManDown || updated.manDownStep === 'MAN_DOWN')) {
    updated.state = 'COMPOUND_HAZARD';
    if (prevState !== 'COMPOUND_HAZARD') {
      newEvents.push({
        id: `evt-${nowMs}-compound`,
        timestamp: timeStr,
        timeMs: nowMs,
        workerId: updated.id,
        workerName: updated.displayName,
        eventType: 'COMPOUND_HAZARD',
        severity: 'CRITICAL',
        description: `EXTREME HAZARD: Worker UNCONSCIOUS (MAN DOWN) in TOXIC GAS environment! Immediate dispatch required!`,
        gasValue: packet.gas,
        category: 'compound',
      });
      shouldTriggerAlarm = true;
      alarmType = 'CRITICAL';
    }
  } else if (isManDown) {
    updated.state = 'MAN_DOWN';
  } else if (updated.gasState === 'HAZARD') {
    updated.state = 'GAS_HAZARD';
  } else if (isPossibleFall) {
    updated.state = 'POSSIBLE_FALL';
  } else if (packet.event === 'WARNING') {
    updated.state = 'WARNING';
    updated.manDownStep = 'ABNORMAL_MOTION';
  } else {
    updated.state = 'NORMAL';
  }

  return {
    updatedWorker: updated,
    newEvents,
    shouldTriggerAlarm,
    alarmType,
  };
}
