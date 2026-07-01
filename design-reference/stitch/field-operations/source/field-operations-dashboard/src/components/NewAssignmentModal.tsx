import React, { useState } from 'react';
import { X, Calendar, ClipboardCheck, Users, MapPin, AlertCircle } from 'lucide-react';
import { FieldTeam, TeamStatus } from '../types';

interface NewAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newTeam: FieldTeam) => void;
}

export default function NewAssignmentModal({ isOpen, onClose, onSubmit }: NewAssignmentModalProps) {
  const [name, setName] = useState('');
  const [officersCount, setOfficersCount] = useState<number>(6);
  const [currentFocus, setCurrentFocus] = useState('');
  const [coords, setCoords] = useState('42.361, -71.060');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<TeamStatus>('On Track');
  const [letter, setLetter] = useState('D');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a team name');
      return;
    }
    if (!currentFocus.trim()) {
      setError('Please provide a current sector focus');
      return;
    }

    const newTeam: FieldTeam = {
      id: `team-${Date.now()}`,
      letter: letter.toUpperCase().substring(0, 1) || 'D',
      name: name.trim(),
      officersCount: Number(officersCount) || 1,
      currentFocus: currentFocus.trim(),
      coords: coords.trim(),
      progress: Math.min(100, Math.max(0, Number(progress))),
      status,
    };

    onSubmit(newTeam);
    
    // Reset form states
    setName('');
    setOfficersCount(6);
    setCurrentFocus('');
    setCoords('42.361, -71.060');
    setProgress(0);
    setStatus('On Track');
    setLetter('D');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs transition-opacity duration-300">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      
      {/* Modal Dialog Content */}
      <div className="bg-white rounded-2xl border border-text-border shadow-2xl w-full max-w-lg p-6 relative z-50 transform scale-100 transition-transform duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-outline hover:bg-surface-low hover:text-text-main transition-all"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-brand-primary/10 rounded-xl text-brand-primary">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-text-main">
              New Field Assignment
            </h3>
            <p className="text-xs text-text-outline">
              Dispatch an active survey team unit to a designated zone.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-brand-error-container/30 border border-brand-error/20 text-brand-on-error rounded-xl flex items-center gap-2 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Letter symbol */}
            <div>
              <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
                Avatar Letter
              </label>
              <input
                type="text"
                maxLength={1}
                value={letter}
                onChange={(e) => setLetter(e.target.value.toUpperCase())}
                placeholder="D"
                className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-bold text-center"
              />
            </div>

            {/* Officers quantity */}
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
                Active Officers
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={officersCount}
                onChange={(e) => setOfficersCount(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
              Survey Unit / Team Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (e.target.value.trim() && letter === 'D') {
                  setLetter(e.target.value.trim().charAt(0).toUpperCase());
                }
              }}
              placeholder="e.g. Forestry Outreach Delta"
              className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-semibold text-text-main"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
              Current Focus Sector
            </label>
            <input
              type="text"
              value={currentFocus}
              onChange={(e) => setCurrentFocus(e.target.value)}
              placeholder="e.g. Village C - Sector 12"
              className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-semibold text-text-main"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
                GPS Coords
              </label>
              <input
                type="text"
                value={coords}
                onChange={(e) => setCoords(e.target.value)}
                placeholder="42.361, -71.060"
                className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
                Initial Progress (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-text-outline uppercase tracking-wider mb-1.5">
              Operational Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TeamStatus)}
              className="w-full px-3.5 py-2 text-sm bg-surface-bg border border-text-border rounded-xl focus:border-brand-primary focus:outline-none font-bold text-text-main cursor-pointer"
            >
              <option value="On Track">On Track (Green)</option>
              <option value="Delayed">Delayed (Red)</option>
              <option value="Completed">Completed (Gray)</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-text-border mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-text-muted hover:text-text-main hover:bg-surface-low rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-container text-white text-xs font-bold rounded-xl transition-all shadow-shard flex items-center gap-1.5"
            >
              Dispatch Team
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
