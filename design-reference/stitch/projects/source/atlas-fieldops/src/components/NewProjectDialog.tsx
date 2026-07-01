import React, { useState, FormEvent } from 'react';
import { X, Sparkles, Folder, Plus } from 'lucide-react';
import { Project } from '../types';

interface NewProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Project) => void;
}

export default function NewProjectDialog({ isOpen, onClose, onSubmit }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Agriculture' | 'Health' | 'Retail'>('Agriculture');
  const [leadName, setLeadName] = useState('');
  const [region, setRegion] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [formsCount, setFormsCount] = useState(10);
  const [leadsCountVal, setLeadsCountVal] = useState('500');
  const [leadsLabel, setLeadsLabel] = useState('Leads'); // e.g. Leads, Active, Points

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !leadName.trim() || !region.trim()) return;

    // Generate random code for ID
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const catCode = category === 'Agriculture' ? 'AG' : category === 'Health' ? 'HL' : 'RT';
    const id = `PRJ-${randomDigits}-${catCode}`;

    // Select standard map images
    let image = '';
    let metricLabel = '';
    let metricValue = '';
    let metricType: 'trend' | 'deployment' | 'speed' = 'trend';
    let trendData: number[] = [];

    if (category === 'Agriculture') {
      image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxus8vV21f3bDZXg3XizddiSWTdUW7GwMhl_XnCJIFgeSmEl1kKqb4aRqvN-p5FSsXB161vupdE1Nm5GGwZcu1xPqYANaxS29Oh8ajb2ktXpu2_FxtQmZ0kjJv2qVnYVY8Pxx6D51sdk0Gz7xZShbBZVEdPbm_uRsVowL1hHYNTAr6mMTyrDcBIc7v5ADNySN7NCg3XxsftVBUzeoQq7ZIX86PykUxbhc-PK6zS8Pbj6jvQu68Mvy2TGqiZwT9qdaOPS-TxY-6gw';
      metricLabel = 'Submissions Trend';
      metricValue = '+5%';
      metricType = 'trend';
      trendData = [3, 4, 5, 4, 6];
    } else if (category === 'Health') {
      image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAE3B-GWZ79fI8UhBrDFkU2ubKYLqJ3Ox8V7PA73naUsFM7Svjn2lwTXQYKIy3Z_Cmx_yXE_mM_wP1neifh8INNP4P945chmgZMPoZmGwsTm8XiU3nmrjNmIKr1Kj4OZ9vYKS4-zJSVgYFJT5gP9A6hJSuOVEBHLhaf3_PB5dDvUixhWb-GVo5SuYQ3TgwYdhUfgH9CsOa09zrM4N8KIqfHpVPuytZ3SUIevoto_48KdhSgGHW03vhKbxzlabTYV0RNUf5QiYfYSg';
      metricLabel = 'Deployment Rate';
      metricValue = 'Optimal';
      metricType = 'deployment';
      trendData = [4, 5, 4, 7, 5];
    } else {
      image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmWdWN-0-4qspSxFRymujV4nfq5KTfLLyidre0oibup5lho6jKT8ShU9wy-oVslANw_KZt9Xv8ZvL9bBnRhgyG8Vg41G5KFqk73g5Zo1v20aTvcOHSkdDrkc0a6Dgq4_4BIefZLj6g2rai5J2414Z5vN1s0ue_svGaDXUHBQ-KTYckdYFlWOBxkO1hx0j01uN8QrSkgAqeiYJw0oEUoopEFhEk_2OQjOlKo8LVIdhiHY5pw7FB8wq7nCCZug4SBKQStspLMjjEXw';
      metricLabel = 'Audit Speed';
      metricValue = 'Fast';
      metricType = 'speed';
      trendData = [6, 7, 5, 8, 7];
    }

    const newProject: Project = {
      id,
      name: name.trim(),
      category,
      formsCount,
      leadsCount: `${leadsCountVal} ${leadsLabel}`,
      metricLabel,
      metricValue,
      metricType,
      trendData,
      image,
      locationLabel: locationLabel.trim() || 'Central Zone',
      leadName: leadName.trim(),
      region: region.trim(),
      startDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      activities: [
        {
          id: 'act-new-1',
          title: 'Project Initialized',
          description: `Enterprise deployment scope launched under lead ${leadName}.`,
          timestamp: 'JUST NOW',
        }
      ]
    };

    onSubmit(newProject);
    onClose();

    // Reset fields
    setName('');
    setCategory('Agriculture');
    setLeadName('');
    setRegion('');
    setLocationLabel('');
    setFormsCount(10);
    setLeadsCountVal('500');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-300" />

      {/* Slide-over Content */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-slide-in p-6 border-l border-border-subtle">
        <div>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Folder className="w-4 h-4" />
              </div>
              <h3 className="text-md font-bold text-on-surface">Initialize New Initiative</h3>
            </div>
            <button
              onClick={onClose}
              className="text-outline hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="new-project-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                Project Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Climate Resilience Mapping"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                Operational Cluster / Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Agriculture', 'Health', 'Retail'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      category === cat
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-outline-variant/30 text-on-surface-variant/70 hover:bg-surface-container-low'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Project Lead */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                Project Lead *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Mitchell"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                value={leadName}
                onChange={(e) => setLeadName(e.target.value)}
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                Global Region *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sub-Saharan Africa"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              />
            </div>

            {/* Specific Location Label */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                Target Sector / Location Cluster *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. East Nigeria Sector 4"
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
              />
            </div>

            {/* Scale Counts */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                  Forms Count
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  value={formsCount}
                  onChange={(e) => setFormsCount(parseInt(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant/80 uppercase tracking-wider mb-1.5">
                  Entities Type
                </label>
                <div className="flex gap-1">
                  <input
                    type="text"
                    className="w-1/2 px-2.5 py-2.5 rounded-xl border border-outline-variant/30 text-sm bg-surface-container-lowest focus:border-primary outline-none transition-all"
                    placeholder="500"
                    value={leadsCountVal}
                    onChange={(e) => setLeadsCountVal(e.target.value)}
                  />
                  <select
                    className="w-1/2 text-xs font-bold border border-outline-variant/30 rounded-xl px-2 bg-white"
                    value={leadsLabel}
                    onChange={(e) => setLeadsLabel(e.target.value)}
                  >
                    <option value="Leads">Leads</option>
                    <option value="Active">Active</option>
                    <option value="Points">Points</option>
                  </select>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="border-t border-border-subtle pt-4 flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold border border-outline-variant/30 hover:bg-surface-container rounded-xl text-on-surface-variant transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-project-form"
            className="flex-1 py-3 text-xs font-bold bg-primary text-on-primary hover:opacity-90 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-primary/10"
          >
            <Plus className="w-4 h-4" /> Initialize
          </button>
        </div>
      </div>
    </div>
  );
}
