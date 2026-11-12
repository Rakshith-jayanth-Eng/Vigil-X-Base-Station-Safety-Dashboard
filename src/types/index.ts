export type WorkerState =
  | 'NORMAL'
  | 'WARNING'
  | 'GAS_HAZARD'
  | 'POSSIBLE_FALL'
  | 'MAN_DOWN'
  | 'COMPOUND_HAZARD'
  | 'OFFLINE';

export type MotionState =
  | 'MOVING'
  | 'STATIONARY'
  | 'ABNORMAL_MOTION'
  | 'POSSIBLE_FALL'
  | 'IMMOBILE';

export type ManDownStep =
  | 'NORMAL'
  | 'ABNORMAL_MOTION'
  | 'POSSIBLE_FALL'
  | 'IMMOBILITY_TIMER'
  | 'MAN_DOWN';

export type EventSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AccelData {
  x: number;
  y: number;
  z: number;
}

export interface GyroData {
  x: number;
  y: number;
  z: number;
}

export interface WorkerGps {
  lat: number;
  lng: number;
  hasFix: boolean;
  satellites: number;
  accuracyMeters: number;
}

export interface WorkerNode {
  id: string; // e.g. "WORKER_01"
  displayName: string; // e.g. "Worker 01"
  assignedZone: string; // e.g. "Confined Tunnel A - Sector 4"
  state: WorkerState;
  
  // Gas telemetry
  gasValue: number; // Raw ADC reading (0 - 1023) from MQ-2
  gasThreshold: number; // Configured trigger threshold (e.g. 500)
  gasState: 'SAFE' | 'HAZARD';
  gasHazardTimestamp?: string;
  gasSensorFault?: boolean; // Flagged if ADC reading is invalid/out-of-range

  // IMU telemetry
  motionState: MotionState;
  accel: AccelData;
  gyro: GyroData;
  imuFault?: boolean; // Flagged if I2C/accel data is unavailable or frozen
  
  // Man-Down state machine
  manDownStep: ManDownStep;
  fallDetectedTime?: number;
  immobilitySeconds: number;
  immobilityTimeout: number; // e.g. 10 seconds

  // Radio telemetry
  rssi: number; // dBm e.g. -82
  snr: number; // dB e.g. 8.4
  packetCount: number;
  lastPacketTime: number; // epoch ms
  lastPacketFormatted: string; // "18:42:17"
  batteryMv?: number | null; // e.g. 3850 mV
  
  // Optional GPS
  gps?: WorkerGps;

  // Operator acknowledgement
  isAcknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface SafetyEvent {
  id: string;
  timestamp: string; // "18:42:17"
  timeMs: number;
  workerId: string;
  workerName: string;
  eventType: 'NORMAL' | 'POSSIBLE_FALL' | 'MAN_DOWN' | 'GAS_HAZARD' | 'COMPOUND_HAZARD' | 'OFFLINE' | 'RECOVERY' | 'ACKNOWLEDGED' | 'RESET' | 'CONNECTION' | 'SENSOR_FAULT';
  severity: EventSeverity;
  description: string;
  gasValue?: number;
  rssi?: number;
  category: 'critical' | 'warning' | 'gas' | 'man-down' | 'compound' | 'connection' | 'system';
}

export interface BaseStationStatus {
  isOnline: boolean;
  loraLinkConnected: boolean;
  serialConnected: boolean;
  serialPortName: string | null;
  baudRate: number;
  mode: 'DEMO' | 'LIVE';
  lastPacketTime: number | null;
  totalPacketsReceived: number;
  uptimeSeconds: number;
  audioAlarmEnabled: boolean;
  offlineTimeoutSeconds: number; // default 25s
}

export interface RawPacket {
  workerId: string;
  event: 'NORMAL' | 'GAS_HAZARD' | 'POSSIBLE_FALL' | 'MAN_DOWN' | 'COMPOUND_HAZARD' | 'WARNING' | 'SENSOR_FAULT';
  gas: number;
  imuState?: MotionState;
  accel?: AccelData;
  gyro?: GyroData;
  timestamp?: string;
  rssi?: number;
  snr?: number;
  batteryMv?: number;
  lat?: number;
  lng?: number;
  sensorFault?: boolean;
}
