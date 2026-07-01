import React, { useState } from 'react';
import { Search, Filter, Compass, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { FieldTeam, TeamStatus } from '../types';

interface TeamScheduleTableProps {
  teams: FieldTeam[];
}

export default function TeamScheduleTable({ teams }: TeamScheduleTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'name' | 'progress' | 'officersCount'>('name');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter items
  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          team.currentFocus.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          team.coords.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'All' || team.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort items
  const sortedTeams = [...filteredTeams].sort((a, b) => {
    let compareA = a[sortField];
    let compareB = b[sortField];
    
    if (typeof compareA === 'string') {
      compareA = compareA.toLowerCase();
      compareB = (compareB as string).toLowerCase();
    }
    
    if (compareA < compareB) return sortAsc ? -1 : 1;
    if (compareA > compareB) return sortAsc ? 1 : -1;
    return 0;
  });

  const getStatusColor = (status: TeamStatus) => {
    switch (status) {
      case 'On Track':
        return 'bg-brand-secondary-container/30 text-brand-on-secondary';
      case 'Delayed':
        return 'bg-brand-error-container text-brand-on-error';
      case 'Completed':
        return 'bg-surface-highest text-text-muted';
      default:
        return 'bg-surface-mid text-text-muted';
    }
  };

  const toggleSort = (field: 'name' | 'progress' | 'officersCount') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getLetterBg = (letter: string) => {
    switch (letter) {
      case 'A': return 'bg-brand-primary-light/30 text-brand-primary';
      case 'B': return 'bg-brand-tertiary/10 text-brand-tertiary';
      case 'G': return 'bg-brand-secondary-container/45 text-brand-secondary';
      default: return 'bg-surface-high text-text-main';
    }
  };

  return (
    <section className="bg-surface-lowest rounded-2xl border border-text-border shadow-shard overflow-hidden">
      {/* Control Header */}
      <div className="p-6 border-b border-text-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-text-main">
            Team Schedule &amp; Work Plan
          </h3>
          <p className="text-xs text-text-outline mt-0.5">
            Real-time status of assigned geographical survey units
          </p>
        </div>
        
        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Search teams, sectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 pl-9 pr-4 py-2 text-xs bg-surface-bg border border-text-border rounded-xl text-text-main placeholder-text-outline focus:outline-none focus:border-brand-primary transition-all font-medium"
            />
            <Search className="w-3.5 h-3.5 text-text-outline absolute left-3 top-3" />
          </div>

          {/* Filter button mock */}
          <div className="flex items-center bg-surface-bg p-1 rounded-xl border border-text-border">
            {['All', 'On Track', 'Delayed', 'Completed'].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`
                  px-3 py-1 text-[11px] font-bold rounded-lg transition-all
                  ${statusFilter === tab 
                    ? 'bg-brand-primary text-white shadow-xs' 
                    : 'text-text-muted hover:text-text-main'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-low/50 border-b border-text-border">
            <tr>
              <th 
                className="px-6 py-4 text-xs font-bold text-text-outline tracking-wider cursor-pointer hover:text-text-main select-none transition-colors"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1.5">
                  FIELD TEAM
                  <ArrowUpDown className="w-3 h-3 text-text-outline/65" />
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-text-outline tracking-wider">
                CURRENT FOCUS
              </th>
              <th 
                className="px-6 py-4 text-xs font-bold text-text-outline tracking-wider cursor-pointer hover:text-text-main select-none transition-colors"
                onClick={() => toggleSort('progress')}
              >
                <div className="flex items-center gap-1.5">
                  TARGET PROGRESS
                  <ArrowUpDown className="w-3 h-3 text-text-outline/65" />
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-bold text-text-outline tracking-wider">
                STATUS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-text-border">
            {sortedTeams.length > 0 ? (
              sortedTeams.map((team) => (
                <tr 
                  key={team.id} 
                  className="hover:bg-surface-low/20 transition-all group"
                >
                  {/* Field Team details */}
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shadow-xs ${getLetterBg(team.letter)}`}>
                        {team.letter}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-text-main group-hover:text-brand-primary transition-colors">
                          {team.name}
                        </p>
                        <p className="text-xs text-text-outline font-medium">
                          {team.officersCount} Officers
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Current Focus coordinates */}
                  <td className="px-6 py-5">
                    <p className="text-sm font-semibold text-text-main">
                      {team.currentFocus}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-text-outline font-mono mt-0.5">
                      <Compass className="w-3 h-3 text-brand-secondary" />
                      <span>{team.coords}</span>
                    </div>
                  </td>

                  {/* Target Progress Bar */}
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-between text-xs font-semibold text-text-muted mb-1">
                      <span>{team.progress}% completed</span>
                    </div>
                    <div className="w-full bg-surface-high rounded-full h-2 overflow-hidden shadow-xs">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          team.status === 'Delayed' 
                            ? 'bg-brand-error' 
                            : team.status === 'Completed'
                            ? 'bg-brand-primary'
                            : 'bg-brand-primary-container'
                        }`}
                        style={{ width: `${team.progress}%` }}
                      />
                    </div>
                  </td>

                  {/* Status chip */}
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-xs ${getStatusColor(team.status)}`}>
                      {team.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-outline font-medium">
                  No active teams found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
