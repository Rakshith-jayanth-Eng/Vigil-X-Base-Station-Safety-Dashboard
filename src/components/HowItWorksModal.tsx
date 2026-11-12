import React from 'react';
import { X, ShieldCheck, Radio, AlertTriangle, Cpu, Activity, Flame, CheckCircle2 } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartScenario?: (scenario: 'man_down' | 'gas_hazard') => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
  onStartScenario,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      <div className="bg-[#0e1626] border border-amber-500/50 rounded-xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Header */}
        <div className="px-5 py-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold font-mono text-sm">
              ?
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                How Vigil-X Works (In Plain English)
              </h2>
              <p className="text-xs text-slate-400">
                Understand the hardware, emergency pipeline, and numbers in 60 seconds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-300 text-xs sm:text-sm">
          {/* 1. The Core Problem & Solution */}
          <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800">
            <h3 className="font-bold text-amber-400 text-sm flex items-center gap-2 mb-2">
              <ShieldCheck className="w-4 h-4" />
              1. Why was Vigil-X built?
            </h3>
            <p className="leading-relaxed text-slate-300">
              When workers go underground into <strong>sewers, tunnels, mines, or confined storage tanks</strong>, regular cell phone signals (4G/5G) and Wi-Fi cannot penetrate solid ground and concrete. If a worker faints from gas or falls, nobody on the surface knows until it is too late.
            </p>
            <p className="mt-2 text-slate-400">
              <strong>The Solution:</strong> Vigil-X uses long-range <strong>LoRa 433MHz radio waves</strong> that punch straight through concrete and rock without needing the internet or cell towers.
            </p>
          </div>

          {/* 2. The Physical Pipeline */}
          <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800">
            <h3 className="font-bold text-cyan-400 text-sm flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4" />
              2. How Does an Emergency Alert Travel?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">Step 1: Sensors</span>
                <span className="text-slate-400">
                  Worker wears an <strong>MQ-2 gas sensor</strong> and <strong>MPU6050 motion sensor</strong>.
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">Step 2: Arduino</span>
                <span className="text-slate-400">
                  An <strong>Arduino Uno</strong> constantly checks if gas exceeds safe limits or if the worker fell.
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">Step 3: LoRa Radio</span>
                <span className="text-slate-400">
                  An <strong>SX1278 module</strong> beams the alert wirelessly to the surface base station.
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-rose-400 font-bold block mb-1">Step 4: Dashboard</span>
                <span className="text-slate-400">
                  This base-station screen flashes red, sounds the alarm, and warns the rescue operator.
                </span>
              </div>
            </div>
          </div>

          {/* 3. Plain English Cheat Sheet */}
          <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-800">
            <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4" />
              3. Cheat Sheet: What do the Numbers Mean?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Gas Sensor Value (0 to 1023)
                </div>
                <p className="text-slate-400 leading-snug">
                  • <strong>Under 500:</strong> Clean, breathable air (SAFE)<br />
                  • <strong>Over 500:</strong> Dangerous gas or smoke detected (HAZARD)
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Man-Down State Machine
                </div>
                <p className="text-slate-400 leading-snug">
                  • <strong>Normal:</strong> Worker is moving and active.<br />
                  • <strong>Possible Fall:</strong> Hard drop detected. System waits 10 seconds.<br />
                  • <strong>Man Down:</strong> Worker hasn't moved in 10s — unconscious!
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  LoRa Signal (RSSI)
                </div>
                <p className="text-slate-400 leading-snug">
                  • <strong>-70 to -85 dBm:</strong> Strong wireless connection.<br />
                  • <strong>Under -100 dBm:</strong> Weak signal through thick concrete.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded border border-slate-800/80">
                <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  "Acknowledge" vs "Safe"
                </div>
                <p className="text-slate-400 leading-snug">
                  Clicking <strong>Acknowledge</strong> silences the siren and logs that the operator is responding. It does <em>not</em> pretend the worker is safe until sensor telemetry proves they are up!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with instant trial buttons */}
        <div className="px-5 py-3.5 bg-[#0a101d] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400 font-mono">
            Want to see an emergency in action right now?
          </span>

          <div className="flex items-center gap-2">
            {onStartScenario && (
              <>
                <button
                  onClick={() => {
                    onStartScenario('gas_hazard');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center gap-1"
                >
                  <Flame className="w-3.5 h-3.5" />
                  Try Gas Leak Demo
                </button>
                <button
                  onClick={() => {
                    onStartScenario('man_down');
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Try Fall & Man-Down Demo
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
