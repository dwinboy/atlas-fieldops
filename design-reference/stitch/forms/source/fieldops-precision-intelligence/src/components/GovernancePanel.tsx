import React from 'react';
import { Shield, Lock, Fingerprint, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { AuditLog } from '../types';

interface GovernancePanelProps {
  auditLogs: AuditLog[];
  onClearLogs?: () => void;
}

export default function GovernancePanel({ auditLogs, onClearLogs }: GovernancePanelProps) {
  
  // Icon mapper for audit logs
  const getLogIcon = (type: string, status: string) => {
    switch (status) {
      case 'success':
        return <div className="w-2.5 h-2.5 rounded-full bg-[#006a61] shadow-sm shadow-[#006a61]" />;
      case 'error':
        return <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-sm shadow-red-500" />;
      case 'warning':
        return <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-400" />;
      case 'info':
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500" />;
    }
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left mt-8">
      {/* Governance Standards (Dark Emerald showcase) */}
      <div className="lg:col-span-2 bg-[#0C1F1B] text-white rounded-xl p-8 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 bottom-0 opacity-5 -translate-x-12 translate-y-12">
          <Shield className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#9cf5c1] text-3xl">security</span>
            <h2 className="text-xl font-bold text-white tracking-tight">Governance Protocol &amp; Audit</h2>
          </div>
          <p className="text-xs text-outline-variant max-w-xl leading-relaxed">
            All FieldOps registries are regulated under international field intelligence safety mandates. Data packets operate with strict local cryptographic buffering before regional synchronization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 pt-4 border-t border-white/10 mt-4">
          {/* Item 1 */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
              <Lock className="w-5 h-5 text-[#9cf5c1]" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white mb-0.5">End-to-End Encryption</h4>
              <p className="text-[11px] text-outline-variant/80 leading-relaxed">
                All collected data is encrypted at rest using AES-256 standards with hardware-level security tokens.
              </p>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/5">
              <Fingerprint className="w-5 h-5 text-[#9cf5c1]" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white mb-0.5">Digital Identity Binding</h4>
              <p className="text-[11px] text-outline-variant/80 leading-relaxed">
                Submission IDs are permanently bound to the field officer's biometric hash and GPS coordinates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Audit Log timeline */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-center border-b border-border-subtle pb-2">
          <h3 className="text-xs font-bold text-[#101e1a] uppercase tracking-wider">Recent Audit Log</h3>
          {onClearLogs ? (
            <button 
              onClick={onClearLogs}
              className="text-[#005232] font-bold text-xs hover:underline cursor-pointer"
            >
              Reset Logs
            </button>
          ) : (
            <span className="text-[10px] bg-[#edfdf6] text-[#005232] border border-[#e1f2eb] px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wide">
              LIVE MONITORED
            </span>
          )}
        </div>

        {/* Timeline body */}
        <div className="space-y-4 max-h-[175px] overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-outline text-xs">
              No audit activities recorded.
            </div>
          ) : (
            auditLogs.map((log, index) => (
              <div key={log.id} className="flex gap-3 relative group">
                {/* Node Connector Line */}
                {index < auditLogs.length - 1 && (
                  <div className="absolute left-[5px] top-3 bottom-0 w-0.5 node-connector" />
                )}
                
                {/* Node Dot */}
                <div className="h-full min-h-[36px] flex flex-col items-center pt-1.5 z-10 shrink-0">
                  {getLogIcon(log.type, log.status)}
                </div>

                <div>
                  <p className="text-xs font-semibold text-[#101e1a] line-clamp-1 leading-tight">
                    {log.title}
                  </p>
                  <p className="text-[10px] text-outline font-semibold mt-0.5">
                    {log.description}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
