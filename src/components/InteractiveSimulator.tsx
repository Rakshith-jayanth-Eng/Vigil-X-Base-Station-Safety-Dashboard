import React, { useState, useEffect } from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  Radio,
  Activity,
  Flame,
  ShieldAlert,
  Play,
  Pause,
  ArrowRight,
  Wifi,
  Sparkles,
  Zap,
} from 'lucide-react';

export const InteractiveSimulator: React.FC = () => {
  const {
    workers,
    simulateScenario,
    acknowledgeAlert,
    requestResetWorker,
  } = useSafetySystem();

  const worker = workers[0] || {
    id: 'WORKER_01',
    displayName: 'Worker 01',
    state: 'NORMAL',
    gasValue: 310,
    gasThreshold: 500,
    immobilitySeconds: 0,
    immobilityTimeout: 10,
    motionState: 'MOVING',
  };

  type StoryKey = 'compound' | 'fall' | 'gas' | 'fade' | 'burst' | 'fault';
  const [activeStory, setActiveStory] = useState<StoryKey | null>('compound');
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);
  const [chaosMode, setChaosMode] = useState<boolean>(false);

  // Stories definitions with plain-English steps
  const stories = {
    compound: {
      title: '🚨 Compound Hazard: Toxic Gas Leak + Fall Impact + Radio Fade',
      badge: 'Compound Multi-Hazard',
      steps: [
        {
          title: '01. Normal Subterranean Operations',
          description: 'Worker 01 is walking through Sub-level Vault 4B. The wearable Arduino reads 1.0g gravity and steady motion.',
          action: () => simulateScenario('normal', 'WORKER_01'),
        },
        {
          title: '02. Methane Seal Failure Occurs',
          description: 'A pipe flange ruptures. Toxic hydrocarbon gas fills the vault (MQ-2 ADC spikes to 795).',
          action: () => simulateScenario('gas_hazard', 'WORKER_01'),
        },
        {
          title: '03. Worker Collapses from Acute Asphyxiation',
          description: 'Worker suffers severe hypoxia, collapsing to the floor. High-G impact (2.85g) triggers verification countdown.',
          action: () => simulateScenario('possible_fall', 'WORKER_01'),
        },
        {
          title: '04. Unconscious Immobility Confirmed in Toxic Gas',
          description: '10 seconds elapsed without motion. Arduino confirms COMPOUND_HAZARD (Worker unconscious in toxic gas).',
          action: () => simulateScenario('compound_hazard', 'WORKER_01'),
        },
        {
          title: '05. Surface Base Station Flashes Critical Klaxon',
          description: 'Base station sounds dual 880Hz/440Hz alert. Operator deploys SCBA rescue squad with 60-second alarm snooze.',
          action: () => {},
        },
      ],
    },
    fall: {
      title: '🚨 Fall & Immobility: Slip, Trip & Sustained Unconsciousness',
      badge: 'Fall & Immobility',
      steps: [
        {
          title: '01. Steady Movement Along Scaffolding',
          description: 'Worker 01 walks normally. Inertial vectors report 1.0g baseline gravity.',
          action: () => simulateScenario('normal', 'WORKER_01'),
        },
        {
          title: '02. Slip and Violent Floor Impact',
          description: 'MPU6050 accelerometer registers 2.85g spike. Worker stops moving.',
          action: () => simulateScenario('possible_fall', 'WORKER_01'),
        },
        {
          title: '03. Autonomous Verification Countdown',
          description: 'Arduino starts 10-second timer. If worker gets back up, it cancels. If immobile, it escalates.',
          action: () => {},
        },
        {
          title: '04. MAN-DOWN Alert Dispatched via LoRa',
          description: '10 seconds elapsed without motion. Arduino transmits MAN_DOWN packet to surface.',
          action: () => simulateScenario('man_down', 'WORKER_01'),
        },
      ],
    },
    gas: {
      title: '🔥 Atmospheric Hazard: Dangerous Hydrocarbon Gas Leak',
      badge: 'Toxic Gas Leak',
      steps: [
        {
          title: '01. Safe Baseline Atmosphere',
          description: 'MQ-2 reports 318 ADC units, well below the 500 threshold limit.',
          action: () => simulateScenario('normal', 'WORKER_01'),
        },
        {
          title: '02. Gas Concentration Surpasses Threshold',
          description: 'Methane enters excavation vault. MQ-2 sensor spikes to 742 ADC.',
          action: () => simulateScenario('gas_hazard', 'WORKER_01'),
        },
        {
          title: '03. Base Station Pulls PubChem Toxicology',
          description: 'Vigil-X loads IDLH limits, mandatory SCBA PPE requirements, and evacuation radius.',
          action: () => {},
        },
      ],
    },
    fade: {
      title: '⚫ RF Link Degradation: Deep Gallery Radio Fade',
      badge: 'Signal Loss & Carrier Fade',
      steps: [
        {
          title: '01. Strong RF Link (-81 dBm)',
          description: 'LoRa 433MHz carrier operating with high SNR (+8.5 dB).',
          action: () => simulateScenario('normal', 'WORKER_01'),
        },
        {
          title: '02. Worker Steps into Heavy Concrete Sump',
          description: 'Signal fades to -115 dBm with negative SNR (-4.2 dB).',
          action: () => simulateScenario('radio_fade', 'WORKER_01'),
        },
        {
          title: '03. Communication Timeout Distinguishes Offline from Fall',
          description: 'No packet received for 30s. Node flagged as OFFLINE without false fall claims.',
          action: () => simulateScenario('offline', 'WORKER_01'),
        },
      ],
    },
    burst: {
      title: '⚡ Fleet Stress: Multi-Worker Telemetry Burst',
      badge: 'High-Density Traffic',
      steps: [
        {
          title: '01. All Workers Transmit Simultaneously',
          description: 'Simulates heavy LoRa channel contention across WORKER_01, WORKER_02, and WORKER_03.',
          action: () => simulateScenario('burst_stress'),
        },
        {
          title: '02. Base Station Demultiplexes Stream',
          description: 'Packet parser decodes interleaved packets without buffer corruption.',
          action: () => {},
        },
      ],
    },
    fault: {
      title: '⚠️ Hardware Fault: Broken Sensor Lead Detection',
      badge: 'Sensor Fault',
      steps: [
        {
          title: '01. Physical Wire Disconnection',
          description: 'MQ-2 analog wire breaks in transit, yielding NaN / out-of-range ADC.',
          action: () => simulateScenario('sensor_fault', 'WORKER_01'),
        },
        {
          title: '02. Honest SENSOR_FAULT Indicator',
          description: 'Dashboard flags SENSOR FAULT rather than falsely reporting clean air.',
          action: () => {},
        },
      ],
    },
  };

  const startStory = (key: StoryKey) => {
    setActiveStory(key);
    setCurrentStep(0);
    stories[key].steps[0].action();
    setIsPlayingAuto(false);
  };

  const goToNextStep = () => {
    if (!activeStory) return;
    const story = stories[activeStory];
    if (currentStep < story.steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      story.steps[next].action();
    } else {
      setIsPlayingAuto(false);
    }
  };

  const goToPrevStep = () => {
    if (!activeStory) return;
    const story = stories[activeStory];
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      story.steps[prev].action();
    }
  };

  useEffect(() => {
    if (!isPlayingAuto || !activeStory) return;
    const story = stories[activeStory];

    const timer = setTimeout(() => {
      if (currentStep < story.steps.length - 1) {
        const next = currentStep + 1;
        setCurrentStep(next);
        story.steps[next].action();
      } else {
        setIsPlayingAuto(false);
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [isPlayingAuto, currentStep, activeStory]);

  // Chaos injection generator
  useEffect(() => {
    if (!chaosMode) return;
    const interval = setInterval(() => {
      const scenarios: Array<'normal' | 'gas_hazard' | 'possible_fall' | 'man_down' | 'compound_hazard' | 'radio_fade'> = [
        'normal',
        'gas_hazard',
        'possible_fall',
        'man_down',
        'compound_hazard',
        'radio_fade',
      ];
      const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const randomWorker = workers[Math.floor(Math.random() * workers.length)]?.id || 'WORKER_01';
      simulateScenario(randomScenario, randomWorker);
    }, 4000);

    return () => clearInterval(interval);
  }, [chaosMode, workers, simulateScenario]);

  const activeStoryData = activeStory ? stories[activeStory] : null;
  const currentStepData = activeStoryData ? activeStoryData.steps[currentStep] : null;

  return (
    <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 sm:p-6 space-y-6 select-none font-sans">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Sparkles className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Hardware Simulation & Emergency Stress Lab
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Execute mission-critical emergency scenarios to stress-test the state machine, Web Serial decoder, and audio alert pipelines.
          </p>
        </div>

        {/* Chaos Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChaosMode(!chaosMode)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold flex items-center gap-1.5 transition-colors border ${
              chaosMode
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            {chaosMode ? 'CHAOS INJECTION: ON' : 'CHAOS INJECTION: OFF'}
          </button>
        </div>
      </div>

      {/* Preset Selector Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => startStory('compound')}
          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            activeStory === 'compound'
              ? 'bg-rose-700 text-amber-200 border-amber-400 font-bold shadow-md'
              : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
          }`}
        >
          🚨 Compound (Gas + Fall)
        </button>
        <button
          onClick={() => startStory('fall')}
          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            activeStory === 'fall'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          🚨 Fall & Man-Down
        </button>
        <button
          onClick={() => startStory('gas')}
          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            activeStory === 'gas'
              ? 'bg-rose-600 text-white border-rose-500 shadow-md'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          🔥 Toxic Gas Leak
        </button>
        <button
          onClick={() => startStory('fade')}
          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            activeStory === 'fade'
              ? 'bg-cyan-700 text-white border-cyan-500 shadow-md'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          ⚫ Radio Carrier Fade
        </button>
        <button
          onClick={() => startStory('burst')}
          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            activeStory === 'burst'
              ? 'bg-purple-700 text-white border-purple-500 shadow-md'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
        >
          ⚡ Multi-Worker Burst
        </button>
        <button
          onClick={() => startStory('fault')}
          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
            activeStory === 'fault'
              ? 'bg-amber-600 text-slate-950 border-amber-400 font-bold shadow-md'
              : 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900'
          }`}
        >
          ⚠️ Sensor Fault
        </button>
      </div>

      {/* Visual Animation Stage */}
      <div className="bg-[#080d16] border border-slate-800 rounded-xl p-4 sm:p-6 overflow-hidden relative">
        <div className="relative pb-6 border-b-2 border-dashed border-amber-600/40">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">
              SURFACE LEVEL (GROUND) — NO CELLULAR / INTERNET REQUIRED
            </span>
            <span>BASE STATION RECEIVER</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 p-3 bg-slate-900/90 rounded-lg border border-slate-700 max-w-sm">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-white text-xs">Vigil-X Base Station</div>
                <div className="text-[11px] text-slate-400 font-mono">SX1278 LoRa Receiver + USB Serial</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  Status: {worker.state === 'NORMAL' ? 'ONLINE · ALL SAFE' : `ALERT: ${worker.state}`}
                </div>
              </div>
            </div>

            <div className="text-right font-mono text-xs hidden sm:block">
              <span className="text-slate-500 block text-[10px]">OPERATOR ALARM</span>
              <span
                className={`font-bold ${
                  worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD' || worker.state === 'COMPOUND_HAZARD'
                    ? 'text-rose-400 animate-pulse text-sm'
                    : 'text-emerald-400'
                }`}
              >
                {worker.state === 'COMPOUND_HAZARD'
                  ? '🚨 DUAL KLAXON ACTIVE'
                  : worker.state === 'MAN_DOWN'
                  ? '🚨 SIREN SOUNDING'
                  : worker.state === 'GAS_HAZARD'
                  ? '🔥 GAS ALARM ACTIVE'
                  : '🟢 SILENT / MONITORING'}
              </span>
            </div>
          </div>

          <div className="my-3 flex items-center justify-center">
            <div className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>
                Wireless 433 MHz LoRa Radio Carrier (Subterranean Wave Propagation)
              </span>
            </div>
          </div>
        </div>

        {/* Underground / Confined Space Area */}
        <div className="pt-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span className="font-bold text-slate-400 uppercase tracking-wider">
              UNDERGROUND CONFINED SPACE (SEWER / SUB-LEVEL 4B)
            </span>
            <span className="text-rose-400">NO CELLULAR SIGNALS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                worker.state === 'COMPOUND_HAZARD' || worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD'
                  ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50'
                  : worker.state === 'POSSIBLE_FALL'
                  ? 'bg-amber-950/60 border-amber-500'
                  : 'bg-slate-900/90 border-slate-700'
              }`}
            >
              <div className="text-3xl sm:text-4xl">
                {worker.state === 'COMPOUND_HAZARD' ? '🚨' : worker.state === 'MAN_DOWN' ? '🤕' : worker.state === 'GAS_HAZARD' ? '😷' : worker.state === 'POSSIBLE_FALL' ? '⚠️' : '👷‍♂️'}
              </div>
              <div>
                <div className="font-bold text-white text-sm">
                  Worker 01 (Lead Scaffolder)
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">
                  State:{' '}
                  <strong
                    className={
                      worker.state === 'COMPOUND_HAZARD' || worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD'
                        ? 'text-rose-400'
                        : worker.state === 'POSSIBLE_FALL'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }
                  >
                    {worker.state.replace('_', ' ')}
                  </strong>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Motion: <strong>{worker.motionState}</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col justify-between font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-1">
                WEARABLE TELEMETRY
              </span>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">MQ-2 Gas Reading:</span>
                  <strong className={worker.gasValue >= 500 ? 'text-rose-400' : 'text-emerald-400'}>
                    {worker.gasValue} / 1023 (Limit: 500)
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">MPU6050 Accel:</span>
                  <strong className="text-slate-200">
                    {worker.accel.x.toFixed(1)}g, {worker.accel.y.toFixed(1)}g, {worker.accel.z.toFixed(1)}g
                  </strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">RF Carrier RSSI:</span>
                  <strong className="text-slate-200">{worker.rssi} dBm</strong>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col justify-between font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-1">
                LOCAL ARDUINO DECISION
              </span>
              <p className="text-[11px] text-slate-300 leading-snug font-sans">
                {worker.state === 'COMPOUND_HAZARD'
                  ? '🚨 Critical Compound State! Toxic gas + sustained immobility verified. Maximum siren cadence triggered.'
                  : worker.state === 'MAN_DOWN'
                  ? '🚨 Fall detected + 10s immobility timeout reached. Autonomous emergency decision confirmed!'
                  : worker.state === 'GAS_HAZARD'
                  ? '🔥 Gas reading passed safety threshold. Local buzzer activated!'
                  : worker.state === 'POSSIBLE_FALL'
                  ? '⚠️ High G impact registered. Immobility timer active...'
                  : '✅ All parameters normal. Transmitting heartbeat telemetry.'}
              </p>
              <div className="text-[10px] text-slate-500 mt-2">
                *Local decision loop. Zero cloud dependencies.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Story Explainer */}
      {activeStoryData && currentStepData && (
        <div className="p-4 bg-slate-900 rounded-xl border border-amber-500/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-xs">
                STEP {currentStep + 1} OF {activeStoryData.steps.length}
              </span>
              <span className="font-bold text-white text-sm">
                {currentStepData.title}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevStep}
                disabled={currentStep === 0}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold text-slate-300"
              >
                Previous
              </button>
              <button
                onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-400 flex items-center gap-1"
              >
                {isPlayingAuto ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {isPlayingAuto ? 'Pause' : 'Auto Play'}
              </button>
              <button
                onClick={goToNextStep}
                disabled={currentStep === activeStoryData.steps.length - 1}
                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-xs font-bold text-slate-950 flex items-center gap-1"
              >
                Next <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {currentStepData.description}
          </p>

          {(worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD' || worker.state === 'COMPOUND_HAZARD') && (
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs text-amber-300 font-medium">
                Try Operator Action:
              </span>
              <button
                onClick={() => acknowledgeAlert(worker.id)}
                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Acknowledge Alert
              </button>
              <button
                onClick={() => requestResetWorker(worker.id)}
                className="px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs"
              >
                Reset Override
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
