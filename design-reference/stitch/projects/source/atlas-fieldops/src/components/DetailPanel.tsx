import React, { useState, FormEvent } from 'react';
import { Sprout, User, Globe, Calendar, FileText, Users, BarChart3, Plus, Send, LineChart, CheckCircle2 } from 'lucide-react';
import { Project, Activity } from '../types';

interface DetailPanelProps {
  project: Project | null;
  onAddActivity: (projectId: string, activity: Omit<Activity, 'id'>) => void;
  onViewReport: (project: Project) => void;
}

export default function DetailPanel({ project, onAddActivity, onViewReport }: DetailPanelProps) {
  const [newActivityText, setNewActivityText] = useState('');
  const [activeQuickLink, setActiveQuickLink] = useState<'forms' | 'ops' | 'results' | null>(null);

  if (!project) {
    return (
      <aside className="w-96 border-l border-border-subtle bg-surface-container-lowest flex flex-col items-center justify-center p-6 text-center h-full">
        <div className="w-16 h-16 rounded-full bg-primary-container/10 flex items-center justify-center text-primary mb-4 animate-bounce">
          <Sprout className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-1">Select a Project</h3>
        <p className="text-xs text-on-surface-variant/60 max-w-[240px]">
          Click on any project card in the repository to view deep telemetry, activity feed, and operational reports.
        </p>
      </aside>
    );
  }

  const handleAddActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivityText.trim()) return;

    onAddActivity(project.id, {
      title: 'Manual Entry Log',
      description: newActivityText.trim(),
      timestamp: 'JUST NOW',
    });
    setNewActivityText('');
  };

  return (
    <aside className="w-full lg:w-96 border-l border-border-subtle bg-surface-container-lowest flex flex-col h-full overflow-hidden">
      {/* Selected Project Header */}
      <div className="p-6 border-b border-border-subtle">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-primary-container/10 flex items-center justify-center text-primary shadow-sm">
            <Sprout className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-lg font-bold leading-tight tracking-tight text-on-surface truncate">
              {project.name}
            </h3>
            <span className="text-xs font-mono font-semibold text-on-surface-variant/60 tracking-wider">
              ID: {project.id}
            </span>
          </div>
        </div>

        {/* Project Meta Information */}
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant/70 font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-outline" /> Project Lead
            </span>
            <span className="font-bold text-on-surface">{project.leadName}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant/70 font-medium flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-outline" /> Region
            </span>
            <span className="font-bold text-on-surface">{project.region}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-on-surface-variant/70 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-outline" /> Start Date
            </span>
            <span className="font-bold text-on-surface">{project.startDate}</span>
          </div>
        </div>
      </div>

      {/* Quick Links Group */}
      <div className="p-4 border-b border-border-subtle grid grid-cols-3 gap-2 bg-surface-container-lowest">
        <button
          onClick={() => setActiveQuickLink(activeQuickLink === 'forms' ? null : 'forms')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group cursor-pointer ${
            activeQuickLink === 'forms'
              ? 'bg-primary-container/10 text-primary scale-[0.98]'
              : 'hover:bg-surface-container text-on-surface'
          }`}
        >
          <FileText className={`w-5 h-5 text-primary group-hover:scale-110 transition-transform`} />
          <span className="text-[11px] font-bold">Forms</span>
        </button>
        
        <button
          onClick={() => setActiveQuickLink(activeQuickLink === 'ops' ? null : 'ops')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group cursor-pointer ${
            activeQuickLink === 'ops'
              ? 'bg-primary-container/10 text-primary scale-[0.98]'
              : 'hover:bg-surface-container text-on-surface'
          }`}
        >
          <Users className={`w-5 h-5 text-primary group-hover:scale-110 transition-transform`} />
          <span className="text-[11px] font-bold">Field Ops</span>
        </button>
        
        <button
          onClick={() => setActiveQuickLink(activeQuickLink === 'results' ? null : 'results')}
          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all group cursor-pointer ${
            activeQuickLink === 'results'
              ? 'bg-primary-container/10 text-primary scale-[0.98]'
              : 'hover:bg-surface-container text-on-surface'
          }`}
        >
          <BarChart3 className={`w-5 h-5 text-primary group-hover:scale-110 transition-transform`} />
          <span className="text-[11px] font-bold">Results</span>
        </button>
      </div>

      {/* Contextual description for active quick links */}
      {activeQuickLink && (
        <div className="bg-primary/5 px-6 py-3 border-b border-border-subtle text-xs text-primary font-medium animate-fade-in">
          {activeQuickLink === 'forms' && (
            <p>📋 Showing baseline structure for {project.formsCount} forms currently assigned to field agents.</p>
          )}
          {activeQuickLink === 'ops' && (
            <p>👷 Active agents are deploying logistics trackers across the {project.locationLabel} area.</p>
          )}
          {activeQuickLink === 'results' && (
            <p>📊 Performance metric indicates standard speed is in "{project.metricValue}" status.</p>
          )}
        </div>
      )}

      {/* Activity Feed */}
      <div className="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div>
          <h4 className="text-xs font-bold text-on-surface-variant/80 uppercase tracking-widest mb-5">
            Activity Feed
          </h4>
          <div className="space-y-6 relative pl-4">
            {/* Thread line */}
            <div className="absolute left-[3px] top-1.5 bottom-1.5 w-[2px] bg-outline-variant/30"></div>

            {project.activities.map((act) => (
              <div key={act.id} className="relative group/item">
                {/* Node dot */}
                <div className="absolute -left-[16px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-primary bg-white z-10 group-hover/item:bg-primary transition-colors"></div>
                
                <div className="flex flex-col">
                  <p className="text-xs font-bold text-on-surface tracking-tight group-hover/item:text-primary transition-colors">
                    {act.title}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/70 leading-relaxed mt-0.5">
                    {act.description}
                  </p>
                  <span className="text-[9px] text-outline font-bold tracking-wide mt-1 uppercase">
                    {act.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Input box for adding a manual activity entry */}
        <form onSubmit={handleAddActivitySubmit} className="mt-6 border-t border-border-subtle/50 pt-4">
          <div className="relative flex items-center bg-surface-container-low rounded-full px-3.5 py-1.5 border border-outline-variant/20 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/5">
            <Plus className="w-4 h-4 text-outline mr-2" />
            <input
              type="text"
              className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs w-full text-on-surface placeholder:text-on-surface-variant/40"
              placeholder="Log manual audit event..."
              value={newActivityText}
              onChange={(e) => setNewActivityText(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newActivityText.trim()}
              className="p-1 rounded-full text-primary hover:bg-primary/10 disabled:text-outline/40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Detail Footer */}
      <div className="p-4 border-t border-border-subtle bg-surface-container-low">
        <button
          onClick={() => onViewReport(project)}
          className="w-full bg-primary-container text-on-primary-container font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-md shadow-primary/5"
        >
          <LineChart className="w-4 h-4" />
          View Full Intelligence Report
        </button>
      </div>
    </aside>
  );
}
