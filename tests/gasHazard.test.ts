import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateGasReading,
  DEFAULT_GAS_THRESHOLD,
  DEFAULT_GAS_HYSTERESIS,
  MIN_VALID_ADC,
  MAX_VALID_ADC,
  processPacketAgainstWorker,
} from '../src/logic/safetyEngine';
import { WorkerNode, RawPacket } from '../src/types';

function createMockWorker(overrides: Partial<WorkerNode> = {}): WorkerNode {
  return {
    id: 'WORKER_01',
    displayName: 'Worker 01',
    assignedZone: 'Vault 4B',
    state: 'NORMAL',
    gasValue: 300,
    gasThreshold: 500,
    gasState: 'SAFE',
    motionState: 'MOVING',
    accel: { x: 0, y: 1, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
    manDownStep: 'NORMAL',
    immobilitySeconds: 0,
    immobilityTimeout: 10,
    rssi: -82,
    snr: 8.0,
    packetCount: 1,
    lastPacketTime: Date.now(),
    lastPacketFormatted: '12:00:00',
    telemetryHistory: [],
    isAcknowledged: false,
    ...overrides,
  };
}

describe('Gas-Hazard Logic and MQ-2 Evaluation (Section 5 Audit)', () => {
  it('1. Reading clearly below configured threshold is classified as SAFE', () => {
    const res = evaluateGasReading(350, 500, 'SAFE', 15);
    assert.equal(res.gasState, 'SAFE');
    assert.equal(res.gasSensorFault, false);
  });

  it('2. Reading exactly equal to configured threshold is classified as HAZARD (boundary test)', () => {
    const res = evaluateGasReading(500, 500, 'SAFE', 15);
    assert.equal(res.gasState, 'HAZARD');
    assert.equal(res.gasSensorFault, false);
  });

  it('3. Reading above configured threshold is classified as HAZARD', () => {
    const res = evaluateGasReading(742, 500, 'SAFE', 15);
    assert.equal(res.gasState, 'HAZARD');
    assert.equal(res.gasSensorFault, false);
  });

  it('4. Minimum supported analog value (0 ADC) is valid and SAFE', () => {
    const res = evaluateGasReading(MIN_VALID_ADC, 500, 'SAFE', 15);
    assert.equal(res.gasState, 'SAFE');
    assert.equal(res.gasSensorFault, false);
  });

  it('5. Maximum supported analog value (1023 ADC) is valid and HAZARD', () => {
    const res = evaluateGasReading(MAX_VALID_ADC, 500, 'SAFE', 15);
    assert.equal(res.gasState, 'HAZARD');
    assert.equal(res.gasSensorFault, false);
  });

  it('6. Negative reading (<0 ADC) is flagged as SENSOR FAULT', () => {
    const res = evaluateGasReading(-1, 500, 'SAFE', 15);
    assert.equal(res.gasSensorFault, true);
    assert.match(res.statusDescription, /SENSOR FAULT/);
  });

  it('7. Overflow reading (>1023 ADC) is flagged as SENSOR FAULT', () => {
    const res = evaluateGasReading(1024, 500, 'SAFE', 15);
    assert.equal(res.gasSensorFault, true);
    assert.match(res.statusDescription, /SENSOR FAULT/);
  });

  it('8. Missing, NaN, or null reading is flagged as SENSOR FAULT without false safe claim', () => {
    const nanRes = evaluateGasReading(NaN, 500, 'SAFE', 15);
    assert.equal(nanRes.gasSensorFault, true);

    const nullRes = evaluateGasReading(null as any, 500, 'SAFE', 15);
    assert.equal(nullRes.gasSensorFault, true);

    const undefRes = evaluateGasReading(undefined as any, 500, 'SAFE', 15);
    assert.equal(undefRes.gasSensorFault, true);
  });

  it('9. Rapid fluctuations around threshold adhere to hysteresis deadband', () => {
    const threshold = 500;
    const hysteresis = 15;
    // Clear threshold is 500 - 15 = 485

    // Step a: Below threshold -> SAFE
    let evalA = evaluateGasReading(490, threshold, 'SAFE', hysteresis);
    assert.equal(evalA.gasState, 'SAFE');

    // Step b: Spike to 505 -> HAZARD triggered
    let evalB = evaluateGasReading(505, threshold, evalA.gasState, hysteresis);
    assert.equal(evalB.gasState, 'HAZARD');

    // Step c: Dips to 495 (below 500, but above 485) -> Must STAY in HAZARD due to deadband
    let evalC = evaluateGasReading(495, threshold, evalB.gasState, hysteresis);
    assert.equal(evalC.gasState, 'HAZARD', 'Hysteresis should keep state in HAZARD above 485');

    // Step d: Oscillates to 502 -> Remains HAZARD
    let evalD = evaluateGasReading(502, threshold, evalC.gasState, hysteresis);
    assert.equal(evalD.gasState, 'HAZARD');

    // Step e: Dips to 480 (below 485 clear threshold) -> RECOVERS to SAFE
    let evalE = evaluateGasReading(480, threshold, evalD.gasState, hysteresis);
    assert.equal(evalE.gasState, 'SAFE');

    // Step f: Rises to 495 -> Stays SAFE (has not crossed 500 yet)
    let evalF = evaluateGasReading(495, threshold, evalE.gasState, hysteresis);
    assert.equal(evalF.gasState, 'SAFE');
  });

  it('10. Repeated hazard readings do not duplicate initial trigger events', () => {
    const worker = createMockWorker();
    const packet1: RawPacket = {
      workerId: 'WORKER_01',
      event: 'GAS_HAZARD',
      gas: 700,
    };

    // First trigger
    const res1 = processPacketAgainstWorker(worker, packet1, 1000, '12:00:01');
    assert.equal(res1.updatedWorker.gasState, 'HAZARD');
    assert.equal(res1.shouldTriggerAlarm, true);
    assert.equal(res1.newEvents.filter((e) => e.eventType === 'GAS_HAZARD').length, 1);

    // Second packet with same or higher reading
    const packet2: RawPacket = {
      workerId: 'WORKER_01',
      event: 'GAS_HAZARD',
      gas: 720,
    };
    const res2 = processPacketAgainstWorker(res1.updatedWorker, packet2, 2000, '12:00:02');
    assert.equal(res2.updatedWorker.gasState, 'HAZARD');
    assert.equal(res2.newEvents.filter((e) => e.eventType === 'GAS_HAZARD').length, 0);
  });

  it('11. Interaction between gas hazard and existing MAN DOWN event (Compound Hazard)', () => {
    const manDownWorker = createMockWorker({
      state: 'MAN_DOWN',
      manDownStep: 'MAN_DOWN',
      motionState: 'IMMOBILE',
    });

    const gasPacket: RawPacket = {
      workerId: 'WORKER_01',
      event: 'GAS_HAZARD',
      gas: 780,
      imuState: 'IMMOBILE',
    };

    const res = processPacketAgainstWorker(manDownWorker, gasPacket, 3000, '12:00:03');
    assert.equal(res.updatedWorker.state, 'COMPOUND_HAZARD');
    assert.equal(res.updatedWorker.gasState, 'HAZARD');
    assert.equal(res.shouldTriggerAlarm, true);
    assert.ok(res.newEvents.some((e) => e.eventType === 'COMPOUND_HAZARD'));
  });

  it('12. Gas hazard recovery clears state and logs RECOVERY event', () => {
    const hazardWorker = createMockWorker({
      state: 'GAS_HAZARD',
      gasState: 'HAZARD',
      gasValue: 700,
    });

    const safePacket: RawPacket = {
      workerId: 'WORKER_01',
      event: 'NORMAL',
      gas: 310,
    };

    const res = processPacketAgainstWorker(hazardWorker, safePacket, 4000, '12:00:04');
    assert.equal(res.updatedWorker.gasState, 'SAFE');
    assert.equal(res.updatedWorker.state, 'NORMAL');
    assert.ok(res.newEvents.some((e) => e.eventType === 'RECOVERY'));
  });

  it('13. Maintains rolling telemetry history and tracks peak gas and TWA', () => {
    let worker = createMockWorker();
    const gasReadings = [300, 320, 650, 700, 400];

    for (let i = 0; i < gasReadings.length; i++) {
      const res = processPacketAgainstWorker(worker, {
        workerId: 'WORKER_01',
        event: gasReadings[i] >= 500 ? 'GAS_HAZARD' : 'NORMAL',
        gas: gasReadings[i],
      }, 5000 + i * 1000, `12:00:0${5 + i}`);
      worker = res.updatedWorker;
    }

    assert.equal(worker.telemetryHistory.length, 5);
    assert.equal(worker.peakGasValue, 700);
    assert.ok(worker.twaGasValue !== undefined && worker.twaGasValue > 0);
  });
});
