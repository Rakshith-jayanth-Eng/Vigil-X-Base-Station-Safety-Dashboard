import React from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  Radio,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Play,
  Usb,
  Power,
  RotateCcw,
} from 'lucide-react';

export const Header: React.FC<{
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenHowItWorks?: () => void;
}> = ({
  activeTab,
  setActiveTab,
  onOpenHowItWorks,
}) => {
  const {
    baseStation,
    setMode,
    toggleBaseStationPower,
    toggleLoraLink,
    toggleAudioAlarm,
    connectSerial,
    disconnectSerial,
    autoSimulate,
    toggleAutoSimulate,
    criticalAlerts,
  } = useSafetySystem();

  const formatUptime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const hasCritical = criticalAlerts.length > 0;

  return (
    <header className="border-b border-slate-800 bg-[#0d131f] text-slate-100 sticky top-0 z-40 select-none">
      {/* Top Technical Status Bar */}
      <div className="px-4 py-2 bg-[#080d16] border-b border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">BASE STATION:</span>
            <button
              onClick={toggleBaseStationPower}
              title="Toggle Base Station Power"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[11px] font-semibold ${
                baseStation.isOnline
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/60'
                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/50 hover:bg-rose-900/60'
              }`}
            >
              <Power className="w-3 h-3" />
              {baseStation.isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">LoRa LINK:</span>
            <button
              onClick={toggleLoraLink}
              title="Toggle LoRa Link"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[11px] font-semibold ${
                baseStation.loraLinkConnected && baseStation.isOnline
                  ? 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50 hover:bg-cyan-900/60'
                  : 'bg-amber-950/60 text-amber-400 border border-amber-800/50 hover:bg-amber-900/60'
              }`}
            >
              <Radio className="w-3 h-3" />
              {baseStation.loraLinkConnected && baseStation.isOnline ? 'CONNECTED (433MHz)' : 'DISCONNECTED'}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">SERIAL:</span>
            {baseStation.serialConnected ? (
              <button
                onClick={disconnectSerial}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-[11px]"
                title="Disconnect USB Serial"
              >
                <Usb className="w-3 h-3" />
                {baseStation.serialPortName || 'USB ACTIVE'}
              </button>
            ) : (
              <button
                onClick={connectSerial}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700 hover:bg-slate-700 text-[11px]"
                title="Connect Arduino via Web Serial API"
              >
                <Usb className="w-3 h-3 text-slate-400" />
                CONNECT ARDUINO
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500">LAST PACKET:</span>
            <span className="text-slate-200">
              {baseStation.lastPacketTime
                ? new Date(baseStation.lastPacketTime).toTimeString().slice(0, 8)
                : 'WAITING'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-slate-500">UPTIME:</span>
            <span className="text-amber-400 font-semibold">{formatUptime(baseStation.uptimeSeconds)}</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleAudioAlarm}
              title={baseStation.audioAlarmEnabled ? 'Alarm Sound: Enabled' : 'Alarm Sound: Muted'}
              className={`p-1 rounded border transition-colors ${
                baseStation.audioAlarmEnabled
                  ? 'border-amber-500/40 text-amber-400 bg-amber-950/30 hover:bg-amber-900/40'
                  : 'border-slate-700 text-slate-500 bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              {baseStation.audioAlarmEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Row */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black tracking-wider text-base">
            VX
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-white font-mono">
                VIGIL-X
              </h1>
              <span className="text-[11px] font-mono uppercase px-1.5 py-0.2 border rounded bg-slate-800/80 text-slate-300 border-slate-700">
                BASE STATION
              </span>
              {hasCritical && (
                <span className="animate-pulse flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-600 text-white shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  EMERGENCY ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Infrastructure-Independent Worker Safety System
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-[#121927] p-1 rounded-lg border border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OVERVIEW
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'simulation'
                ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                : 'text-amber-400/90 hover:text-amber-300 bg-amber-500/10 border border-amber-500/20'
            }`}
          >
            <span>🎮</span>
            <span>SIMULATION LAB</span>
          </button>
          <button
            onClick={() => setActiveTab('workers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'workers'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WORKERS
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'timeline'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ALERTS & TIMELINE
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'system'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SYSTEM & ARDUINO
          </button>
        </nav>

        {/* Mode Selector & How It Works button */}
        <div className="flex items-center gap-2 flex-wrap">
          {onOpenHowItWorks && (
            <button
              onClick={onOpenHowItWorks}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors flex items-center gap-1"
              title="Learn how Vigil-X works in plain English"
            >
              <span>💡</span>
              <span>HOW IT WORKS</span>
            </button>
          )}

          <div className="flex items-center p-1 rounded-lg bg-[#121927] border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setMode('DEMO')}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                baseStation.mode === 'DEMO'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DEMO MODE
            </button>
            <button
              onClick={() => setMode('LIVE')}
              className={`px-2.5 py-1 rounded transition-colors font-semibold ${
                baseStation.mode === 'LIVE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              LIVE MODE
            </button>
          </div>

          {baseStation.mode === 'DEMO' && (
            <button
              onClick={toggleAutoSimulate}
              title="Toggle automatic telemetry jitter and periodic heartbeats"
              className={`px-2.5 py-1.5 rounded text-xs font-mono font-medium border flex items-center gap-1.5 transition-colors ${
                autoSimulate
                  ? 'bg-slate-800 text-emerald-400 border-emerald-800/60'
                  : 'bg-slate-800/50 text-slate-400 border-slate-700'
              }`}
            >
              <Play className={`w-3 h-3 ${autoSimulate ? 'text-emerald-400' : 'text-slate-500'}`} />
              {autoSimulate ? 'AUTO SIM: ON' : 'AUTO SIM: PAUSED'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
