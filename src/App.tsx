import React, { useState } from 'react';
import { SafetySystemProvider, useSafetySystem } from './context/SafetySystemContext';
import { Header } from './components/Header';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { SummaryCards } from './components/SummaryCards';
import { WorkerCard } from './components/WorkerCard';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { ConfirmResetModal } from './components/ConfirmResetModal';
import { EventTimeline } from './components/EventTimeline';
import { SystemPanel } from './components/SystemPanel';
import { InteractiveSimulator } from './components/InteractiveSimulator';
import { HowItWorksModal } from './components/HowItWorksModal';
import {
  Play,
  RotateCcw,
  Flame,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Clock,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [simWorkerTarget, setSimWorkerTarget] = useState<string>('WORKER_01');
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);

  const {
    workers,
    baseStation,
    simulateScenario,
    events,
    setSelectedWorkerId,
  } = useSafetySystem();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* 1. Base Station Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
      />

      {/* 2. Critical Emergency Alert Banner */}
      <EmergencyAlertBanner />

      {/* 3. Main Workspace */}
      <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Friendly Quick-Start & Simulation Teaser Bar */}
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-slate-900 to-cyan-500/10 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>New to Vigil-X? Test How it Works in Real Time</span>
                    <span className="text-[10px] bg-amber-500/30 text-amber-300 font-mono px-1.5 py-0.2 rounded border border-amber-500/40">
                      INTERACTIVE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    See how physical wearable sensors trigger alarms and beam LoRa packets without any internet or cellular connection.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={() => setIsHowItWorksOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  💡 60-Sec Guide
                </button>
                <button
                  onClick={() => setActiveTab('simulation')}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-sm flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Open Simulation Lab
                </button>
              </div>
            </div>

            {/* System Summary Cards */}
            <SummaryCards />

            {/* Quick Demo Mode Simulation Bar (Section 22) */}
            {baseStation.mode === 'DEMO' && (
              <div className="p-3.5 bg-[#0f1728] border border-amber-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 text-[10px]">
                    DEMO SIMULATOR
                  </span>
                  <span className="text-slate-300 font-medium font-sans">
                    Quick Hardware Test:
                  </span>
                  <select
                    value={simWorkerTarget}
                    onChange={(e) => setSimWorkerTarget(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 text-xs font-bold"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.id} ({w.displayName.split(' - ')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => simulateScenario('normal', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-semibold transition-colors"
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => simulateScenario('gas_hazard', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-semibold transition-colors flex items-center gap-1"
                  >
                    <Flame className="w-3 h-3" />
                    Gas Hazard
                  </button>
                  <button
                    onClick={() => simulateScenario('possible_fall', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/60 font-semibold transition-colors flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Possible Fall
                  </button>
                  <button
                    onClick={() => simulateScenario('man_down', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/60 font-semibold transition-colors flex items-center gap-1"
                  >
                    <ShieldAlert className="w-3 h-3" />
                    Man Down
                  </button>
                  <button
                    onClick={() => simulateScenario('compound_hazard', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-rose-950 text-amber-200 border border-amber-500/80 font-bold transition-colors flex items-center gap-1"
                    title="Simulate simultaneous Man Down and Gas Hazard"
                  >
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    Fall + Gas
                  </button>
                  <button
                    onClick={() => simulateScenario('sensor_fault', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-amber-950/70 hover:bg-amber-900 text-amber-300 border border-amber-800/60 font-semibold transition-colors"
                    title="Simulate sensor disconnection or invalid ADC"
                  >
                    Sensor Fault
                  </button>
                  <button
                    onClick={() => simulateScenario('offline', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold transition-colors"
                  >
                    Offline
                  </button>
                  <button
                    onClick={() => simulateScenario('recovery', simWorkerTarget)}
                    className="px-2.5 py-1.5 rounded bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 font-semibold transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Recovery
                  </button>
                </div>
              </div>
            )}

            {/* Workers Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
                    <span>MONITORED WORKER NODES</span>
                    <span className="text-xs font-normal text-slate-400">
                      ({workers.length} nodes active)
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time telemetry parsed from LoRa 433MHz carrier packets
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('workers')}
                  className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  Fleet View <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker) => (
                  <WorkerCard key={worker.id} worker={worker} />
                ))}
              </div>
            </div>

            {/* Bottom Split: Recent Events Snapshot & Engineering Principle Notice */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Recent Events Snapshot (2 cols) */}
              <div className="lg:col-span-2 bg-[#0e1626] border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      RECENT SAFETY LOGS
                    </h3>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className="text-xs font-mono text-amber-400 hover:text-amber-300"
                    >
                      View All ({events.length})
                    </button>
                  </div>

                  <div className="divide-y divide-slate-800/60 font-mono text-xs max-h-56 overflow-y-auto">
                    {events.slice(0, 5).map((e) => (
                      <div key={e.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-slate-500 text-[11px]">{e.timestamp}</span>
                          <span className="font-bold text-slate-300">{e.workerId}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded border ${
                              e.severity === 'CRITICAL'
                                ? 'bg-rose-950 text-rose-300 border-rose-800'
                                : e.severity === 'WARNING'
                                ? 'bg-amber-950 text-amber-300 border-amber-800'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {e.eventType}
                          </span>
                          <span className="text-slate-400 truncate text-[11px]">{e.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Engineering Principle Card (1 col) */}
              <div className="bg-[#0e1626] border border-slate-800 rounded-xl p-4 flex flex-col justify-between text-xs font-mono">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>ENGINEERING ARCHITECTURE</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans mb-3">
                    The Vigil-X emergency path is entirely infrastructure-independent:
                  </p>
                  <div className="p-2.5 bg-slate-950 rounded border border-slate-900 text-[11px] text-slate-400 space-y-1">
                    <div className="text-emerald-400 font-bold">1. SENSORS (MQ-2 + MPU6050)</div>
                    <div className="pl-3">↓ Autonomous reads</div>
                    <div className="text-emerald-400 font-bold">2. ARDUINO (UNO)</div>
                    <div className="pl-3">↓ Local state machine decision</div>
                    <div className="text-cyan-400 font-bold">3. LORA RF (SX1278 433MHz)</div>
                    <div className="pl-3">↓ Point-to-point wireless</div>
                    <div className="text-amber-400 font-bold">4. BASE STATION & DASHBOARD</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  *Emergency detection does NOT depend on cellular, WiFi, or cloud connectivity.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SIMULATION LAB TAB */}
        {activeTab === 'simulation' && <InteractiveSimulator />}

        {/* WORKERS TAB */}
        {activeTab === 'workers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-mono font-bold text-white">
                  WORKER FLEET STATUS & TELEMETRY
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Detailed inspection of individual nodes, gas sensors, IMU motion, and RF parameters
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workers.map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          </div>
        )}

        {/* ALERTS & TIMELINE TAB */}
        {activeTab === 'timeline' && <EventTimeline />}

        {/* SYSTEM & ARDUINO TAB */}
        {activeTab === 'system' && <SystemPanel />}
      </main>

      {/* Modal: Deep-dive Worker Detail Modal */}
      <WorkerDetailModal />

      {/* Modal: Controlled Reset Confirmation */}
      <ConfirmResetModal />

      {/* Modal: How It Works Plain English Explainer */}
      <HowItWorksModal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        onStartScenario={(s) => {
          setActiveTab('simulation');
          simulateScenario(s, 'WORKER_01');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <SafetySystemProvider>
      <DashboardContent />
    </SafetySystemProvider>
  );
}

