import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  processPacketAgainstWorker,
  isMotionActive,
  vectorMagnitude,
  DEFAULT_IMMOBILITY_TIMEOUT,
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
    accel: { x: 0, y: 1.0, z: 0 },
    gyro: { x: 0, y: 0, z: 0 },
    manDownStep: 'NORMAL',
    immobilitySeconds: 0,
    immobilityTimeout: DEFAULT_IMMOBILITY_TIMEOUT,
    rssi: -82,
    snr: 8.0,
    packetCount: 1,
    lastPacketTime: 100000,
    lastPacketFormatted: '12:00:00',
    telemetryHistory: [],
    isAcknowledged: false,
    ...overrides,
  };
}

describe('MPU6050 Motion & Man-Down State Machine Audit', () => {
  it('1. Normal walking and motion is detected as active motion without false fall', () => {
    const walkingAccel = { x: -0.15, y: 1.35, z: 0.2 };
    const walkingGyro = { x: 12, y: -5, z: 8 };

    assert.equal(isMotionActive(walkingAccel, walkingGyro), true);

    const worker = createMockWorker();
    const packet: RawPacket = {
      workerId: 'WORKER_01',
      event: 'NORMAL',
      gas: 310,
      imuState: 'MOVING',
      accel: walkingAccel,
      gyro: walkingGyro,
    };

    const res = processPacketAgainstWorker(worker, packet, 101000, '12:01:40');
    assert.equal(res.updatedWorker.state, 'NORMAL');
    assert.equal(res.updatedWorker.manDownStep, 'NORMAL');
    assert.equal(res.shouldTriggerAlarm, false);
  });

  it('2. Temporary stationary pause does NOT trigger fall or emergency', () => {
    const stationaryAccel = { x: 0.01, y: 0.99, z: 0.02 };
    const stationaryGyro = { x: 0, y: 0, z: 0 };

    assert.equal(isMotionActive(stationaryAccel, stationaryGyro), false);

    const worker = createMockWorker();
    const packet: RawPacket = {
      workerId: 'WORKER_01',
      event: 'NORMAL',
      gas: 310,
      imuState: 'STATIONARY',
      accel: stationaryAccel,
      gyro: stationaryGyro,
    };

    const res = processPacketAgainstWorker(worker, packet, 102000, '12:02:00');
    assert.equal(res.updatedWorker.state, 'NORMAL');
    assert.equal(res.updatedWorker.motionState, 'STATIONARY');
    assert.equal(res.shouldTriggerAlarm, false);
  });

  it('3. High impact spike triggers POSSIBLE_FALL and initiates immobility verification', () => {
    const worker = createMockWorker();
    const packet: RawPacket = {
      workerId: 'WORKER_01',
      event: 'POSSIBLE_FALL',
      gas: 310,
      imuState: 'POSSIBLE_FALL',
      accel: { x: 0.8, y: 2.5, z: -1.2 },
      gyro: { x: 150, y: -80, z: 45 },
    };

    const res = processPacketAgainstWorker(worker, packet, 103000, '12:03:00');
    assert.equal(res.updatedWorker.state, 'POSSIBLE_FALL');
    assert.equal(res.updatedWorker.manDownStep, 'IMMOBILITY_TIMER');
    assert.equal(res.shouldTriggerAlarm, true);
    assert.equal(res.alarmType, 'WARNING');

    const fallEvent = res.newEvents.find((e) => e.eventType === 'POSSIBLE_FALL');
    assert.ok(fallEvent, 'Must generate a POSSIBLE_FALL warning event');
    assert.equal(fallEvent.severity, 'WARNING');
  });

  it('4. False alarm recovery: worker gets back up before timeout, resetting to NORMAL', () => {
    const workerInFall = createMockWorker({
      state: 'POSSIBLE_FALL',
      manDownStep: 'IMMOBILITY_TIMER',
      immobilitySeconds: 4,
      fallDetectedTime: 103000,
    });

    const recoveryPacket: RawPacket = {
      workerId: 'WORKER_01',
      event: 'NORMAL',
      gas: 315,
      imuState: 'MOVING',
      accel: { x: -0.1, y: 0.98, z: 0.2 },
      gyro: { x: 14, y: 2, z: -5 },
    };

    const res = processPacketAgainstWorker(workerInFall, recoveryPacket, 107000, '12:03:07');
    assert.equal(res.updatedWorker.state, 'NORMAL');
    assert.equal(res.updatedWorker.manDownStep, 'NORMAL');
    assert.equal(res.updatedWorker.immobilitySeconds, 0);

    const recEvent = res.newEvents.find((e) => e.eventType === 'RECOVERY');
    assert.ok(recEvent, 'Must generate a RECOVERY event upon standing back up');
    assert.equal(res.alarmType, 'RECOVERY');
  });

  it('5. Sustained immobility confirms MAN_DOWN critical emergency', () => {
    const workerInFall = createMockWorker({
      state: 'POSSIBLE_FALL',
      manDownStep: 'IMMOBILITY_TIMER',
      immobilitySeconds: 9,
    });

    const manDownPacket: RawPacket = {
      workerId: 'WORKER_01',
      event: 'MAN_DOWN',
      gas: 318,
      imuState: 'IMMOBILE',
      accel: { x: 0.05, y: 0.08, z: 0.99 },
      gyro: { x: 0, y: 0, z: 0 },
    };

    const res = processPacketAgainstWorker(workerInFall, manDownPacket, 110000, '12:03:10');
    assert.equal(res.updatedWorker.state, 'MAN_DOWN');
    assert.equal(res.updatedWorker.manDownStep, 'MAN_DOWN');
    assert.equal(res.updatedWorker.motionState, 'IMMOBILE');
    assert.equal(res.updatedWorker.immobilitySeconds, DEFAULT_IMMOBILITY_TIMEOUT);
    assert.equal(res.shouldTriggerAlarm, true);
    assert.equal(res.alarmType, 'CRITICAL');

    const manDownEvt = res.newEvents.find((e) => e.eventType === 'MAN_DOWN');
    assert.ok(manDownEvt);
    assert.equal(manDownEvt.severity, 'CRITICAL');
  });

  it('6. Compound Hazard: Man-Down occurs simultaneously with toxic gas leak', () => {
    const worker = createMockWorker({
      state: 'MAN_DOWN',
      manDownStep: 'MAN_DOWN',
      motionState: 'IMMOBILE',
    });

    const compoundPacket: RawPacket = {
      workerId: 'WORKER_01',
      event: 'COMPOUND_HAZARD',
      gas: 780,
      imuState: 'IMMOBILE',
      accel: { x: 0.02, y: 0.05, z: 0.99 },
    };

    const res = processPacketAgainstWorker(worker, compoundPacket, 115000, '12:05:00');
    assert.equal(res.updatedWorker.state, 'COMPOUND_HAZARD');
    assert.equal(res.updatedWorker.gasState, 'HAZARD');
    assert.equal(res.shouldTriggerAlarm, true);
    assert.equal(res.alarmType, 'CRITICAL');

    const compoundEvt = res.newEvents.find((e) => e.eventType === 'COMPOUND_HAZARD');
    assert.ok(compoundEvt, 'Must identify extreme COMPOUND_HAZARD condition');
    assert.equal(compoundEvt.severity, 'CRITICAL');
  });

  it('7. Operator acknowledgement does NOT clear physical emergency state', () => {
    const worker = createMockWorker({
      state: 'MAN_DOWN',
      manDownStep: 'MAN_DOWN',
      isAcknowledged: true,
      acknowledgedBy: 'BASE_OPERATOR_1',
    });

    const packet: RawPacket = {
      workerId: 'WORKER_01',
      event: 'MAN_DOWN',
      gas: 312,
      imuState: 'IMMOBILE',
    };

    const res = processPacketAgainstWorker(worker, packet, 118000, '12:06:00');
    assert.equal(res.updatedWorker.state, 'MAN_DOWN');
    assert.notEqual(res.updatedWorker.state, 'NORMAL');
  });

  it('8. Vector magnitude calculates accurately across positive and negative axes', () => {
    const mag = vectorMagnitude({ x: -0.6, y: 0.8, z: 0 });
    assert.equal(Math.round(mag * 10) / 10, 1.0);
  });
});
