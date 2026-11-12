import React from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

export const ConfirmResetModal: React.FC = () => {
  const {
    pendingResetWorkerId,
    cancelResetModal,
    confirmResetWorker,
    workers,
  } = useSafetySystem();

  if (!pendingResetWorkerId) return null;

  const worker = workers.find((w) => w.id === pendingResetWorkerId);
  if (!worker) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#121927] border border-amber-600/70 rounded-xl w-full max-w-md p-5 shadow-2xl text-slate-100 font-mono animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-3 text-amber-400">
          <div className="p-2 rounded bg-amber-500/20 border border-amber-500/40">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              CONFIRM EMERGENCY RESET
            </h3>
            <span className="text-xs text-amber-400/90">
              Prototype Testing Override
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed font-sans mb-4">
          Are you sure you want to manually reset this alert?
          <br />
          <span className="text-slate-400 text-[11px] block mt-1">
            *In production, emergency states should clear when sensor telemetry confirms recovery. This manual override is provided specifically for testing the hackathon prototype.
          </span>
        </p>

        <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs space-y-1.5 mb-5">
          <div className="flex justify-between">
            <span className="text-slate-500">Target Worker:</span>
            <strong className="text-slate-200">{worker.id} ({worker.displayName.split(' - ')[0]})</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Active Alert:</span>
            <strong className="text-rose-400">{worker.state.replace('_', ' ')}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Gas ADC:</span>
            <span className="text-slate-300">{worker.gasValue}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Motion State:</span>
            <span className="text-slate-300">{worker.motionState}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={cancelResetModal}
            className="px-3.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => confirmResetWorker(worker.id)}
            className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CONFIRM RESET
          </button>
        </div>
      </div>
    </div>
  );
};
