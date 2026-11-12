import { RawPacket, MotionState } from '../types';

export interface ParseResult {
  success: boolean;
  packet?: RawPacket;
  error?: string;
  rawString: string;
}

/**
 * Robust parser supporting multiple Arduino transmission formats:
 * 1. JSON: {"workerId":"WORKER_01","event":"MAN_DOWN","gas":342,"imuState":"IMMOBILE","rssi":-87,"snr":7.5}
 * 2. CSV / Delimited: VX,WORKER_01,NORMAL,320,MOVING,-82,7.5 or VX,WORKER_01,MAN_DOWN,750,IMMOBILE,-0.02,0.1,0.98,-80,8.1
 * 3. Key-Value: W:WORKER_01|E:MAN_DOWN|G:342|IMU:IMMOBILE|RSSI:-87|SNR:7.5
 */
export function parsePacketLine(line: string): ParseResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { success: false, error: 'Empty line', rawString: line };
  }

  // Filter out system diagnostic or non-packet messages
  if (
    trimmed.startsWith('[BOOT]') ||
    trimmed.startsWith('[LORA]') ||
    trimmed.startsWith('[SERIAL]') ||
    trimmed.startsWith('[SIM]') ||
    trimmed.startsWith('[ERROR]') ||
    trimmed.startsWith('//')
  ) {
    return { success: false, error: 'System log line, not a packet', rawString: line };
  }

  // 1. Try JSON
  if (trimmed.startsWith('{')) {
    if (!trimmed.endsWith('}')) {
      return { success: false, error: 'Malformed JSON: Truncated or incomplete packet (missing closing brace)', rawString: line };
    }
    try {
      const parsed = JSON.parse(trimmed);
      const workerId = String(parsed.workerId || parsed.id || parsed.w || '').trim().toUpperCase();
      if (!workerId) {
        return { success: false, error: 'JSON missing workerId', rawString: line };
      }

      const eventRaw = String(parsed.event || parsed.status || parsed.e || 'NORMAL').toUpperCase();
      
      let event: RawPacket['event'] = 'NORMAL';
      if (['MAN_DOWN', 'MANDOWN'].includes(eventRaw)) event = 'MAN_DOWN';
      else if (['COMPOUND_HAZARD', 'MAN_DOWN_GAS', 'COMPOUND'].includes(eventRaw)) event = 'COMPOUND_HAZARD';
      else if (['GAS_HAZARD', 'GAS'].includes(eventRaw)) event = 'GAS_HAZARD';
      else if (['POSSIBLE_FALL', 'FALL'].includes(eventRaw)) event = 'POSSIBLE_FALL';
      else if (['WARNING'].includes(eventRaw)) event = 'WARNING';
      else if (['SENSOR_FAULT', 'FAULT'].includes(eventRaw)) event = 'SENSOR_FAULT';
      else event = 'NORMAL';

      const rawGas = parsed.gas ?? parsed.g ?? parsed.gasValue;
      const gasNum = rawGas !== undefined && rawGas !== null ? Number(rawGas) : NaN;

      const imuRaw = String(parsed.imuState ?? parsed.imu ?? parsed.motion ?? 'MOVING').toUpperCase();
      let imuState: MotionState = 'MOVING';
      if (['IMMOBILE', 'STATIONARY', 'POSSIBLE_FALL', 'ABNORMAL_MOTION'].includes(imuRaw)) {
        imuState = imuRaw as MotionState;
      }

      const accel = parsed.accel || (
        parsed.ax !== undefined
          ? { x: Number(parsed.ax), y: Number(parsed.ay ?? 0), z: Number(parsed.az ?? 1) }
          : undefined
      );

      const gyro = parsed.gyro || (
        parsed.gx !== undefined
          ? { x: Number(parsed.gx), y: Number(parsed.gy ?? 0), z: Number(parsed.gz ?? 0) }
          : undefined
      );

      const packet: RawPacket = {
        workerId,
        event,
        gas: isNaN(gasNum) ? NaN : gasNum,
        sensorFault: isNaN(gasNum) || parsed.fault === true,
        imuState,
        accel,
        gyro,
        rssi: typeof parsed.rssi === 'number' ? parsed.rssi : -80,
        snr: typeof parsed.snr === 'number' ? parsed.snr : 8.0,
        batteryMv: typeof parsed.batteryMv === 'number' ? parsed.batteryMv : typeof parsed.vbat === 'number' ? parsed.vbat : undefined,
        timestamp: parsed.timestamp || undefined,
        lat: parsed.lat,
        lng: parsed.lng,
      };

      return { success: true, packet, rawString: line };
    } catch (err: any) {
      return { success: false, error: `Malformed JSON: ${err?.message}`, rawString: line };
    }
  }

  // 2. Try CSV: require prefix 'VX,' or 'VIGILX,' or start with 'WORKER_'
  if (trimmed.startsWith('VX,') || trimmed.startsWith('VIGILX,') || /^WORKER_\w+,/i.test(trimmed)) {
    const parts = trimmed.split(',').map((p) => p.trim());
    let offset = 0;
    if (parts[0] === 'VX' || parts[0] === 'VIGILX') offset = 1;

    if (parts.length >= offset + 3) {
      const workerId = (parts[offset] || '').toUpperCase();
      if (!workerId) return { success: false, error: 'CSV missing worker ID', rawString: line };

      const eventRaw = (parts[offset + 1] || 'NORMAL').toUpperCase();
      const gas = parseFloat(parts[offset + 2]);
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

      // Check for optional trailing rssi, snr
      const rssi = parts.length > offset + 4 ? parseFloat(parts[offset + 4]) : -80;
      const snr = parts.length > offset + 5 ? parseFloat(parts[offset + 5]) : 7.5;

      const packet: RawPacket = {
        workerId,
        event,
        gas: isNaN(gas) ? NaN : gas,
        imuState,
        rssi: isNaN(rssi) ? -80 : rssi,
        snr: isNaN(snr) ? 7.5 : snr,
      };

      return { success: true, packet, rawString: line };
    }
  }

  // 3. Try Key-Value: W:WORKER_01|E:MAN_DOWN|G:342...
  if (trimmed.includes(':') && (trimmed.includes('|') || trimmed.includes('&') || trimmed.includes(';'))) {
    const delimiter = trimmed.includes('|') ? '|' : trimmed.includes(';') ? ';' : '&';
    const pairs = trimmed.split(delimiter);
    const kv: Record<string, string> = {};
    for (const p of pairs) {
      const [k, v] = p.split(':');
      if (k && v !== undefined) kv[k.trim().toUpperCase()] = v.trim();
    }

    const workerId = (kv['WORKERID'] || kv['WORKER'] || kv['W'] || '').toUpperCase();
    if (!workerId) {
      return { success: false, error: 'Key-value missing worker identifier (W: or WORKER:)', rawString: line };
    }

    const eventRaw = (kv['EVENT'] || kv['E'] || 'NORMAL').toUpperCase();
    const gasVal = kv['GAS'] || kv['G'];
    const gas = gasVal !== undefined ? parseFloat(gasVal) : NaN;
    const imuRaw = (kv['IMU'] || kv['M'] || 'MOVING').toUpperCase();
    const rssi = parseFloat(kv['RSSI'] || '-80');
    const snr = parseFloat(kv['SNR'] || '8.0');

    let event: RawPacket['event'] = 'NORMAL';
    if (['MAN_DOWN', 'MANDOWN'].includes(eventRaw)) event = 'MAN_DOWN';
    else if (['COMPOUND_HAZARD', 'COMPOUND'].includes(eventRaw)) event = 'COMPOUND_HAZARD';
    else if (['GAS_HAZARD', 'GAS'].includes(eventRaw)) event = 'GAS_HAZARD';
    else if (['POSSIBLE_FALL', 'FALL'].includes(eventRaw)) event = 'POSSIBLE_FALL';
    else if (['WARNING'].includes(eventRaw)) event = 'WARNING';

    let imuState: MotionState = 'MOVING';
    if (['IMMOBILE', 'STATIONARY', 'POSSIBLE_FALL', 'ABNORMAL_MOTION'].includes(imuRaw)) {
      imuState = imuRaw as MotionState;
    }

    return {
      success: true,
      packet: {
        workerId,
        event,
        gas: isNaN(gas) ? NaN : gas,
        imuState,
        rssi: isNaN(rssi) ? -80 : rssi,
        snr: isNaN(snr) ? 8.0 : snr,
      },
      rawString: line,
    };
  }

  return {
    success: false,
    error: 'Unrecognized packet syntax. Supported: JSON ({"workerId":...}), CSV (VX,WORKER_01,...), or Key-Value (W:01|E:...)',
    rawString: line,
  };
}
