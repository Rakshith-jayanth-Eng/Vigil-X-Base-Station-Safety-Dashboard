import React from 'react';
import { WorkerNode } from '../types';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Activity,
  Battery,
  Clock,
  Eye,
  RotateCcw,
} from 'lucide-react';

interface WorkerCardProps {
  worker: WorkerNode;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({ worker }) => {
  const {
    setSelectedWorkerId,
    acknowledgeAlert,
    requestResetWorker,
    simulateScenario,
  } = useSafetySystem();

  const isCritical = ['MAN_DOWN', 'GAS_HAZARD', 'COMPOUND_HAZARD'].includes(worker.state);
  const isWarning = ['POSSIBLE_FALL', 'WARNING'].includes(worker.state);

  // Card border & background styling based on state
  let cardBorder = 'border-slate-800 bg-[#0e1626]';
  let statusBadgeBg = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/50';
  let statusLabel = 'SAFE & ACTIVE';
  let plainSubtitle = 'Normal movement & clean air';
  let StatusIcon = CheckCircle2;

  if (worker.state === 'COMPOUND_HAZARD') {
    cardBorder = 'border-rose-500 bg-[#1e0a12] shadow-lg shadow-rose-950/70 ring-1 ring-amber-500/50';
    statusBadgeBg = 'bg-rose-600 text-amber-200 animate-pulse font-bold';
    statusLabel = 'DUAL: FALL + GAS';
    plainSubtitle = 'CRITICAL: Worker unconscious in toxic atmosphere!';
    StatusIcon = ShieldAlert;
  } else if (worker.state === 'MAN_DOWN') {
    cardBorder = 'border-rose-600/90 bg-[#170e14] shadow-md shadow-rose-950/50';
    statusBadgeBg = 'bg-rose-600 text-white animate-pulse';
    statusLabel = 'MAN DOWN';
    plainSubtitle = 'Worker fallen & immobile underground';
    StatusIcon = ShieldAlert;
  } else if (worker.state === 'GAS_HAZARD') {
    cardBorder = 'border-rose-600/90 bg-[#170e14] shadow-md shadow-rose-950/50';
    statusBadgeBg = 'bg-rose-600 text-white animate-pulse';
    statusLabel = 'GAS HAZARD';
    plainSubtitle = 'Toxic gas reading exceeded threshold';
    StatusIcon = Flame;
  } else if (worker.state === 'POSSIBLE_FALL') {
    cardBorder = 'border-amber-500/80 bg-[#17140e]';
    statusBadgeBg = 'bg-amber-500 text-slate-950 font-bold';
    statusLabel = 'POSSIBLE FALL';
    plainSubtitle = 'Monitoring immobility verification timer';
    StatusIcon = AlertTriangle;
  } else if (worker.state === 'WARNING') {
    cardBorder = 'border-amber-600/60 bg-[#17140e]';
    statusBadgeBg = 'bg-amber-950/80 text-amber-400 border-amber-700/50';
    statusLabel = 'ABNORMAL';
    plainSubtitle = 'Unusual impact motion detected';
    StatusIcon = AlertTriangle;
  } else if (worker.state === 'OFFLINE') {
    cardBorder = 'border-slate-800 bg-[#0b101a] opacity-80';
    statusBadgeBg = 'bg-slate-800 text-slate-400 border-slate-700';
    statusLabel = 'NO SIGNAL';
    plainSubtitle = 'Radio carrier lost (out of range/tunnel)';
    StatusIcon = WifiOff;
  }

  // Gas percentage against standard 1023 ADC range
  const gasPercent = Math.min(100, Math.round((worker.gasValue / 1023) * 100));
  const gasThresholdPercent = Math.round((worker.gasThreshold / 1023) * 100);
  const secondsSincePacket = Math.max(0, Math.round((Date.now() - worker.lastPacketTime) / 1000));

  // Generate SVG Sparkline Points from rolling history
  const history = worker.telemetryHistory || [];
  const sparklinePoints = React.useMemo(() => {
    if (history.length < 2) return '';
    const maxVal = 1023;
    const width = 180;
    const height = 30;
    const step = width / (history.length - 1);

    return history
      .map((p, idx) => {
        const x = idx * step;
        const normalized = Math.min(1, Math.max(0, p.gasValue / maxVal));
        const y = height - normalized * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [history]);

  return (
    <div
      className={`border rounded-lg p-4 flex flex-col justify-between transition-all select-none ${cardBorder}`}
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-white text-base tracking-wide">
                {worker.id}
              </span>
              <span className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                {worker.assignedZone}
              </span>
            </div>
            <div className="text-xs text-slate-300 font-medium">
              {worker.displayName.split(' - ')[1] || worker.displayName}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {plainSubtitle}
            </div>
          </div>

          <div
            className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${statusBadgeBg}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{statusLabel}</span>
          </div>
        </div>

        {/* Immobility countdown during possible fall */}
        {worker.state === 'POSSIBLE_FALL' && (
          <div className="my-2 p-2 rounded bg-amber-950/40 border border-amber-600/40 text-xs font-mono">
            <div className="flex justify-between text-amber-300 mb-1">
              <span>MAN-DOWN VERIFICATION</span>
              <span className="font-bold">
                {(worker.immobilityTimeout - worker.immobilitySeconds).toFixed(1)}s / {worker.immobilityTimeout}s
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (worker.immobilitySeconds / worker.immobilityTimeout) * 100)}%`,
                }}
              />
            </div>
            <div className="text-[10px] text-amber-400/80 mt-1">
              Monitoring worker movement · Confirmed if immobile
            </div>
          </div>
        )}

        {/* Operator Acknowledgement Tag */}
        {worker.isAcknowledged && (
          <div className="my-1.5 px-2 py-1 rounded bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-between text-[11px] font-mono text-emerald-300">
            <span className="flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              ACKNOWLEDGED BY OPERATOR
            </span>
            <span className="text-emerald-400/70 text-[10px]">{worker.acknowledgedAt}</span>
          </div>
        )}

        {/* Mini Sparkline Trend Chart */}
        {sparklinePoints && (
          <div className="my-2 py-1.5 px-2 bg-slate-900/60 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
              <span>60s Gas Telemetry Trend</span>
              <span className="text-slate-300">
                Peak: <strong className="text-slate-100">{worker.peakGasValue ?? worker.gasValue}</strong> · TWA: <strong className="text-slate-100">{worker.twaGasValue ?? worker.gasValue}</strong>
              </span>
            </div>
            <svg className="w-full h-7 overflow-visible" viewBox="0 0 180 30" preserveAspectRatio="none">
              <polyline
                fill="none"
                stroke={worker.gasState === 'HAZARD' ? '#f43f5e' : '#06b6d4'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklinePoints}
              />
            </svg>
          </div>
        )}

        {/* Sensor Telemetry Rows */}
        <div className="space-y-2 mt-2 pt-2 border-t border-slate-800/80 font-mono text-xs">
          {/* Gas Sensor */}
          <div>
            <div className="flex justify-between items-center text-slate-300 mb-1">
              <span className="text-slate-400 flex items-center gap-1">
                Gas: <strong className={worker.gasSensorFault ? 'text-amber-400' : worker.gasState === 'HAZARD' ? 'text-rose-400' : 'text-slate-200'}>
                  {worker.gasSensorFault ? 'FAULT / N/A' : isNaN(worker.gasValue) ? 'N/A' : worker.gasValue}
                </strong>
              </span>
              <span className="text-[10px] text-slate-500">
                Thresh: {worker.gasThreshold}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
                style={{ left: `${gasThresholdPercent}%` }}
                title={`Threshold: ${worker.gasThreshold}`}
              />
              <div
                className={`h-full transition-all duration-300 ${
                  worker.gasSensorFault ? 'bg-amber-500' : worker.gasState === 'HAZARD' ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${worker.gasSensorFault ? 100 : gasPercent}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex justify-between">
              <span>{worker.gasSensorFault ? '⚠️ Sensor Disconnected' : 'MQ-2 raw ADC (0-1023)'}</span>
              <span className={worker.gasSensorFault ? 'text-amber-400 font-bold' : worker.gasState === 'HAZARD' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {worker.gasSensorFault ? 'FAULT' : worker.gasState}
              </span>
            </div>
          </div>

          {/* Motion State */}
          <div className="flex items-center justify-between py-1 bg-slate-900/40 px-2 rounded">
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              Motion:
            </span>
            <span
              className={`font-semibold ${
                worker.motionState === 'IMMOBILE'
                  ? 'text-rose-400'
                  : worker.motionState === 'POSSIBLE_FALL'
                  ? 'text-amber-400'
                  : 'text-slate-200'
              }`}
            >
              {worker.motionState}
            </span>
          </div>

          {/* Battery & Signal */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-0.5">
            <div className="flex items-center gap-1">
              <Battery className="w-3 h-3 text-slate-500" />
              <span>
                {worker.batteryMv ? `${(worker.batteryMv / 1000).toFixed(2)}V` : '3.82V'}
              </span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <span>LoRa:</span>
              <span className="text-slate-300 font-semibold">{worker.rssi} dBm</span>
            </div>
          </div>

          {/* Last Packet Timestamp */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last packet:
            </span>
            <span className="text-slate-300">
              {worker.lastPacketFormatted} ({secondsSincePacket}s ago)
            </span>
          </div>
        </div>

        {/* 1-Click Simulation Shortcuts */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">Quick Test:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => simulateScenario('possible_fall', worker.id)}
              title="Test Fall Detection on this worker"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px]"
            >
              Fall
            </button>
            <button
              onClick={() => simulateScenario('gas_hazard', worker.id)}
              title="Test Gas Hazard on this worker"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 text-[10px]"
            >
              Gas
            </button>
            <button
              onClick={() => simulateScenario('recovery', worker.id)}
              title="Reset worker to safe normal state"
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 text-[10px]"
            >
              Safe
            </button>
          </div>
        </div>
      </div>

      {/* Action Footer Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={() => setSelectedWorkerId(worker.id)}
          className="flex-1 py-1.5 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-colors border border-slate-700 flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          DETAILS
        </button>

        {isCritical || isWarning ? (
          !worker.isAcknowledged ? (
            <button
              onClick={() => acknowledgeAlert(worker.id)}
              className="py-1.5 px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm flex items-center gap-1 shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              ACKNOWLEDGE
            </button>
          ) : (
            <button
              onClick={() => requestResetWorker(worker.id)}
              title="Reset alert for prototype demonstration"
              className="py-1.5 px-2.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs font-mono transition-colors border border-rose-800/50 flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              RESET
            </button>
          )
        ) : (
          <button
            onClick={() => setSelectedWorkerId(worker.id)}
            className="py-1.5 px-2 rounded text-slate-500 hover:text-slate-300 text-xs font-mono transition-colors"
          >
            TELEMETRY
          </button>
        )}
      </div>
    </div>
  );
};
