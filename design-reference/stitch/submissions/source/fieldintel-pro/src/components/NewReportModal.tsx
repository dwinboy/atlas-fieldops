import React, { useState, FormEvent } from 'react';
import { X, Send, MapPin, ClipboardList, Info } from 'lucide-react';
import { SubmissionRecord, SectorType, UrgencyType } from '../types';

interface NewReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: SubmissionRecord) => void;
}

export default function NewReportModal({ isOpen, onClose, onSubmit }: NewReportModalProps) {
  const [entityName, setEntityName] = useState('');
  const [subTitle, setSubTitle] = useState('');
  const [sector, setSector] = useState<SectorType>('HEALTH');
  const [officerName, setOfficerName] = useState('Sarah Jenkins');
  const [urgency, setUrgency] = useState<UrgencyType>('NORMAL');
  const [lat, setLat] = useState('9.0820');
  const [lng, setLng] = useState('8.6753');
  const [supplyLevel, setSupplyLevel] = useState('85% Capacity');
  const [lastAudit, setLastAudit] = useState('Just Now');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim()) {
      alert('Please provide an Entity Name.');
      return;
    }

    // Set standard preset images based on the sector for realism
    let entityImage = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=300';
    let mapImage = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400';
    let evidenceImages = [
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=300',
      'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=300'
    ];

    if (sector === 'AGRI') {
      entityImage = 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=300';
      evidenceImages = [
        'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=300',
        'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&q=80&w=300'
      ];
    } else if (sector === 'INFRA') {
      entityImage = 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=300';
      evidenceImages = [
        'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=300',
        'https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&q=80&w=300'
      ];
    }

    const newRecord: SubmissionRecord = {
      id: `#FO-${Math.floor(1000 + Math.random() * 9000)}`,
      entityName: entityName.trim(),
      subTitle: subTitle.trim() || 'General Operations Unit',
      sector,
      fieldOfficer: {
        name: officerName,
        avatarUrl: officerName === 'Sarah Jenkins' 
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100'
          : officerName === 'David Okafor'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100'
          : officerName === 'Elena Rodriguez'
          ? 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100'
          : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100'
      },
      dateSubmitted: 'Oct 24, 08:00 AM',
      timestamp: Date.now(),
      status: 'Pending',
      urgency,
      gps: {
        latitude: parseFloat(lat) || 9.0820,
        longitude: parseFloat(lng) || 8.6753,
        displayString: `${parseFloat(lat).toFixed(4)}° N, ${parseFloat(lng).toFixed(4)}° E`
      },
      entityImage,
      mapImage,
      formIntelligence: {
        supplyLevel,
        lastAudit,
        additionalMetrics: [
          { label: 'Battery Health', value: 'Optimal' },
          { label: 'Transmission', value: '4G LTE' }
        ]
      },
      officerNotes: notes.trim() || 'No administrative field notes submitted by the inspecting officer.',
      fieldEvidence: evidenceImages
    };

    onSubmit(newRecord);

    // Reset fields
    setEntityName('');
    setSubTitle('');
    setSector('HEALTH');
    setOfficerName('Sarah Jenkins');
    setUrgency('NORMAL');
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl border border-outline-variant w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-primary">Submit New Field Report</h3>
              <p className="text-xs text-on-surface-variant font-medium">Create a compliant operational audit record instantly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full hover:bg-surface-container cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Entity Name */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Entity Name *
              </label>
              <input
                type="text"
                required
                className="w-full border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="e.g. Lagos Health Clinic"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
              />
            </div>

            {/* Subtitle / Department */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Subtitle / Unit / Department
              </label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="e.g. Outpost Cluster C"
                value={subTitle}
                onChange={(e) => setSubTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Sector Select */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Sector Type
              </label>
              <select
                className="w-full border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                value={sector}
                onChange={(e) => setSector(e.target.value as SectorType)}
              >
                <option value="HEALTH">Health</option>
                <option value="AGRI">Agriculture</option>
                <option value="INFRA">Infrastructure</option>
              </select>
            </div>

            {/* Field Officer */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Assign Inspecting Officer
              </label>
              <select
                className="w-full border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
              >
                <option value="Sarah Jenkins">Sarah Jenkins (Health Specialist)</option>
                <option value="David Okafor">David Okafor (Agri Inspector)</option>
                <option value="Elena Rodriguez">Elena Rodriguez (Safety Lead)</option>
                <option value="Marcus Thorne">Marcus Thorne (Civil Engineer)</option>
              </select>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Urgency Tier
              </label>
              <div className="flex gap-4 items-center py-1.5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-on-surface cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="NORMAL"
                    checked={urgency === 'NORMAL'}
                    onChange={() => setUrgency('NORMAL')}
                    className="text-primary focus:ring-primary"
                  />
                  Normal
                </label>
                <label className="flex items-center gap-1.5 text-sm font-extrabold text-red-600 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value="URGENT"
                    checked={urgency === 'URGENT'}
                    onChange={() => setUrgency('URGENT')}
                    className="text-error focus:ring-error"
                  />
                  URGENT
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* GPS Latitude */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Latitude / Longitude
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.0001"
                  className="w-1/2 border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Lat: 9.0820"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                />
                <input
                  type="number"
                  step="0.0001"
                  className="w-1/2 border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Lng: 8.6753"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>

            {/* Supply Level */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Supply Level / Capacity
              </label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. 88% Capacity"
                value={supplyLevel}
                onChange={(e) => setSupplyLevel(e.target.value)}
              />
            </div>

            {/* Last Audit */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Last Audit Period
              </label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="e.g. 12 Days Ago"
                value={lastAudit}
                onChange={(e) => setLastAudit(e.target.value)}
              />
            </div>
          </div>

          {/* Officer Field Notes */}
          <div>
            <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Field Inspection Officer Notes
            </label>
            <textarea
              className="w-full border border-outline-variant rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none h-24 resize-none"
              placeholder="e.g. All storage facilities and refrigeration devices checked and working under safe bounds..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant flex items-start gap-3">
            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-on-surface-variant font-medium">
              Upon clicking "Submit", this report is created in a <strong>Pending</strong> state. It will instantly update your local database array, increase the "Pending Review" count, and show up immediately in the records table. You can then review, approve, or return it.
            </div>
          </div>

        </form>

        {/* Modal Actions */}
        <div className="p-6 border-t border-outline-variant bg-surface-container-lowest flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-outline-variant hover:bg-surface-container rounded-xl text-xs font-bold text-on-surface transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleFormSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white hover:bg-primary-container rounded-xl text-xs font-bold shadow-md shadow-primary/20 cursor-pointer active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
            Submit Field Report
          </button>
        </div>

      </div>
    </div>
  );
}
