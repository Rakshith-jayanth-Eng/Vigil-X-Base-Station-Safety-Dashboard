import React, { useState, useEffect } from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  Radio,
  Activity,
  Flame,
  ShieldAlert,
  RotateCcw,
  Play,
  Pause,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  Sparkles,
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

  type StoryKey = 'fall' | 'gas' | 'recovery' | 'offline' | 'compound' | 'fault';
  const [activeStory, setActiveStory] = useState<StoryKey | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState<boolean>(false);

  // Stories definitions with plain-English steps
  const stories = {
    fall: {
      title: '🚨 Scenario A: Worker Falls & Becomes Unconscious (Man-Down)',
      badge: 'Fall & Immobility',
      steps: [
        {
          title: 'Normal Operations Underground',
          description: 'Worker 01 is walking through Sub-level Vault 4B. The wearable Arduino reads 1.0g gravity and steady motion.',
          action: () => simulateScenario('normal', 'WORKER_01'),
          highlight: 'worker_moving',
        },
        {
          title: 'Worker Slips and Hits Ground',
          description: 'A sudden impact spike (2.85g) is detected by the MPU6050 accelerometer. The worker stops moving.',
          action: () => simulateScenario('possible_fall', 'WORKER_01'),
          highlight: 'worker_fallen',
        },
        {
          title: 'Autonomous Verification Countdown',
          description: 'The Arduino starts a 10-second timer. If the worker gets up, it cancels. If they stay motionless, it confirms an emergency.',
          action: () => {},
          highlight: 'timer',
        },
        {
          title: 'Man-Down Confirmed & LoRa Broadcast',
          description: '10 seconds elapsed without motion! The Arduino confirms MAN DOWN and broadcasts a 433MHz LoRa packet through the ground.',
          action: () => simulateScenario('man_down', 'WORKER_01'),
          highlight: 'lora_wave',
        },
        {
          title: 'Base Station Alarm Sounds',
          description: 'The surface computer receives the packet within 1 second. The operator clicks Acknowledge to deploy the rescue team.',
          action: () => {},
          highlight: 'base_station',
        },
      ],
    },
    gas: {
      title: '🔥 Scenario B: Hazardous Gas / Methane Leak Detected',
      badge: 'Toxic Gas Leak',
      steps: [
        {
          title: 'Clean Ambient Air',
          description: 'Underground air is safe. The MQ-2 sensor reports raw reading ~315 (well under the 500 danger line).',
          action: () => simulateScenario('normal', 'WORKER_01'),
          highlight: 'worker_moving',
        },
        {
          title: 'Gas Leak Occurs in Tunnel',
          description: 'A pipe seal cracks. Methane gas rapidly enters the shaft. MQ-2 analog reading spikes to 742!',
          action: () => simulateScenario('gas_hazard', 'WORKER_01'),
          highlight: 'gas_leak',
        },
        {
          title: 'Arduino Detects Danger Instantly',
          description: 'Because 742 > 500, the wearable Arduino immediately triggers a GAS HAZARD state without waiting for cloud processing.',
          action: () => {},
          highlight: 'arduino_decision',
        },
        {
          title: 'Emergency Radio Packet Received',
          description: 'The LoRa radio delivers the alert to the surface in milliseconds. The base-station banner flashes red with exact gas readings.',
          action: () => {},
          highlight: 'base_station',
        },
      ],
    },
    recovery: {
      title: '✅ Scenario C: False Alarm / Worker Stumbles & Recovers',
      badge: 'Fall Self-Recovery',
      steps: [
        {
          title: 'Worker Trips on Rubble',
          description: 'Impact spike triggers the verification countdown timer. System enters Warning mode.',
          action: () => simulateScenario('possible_fall', 'WORKER_01'),
          highlight: 'timer',
        },
        {
          title: 'Worker Stands Back Up',
          description: 'Worker recovers their footing and starts moving again. The MPU6050 detects motion vectors.',
          action: () => simulateScenario('recovery', 'WORKER_01'),
          highlight: 'worker_moving',
        },
        {
          title: 'System Automatically Resets to Safe',
          description: 'The Arduino verifies the worker is active and healthy. Status returns to NORMAL without false emergency panic.',
          action: () => {},
          highlight: 'safe',
        },
      ],
    },
    offline: {
      title: '⚫ Scenario D: Worker Enters Deep Vault / Radio Lost',
      badge: 'Signal Loss vs Emergency',
      steps: [
        {
          title: 'Healthy Radio Carrier',
          description: 'Heartbeat packets arrive every few seconds with RSSI -82 dBm.',
          action: () => simulateScenario('normal', 'WORKER_01'),
          highlight: 'lora_wave',
        },
        {
          title: 'Worker Steps Behind Thick Lead Door',
          description: 'Radio waves are blocked. No packets arrive for 30 seconds.',
          action: () => simulateScenario('offline', 'WORKER_01'),
          highlight: 'offline_lost',
        },
        {
          title: 'Communication Failure Flagged (Not False Fall)',
          description: 'The dashboard marks the worker OFFLINE rather than claiming a medical emergency, keeping rescue info accurate.',
          action: () => {},
          highlight: 'base_station',
        },
      ],
    },
    compound: {
      title: '🚨 Scenario E: DUAL COMPOUND HAZARD (Fall + Gas Leak)',
      badge: 'Unconscious in Toxic Gas',
      steps: [
        {
          title: 'Worker Falls in Confined Tunnel',
          description: 'Impact spike triggers possible fall. Worker remains motionless.',
          action: () => simulateScenario('possible_fall', 'WORKER_01'),
          highlight: 'worker_fallen',
        },
        {
          title: 'Immobility Confirmed (MAN DOWN)',
          description: '10-second timer expires. Arduino flags worker as MAN DOWN.',
          action: () => simulateScenario('man_down', 'WORKER_01'),
          highlight: 'timer',
        },
        {
          title: 'Simultaneous Gas Leak Occurs',
          description: 'Methane fills tunnel (MQ-2 ADC spikes to 760). Worker is unconscious and cannot evacuate!',
          action: () => simulateScenario('compound_hazard', 'WORKER_01'),
          highlight: 'gas_leak',
        },
        {
          title: 'Highest Priority Emergency Alarm',
          description: 'System triggers COMPOUND_HAZARD. Base station flashes red and amber dual sirens for maximum rescue priority.',
          action: () => {},
          highlight: 'base_station',
        },
      ],
    },
    fault: {
      title: '⚠️ Scenario F: Sensor Disconnection / Hardware Fault',
      badge: 'Hardware Fault Detection',
      steps: [
        {
          title: 'Normal Operation',
          description: 'Sensor wires secure. Normal heartbeat telemetry arriving.',
          action: () => simulateScenario('normal', 'WORKER_01'),
          highlight: 'worker_moving',
        },
        {
          title: 'Sensor Wire Disconnects Underground',
          description: 'MQ-2 analog pin loses contact. Arduino transmits SENSOR_FAULT packet.',
          action: () => simulateScenario('sensor_fault', 'WORKER_01'),
          highlight: 'gas_leak',
        },
        {
          title: 'System Flags Warning Without Forging Safe Data',
          description: 'The dashboard displays SENSOR FAULT instead of silently assuming clean air, preventing dangerous false security.',
          action: () => {},
          highlight: 'base_station',
        },
      ],
    },
  };

  // Start a story
  const startStory = (key: 'fall' | 'gas' | 'recovery' | 'offline' | 'compound' | 'fault') => {
    setActiveStory(key);
    setCurrentStep(0);
    stories[key].steps[0].action();
    setIsPlayingAuto(false);
  };

  // Step next
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

  // Step prev
  const goToPrevStep = () => {
    if (!activeStory) return;
    const story = stories[activeStory];
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      story.steps[prev].action();
    }
  };

  // Auto-play timer
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
              Interactive Hardware Simulation & Demonstration Lab
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pick a scenario below to watch how the physical sensors, Arduino microcontroller, and LoRa wireless link respond in real time.
          </p>
        </div>

        {/* Scenario Selection Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
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
            onClick={() => startStory('recovery')}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
              activeStory === 'recovery'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ✅ Self-Recovery
          </button>
          <button
            onClick={() => startStory('offline')}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
              activeStory === 'offline'
                ? 'bg-cyan-700 text-white border-cyan-500 shadow-md'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            ⚫ Signal Loss
          </button>
          <button
            onClick={() => startStory('compound')}
            className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
              activeStory === 'compound'
                ? 'bg-rose-700 text-amber-200 border-amber-400 font-bold shadow-md'
                : 'bg-rose-950/80 text-rose-300 border-rose-800 hover:bg-rose-900'
            }`}
          >
            🚨 Fall + Gas Leak
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
      </div>

      {/* Visual Animation Stage: Surface vs Underground */}
      <div className="bg-[#080d16] border border-slate-800 rounded-xl p-4 sm:p-6 overflow-hidden relative">
        {/* Sky / Surface Area */}
        <div className="relative pb-6 border-b-2 border-dashed border-amber-600/40">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider">
              SURFACE LEVEL (GROUND) — NO CELLULAR / INTERNET NEEDED
            </span>
            <span>BASE STATION RECEIVER</span>
          </div>

          <div className="flex items-center justify-between">
            {/* Surface Base Station Antenna & Laptop */}
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

            {/* Operator Emergency Bell status */}
            <div className="text-right font-mono text-xs hidden sm:block">
              <span className="text-slate-500 block text-[10px]">OPERATOR ALARM</span>
              <span
                className={`font-bold ${
                  worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD'
                    ? 'text-rose-400 animate-pulse text-sm'
                    : 'text-emerald-400'
                }`}
              >
                {worker.state === 'MAN_DOWN'
                  ? '🚨 SIREN SOUNDING'
                  : worker.state === 'GAS_HAZARD'
                  ? '🔥 GAS ALARM ACTIVE'
                  : '🟢 SILENT / MONITORING'}
              </span>
            </div>
          </div>

          {/* Radio Waves Animation in Mid-Air */}
          <div className="my-3 flex items-center justify-center">
            <div className="flex items-center gap-1.5 font-mono text-[11px] px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>
                Wireless 433 MHz LoRa Radio Carrier (Punches through 10ft Concrete & Earth)
              </span>
            </div>
          </div>
        </div>

        {/* Underground / Confined Space Area */}
        <div className="pt-6">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-3">
            <span className="font-bold text-slate-400 uppercase tracking-wider">
              UNDERGROUND CONFINED SPACE (SEWER / MINE / SUB-LEVEL 4B)
            </span>
            <span className="text-rose-400">NO 4G/5G COVERAGE</span>
          </div>

          {/* Worker Node Graphic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Worker Visual Avatar & Status */}
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
                worker.state === 'MAN_DOWN'
                  ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50'
                  : worker.state === 'GAS_HAZARD'
                  ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50'
                  : worker.state === 'POSSIBLE_FALL'
                  ? 'bg-amber-950/60 border-amber-500'
                  : 'bg-slate-900/90 border-slate-700'
              }`}
            >
              {/* Worker Avatar */}
              <div className="text-3xl sm:text-4xl">
                {worker.state === 'MAN_DOWN' ? '🤕' : worker.state === 'GAS_HAZARD' ? '😷' : worker.state === 'POSSIBLE_FALL' ? '⚠️' : '👷‍♂️'}
              </div>
              <div>
                <div className="font-bold text-white text-sm">
                  Worker 01 (Lead Scaffolder)
                </div>
                <div className="text-xs text-slate-300 font-mono mt-0.5">
                  State:{' '}
                  <strong
                    className={
                      worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD'
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

            {/* Wearable Sensors Telemetry (MQ-2 & MPU6050) */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col justify-between font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-1">
                WEARABLE SENSORS (HARDWARE)
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
                  <span className="text-slate-400">Battery:</span>
                  <strong className="text-slate-200">3.82 V (Lithium)</strong>
                </div>
              </div>
            </div>

            {/* Autonomous Local Arduino Decision */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex flex-col justify-between font-mono text-xs">
              <span className="text-slate-400 font-bold block mb-1">
                AUTONOMOUS ARDUINO BRAIN
              </span>
              <p className="text-[11px] text-slate-300 leading-snug font-sans">
                {worker.state === 'MAN_DOWN'
                  ? '🚨 Fall detected + 10s immobility timeout reached. Autonomous emergency decision confirmed!'
                  : worker.state === 'GAS_HAZARD'
                  ? '🔥 Gas reading passed safety threshold. Local buzzer activated!'
                  : worker.state === 'POSSIBLE_FALL'
                  ? '⚠️ High G impact registered. Immobility timer active...'
                  : '✅ All parameters normal. Transmitting 1Hz heartbeat packet.'}
              </p>
              <div className="text-[10px] text-slate-500 mt-2">
                *Decision executed on Arduino Uno. No cloud required.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Story Explainer Bar */}
      {activeStoryData && currentStepData ? (
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

            {/* Stepper controls */}
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

          {/* Quick operator action when in alert */}
          {(worker.state === 'MAN_DOWN' || worker.state === 'GAS_HAZARD') && (
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs text-amber-300 font-medium">
                Try Operator Action:
              </span>
              <button
                onClick={() => acknowledgeAlert(worker.id)}
                className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Click to Acknowledge Alert
              </button>
              <button
                onClick={() => requestResetWorker(worker.id)}
                className="px-3 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs"
              >
                Test Reset Override
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400 font-mono">
          Click any scenario above (e.g., <strong>🚨 Fall & Man-Down</strong> or <strong>🔥 Toxic Gas Leak</strong>) to start the step-by-step interactive walkthrough.
        </div>
      )}
    </div>
  );
};
