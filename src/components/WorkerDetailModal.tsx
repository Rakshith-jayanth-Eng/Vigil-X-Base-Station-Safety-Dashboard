import React from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  X,
  Radio,
  Flame,
  Activity,
  Compass,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  Sliders,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';

export const WorkerDetailModal: React.FC = () => {
  const {
    selectedWorkerId,
    setSelectedWorkerId,
    workers,
    acknowledgeAlert,
    requestResetWorker,
    simulateScenario,
    updateWorkerThreshold,
    updateImmobilityTimeout,
  } = useSafetySystem();

  if (!selectedWorkerId) return null;

  const worker = workers.find((w) => w.id === selectedWorkerId);
  if (!worker) return null;

  const isCritical = ['MAN_DOWN', 'GAS_HAZARD', 'COMPOUND_HAZARD'].includes(worker.state);
  const isWarning = ['POSSIBLE_FALL', 'WARNING'].includes(worker.state);
  const isOffline = worker.state === 'OFFLINE';

  const gasPercent = Math.min(100, Math.round(((isNaN(worker.gasValue) ? 0 : worker.gasValue) / 1023) * 100));
  const gasThresholdPercent = Math.round((worker.gasThreshold / 1023) * 100);

  // Tilt computation from Accel
  const pitchDeg = Math.round(Math.atan2(worker.accel.y, Math.sqrt(worker.accel.x * worker.accel.x + worker.accel.z * worker.accel.z)) * (180 / Math.PI));
  const rollDeg = Math.round(Math.atan2(-worker.accel.x, worker.accel.z) * (180 / Math.PI));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto select-none">
      <div className="bg-[#0e1626] border border-slate-700/80 rounded-xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-black text-sm">
              {worker.id.replace('WORKER_', 'W')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-mono font-black text-white tracking-wide">
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
            {isCritical || isWarning ? (
              !worker.isAcknowledged ? (
                <button
                  onClick={() => acknowledgeAlert(worker.id)}
                  className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ACKNOWLEDGE ALERT
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
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-slate-200">
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
                {worker.batteryMv ? `${(worker.batteryMv / 1000).toFixed(2)} V` : 'N/A (Prototype)'}
              </span>
            </div>
          </div>

          {/* Section: Gas Sensor (Section 12 & 15) */}
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

            {/* Honest Technical Note from prompt */}
            <div className="mb-3 p-2 rounded bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 leading-relaxed font-mono">
              <strong className="text-amber-400">Notice:</strong> Displaying prototype raw sensor ADC reading (0–1023) from MQ-2 analog pin. This prototype uses an uncalibrated threshold trigger logic; it is NOT labeled as a calibrated toxic-gas ppm concentration meter.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3 font-mono">
              <div className="bg-[#121927] p-3 rounded border border-slate-800">
                <span className="text-slate-500 text-xs">PROTOTYPE SENSOR VALUE</span>
                <div className={`text-2xl font-black mt-1 ${worker.gasState === 'HAZARD' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {worker.gasValue}
                </div>
                <span className="text-[10px] text-slate-500">10-bit ADC (0 - 1023)</span>
              </div>

              <div className="bg-[#121927] p-3 rounded border border-slate-800">
                <span className="text-slate-500 text-xs">SAFETY THRESHOLD</span>
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
                <span className="text-[10px] text-slate-500">Time threshold crossed</span>
              </div>
            </div>

            {/* Linear Gauge with threshold mark */}
            <div className="mt-2">
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                <span>0 (Clean Ambient)</span>
                <span className="text-amber-400 font-semibold">Threshold: {worker.gasThreshold}</span>
                <span>1023 (Saturation)</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                {/* Threshold vertical line */}
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

            {/* Threshold fine-tuning slider for testing */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-slate-500" />
                Adjust Prototype Threshold:
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

          {/* Section: IMU Data & State Machine (Section 13 & 14) */}
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
              {/* Accel and Gyro readings */}
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

              {/* Artificial Horizon / Tilt Bubble */}
              <div className="bg-[#121927] p-3 rounded border border-slate-800 flex flex-col justify-between">
                <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300">ORIENTATION & TILT</span>
                  <span>Pitch: {pitchDeg}° · Roll: {rollDeg}°</span>
                </div>

                <div className="relative w-full h-32 bg-slate-950 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                  {/* Horizon line rotated */}
                  <div
                    className="absolute w-48 h-0.5 bg-cyan-500/80 transition-transform duration-200"
                    style={{
                      transform: `rotate(${rollDeg}deg) translateY(${Math.min(30, Math.max(-30, pitchDeg))}px)`,
                    }}
                  />
                  {/* Center reticle */}
                  <div className="w-6 h-6 rounded-full border-2 border-amber-400/80 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                  <div className="absolute bottom-1 right-2 text-[10px] font-mono text-slate-500">
                    MPU6050 vector
                  </div>
                </div>

                <div className="mt-2 text-[11px] font-mono text-slate-400 flex justify-between">
                  <span>Posture: {Math.abs(pitchDeg) > 45 || Math.abs(rollDeg) > 45 ? '⚠️ Horizontal / Fallen' : '✅ Upright / Vertical'}</span>
                  <span>Impact Magnitude: {Math.sqrt(worker.accel.x**2 + worker.accel.y**2 + worker.accel.z**2).toFixed(2)}g</span>
                </div>
              </div>
            </div>

            {/* Man-Down State Machine Flow Diagram (Section 14) */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-mono font-bold text-xs text-amber-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  MAN-DOWN STATE MACHINE (EMBEDDED ARDUINO DECISION LOGIC)
                </h4>
                <span className="text-[11px] font-mono text-slate-400">
                  Timeout: {worker.immobilityTimeout}s
                </span>
              </div>

              <p className="text-[11px] text-slate-400 font-mono mb-3">
                *The dashboard visualization reflects the Arduino state machine. Emergency verification executes autonomously on the worker node.
              </p>

              {/* State Machine Step Pipeline */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-xs">
                {/* 1. NORMAL */}
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

                {/* 2. ABNORMAL MOTION */}
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

                {/* 3. POSSIBLE FALL */}
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

                {/* 4. IMMOBILITY TIMER */}
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

                {/* 5. MAN DOWN */}
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

              {/* Verification countdown if in possible fall */}
              {worker.state === 'POSSIBLE_FALL' && (
                <div className="mt-3 p-3 bg-amber-950/50 border border-amber-600/60 rounded font-mono text-xs text-amber-200">
                  <div className="flex justify-between font-bold mb-1">
                    <span>MAN-DOWN VERIFICATION IN PROGRESS</span>
                    <span>
                      {(worker.immobilityTimeout - worker.immobilitySeconds).toFixed(1)}s remaining of {worker.immobilityTimeout}s timeout
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/80">
                    If worker resumes motion before timeout, Arduino will return state to NORMAL. If immobility persists, MAN DOWN will trigger.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section: GPS & Environmental (Section 25) */}
          <div className="border border-slate-800 rounded-lg p-4 bg-[#0a101d]/60 font-mono text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <h3 className="font-bold text-white">
                  OPTIONAL GPS (NEO-6M RECEIVER)
                </h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {worker.gps?.hasFix ? '3D FIX ACQUIRED' : 'INDOOR / NO FIX'}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-3">
              Designed for infrastructure-poor & underground environments. GPS coordinates are optional and non-blocking for emergency detection.
            </p>

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
                <span className="text-slate-500 text-[10px] block">ENV ACCURACY</span>
                <span className="font-bold text-slate-200">±{worker.gps?.accuracyMeters ?? 50}m (Est)</span>
              </div>
            </div>
          </div>

          {/* Section: Demo Simulation Buttons for this Worker (Section 22) */}
          <div className="border border-slate-800 rounded-lg p-4 bg-[#0a101d]">
            <h4 className="font-mono font-bold text-xs text-amber-400 mb-2">
              DEMO / HARDWARE SIMULATION CONTROLS FOR {worker.id}
            </h4>
            <p className="text-[11px] font-mono text-slate-400 mb-3">
              Trigger specific telemetry states to evaluate the emergency alert path and operator response:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-mono text-xs">
              <button
                onClick={() => simulateScenario('normal', worker.id)}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold transition-colors"
              >
                NORMAL
              </button>
              <button
                onClick={() => simulateScenario('gas_hazard', worker.id)}
                className="p-2 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 font-semibold transition-colors"
              >
                GAS HAZARD
              </button>
              <button
                onClick={() => simulateScenario('possible_fall', worker.id)}
                className="p-2 rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700 font-semibold transition-colors"
              >
                POSSIBLE FALL
              </button>
              <button
                onClick={() => simulateScenario('man_down', worker.id)}
                className="p-2 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 font-semibold transition-colors"
              >
                MAN DOWN
              </button>
              <button
                onClick={() => simulateScenario('compound_hazard', worker.id)}
                className="p-2 rounded bg-rose-950 text-amber-300 border border-amber-500/80 font-bold transition-colors"
                title="Test simultaneous Fall + Gas Hazard"
              >
                FALL + GAS
              </button>
              <button
                onClick={() => simulateScenario('offline', worker.id)}
                className="p-2 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold transition-colors"
              >
                OFFLINE
              </button>
              <button
                onClick={() => simulateScenario('recovery', worker.id)}
                className="p-2 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 font-semibold transition-colors"
              >
                RECOVERY
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#0a101d] border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => requestResetWorker(worker.id)}
            className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-xs font-mono border border-rose-800/50 transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            CONTROLLED RESET (PROTOTYPE)
          </button>

          <button
            onClick={() => setSelectedWorkerId(null)}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
