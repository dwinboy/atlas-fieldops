import { X, MapPin, ClipboardCheck, Clock, Undo2, CheckCircle2, AlertTriangle, Eye, ZoomIn } from 'lucide-react';
import { SubmissionRecord } from '../types';
import { useState } from 'react';

interface DetailPanelProps {
  record: SubmissionRecord | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReturn: (id: string) => void;
}

export default function DetailPanel({
  record,
  onClose,
  onApprove,
  onReturn,
}: DetailPanelProps) {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (!record) {
    return (
      <aside 
        id="detail-panel-empty"
        className="w-[400px] bg-white rounded-2xl border border-outline-variant flex flex-col justify-center items-center p-8 text-center shadow-lg"
      >
        <ClipboardCheck className="w-16 h-16 text-outline-variant mb-4 animate-pulse" />
        <h3 className="text-lg font-extrabold text-primary mb-1">No Record Selected</h3>
        <p className="text-xs text-on-surface-variant max-w-xs">
          Select any submission from the table on the left to review geographical coordinates, audit logs, and photo evidence.
        </p>
      </aside>
    );
  }

  // Determine status color indicators
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'text-primary bg-primary/10';
      case 'Returned':
        return 'text-error bg-error/10';
      case 'In Review':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-orange-600 bg-orange-50';
    }
  };

  return (
    <aside 
      id={`detail-panel-${record.id}`}
      className="w-[400px] bg-white rounded-2xl border border-outline-variant flex flex-col shadow-lg overflow-hidden shrink-0 animate-in slide-in-from-right duration-300"
    >
      {/* Panel Header */}
      <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
        <div>
          <h3 className="text-lg font-extrabold text-primary leading-tight">Record Review</h3>
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-0.5">
            Audit ID: {record.id}
          </p>
        </div>
        <button
          id="btn-close-detail-panel"
          onClick={onClose}
          className="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full hover:bg-surface-container cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Scrollable Body */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {/* Entity Profile Information */}
        <div className="flex gap-4 items-start">
          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-outline-variant shadow-sm relative group">
            <img
              className="w-full h-full object-cover"
              src={record.entityImage}
              alt={record.entityName}
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setZoomedImage(record.entityImage)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-zoom-in text-white"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-sm text-on-surface truncate">
              {record.entityName}
            </h4>
            <p className="text-xs text-on-surface-variant mb-2 font-medium">
              {record.subTitle} • <span className="font-bold text-primary">{record.status}</span>
            </p>
            <div className="flex gap-2 flex-wrap">
              {record.urgency === 'URGENT' && (
                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[10px] font-extrabold tracking-wide flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3 text-red-700" />
                  URGENT
                </span>
              )}
              <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px] font-extrabold uppercase tracking-widest">
                {record.sector}
              </span>
            </div>
          </div>
        </div>

        {/* GPS Satellite Map Module */}
        <div className="rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="bg-surface-container-high px-4 py-2 border-b border-outline-variant flex justify-between items-center">
            <span className="text-[11px] font-extrabold text-on-surface-variant flex items-center gap-1 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              Geolocation
            </span>
            <span className="font-mono text-[10px] text-on-surface font-semibold tracking-wider">
              {record.gps.displayString}
            </span>
          </div>
          <div className="h-40 bg-slate-100 relative group overflow-hidden">
            <img
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              src={record.mapImage}
              alt="Geolocation satellite map"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
            <a
              id="link-open-maps"
              href={`https://www.google.com/maps/search/?api=1&query=${record.gps.latitude},${record.gps.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 bg-white hover:bg-primary hover:text-white text-on-surface px-2.5 py-1 rounded text-[10px] font-extrabold shadow-sm border border-outline-variant transition-all cursor-pointer"
            >
              Open in Maps
            </a>
          </div>
        </div>

        {/* Form Intelligence Items */}
        <div className="space-y-4">
          <h5 className="text-[11px] font-extrabold text-on-surface-variant tracking-widest uppercase">
            Form Intelligence
          </h5>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                Supply Level
              </p>
              <p className="text-sm font-extrabold text-on-surface">
                {record.formIntelligence.supplyLevel || 'N/A'}
              </p>
            </div>
            
            <div className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                Last Audit
              </p>
              <p className="text-sm font-extrabold text-on-surface">
                {record.formIntelligence.lastAudit || 'Never'}
              </p>
            </div>
          </div>

          {/* Additional Metrics if present */}
          {record.formIntelligence.additionalMetrics && record.formIntelligence.additionalMetrics.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {record.formIntelligence.additionalMetrics.map((met, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-0.5">
                    {met.label}
                  </p>
                  <p className="text-sm font-extrabold text-on-surface">
                    {met.value}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Officer Field Notes */}
          <div className="p-4 rounded-lg border border-outline-variant bg-surface-container-lowest shadow-sm">
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider mb-1.5">
              Officer Notes
            </p>
            <p className="text-xs text-on-surface leading-relaxed italic font-medium">
              "{record.officerNotes}"
            </p>
          </div>
        </div>

        {/* Field Evidence Photo Carousel */}
        <div className="space-y-3">
          <h5 className="text-[11px] font-extrabold text-on-surface-variant tracking-widest uppercase">
            Field Evidence
          </h5>
          
          <div className="grid grid-cols-3 gap-2">
            {record.fieldEvidence.map((imgUrl, index) => (
              <div 
                key={index}
                className="aspect-square rounded-lg border border-outline-variant overflow-hidden cursor-zoom-in relative group shadow-sm"
              >
                <img
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                  src={imgUrl}
                  alt={`Field evidence ${index + 1}`}
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => setZoomedImage(imgUrl)}
                  className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {/* Visual placeholder square */}
            <div 
              onClick={() => alert('All photo attachments have been audited. You can drag and drop new evidence photos here in premium.')}
              className="aspect-square rounded-lg border border-dashed border-outline-variant bg-surface-container hover:bg-surface-container-high flex flex-col items-center justify-center text-on-surface-variant cursor-pointer transition-colors shadow-sm"
            >
              <span className="font-extrabold text-xs text-primary">+2 More</span>
              <span className="text-[9px] text-on-surface-variant font-semibold uppercase mt-0.5">Add Photo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Bottom Actions */}
      <div className="p-6 border-t border-outline-variant bg-surface-container-lowest grid grid-cols-2 gap-4">
        <button
          id={`btn-return-${record.id}`}
          onClick={() => onReturn(record.id)}
          className="flex items-center justify-center gap-2 py-3 border border-error text-error hover:bg-error-container hover:text-on-error-container font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <Undo2 className="w-4 h-4" />
          Return Report
        </button>
        
        <button
          id={`btn-approve-${record.id}`}
          onClick={() => onApprove(record.id)}
          className="flex items-center justify-center gap-2 py-3 bg-primary text-white hover:bg-primary-container hover:text-on-primary-container font-bold text-xs rounded-xl active:scale-95 transition-all cursor-pointer shadow-md shadow-primary/15"
        >
          <CheckCircle2 className="w-4 h-4" />
          Approve Report
        </button>
      </div>

      {/* Full-Screen Zoom Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[100] cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-xl bg-white p-2">
            <img 
              src={zoomedImage} 
              alt="Evidence zoomed" 
              className="max-w-full max-h-[80vh] object-contain rounded"
              referrerPolicy="no-referrer"
            />
            <button 
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors"
              onClick={() => setZoomedImage(null)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
