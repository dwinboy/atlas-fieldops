import React, { useState } from 'react';
import { MoreVertical, FileText, Users, MapPin, Trash2, Eye } from 'lucide-react';
import { Project } from '../types';

interface ProjectCardProps {
  key?: string | number;
  project: Project;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, isSelected, onSelect, onDelete }: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Category specific styles
  const getCategoryStyles = (category: Project['category']) => {
    switch (category) {
      case 'Agriculture':
        return {
          tagClass: 'bg-secondary-container/40 text-on-secondary-container',
          borderClass: 'border-b-4 border-b-primary',
          hoverTitleClass: 'group-hover:text-primary',
          barColor: 'bg-secondary',
          barBg: 'bg-secondary/25',
          accentText: 'text-secondary',
        };
      case 'Health':
        return {
          tagClass: 'bg-tertiary-container/15 text-tertiary',
          borderClass: 'border-b-4 border-b-tertiary',
          hoverTitleClass: 'group-hover:text-tertiary',
          barColor: 'bg-tertiary',
          barBg: 'bg-tertiary/25',
          accentText: 'text-tertiary',
        };
      case 'Retail':
        return {
          tagClass: 'bg-cyan-accent/15 text-cyan-accent',
          borderClass: 'border-b-4 border-b-cyan-accent',
          hoverTitleClass: 'group-hover:text-cyan-accent',
          barColor: 'bg-cyan-accent',
          barBg: 'bg-cyan-accent/25',
          accentText: 'text-cyan-accent',
        };
    }
  };

  const styles = getCategoryStyles(project.category);

  return (
    <div
      onClick={onSelect}
      className={`group bg-surface-container-lowest border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 flex flex-col cursor-pointer relative ${styles.borderClass} ${
        isSelected ? 'ring-2 ring-primary border-transparent shadow-lg' : 'border-border-subtle'
      }`}
    >
      <div className="p-5 flex-grow">
        <div className="flex justify-between items-start mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${styles.tagClass}`}>
            {project.category}
          </span>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="text-outline hover:text-primary p-1.5 hover:bg-surface-container rounded-full transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-border-subtle rounded-xl shadow-lg z-30 py-1.5 text-xs text-on-surface-variant font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-surface-container hover:text-primary flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" /> View Details
                </button>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-error-container hover:text-error flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Project
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 className={`text-lg font-bold tracking-tight mb-2 text-on-surface transition-colors ${styles.hoverTitleClass}`}>
          {project.name}
        </h3>

        <div className="flex items-center gap-4 text-on-surface-variant/70 text-xs font-semibold mb-5">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-outline" /> {project.formsCount} Forms
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-outline" /> {project.leadsCount}
          </span>
        </div>

        {/* Dynamic Metric & Trend Bars */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-bold mb-2">
            <span className="text-on-surface-variant/70">{project.metricLabel}</span>
            <span className={`${styles.accentText}`}>{project.metricValue}</span>
          </div>
          <div className="h-8 w-full flex items-end gap-1.5 px-1 bg-surface-container-lowest rounded-lg border border-border-subtle/40 p-1">
            {project.trendData.map((val, i) => (
              <div key={i} className="flex-1 h-full flex items-end">
                <div
                  className={`${styles.barColor} w-full rounded-t-sm transition-all duration-500`}
                  style={{ height: `${(val / 10) * 100}%` }}
                ></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map Preview section */}
      <div className="h-28 w-full overflow-hidden relative border-t border-border-subtle group-hover:scale-102 transition-transform duration-500">
        <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>
        <img
          className="w-full h-full object-cover grayscale-[0.2] contrast-[1.05]"
          alt={project.name + " Map"}
          src={project.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-surface-container-lowest/20 to-transparent"></div>
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-full border border-border-subtle shadow-xs">
          <MapPin className={`w-3.5 h-3.5 ${styles.accentText}`} />
          <span className="text-[11px] font-bold text-on-surface">{project.locationLabel}</span>
        </div>
      </div>
    </div>
  );
}
