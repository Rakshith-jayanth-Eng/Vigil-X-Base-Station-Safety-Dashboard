import React from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import { Users, AlertOctagon, Flame, ShieldCheck, Radio, ShieldAlert } from 'lucide-react';

export const SummaryCards: React.FC = () => {
  const { workers, baseStation, criticalAlerts } = useSafetySystem();

  // Metrics computation
  const totalWorkers = workers.length;
  const activeAlertsCount = criticalAlerts.length;

  const gasHazardWorkers = workers.filter((w) => w.gasState === 'HAZARD');
  const gasStatusText = gasHazardWorkers.length > 0 ? `HAZARD (${gasHazardWorkers.length})` : 'SAFE';
  const gasIsHazard = gasHazardWorkers.length > 0;

  const compoundWorkers = workers.filter((w) => w.state === 'COMPOUND_HAZARD');
  const manDownWorkers = workers.filter((w) => w.state === 'MAN_DOWN' || w.state === 'COMPOUND_HAZARD');
  const possibleFallWorkers = workers.filter((w) => w.state === 'POSSIBLE_FALL');
  let manDownStatusText = 'NORMAL';
  let manDownColor = 'text-emerald-400';

  if (compoundWorkers.length > 0) {
    manDownStatusText = `DUAL HAZARD (${compoundWorkers.length})`;
    manDownColor = 'text-rose-400';
  } else if (manDownWorkers.length > 0) {
    manDownStatusText = `MAN DOWN (${manDownWorkers.length})`;
    manDownColor = 'text-rose-400';
  } else if (possibleFallWorkers.length > 0) {
    manDownStatusText = `VERIFYING FALL (${possibleFallWorkers.length})`;
    manDownColor = 'text-amber-400';
  }

  // Average RSSI
  const activeWorkersWithSignal = workers.filter((w) => w.state !== 'OFFLINE');
  const avgRssi = activeWorkersWithSignal.length > 0
    ? Math.round(activeWorkersWithSignal.reduce((sum, w) => sum + w.rssi, 0) / activeWorkersWithSignal.length)
    : -85;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* 1. WORKERS */}
      <div className="bg-[#0f1728] border border-slate-800 p-3.5 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>WORKERS</span>
          <Users className="w-4 h-4 text-slate-500" />
        </div>
        <div className="my-1.5">
          <div className="text-2xl font-mono font-black text-white">
            {totalWorkers}
          </div>
          <div className="text-xs text-slate-300 font-medium">
            Monitored in tunnels
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {workers.filter((w) => w.state !== 'OFFLINE').length} Online · {workers.filter((w) => w.state === 'OFFLINE').length} Offline
        </div>
      </div>

      {/* 2. ACTIVE ALERTS */}
      <div
        className={`border p-3.5 rounded-lg flex flex-col justify-between transition-colors ${
          activeAlertsCount > 0
            ? 'bg-rose-950/30 border-rose-800/80'
            : 'bg-[#0f1728] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>ACTIVE ALERTS</span>
          <AlertOctagon
            className={`w-4 h-4 ${activeAlertsCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}
          />
        </div>
        <div className="my-1.5">
          <div
            className={`text-2xl font-mono font-black ${
              activeAlertsCount > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {activeAlertsCount}
          </div>
          <div className="text-xs font-medium">
            {activeAlertsCount > 0 ? (
              <span className="text-rose-300">Requires rescue attention!</span>
            ) : (
              <span className="text-emerald-300">All workers safe</span>
            )}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {workers.filter((w) => w.isAcknowledged).length} Operator Acknowledged
        </div>
      </div>

      {/* 3. GAS STATUS */}
      <div
        className={`border p-3.5 rounded-lg flex flex-col justify-between transition-colors ${
          gasIsHazard ? 'bg-rose-950/30 border-rose-800/80' : 'bg-[#0f1728] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>GAS AIR STATUS</span>
          <Flame
            className={`w-4 h-4 ${gasIsHazard ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`}
          />
        </div>
        <div className="my-1.5">
          <div
            className={`text-2xl font-mono font-black ${
              gasIsHazard ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {gasStatusText}
          </div>
          <div className="text-xs font-medium">
            {gasIsHazard ? (
              <span className="text-rose-300">Toxic gas leak detected</span>
            ) : (
              <span className="text-slate-300">Clean breathable air (Safe &lt;500)</span>
            )}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Max: {Math.max(...workers.map((w) => w.gasValue))} ADC (limit: 500)
        </div>
      </div>

      {/* 4. MAN-DOWN STATUS */}
      <div
        className={`border p-3.5 rounded-lg flex flex-col justify-between transition-colors ${
          manDownWorkers.length > 0
            ? 'bg-rose-950/30 border-rose-800/80'
            : possibleFallWorkers.length > 0
            ? 'bg-amber-950/30 border-amber-800/80'
            : 'bg-[#0f1728] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>MAN-DOWN STATUS</span>
          {manDownWorkers.length > 0 ? (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          )}
        </div>
        <div className="my-1.5">
          <div className={`text-xl font-mono font-black ${manDownColor}`}>
            {manDownStatusText}
          </div>
          <div className="text-xs font-medium">
            {manDownWorkers.length > 0 ? (
              <span className="text-rose-300">Worker fallen & unconscious</span>
            ) : possibleFallWorkers.length > 0 ? (
              <span className="text-amber-300">Checking for movement (10s)</span>
            ) : (
              <span className="text-slate-300">Workers moving & upright</span>
            )}
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          MPU6050 10s immobility verification
        </div>
      </div>

      {/* 5. LORA STATUS */}
      <div className="bg-[#0f1728] border border-slate-800 p-3.5 rounded-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
          <span>LORA WIRELESS</span>
          <Radio className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="my-1.5">
          <div
            className={`text-2xl font-mono font-black ${
              baseStation.loraLinkConnected && baseStation.isOnline
                ? 'text-cyan-400'
                : 'text-amber-400'
            }`}
          >
            {baseStation.loraLinkConnected && baseStation.isOnline ? 'CONNECTED' : 'STANDBY'}
          </div>
          <div className="text-xs text-slate-300 font-medium">
            Radio link (No WiFi / Cell needed)
          </div>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          433MHz · Avg RSSI: {avgRssi} dBm
        </div>
      </div>
    </div>
  );
};
