import { RawPacket, MotionState } from '../types';

export type ParseSuccess = {
  ok: true;
  success: true;
  data: RawPacket;
  packet: RawPacket;
  error?: undefined;
  raw: string;
  rawString: string;
};

export type ParseFailure = {
  ok: false;
  success: false;
  data?: undefined;
  packet?: undefined;
  error: string;
  raw: string;
  rawString: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

/**
 * Sanitizes and validates numeric values. Rejects Infinity, -Infinity, NaN.
 */
function sanitizeNumber(val: unknown, fallback: number = NaN): number {
  if (val === undefined || val === null || val === '') return fallback;
  const n = Number(val);
  if (!Number.isFinite(n) || Number.isNaN(n)) return fallback;
  return n;
}

/**
 * Validates and normalizes worker IDs (alphanumeric with underscores, max 64 chars).
 */
function sanitizeWorkerId(rawId: unknown): string | null {
  if (!rawId) return null;
  const str = String(rawId).trim().toUpperCase();
  if (!str) return null;
  // Disallow control characters or excessively long strings
  if (str.length > 64) return str.slice(0, 64);
  return str;
}

/**
 * Robust parser supporting multiple Arduino transmission formats:
 * 1. JSON: {"workerId":"WORKER_01","event":"MAN_DOWN","gas":342,"imuState":"IMMOBILE","rssi":-87,"snr":7.5}
 * 2. CSV / Delimited: VX,WORKER_01,NORMAL,320,MOVING,-82,7.5 or VX,WORKER_01,MAN_DOWN,750,IMMOBILE,-0.02,0.1,0.98,-80,8.1
 * 3. Key-Value: W:WORKER_01|E:MAN_DOWN|G:342|IMU:IMMOBILE|RSSI:-87|SNR:7.5
 */
export function parsePacketLine(line: string): ParseResult {
  const trimmed = typeof line === 'string' ? line.trim() : '';
  if (!trimmed) {
    return {
      ok: false,
      success: false,
      error: 'Empty packet line received',
      raw: line,
      rawString: line,
    };
  }

  // Filter out system diagnostic or non-packet boot logs
  if (
    trimmed.startsWith('[BOOT]') ||
    trimmed.startsWith('[LORA]') ||
    trimmed.startsWith('[SERIAL]') ||
    trimmed.startsWith('[SIM]') ||
    trimmed.startsWith('[ERROR]') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('#')
  ) {
    return {
      ok: false,
      success: false,
      error: 'System diagnostic log line, not a worker telemetry packet',
      raw: line,
      rawString: line,
    };
  }

  // 1. JSON FORMAT
  if (trimmed.startsWith('{')) {
    if (!trimmed.endsWith('}')) {
      return {
        ok: false,
        success: false,
        error: 'Malformed JSON: Truncated or incomplete packet (missing closing brace)',
        raw: line,
        rawString: line,
      };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
          ok: false,
          success: false,
          error: 'Malformed JSON: Packet must be an object payload',
          raw: line,
          rawString: line,
        };
      }

      // Check worker ID variants: workerId, id, w, worker_id, worker
      const workerId = sanitizeWorkerId(
        parsed.workerId ?? parsed.id ?? parsed.w ?? parsed.worker_id ?? parsed.worker
      );
      if (!workerId) {
        return {
          ok: false,
          success: false,
          error: 'JSON missing workerId',
          raw: line,
          rawString: line,
        };
      }

      const eventRaw = String(
        parsed.event ?? parsed.status ?? parsed.e ?? parsed.alert ?? 'NORMAL'
      ).toUpperCase();

      let event: RawPacket['event'] = 'NORMAL';
      if (['MAN_DOWN', 'MANDOWN'].includes(eventRaw)) event = 'MAN_DOWN';
      else if (['COMPOUND_HAZARD', 'MAN_DOWN_GAS', 'COMPOUND'].includes(eventRaw)) event = 'COMPOUND_HAZARD';
      else if (['GAS_HAZARD', 'GAS'].includes(eventRaw)) event = 'GAS_HAZARD';
      else if (['POSSIBLE_FALL', 'FALL'].includes(eventRaw)) event = 'POSSIBLE_FALL';
      else if (['WARNING'].includes(eventRaw)) event = 'WARNING';
      else if (['SENSOR_FAULT', 'FAULT'].includes(eventRaw)) event = 'SENSOR_FAULT';

      // Check gas reading variants: gas, g, gas_value, gasValue
      const rawGas = parsed.gas ?? parsed.g ?? parsed.gas_value ?? parsed.gasValue;
      const gasNum = sanitizeNumber(rawGas, NaN);

      const imuRaw = String(
        parsed.imuState ?? parsed.imu ?? parsed.motion ?? parsed.motion_state ?? 'MOVING'
      ).toUpperCase();
      let imuState: MotionState = 'MOVING';
      if (['IMMOBILE', 'STATIONARY', 'POSSIBLE_FALL', 'ABNORMAL_MOTION'].includes(imuRaw)) {
        imuState = imuRaw as MotionState;
      }

      // Accelerometer
      let accel = parsed.accel;
      if (!accel && (parsed.ax !== undefined || parsed.ay !== undefined || parsed.az !== undefined)) {
        accel = {
          x: sanitizeNumber(parsed.ax, 0),
          y: sanitizeNumber(parsed.ay, 1),
          z: sanitizeNumber(parsed.az, 0),
        };
      } else if (accel) {
        accel = {
          x: sanitizeNumber(accel.x, 0),
          y: sanitizeNumber(accel.y, 1),
          z: sanitizeNumber(accel.z, 0),
        };
      }

      // Gyroscope
      let gyro = parsed.gyro;
      if (!gyro && (parsed.gx !== undefined || parsed.gy !== undefined || parsed.gz !== undefined)) {
        gyro = {
          x: sanitizeNumber(parsed.gx, 0),
          y: sanitizeNumber(parsed.gy, 0),
          z: sanitizeNumber(parsed.gz, 0),
        };
      }

      const rssi = sanitizeNumber(parsed.rssi, -80);
      const snr = sanitizeNumber(parsed.snr, 8.0);
      const batteryMv = parsed.batteryMv !== undefined || parsed.vbat !== undefined
        ? sanitizeNumber(parsed.batteryMv ?? parsed.vbat, 3800)
        : undefined;

      const packet: RawPacket = {
        workerId,
        event,
        gas: gasNum,
        sensorFault: Number.isNaN(gasNum) || parsed.fault === true || parsed.sensor_fault === true,
        imuState,
        accel,
        gyro,
        rssi,
        snr,
        batteryMv,
        timestamp: parsed.timestamp ? String(parsed.timestamp) : undefined,
        lat: parsed.lat !== undefined ? sanitizeNumber(parsed.lat) : undefined,
        lng: parsed.lng !== undefined ? sanitizeNumber(parsed.lng) : undefined,
      };

      return {
        ok: true,
        success: true,
        data: packet,
        packet,
        raw: line,
        rawString: line,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        success: false,
        error: `Malformed JSON: ${msg}`,
        raw: line,
        rawString: line,
      };
    }
  }

  // 2. CSV FORMAT (VX,WORKER_01,... or VIGILX,WORKER_01,... or WORKER_01,...)
  if (trimmed.startsWith('VX,') || trimmed.startsWith('VIGILX,') || /^WORKER_\w+,/i.test(trimmed)) {
    const parts = trimmed.split(',').map((p) => p.trim());
    let offset = 0;
    if (parts[0] === 'VX' || parts[0] === 'VIGILX') offset = 1;

    if (parts.length >= offset + 3) {
      const workerId = sanitizeWorkerId(parts[offset]);
      if (!workerId) {
        return {
          ok: false,
          success: false,
          error: 'CSV missing worker ID',
          raw: line,
          rawString: line,
        };
      }

      const eventRaw = (parts[offset + 1] || 'NORMAL').toUpperCase();
      const gas = sanitizeNumber(parts[offset + 2], NaN);
      const imuRaw = (parts[offset + 3] || 'MOVING').toUpperCase();

      let event: RawPacket['event'] = 'NORMAL';
      if (['MAN_DOWN', 'MANDOWN'].includes(eventRaw)) event = 'MAN_DOWN';
      else if (['COMPOUND_HAZARD', 'COMPOUND'].includes(eventRaw)) event = 'COMPOUND_HAZARD';
      else if (['GAS_HAZARD', 'GAS'].includes(eventRaw)) event = 'GAS_HAZARD';
      else if (['POSSIBLE_FALL', 'FALL'].includes(eventRaw)) event = 'POSSIBLE_FALL';
      else if (['WARNING'].includes(eventRaw)) event = 'WARNING';
      else if (['SENSOR_FAULT'].includes(eventRaw)) event = 'SENSOR_FAULT';

      let imuState: MotionState = 'MOVING';
      if (['IMMOBILE', 'STATIONARY', 'POSSIBLE_FALL', 'ABNORMAL_MOTION'].includes(imuRaw)) {
        imuState = imuRaw as MotionState;
      }

      const rssi = parts.length > offset + 4 ? sanitizeNumber(parts[offset + 4], -80) : -80;
      const snr = parts.length > offset + 5 ? sanitizeNumber(parts[offset + 5], 7.5) : 7.5;

      const packet: RawPacket = {
        workerId,
        event,
        gas,
        sensorFault: Number.isNaN(gas),
        imuState,
        rssi,
        snr,
      };

      return {
        ok: true,
        success: true,
        data: packet,
        packet,
        raw: line,
        rawString: line,
      };
    }
  }

  // 3. KEY-VALUE DELIMITED FORMAT (W:WORKER_01|E:MAN_DOWN|G:342...)
  if (trimmed.includes(':') && (trimmed.includes('|') || trimmed.includes('&') || trimmed.includes(';'))) {
    const delimiter = trimmed.includes('|') ? '|' : trimmed.includes(';') ? ';' : '&';
    const pairs = trimmed.split(delimiter);
    const kv: Record<string, string> = {};
    for (const p of pairs) {
      const idx = p.indexOf(':');
      if (idx > 0) {
        const k = p.slice(0, idx).trim().toUpperCase();
        const v = p.slice(idx + 1).trim();
        kv[k] = v;
      }
    }

    const workerId = sanitizeWorkerId(kv['WORKERID'] || kv['WORKER'] || kv['W']);
    if (!workerId) {
      return {
        ok: false,
        success: false,
        error: 'Key-value missing worker identifier (W: or WORKER:)',
        raw: line,
        rawString: line,
      };
    }

    const eventRaw = (kv['EVENT'] || kv['E'] || 'NORMAL').toUpperCase();
    const gas = sanitizeNumber(kv['GAS'] ?? kv['G'], NaN);
    const imuRaw = (kv['IMU'] || kv['M'] || 'MOVING').toUpperCase();
    const rssi = sanitizeNumber(kv['RSSI'], -80);
    const snr = sanitizeNumber(kv['SNR'], 8.0);

    let event: RawPacket['event'] = 'NORMAL';
    if (['MAN_DOWN', 'MANDOWN'].includes(eventRaw)) event = 'MAN_DOWN';
    else if (['COMPOUND_HAZARD', 'COMPOUND'].includes(eventRaw)) event = 'COMPOUND_HAZARD';
    else if (['GAS_HAZARD', 'GAS'].includes(eventRaw)) event = 'GAS_HAZARD';
    else if (['POSSIBLE_FALL', 'FALL'].includes(eventRaw)) event = 'POSSIBLE_FALL';
    else if (['WARNING'].includes(eventRaw)) event = 'WARNING';
    else if (['SENSOR_FAULT'].includes(eventRaw)) event = 'SENSOR_FAULT';

    let imuState: MotionState = 'MOVING';
    if (['IMMOBILE', 'STATIONARY', 'POSSIBLE_FALL', 'ABNORMAL_MOTION'].includes(imuRaw)) {
      imuState = imuRaw as MotionState;
    }

    const packet: RawPacket = {
      workerId,
      event,
      gas,
      sensorFault: Number.isNaN(gas),
      imuState,
      rssi,
      snr,
    };

    return {
      ok: true,
      success: true,
      data: packet,
      packet,
      raw: line,
      rawString: line,
    };
  }

  return {
    ok: false,
    success: false,
    error:
      'Unrecognized packet syntax. Supported: JSON ({"workerId":...}), CSV (VX,WORKER_01,...), or Key-Value (W:01|E:...)',
    raw: line,
    rawString: line,
  };
}
