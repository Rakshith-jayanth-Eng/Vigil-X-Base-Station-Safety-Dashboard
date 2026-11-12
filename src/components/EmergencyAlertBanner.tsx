import React, { useEffect } from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  AlertTriangle,
  Flame,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  VolumeX,
  Volume2,
} from 'lucide-react';
import { KNOWN_HAZARDOUS_GASES } from '../services/pubchemService';

export const EmergencyAlertBanner: React.FC = () => {
  const {
    criticalAlerts,
    acknowledgeAlert,
    requestResetWorker,
    setSelectedWorkerId,
    snoozeActiveAlarm,
    cancelAlarmSnooze,
    snoozeRemaining,
  } = useSafetySystem();

  // Keyboard shortcut listener: Space to acknowledge first alert, Esc to snooze
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input or textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.code === 'Space' && criticalAlerts.length > 0) {
        const unacked = criticalAlerts.find((a) => !a.worker.isAcknowledged);
        if (unacked) {
          e.preventDefault();
          acknowledgeAlert(unacked.worker.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [criticalAlerts, acknowledgeAlert]);

  if (criticalAlerts.length === 0) return null;

  return (
    <div
      role="region"
      aria-live="assertive"
      aria-label="Mission Critical Safety Alerts"
      className="bg-[#0b0709] border-b-2 border-rose-600 divide-y divide-rose-950/60 select-none"
    >
      {criticalAlerts.map(({ worker, reason, eventType, time }) => {
        const isCompound = eventType === 'COMPOUND_HAZARD';
        const isManDown = eventType === 'MAN_DOWN' || isCompound;
        const isGas = eventType === 'GAS_HAZARD' || isCompound;
        const isPossibleFall = eventType === 'POSSIBLE_FALL';
        const isWarning = isPossibleFall;

        const bannerBg = isCompound
          ? 'bg-rose-950/90 border-l-4 border-l-amber-400'
          : isWarning
          ? 'bg-amber-950/50 border-l-4 border-l-amber-500'
          : 'bg-rose-950/70 border-l-4 border-l-rose-500';

        const defaultGasProfile = isGas ? KNOWN_HAZARDOUS_GASES.CH4 : null;

        return (
          <div
            key={worker.id}
            className={`px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${bannerBg} transition-colors`}
          >
            {/* Left alert summary */}
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded mt-0.5 shrink-0 ${
                  isCompound
                    ? 'bg-rose-600/30 text-rose-300'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {isCompound ? (
                  <div className="flex items-center gap-1">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <Flame className="w-4 h-4 text-amber-400" />
                  </div>
                ) : isGas ? (
                  <Flame className="w-5 h-5" />
                ) : isManDown ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[11px] font-mono font-bold tracking-wider px-2 py-0.5 rounded ${
                      isCompound
                        ? 'bg-red-700 text-amber-200'
                        : isWarning
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {isWarning ? 'WARNING' : 'CRITICAL ALERT'}
                  </span>
                  <span className="font-mono font-bold text-white text-sm sm:text-base tracking-wide">
                    {worker.id} ({worker.displayName.split(' - ')[0]}) — {eventType.replace('_', ' ')}
                  </span>
                  {worker.isAcknowledged ? (
                    <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      OPERATOR ACKNOWLEDGED
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-amber-400/90 font-medium">
                      Press [Space] to Acknowledge
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-slate-100 mt-1 font-medium">
                  {reason}
                </p>

                {/* Structured Protocol Guidance for Gas Hazards */}
                {isGas && defaultGasProfile && (
                  <div className="mt-2 text-xs font-mono bg-slate-900/80 border border-rose-900/60 p-2 rounded max-w-2xl text-slate-300 space-y-1">
                    <div className="flex items-center gap-2 text-amber-300 font-bold">
                      <span>RESPIRATORY PPE:</span>
                      <span className="text-slate-200 font-normal">{defaultGasProfile.responseProtocol.ppeLevel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-rose-300 font-bold">
                      <span>EVACUATION RADIUS:</span>
                      <span className="text-slate-200 font-normal">{defaultGasProfile.responseProtocol.evacuationRadius}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs font-mono text-slate-400 mt-2 flex-wrap">
                  <span>
                    Detected: <strong className="text-slate-200">{time}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Last LoRa Packet: <strong className="text-slate-200">{worker.lastPacketFormatted}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Zone: <strong className="text-slate-200">{worker.assignedZone}</strong>
                  </span>
                  {isGas && (
                    <>
                      <span>·</span>
                      <span>
                        MQ-2 Sensor ADC: <strong className="text-rose-400">{worker.gasValue}</strong> (Threshold: {worker.gasThreshold})
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

            {/* Action buttons */}
            <div className="flex items-center gap-2 self-start lg:self-center flex-wrap shrink-0">
              {/* Snooze 60s Control */}
              {snoozeRemaining > 0 ? (
                <button
                  onClick={cancelAlarmSnooze}
                  className="px-3 py-1.5 rounded bg-amber-500/20 border border-amber-500 text-amber-300 hover:bg-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors"
                  title="Click to resume audio alarm immediately"
                >
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  SNOOZED ({snoozeRemaining}s)
                </button>
              ) : (
                <button
                  onClick={() => snoozeActiveAlarm(60)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
                  title="Snooze audio alert for 60 seconds with auto-rearm"
                >
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  SNOOZE 60s
                </button>
              )}

              {!worker.isAcknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(worker.id)}
                  className="px-3.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACKNOWLEDGE
                </button>
              ) : (
                <span className="text-xs text-amber-300/80 font-mono italic px-1">
                  (Acknowledged)
                </span>
              )}

              <button
                onClick={() => setSelectedWorkerId(worker.id)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                INSPECT
              </button>

              <button
                onClick={() => requestResetWorker(worker.id)}
                title="Prototype Controlled Reset"
                className="px-2.5 py-1.5 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-xs font-mono border border-rose-800/60 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                RESET
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
