import { X, ShieldCheck, Activity, Cpu, TrendingUp, Database, Network, RefreshCw } from 'lucide-react';
import { Project } from '../types';

interface ReportModalProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportModal({ project, isOpen, onClose }: ReportModalProps) {
  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity" />

      {/* Modal Box */}
      <div className="bg-white rounded-2xl max-w-2xl w-full h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col justify-between overflow-hidden shadow-2xl z-10 border border-border-subtle animate-fade-in">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle flex justify-between items-center bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <ShieldCheck className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-md font-bold text-on-surface">Intelligence & Integrity Audit Report</h3>
              <p className="text-[11px] font-mono text-on-surface-variant/60 tracking-wider">
                PRJ-{project.id}-NODE // SHA-256 SECURED
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-primary p-1.5 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-grow">
          {/* Main Info Hero */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 text-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 block mb-1">
                Audit Scope
              </span>
              <span className="text-md font-extrabold text-primary">{project.category} Category</span>
            </div>
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 text-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 block mb-1">
                Core Integrity
              </span>
              <span className="text-md font-extrabold text-secondary">99.9% Audited</span>
            </div>
            <div className="bg-surface-container p-4 rounded-xl border border-outline-variant/10 text-center">
              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 block mb-1">
                Status Metric
              </span>
              <span className="text-md font-extrabold text-primary">{project.metricValue}</span>
            </div>
          </div>

          {/* Visual SVG Charting section */}
          <div>
            <h4 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Multi-Day Telemetry Flux
            </h4>
            <div className="h-44 w-full bg-deep-emerald-dark rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
              {/* Grid Background Lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-10">
                <div className="border-b border-white w-full h-[1px]"></div>
                <div className="border-b border-white w-full h-[1px]"></div>
                <div className="border-b border-white w-full h-[1px]"></div>
                <div className="border-b border-white w-full h-[1px]"></div>
              </div>

              {/* Dynamic SVG Waveform Chart */}
              <div className="absolute inset-0 top-6 bottom-10 left-12 right-6">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Fill area */}
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#80d8a6" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#80d8a6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Agricultural / Health / Retail Category specific custom SVG path paths */}
                  <path
                    d={
                      project.category === 'Agriculture'
                        ? 'M 0 80 Q 25 30, 50 60 T 100 20 L 100 100 L 0 100 Z'
                        : project.category === 'Health'
                        ? 'M 0 60 Q 25 20, 50 70 T 100 40 L 100 100 L 0 100 Z'
                        : 'M 0 40 Q 25 80, 50 30 T 100 50 L 100 100 L 0 100 Z'
                    }
                    fill="url(#chartGradient)"
                    className="transition-all duration-1000"
                  />
                  
                  <path
                    d={
                      project.category === 'Agriculture'
                        ? 'M 0 80 Q 25 30, 50 60 T 100 20'
                        : project.category === 'Health'
                        ? 'M 0 60 Q 25 20, 50 70 T 100 40'
                        : 'M 0 40 Q 25 80, 50 30 T 100 50'
                    }
                    fill="none"
                    stroke="#80d8a6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="transition-all duration-1000 animate-dash"
                  />

                  {/* Nodes */}
                  <circle cx="25" cy={project.category === 'Agriculture' ? '50' : project.category === 'Health' ? '40' : '65'} r="2" fill="#80d8a6" className="animate-pulse" />
                  <circle cx="50" cy={project.category === 'Agriculture' ? '60' : project.category === 'Health' ? '70' : '30'} r="2" fill="#80d8a6" />
                  <circle cx="100" cy={project.category === 'Agriculture' ? '20' : project.category === 'Health' ? '40' : '50'} r="2" fill="#80d8a6" />
                </svg>
              </div>

              {/* Chart labels */}
              <div className="flex justify-between items-center text-[10px] text-surface-variant/40 font-semibold mt-auto z-10 font-mono">
                <span>EPOCH 01 // START</span>
                <span>EPOCH 02</span>
                <span>EPOCH 03</span>
                <span>EPOCH 04 // RECENT</span>
              </div>
            </div>
          </div>

          {/* Infrastructure Audited Records */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-widest flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-primary" /> Core Node Cryptography Logs
            </h4>
            
            <div className="bg-surface-bg rounded-xl p-4 border border-border-subtle font-mono text-[11px] text-on-surface-variant/80 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-secondary font-bold">✔</span>
                <span>[SSL_MATCH] Signature verified by secure node US-EAST-09.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-secondary font-bold">✔</span>
                <span>[GPS_CHECK] Coordinate sector bound confirmed: {project.locationLabel}.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-secondary font-bold">✔</span>
                <span>[HASH_SUM] Integrity checksum matched: sha256:d8f76e31ae8092.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-secondary font-bold">✔</span>
                <span>[LEAD_AUTH] Verified digital key authorization for {project.leadName}.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle bg-surface-container-low flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold bg-primary text-on-primary hover:opacity-95 rounded-xl transition-all cursor-pointer shadow-md shadow-primary/10"
          >
            Acknowledge & Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
