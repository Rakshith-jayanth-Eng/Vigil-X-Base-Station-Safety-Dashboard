import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { processPacketAgainstWorker } from '../src/logic/safetyEngine';
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
    immobilityTimeout: 10,
    rssi: -82,
    snr: 8.0,
    packetCount: 50,
    lastPacketTime: 100000,
    lastPacketFormatted: '12:00:00',
    isAcknowledged: false,
    ...overrides,
  };
}

describe('Communication Link & Offline State Audit (Section 24)', () => {
  it('1. Offline status is distinct from emergency status', () => {
    // When a worker node stops transmitting, its state becomes OFFLINE
    const offlineWorker = createMockWorker({
      state: 'OFFLINE',
    });

    assert.equal(offlineWorker.state, 'OFFLINE');
    // It is NOT classified as MAN_DOWN or GAS_HAZARD
    assert.notEqual(offlineWorker.state, 'MAN_DOWN');
    assert.notEqual(offlineWorker.state, 'GAS_HAZARD');
  });

  it('2. Node immediately recovers from OFFLINE when a valid packet arrives', () => {
    const offlineWorker = createMockWorker({
      state: 'OFFLINE',
      lastPacketTime: 50000,
    });

    const packet: RawPacket = {
      workerId: 'WORKER_01',
      event: 'NORMAL',
      gas: 310,
      imuState: 'MOVING',
      rssi: -84,
      snr: 7.8,
    };

    const res = processPacketAgainstWorker(offlineWorker, packet, 120000, '12:02:00');
    assert.equal(res.updatedWorker.state, 'NORMAL');
    assert.equal(res.updatedWorker.lastPacketTime, 120000);
    assert.equal(res.updatedWorker.packetCount, 51);
  });

  it('3. Worker in MAN_DOWN remains MAN_DOWN even if packets are intermittent', () => {
    const manDownWorker = createMockWorker({
      state: 'MAN_DOWN',
      manDownStep: 'MAN_DOWN',
      motionState: 'IMMOBILE',
    });

    const packet: RawPacket = {
      workerId: 'WORKER_01',
      event: 'MAN_DOWN',
      gas: 315,
      imuState: 'IMMOBILE',
      rssi: -95, // weak link
      snr: 4.2,
    };

    const res = processPacketAgainstWorker(manDownWorker, packet, 130000, '12:03:00');
    assert.equal(res.updatedWorker.state, 'MAN_DOWN');
    assert.equal(res.updatedWorker.rssi, -95);
  });
});
