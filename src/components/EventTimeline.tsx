import React, { useState } from 'react';
import { useSafetySystem } from '../context/SafetySystemContext';
import {
  Download,
  Trash2,
  Search,
  AlertTriangle,
  ShieldAlert,
  Flame,
  Radio,
  CheckCircle2,
  Info,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';

export const EventTimeline: React.FC = () => {
  const { events, clearEvents, exportAuditBundle } = useSafetySystem();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEvents = events.filter((e) => {
    if (activeFilter === 'critical' && e.severity !== 'CRITICAL') return false;
    if (activeFilter === 'warning' && e.severity !== 'WARNING') return false;
    if (activeFilter === 'gas' && e.category !== 'gas') return false;
    if (activeFilter === 'man-down' && e.category !== 'man-down') return false;
    if (activeFilter === 'connection' && e.category !== 'connection') return false;
    if (activeFilter === 'system' && e.category !== 'system') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const match =
        e.workerId.toLowerCase().includes(term) ||
        e.workerName.toLowerCase().includes(term) ||
        e.eventType.toLowerCase().includes(term) ||
        e.description.toLowerCase().includes(term) ||
        (e.operatorNote && e.operatorNote.toLowerCase().includes(term));
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="bg-[#0e1626] border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* Top Header & Controls */}
      <div className="p-4 bg-[#0a101d] border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-mono font-bold text-white flex items-center gap-2">
            <span>SAFETY INCIDENT & TELEMETRY AUDIT TRAIL</span>
            <span className="text-xs font-normal text-slate-400">
              ({filteredEvents.length} events logged)
            </span>
          </h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Immutable log of worker states, operator acknowledgments, gas threshold crossings, and RF telemetry
          </p>
        </div>

        {/* 1-Click JSON and CSV Audit Bundle Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportAuditBundle('csv')}
            title="Download comprehensive CSV compliance audit bundle"
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV AUDIT BUNDLE
          </button>
          <button
            onClick={() => exportAuditBundle('json')}
            title="Download structured JSON telemetry & incident bundle"
            className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            JSON BUNDLE
          </button>
          <button
            onClick={clearEvents}
            title="Clear active event buffer"
            className="px-2.5 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-mono border border-rose-800/50 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            CLEAR
          </button>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="px-4 py-3 bg-[#0c121e] border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Filters */}
        <div className="flex items-center gap-1 flex-wrap overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'ALL' },
            { id: 'critical', label: 'CRITICAL' },
            { id: 'warning', label: 'WARNING' },
            { id: 'gas', label: 'GAS' },
            { id: 'man-down', label: 'MAN-DOWN' },
            { id: 'connection', label: 'RF LINK' },
            { id: 'system', label: 'SYSTEM' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-2.5 py-1 text-xs font-mono font-medium rounded transition-colors ${
                activeFilter === f.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search worker or incident..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-slate-900 border border-slate-700/80 rounded text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Event Stream List */}
      <div className="divide-y divide-slate-800/70 max-h-[550px] overflow-y-auto font-mono text-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No events match the selected filter criteria.
          </div>
        ) : (
          filteredEvents.map((e) => {
            let severityBadge = 'bg-slate-800 text-slate-400 border-slate-700';
            let Icon = Info;
            let rowBg = 'hover:bg-slate-800/30';

            if (e.severity === 'CRITICAL') {
              severityBadge = 'bg-rose-950 text-rose-300 border-rose-700';
              Icon = ShieldAlert;
              rowBg = 'bg-rose-950/15 hover:bg-rose-950/25';
            } else if (e.severity === 'WARNING') {
              severityBadge = 'bg-amber-950 text-amber-300 border-amber-700';
              Icon = AlertTriangle;
              rowBg = 'bg-amber-950/15 hover:bg-amber-950/25';
            }

            if (e.category === 'gas') Icon = Flame;
            if (e.category === 'connection') Icon = Radio;
            if (e.eventType === 'NORMAL' || e.eventType === 'RECOVERY') Icon = CheckCircle2;

            return (
              <div
                key={e.id}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${rowBg}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon
                      className={`w-4 h-4 ${
                        e.severity === 'CRITICAL'
                          ? 'text-rose-400'
                          : e.severity === 'WARNING'
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400 font-semibold">{e.timestamp}</span>
                      <span className="font-bold text-white">{e.workerId}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${severityBadge}`}
                      >
                        {e.eventType.replace('_', ' ')}
                      </span>
                      {e.gasValue !== undefined && (
                        <span className="text-[11px] text-slate-400">
                          Gas ADC: <strong className="text-slate-200">{e.gasValue}</strong>
                        </span>
                      )}
                      {e.rssi !== undefined && (
                        <span className="text-[11px] text-slate-400">
                          RSSI: <strong className="text-slate-200">{e.rssi} dBm</strong>
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 mt-1 leading-snug font-sans text-xs">
                      {e.description}
                    </p>
                    {e.operatorNote && (
                      <div className="mt-1 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded inline-block">
                        Operator Log: {e.operatorNote}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 self-start sm:self-center shrink-0 uppercase tracking-wide">
                  [{e.category}]
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
