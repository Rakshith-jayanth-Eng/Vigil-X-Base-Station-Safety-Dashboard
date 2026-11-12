import React, { useState, useEffect } from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  X,
  Radio,
  Flame,
  Activity,
  CheckCircle2,
  RotateCcw,
  Sliders,
  MapPin,
  Layers,
  FlaskConical,
  ShieldAlert,
  AlertCircle,
  HeartPulse,
} from 'lucide-react';
import {
  KNOWN_HAZARDOUS_GASES,
  ChemicalGasProfile,
  fetchPubChemCompoundByCid,
} from '../services/pubchemService';

export const WorkerDetailModal: React.FC = () => {
  const {
    selectedWorkerId,
    setSelectedWorkerId,
    workers,
    acknowledgeAlert,
    requestResetWorker,
    simulateScenario,
    updateWorkerThreshold,
  } = useSafetySystem();

  const [selectedGasKey, setSelectedGasKey] = useState<string>('CH4');
  const [pubchemData, setPubchemData] = useState<Partial<ChemicalGasProfile> | null>(null);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'toxicology'>('telemetry');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedWorkerId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedWorkerId]);

  // Load PubChem compound details when gas key changes
  useEffect(() => {
    const profile = KNOWN_HAZARDOUS_GASES[selectedGasKey];
    if (profile?.cid) {
      fetchPubChemCompoundByCid(profile.cid).then((res) => {
        if (res) setPubchemData(res);
      });
    }
  }, [selectedGasKey]);

  if (!selectedWorkerId) return null;

  const worker = workers.find((w) => w.id === selectedWorkerId);
  if (!worker) return null;

  const isCritical = ['MAN_DOWN', 'GAS_HAZARD', 'COMPOUND_HAZARD'].includes(worker.state);
  const isWarning = ['POSSIBLE_FALL', 'WARNING'].includes(worker.state);
  const isOffline = worker.state === 'OFFLINE';

  const gasPercent = Math.min(100, Math.round(((isNaN(worker.gasValue) ? 0 : worker.gasValue) / 1023) * 100));
  const gasThresholdPercent = Math.round((worker.gasThreshold / 1023) * 100);

  // Tilt computation from Accel
  const pitchDeg = Math.round(
    Math.atan2(worker.accel.y, Math.sqrt(worker.accel.x * worker.accel.x + worker.accel.z * worker.accel.z)) *
      (180 / Math.PI)
  );
  const rollDeg = Math.round(Math.atan2(-worker.accel.x, worker.accel.z) * (180 / Math.PI));

  const activeChemical = KNOWN_HAZARDOUS_GASES[selectedGasKey] || KNOWN_HAZARDOUS_GASES.CH4;

  // Generate SVG Sparkline Points from rolling history
  const history = worker.telemetryHistory || [];
  const sparklinePoints = history.length > 1
    ? history
        .map((p, idx) => {
          const x = (idx / (history.length - 1)) * 400;
          const y = 60 - Math.min(1, Math.max(0, p.gasValue / 1023)) * 60;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' ')
    : '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="worker-modal-title"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none"
    >
      <div className="bg-[#0e1626] border border-slate-700/80 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
              {worker.id.replace('WORKER_', 'W')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="worker-modal-title" className="text-lg font-mono font-bold text-white tracking-wide">
                  {worker.id}
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  ({worker.displayName})
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                    worker.state === 'COMPOUND_HAZARD'
                      ? 'bg-rose-950 text-amber-300 border-amber-500 animate-pulse font-black'
                      : worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD'
                      ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                      : worker.state === 'POSSIBLE_FALL'
                      ? 'bg-amber-950 text-amber-300 border-amber-600'
                      : worker.state === 'OFFLINE'
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {worker.state.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Assigned Zone: <span className="text-slate-200">{worker.assignedZone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Tabs */}
            <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1 rounded transition-colors ${
                  activeTab === 'telemetry' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Telemetry & IMU
              </button>
              <button
                onClick={() => setActiveTab('toxicology')}
                className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
                  activeTab === 'toxicology' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FlaskConical className="w-3 h-3" />
                PubChem Toxicology
              </button>
            </div>

            {isCritical || isWarning ? (
              !worker.isAcknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(worker.id)}
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACKNOWLEDGE
                </button>
              ) : (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-800/60">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACKNOWLEDGED
                </span>
              )
            ) : null}

            <button
              onClick={() => setSelectedWorkerId(null)}
              aria-label="Close dialog"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-200">
          {activeTab === 'toxicology' ? (
            /* Toxicology Intelligence View */
            <div className="space-y-4 font-mono">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-amber-400" />
                  <h3 className="font-bold text-sm text-white">
                    PUBCHEM CHEMICAL INTELLIGENCE & DISPATCH ADVISORY
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400">Target Gas:</span>
                  <select
                    value={selectedGasKey}
                    onChange={(e) => setSelectedGasKey(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-amber-300 text-xs px-2 py-1 rounded focus:outline-hidden"
                  >
                    {Object.entries(KNOWN_HAZARDOUS_GASES).map(([k, g]) => (
                      <option key={k} value={k}>
                        {g.name} ({g.chemicalFormula})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chemical Summary Card */}
              <div className="bg-[#0a101d] border border-slate-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-white">{activeChemical.name}</span>
                    <span className="text-amber-400 font-bold">{activeChemical.chemicalFormula}</span>
                    <span className="text-slate-500 text-xs">(PubChem CID: {activeChemical.cid})</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {activeChemical.description}
                  </p>
                  <div className="text-[11px] text-slate-400">
                    Industrial Context: <span className="text-slate-200">{activeChemical.industrialContext}</span>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-800 p-3 rounded text-xs space-y-1.5">
                  <span className="text-slate-400 font-bold block text-[10px]">EXPOSURE STANDARDS</span>
                  <div>
                    <span className="text-slate-500 text-[10px]">OSHA PEL: </span>
                    <span className="text-slate-200 font-bold">{activeChemical.oshaPel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">NIOSH REL: </span>
                    <span className="text-slate-200 font-bold">{activeChemical.nioshRel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px]">IDLH LIMIT: </span>
                    <span className="text-rose-400 font-bold">{activeChemical.idlh}</span>
                  </div>
                </div>
              </div>

              {/* Actionable Incident Response Protocol */}
              <div className="bg-rose-950/40 border border-rose-900/60 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>EMERGENCY DISPATCH & INCIDENT RESPONSE PROTOCOL</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded border border-rose-900/40">
                    <span className="text-[10px] text-amber-300 font-bold block mb-1">MANDATORY PPE</span>
                    <p className="text-slate-200 text-[11px] leading-relaxed font-sans">
                      {activeChemical.responseProtocol.ppeLevel}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-rose-900/40">
                    <span className="text-[10px] text-rose-300 font-bold block mb-1">EVACUATION RADIUS</span>
                    <p className="text-slate-200 text-[11px] leading-relaxed font-sans">
                      {activeChemical.responseProtocol.evacuationRadius}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded border border-rose-900/40">
                    <span className="text-[10px] text-cyan-300 font-bold block mb-1">VENTILATION ACTION</span>
                    <p className="text-slate-200 text-[11px] leading-relaxed font-sans">
                      {activeChemical.responseProtocol.ventilationAction}
                    </p>
                  </div>
                </div>
              </div>

              {/* First-Aid Guidance */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <HeartPulse className="w-4 h-4 text-emerald-400" />
                  <span>FIELD MEDICAL & FIRST-AID PROTOCOLS</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">INHALATION TRIAGE:</span>
                    <p className="text-slate-200 text-[11px] font-sans mt-0.5">
                      {activeChemical.firstAid.inhalation}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">MEDICAL ANTIDOTE / SUPPORT:</span>
                    <p className="text-slate-200 text-[11px] font-sans mt-0.5">
                      {activeChemical.firstAid.antidote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Telemetry & Sensor Details View */
            <>
              {/* Top Hardware / Radio Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0a101d] p-3.5 rounded-lg border border-slate-800/80 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">RF LINK STATUS</span>
                  <span className="font-bold text-cyan-400 flex items-center gap-1 mt-0.5">
                    <Radio className="w-3.5 h-3.5" />
                    {isOffline ? 'OFFLINE / LOST' : 'SX1278 (ONLINE)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RSSI / SNR</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">
                    {worker.rssi} dBm / {worker.snr} dB
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">PACKET TELEMETRY</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">
                    #{worker.packetCount} pkts · {worker.lastPacketFormatted}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">BATTERY VOLTAGE</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">
                    {worker.batteryMv ? `${(worker.batteryMv / 1000).toFixed(2)} V` : '3.82 V'}
                  </span>
                </div>
              </div>

              {/* Rolling 60-Second Sparkline History */}
              {sparklinePoints && (
                <div className="bg-[#0a101d] border border-slate-800 rounded-lg p-4 font-mono text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-300 font-bold">ROLLING 60-SAMPLE TELEMETRY STREAM</span>
                    <span className="text-slate-400 text-[11px]">
                      Current: <strong className="text-cyan-400">{worker.gasValue}</strong> · Peak: <strong className="text-rose-400">{worker.peakGasValue ?? worker.gasValue}</strong> · TWA: <strong className="text-amber-400">{worker.twaGasValue ?? worker.gasValue}</strong>
                    </span>
                  </div>
                  <div className="w-full h-16 bg-slate-950 rounded border border-slate-800/80 p-2 flex items-center">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 400 60" preserveAspectRatio="none">
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
                </div>
              )}

              {/* Section: Gas Sensor */}
              <div className="border border-slate-800 rounded-lg p-4 bg-[#0a101d]/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Flame className={`w-4 h-4 ${worker.gasState === 'HAZARD' ? 'text-rose-400' : 'text-slate-400'}`} />
                    <h3 className="font-mono font-bold text-sm text-white">
                      GAS SENSOR TELEMETRY (MQ-2)
                    </h3>
                  </div>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded font-bold border ${
                      worker.gasState === 'HAZARD'
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    STATUS: {worker.gasState}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3 font-mono">
                  <div className="bg-[#121927] p-3 rounded border border-slate-800">
                    <span className="text-slate-500 text-xs">RAW SENSOR ADC</span>
                    <div className={`text-2xl font-black mt-1 ${worker.gasState === 'HAZARD' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {worker.gasValue}
                    </div>
                    <span className="text-[10px] text-slate-500">10-bit range (0 - 1023)</span>
                  </div>

                  <div className="bg-[#121927] p-3 rounded border border-slate-800">
                    <span className="text-slate-500 text-xs">HAZARD THRESHOLD</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">
                      {worker.gasThreshold}
                    </div>
                    <span className="text-[10px] text-slate-500">Configured limit</span>
                  </div>

                  <div className="bg-[#121927] p-3 rounded border border-slate-800">
                    <span className="text-slate-500 text-xs">TRIGGER EVENT TIME</span>
                    <div className="text-lg font-bold text-slate-200 mt-1">
                      {worker.gasHazardTimestamp || 'None (Safe Zone)'}
                    </div>
                    <span className="text-[10px] text-slate-500">Threshold crossed</span>
                  </div>
                </div>

                {/* Linear Gauge with threshold mark */}
                <div className="mt-2">
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                    <span>0 (Clean)</span>
                    <span className="text-amber-400 font-semibold">Threshold: {worker.gasThreshold}</span>
                    <span>1023 (Saturation)</span>
                  </div>
                  <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 shadow-sm"
                      style={{ left: `${gasThresholdPercent}%` }}
                    />
                    <div
                      className={`h-full transition-all duration-300 ${
                        worker.gasState === 'HAZARD' ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${gasPercent}%` }}
                    />
                  </div>
                </div>

                {/* Threshold slider */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-slate-500" />
                    Configure Sensor Threshold:
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="200"
                      max="900"
                      step="25"
                      value={worker.gasThreshold}
                      onChange={(e) => updateWorkerThreshold(worker.id, parseInt(e.target.value, 10))}
                      className="accent-amber-400 cursor-pointer w-32"
                    />
                    <span className="text-amber-400 font-bold w-10 text-right">{worker.gasThreshold}</span>
                  </div>
                </div>
              </div>

              {/* Section: IMU Data & State Machine */}
              <div className="border border-slate-800 rounded-lg p-4 bg-[#0a101d]/60">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-mono font-bold text-sm text-white">
                      6-DOF IMU (MPU6050) & MOTION INTERPRETATION
                    </h3>
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    Interpreted: <strong className="text-slate-100">{worker.motionState}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-3 font-mono text-xs">
                    <div className="bg-[#121927] p-3 rounded border border-slate-800">
                      <span className="text-slate-400 block mb-2 font-semibold">
                        ACCELEROMETER (g-force)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">X</span>
                          <span className="text-slate-200 font-bold">{worker.accel.x.toFixed(2)} g</span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Y</span>
                          <span className="text-slate-200 font-bold">{worker.accel.y.toFixed(2)} g</span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Z</span>
                          <span className="text-slate-200 font-bold">{worker.accel.z.toFixed(2)} g</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#121927] p-3 rounded border border-slate-800">
                      <span className="text-slate-400 block mb-2 font-semibold">
                        GYROSCOPE (deg/s)
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">X</span>
                          <span className="text-slate-200 font-bold">{worker.gyro.x}°/s</span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Y</span>
                          <span className="text-slate-200 font-bold">{worker.gyro.y}°/s</span>
                        </div>
                        <div className="p-1.5 bg-slate-900 rounded border border-slate-800/80">
                          <span className="text-[10px] text-slate-500 block">Z</span>
                          <span className="text-slate-200 font-bold">{worker.gyro.z}°/s</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Artificial Horizon */}
                  <div className="bg-[#121927] p-3 rounded border border-slate-800 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
                      <span className="font-semibold text-slate-300">SPATIAL ORIENTATION</span>
                      <span>Pitch: {pitchDeg}° · Roll: {rollDeg}°</span>
                    </div>

                    <div className="relative w-full h-32 bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                      <div
                        className="absolute w-48 h-0.5 bg-cyan-500/80 transition-transform duration-200"
                        style={{
                          transform: `rotate(${rollDeg}deg) translateY(${Math.min(30, Math.max(-30, pitchDeg))}px)`,
                        }}
                      />
                      <div className="w-6 h-6 rounded-full border-2 border-amber-400/80 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] font-mono text-slate-400 flex justify-between">
                      <span>Posture: {Math.abs(pitchDeg) > 45 || Math.abs(rollDeg) > 45 ? '⚠️ Horizontal' : '✅ Upright'}</span>
                      <span>Magnitude: {Math.sqrt(worker.accel.x**2 + worker.accel.y**2 + worker.accel.z**2).toFixed(2)}g</span>
                    </div>
                  </div>
                </div>

                {/* State Machine Steps */}
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-mono font-bold text-xs text-amber-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      MAN-DOWN STATE MACHINE (ARDUINO DECISION PIPELINE)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Timeout: {worker.immobilityTimeout}s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                    <div
                      className={`p-2 rounded border text-center transition-all ${
                        worker.manDownStep === 'NORMAL' && worker.state === 'NORMAL'
                          ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="block text-[10px]">STEP 1</span>
                      <span>NORMAL</span>
                    </div>

                    <div
                      className={`p-2 rounded border text-center transition-all ${
                        worker.manDownStep === 'ABNORMAL_MOTION'
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="block text-[10px]">STEP 2</span>
                      <span>ABNORMAL</span>
                    </div>

                    <div
                      className={`p-2 rounded border text-center transition-all ${
                        worker.manDownStep === 'POSSIBLE_FALL'
                          ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="block text-[10px]">STEP 3</span>
                      <span>POSSIBLE FALL</span>
                    </div>

                    <div
                      className={`p-2 rounded border text-center transition-all ${
                        worker.manDownStep === 'IMMOBILITY_TIMER'
                          ? 'bg-amber-950/90 border-amber-400 text-amber-300 font-bold animate-pulse shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="block text-[10px]">STEP 4</span>
                      <span>TIMER ({worker.immobilitySeconds.toFixed(0)}s)</span>
                    </div>

                    <div
                      className={`p-2 rounded border text-center transition-all col-span-2 sm:col-span-1 ${
                        worker.manDownStep === 'MAN_DOWN'
                          ? 'bg-rose-950/90 border-rose-500 text-rose-300 font-bold shadow-md shadow-rose-950/50'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="block text-[10px]">STEP 5</span>
                      <span>🚨 MAN DOWN</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section: GPS & Environmental */}
              <div className="border border-slate-800 rounded-lg p-4 bg-[#0a101d]/60 font-mono text-xs">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <h3 className="font-bold text-white">
                      GPS SATELLITE FIX (NEO-6M RECEIVER)
                    </h3>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {worker.gps?.hasFix ? '3D FIX ACQUIRED' : 'INDOOR / TUNNEL (NO FIX)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#121927] p-3 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] block">LATITUDE</span>
                    <span className="font-bold text-slate-200">{worker.gps?.lat.toFixed(4) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">LONGITUDE</span>
                    <span className="font-bold text-slate-200">{worker.gps?.lng.toFixed(4) || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">SATELLITES</span>
                    <span className="font-bold text-slate-200">{worker.gps?.satellites ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">ACCURACY</span>
                    <span className="font-bold text-slate-200">±{worker.gps?.accuracyMeters ?? 45}m</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0a101d] border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => requestResetWorker(worker.id)}
            className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-mono border border-rose-800/50 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CONTROLLED RESET
          </button>

          <button
            onClick={() => setSelectedWorkerId(null)}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 transition-colors"
          >
            CLOSE (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
