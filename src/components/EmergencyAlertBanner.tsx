import React from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle2, RotateCcw, ExternalLink } from 'lucide-react';

export const EmergencyAlertBanner: React.FC = () => {
  const {
    criticalAlerts,
    acknowledgeAlert,
    requestResetWorker,
    setSelectedWorkerId,
  } = useSafetySystem();

  if (criticalAlerts.length === 0) return null;

  return (
    <div className="bg-[#140b0f] border-b-2 border-rose-600/90 divide-y divide-rose-900/40 select-none">
      {criticalAlerts.map(({ worker, reason, eventType, time }) => {
        const isCompound = eventType === 'COMPOUND_HAZARD';
        const isManDown = eventType === 'MAN_DOWN' || isCompound;
        const isGas = eventType === 'GAS_HAZARD' || isCompound;
        const isPossibleFall = eventType === 'POSSIBLE_FALL';

        const isWarning = isPossibleFall;
        const bannerBg = isCompound
          ? 'bg-rose-950/80 border-rose-500 ring-1 ring-amber-500'
          : isWarning
          ? 'bg-amber-950/40 border-amber-500'
          : 'bg-rose-950/60 border-rose-500';
        const badgeColor = isCompound
          ? 'bg-red-700 text-amber-200 animate-pulse font-black'
          : isWarning
          ? 'bg-amber-500 text-slate-950'
          : 'bg-rose-600 text-white';

        return (
          <div
            key={worker.id}
            className={`px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 ${bannerBg} transition-colors`}
          >
            {/* Left alert summary */}
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded mt-0.5 ${
                  isCompound
                    ? 'bg-rose-600/30 text-rose-300'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {isCompound ? (
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="w-5 h-5 animate-bounce text-rose-400" />
                    <Flame className="w-4 h-4 animate-pulse text-amber-400" />
                  </div>
                ) : isGas ? (
                  <Flame className="w-5 h-5 animate-pulse" />
                ) : isManDown ? (
                  <ShieldAlert className="w-5 h-5 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-mono font-black tracking-wider px-2 py-0.5 rounded ${badgeColor}`}
                  >
                    {isWarning ? '⚠️ WARNING' : '🚨 CRITICAL ALERT'}
                  </span>
                  <span className="font-mono font-bold text-white text-sm sm:text-base tracking-wide">
                    {worker.id} ({worker.displayName.split(' - ')[0]}) — {eventType.replace('_', ' ')}
                  </span>
                  {worker.isAcknowledged && (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      ACKNOWLEDGED BY OPERATOR
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium">
                  {reason}
                </p>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400 mt-1 flex-wrap">
                  <span>
                    Detected: <strong className="text-slate-200">{time}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    LoRa packet received: <strong className="text-slate-200">{worker.lastPacketFormatted}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Zone: <strong className="text-slate-200">{worker.assignedZone}</strong>
                  </span>
                  {isGas && (
                    <>
                      <span>·</span>
                      <span>
                        Sensor: <strong className="text-rose-400">{worker.gasValue}</strong> / Threshold:{' '}
                        <strong className="text-slate-300">{worker.gasThreshold}</strong>
                      </span>
                    </>
                  )}
                  {isPossibleFall && (
                    <>
                      <span>·</span>
                      <span className="text-amber-300 font-semibold">
                        Immobility timer: {(worker.immobilityTimeout - worker.immobilitySeconds).toFixed(1)}s remaining
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right buttons */}
            <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
              {!worker.isAcknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(worker.id)}
                  className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACKNOWLEDGE
                </button>
              ) : (
                <span className="text-xs text-amber-300/80 font-mono italic px-2">
                  (Operator Ack · Worker Still in Hazard)
                </span>
              )}

              <button
                onClick={() => setSelectedWorkerId(worker.id)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                VIEW WORKER
              </button>

              <button
                onClick={() => requestResetWorker(worker.id)}
                title="Prototype Controlled Reset"
                className="px-2.5 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-mono border border-rose-800/60 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                RESET ALERT
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
