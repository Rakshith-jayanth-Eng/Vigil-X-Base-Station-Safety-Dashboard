import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePacketLine } from '../src/utils/packetParser';

describe('LoRa Serial Packet Parser Audit (Section 7)', () => {
  it('1. Successfully parses standard JSON packet', () => {
    const raw = '{"workerId":"WORKER_01","event":"MAN_DOWN","gas":340,"imuState":"IMMOBILE","rssi":-85,"snr":7.2}';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.equal(res.ok, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_01');
    assert.equal(res.packet.event, 'MAN_DOWN');
    assert.equal(res.packet.gas, 340);
    assert.equal(res.packet.imuState, 'IMMOBILE');
    assert.equal(res.packet.rssi, -85);
    assert.equal(res.packet.snr, 7.2);
  });

  it('2. Successfully parses compact JSON with shortened keys (w, e, g, ax, ay, az)', () => {
    const raw = '{"w":"WORKER_02","e":"GAS_HAZARD","g":750,"ax":0.02,"ay":0.98,"az":0.1,"rssi":-92}';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_02');
    assert.equal(res.packet.event, 'GAS_HAZARD');
    assert.equal(res.packet.gas, 750);
    assert.deepEqual(res.packet.accel, { x: 0.02, y: 0.98, z: 0.1 });
    assert.equal(res.packet.rssi, -92);
  });

  it('3. Successfully parses CSV packets with VX prefix', () => {
    const raw = 'VX,WORKER_01,NORMAL,320,MOVING,-82,8.0';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_01');
    assert.equal(res.packet.event, 'NORMAL');
    assert.equal(res.packet.gas, 320);
    assert.equal(res.packet.imuState, 'MOVING');
    assert.equal(res.packet.rssi, -82);
    assert.equal(res.packet.snr, 8.0);
  });

  it('4. Successfully parses CSV packets with direct WORKER_ identifier', () => {
    const raw = 'WORKER_03,POSSIBLE_FALL,295,POSSIBLE_FALL,-79,8.5';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_03');
    assert.equal(res.packet.event, 'POSSIBLE_FALL');
    assert.equal(res.packet.gas, 295);
    assert.equal(res.packet.imuState, 'POSSIBLE_FALL');
  });

  it('5. Successfully parses Key-Value pipe delimited packets', () => {
    const raw = 'W:WORKER_01|E:MAN_DOWN|G:342|IMU:IMMOBILE|RSSI:-87|SNR:7.5';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_01');
    assert.equal(res.packet.event, 'MAN_DOWN');
    assert.equal(res.packet.gas, 342);
    assert.equal(res.packet.imuState, 'IMMOBILE');
    assert.equal(res.packet.rssi, -87);
    assert.equal(res.packet.snr, 7.5);
  });

  it('6. Ignores system boot logs, debug comments, and diagnostic strings', () => {
    assert.equal(parsePacketLine('[BOOT] Arduino starting').success, false);
    assert.equal(parsePacketLine('[LORA] SX1278 init OK').success, false);
    assert.equal(parsePacketLine('[SERIAL] Port opened').success, false);
    assert.equal(parsePacketLine('// C++ comment line').success, false);
    assert.equal(parsePacketLine('').success, false);
    assert.equal(parsePacketLine('   ').success, false);
  });

  it('7. Handles malformed JSON gracefully without crashing', () => {
    const raw = '{"workerId":"WORKER_01","event":...BROKEN_JSON';
    const res = parsePacketLine(raw);
    assert.equal(res.success, false);
    assert.equal(res.ok, false);
    assert.match(res.error || '', /Malformed JSON/i);
  });

  it('8. Handles missing worker ID in JSON gracefully', () => {
    const raw = '{"event":"MAN_DOWN","gas":300}';
    const res = parsePacketLine(raw);
    assert.equal(res.success, false);
    assert.match(res.error || '', /missing workerId/i);
  });

  it('9. Identifies sensor fault when gas ADC is NaN or missing', () => {
    const raw = '{"workerId":"WORKER_01","event":"SENSOR_FAULT","fault":true}';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.sensorFault, true);
  });

  it('10. Edge Case: Handles prompt-specified JSON format with gas_value, gas_hazard, motion_state, alert', () => {
    const raw = '{"worker_id":"WORKER_01","gas_value":245,"gas_hazard":false,"motion_state":"NORMAL","alert":"NONE"}';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_01');
    assert.equal(res.packet.gas, 245);
    assert.equal(res.packet.event, 'NORMAL');
  });

  it('11. Edge Case: Protects against Infinity / -Infinity payloads', () => {
    // Quoted string Infinity is sanitized to NaN
    const rawStr = '{"workerId":"WORKER_01","event":"NORMAL","gas":"Infinity","rssi":"-Infinity"}';
    const resStr = parsePacketLine(rawStr);
    assert.equal(resStr.success, true);
    assert.ok(resStr.packet);
    assert.ok(Number.isNaN(resStr.packet.gas));
    assert.equal(resStr.packet.rssi, -80); // Fallback to -80 for non-finite RSSI

    // Unquoted Infinity is rejected gracefully by JSON parser without crashing
    const rawUnquoted = '{"workerId":"WORKER_01","event":"NORMAL","gas":Infinity}';
    const resUnquoted = parsePacketLine(rawUnquoted);
    assert.equal(resUnquoted.success, false);
    assert.match(resUnquoted.error || '', /Malformed JSON/i);
  });

  it('12. Edge Case: Tolerates extra spaces and lowercase worker IDs', () => {
    const raw = '   {"workerId":"worker_99","event":"normal","gas":320}   ';
    const res = parsePacketLine(raw);
    assert.equal(res.success, true);
    assert.ok(res.packet);
    assert.equal(res.packet.workerId, 'WORKER_99');
    assert.equal(res.packet.event, 'NORMAL');
  });
});
