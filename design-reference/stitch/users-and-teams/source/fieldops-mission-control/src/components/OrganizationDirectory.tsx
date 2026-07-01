import { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, Edit2, Trash2, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { User } from '../types';

interface OrganizationDirectoryProps {
  users: User[];
  onDeleteUser: (id: string) => void;
  onEditUser: (user: User) => void;
}

export default function OrganizationDirectory({ 
  users, 
  onDeleteUser, 
  onEditUser 
}: OrganizationDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'supervisor' | 'officer' | 'agriculture' | 'live'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    email: string;
    role: 'Supervisor' | 'Officer' | 'Admin';
    team: 'Agriculture Alpha' | 'Health Outreach' | 'Infrastructure Delta' | 'Logistics Echo' | 'Central Command';
    status: 'Live' | 'Offline';
  } | null>(null);

  // Filter and search logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search matches name, email, or team
      const matchesSearch = 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.team.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Filter pills
      if (activeFilter === 'supervisor') return user.role === 'Supervisor';
      if (activeFilter === 'officer') return user.role === 'Officer';
      if (activeFilter === 'agriculture') return user.team.includes('Agriculture');
      if (activeFilter === 'live') return user.status === 'Live';

      return true;
    });
  }, [users, searchQuery, activeFilter]);

  // Pagination logic
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Guard page range if users list changes
  const currentPageSanitized = Math.min(currentPage, totalPages);
  
  const paginatedUsers = useMemo(() => {
    const start = (currentPageSanitized - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPageSanitized, itemsPerPage]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      team: user.team,
      status: user.status
    });
  };

  const saveEdit = (id: string) => {
    if (editForm) {
      onEditUser({
        id,
        ...editForm
      });
      setEditingUserId(null);
      setEditForm(null);
    }
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm(null);
  };

  return (
    <div className="bg-white border border-brand-outline-variant/40 rounded-xl overflow-hidden flex flex-col h-full shadow-sm transition-all duration-300">
      
      {/* Search and Quick Filters Header */}
      <div className="p-5 border-b border-brand-outline-variant/30 bg-brand-surface-container-low/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-brand-on-surface tracking-tight">Organization Directory</h3>
            <p className="text-xs text-brand-on-surface-variant/70 mt-0.5">Filter, search, and manage personnel records.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-2.5 text-brand-on-surface-variant/60 w-4 h-4" />
              <input 
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset page on search
                }}
                className="pl-9 pr-4 py-1.5 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all w-full md:w-60 text-brand-on-surface"
              />
            </div>
            
            <button 
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="p-2 border border-brand-outline-variant/40 rounded-lg hover:bg-brand-surface-container-low transition-all duration-200 text-brand-on-surface"
              title="Reset filters"
            >
              <SlidersHorizontal className="w-4 h-4 text-brand-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => { setActiveFilter('all'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ${
              activeFilter === 'all' 
                ? 'bg-brand-primary text-white shadow-sm' 
                : 'border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low'
            }`}
          >
            All Users
          </button>
          
          <button
            onClick={() => { setActiveFilter('supervisor'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ${
              activeFilter === 'supervisor' 
                ? 'bg-brand-primary text-white shadow-sm' 
                : 'border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low'
            }`}
          >
            Role: Supervisor
          </button>
          
          <button
            onClick={() => { setActiveFilter('officer'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ${
              activeFilter === 'officer' 
                ? 'bg-brand-primary text-white shadow-sm' 
                : 'border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low'
            }`}
          >
            Role: Officer
          </button>
          
          <button
            onClick={() => { setActiveFilter('agriculture'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ${
              activeFilter === 'agriculture' 
                ? 'bg-brand-primary text-white shadow-sm' 
                : 'border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low'
            }`}
          >
            Team: Agriculture
          </button>
          
          <button
            onClick={() => { setActiveFilter('live'); setCurrentPage(1); }}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 ${
              activeFilter === 'live' 
                ? 'bg-brand-primary text-white shadow-sm' 
                : 'border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low'
            }`}
          >
            Status: Live
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-brand-surface-container-low/40 border-b border-brand-outline-variant/30">
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-brand-on-surface-variant/75">User</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-brand-on-surface-variant/75">Role</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-brand-on-surface-variant/75">Team</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-brand-on-surface-variant/75">Status</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-brand-on-surface-variant/75 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-outline-variant/20">
            {paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-brand-on-surface-variant/60 font-medium">
                  No personnel matching the selected criteria.
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const isEditing = editingUserId === user.id;
                return (
                  <tr key={user.id} className="hover:bg-brand-surface-container-low/10 transition-colors">
                    {/* User Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <div className="space-y-2 max-w-xs">
                          <input 
                            type="text" 
                            value={editForm?.name || ''} 
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                            className="px-2 py-1 border border-brand-outline-variant rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            placeholder="Full Name"
                          />
                          <input 
                            type="email" 
                            value={editForm?.email || ''} 
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)}
                            className="px-2 py-1 border border-brand-outline-variant rounded text-xs w-full focus:outline-none focus:ring-1 focus:ring-brand-primary"
                            placeholder="Email address"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          {user.avatarUrl ? (
                            <img 
                              className="w-9 h-9 rounded-full object-cover border border-brand-outline-variant/30 shadow-sm" 
                              src={user.avatarUrl} 
                              alt={user.name}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-brand-primary-fixed-dim flex items-center justify-center font-bold text-brand-primary text-xs border border-brand-primary/20 shadow-sm">
                              {user.initials || user.name.split(' ').map(n => n[0]).join('')}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-brand-on-surface">{user.name}</p>
                            <p className="text-[11px] text-brand-on-surface-variant/70 font-mono">{user.email}</p>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Role Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select 
                          value={editForm?.role} 
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, role: e.target.value as any } : null)}
                          className="px-2 py-1 border border-brand-outline-variant rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        >
                          <option value="Supervisor">Supervisor</option>
                          <option value="Officer">Officer</option>
                          <option value="Admin">Admin</option>
                        </select>
                      ) : (
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          user.role === 'Supervisor' 
                            ? 'bg-brand-secondary-container text-brand-on-secondary-container border border-brand-secondary/20' 
                            : user.role === 'Officer'
                            ? 'bg-brand-tertiary-fixed text-brand-on-tertiary-fixed border border-brand-tertiary/20'
                            : 'bg-brand-primary-container text-brand-on-primary-container border border-brand-primary/20'
                        }`}>
                          {user.role}
                        </span>
                      )}
                    </td>

                    {/* Team Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-on-surface-variant">
                      {isEditing ? (
                        <select 
                          value={editForm?.team} 
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, team: e.target.value as any } : null)}
                          className="px-2 py-1 border border-brand-outline-variant rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        >
                          <option value="Agriculture Alpha">Agriculture Alpha</option>
                          <option value="Health Outreach">Health Outreach</option>
                          <option value="Infrastructure Delta">Infrastructure Delta</option>
                          <option value="Logistics Echo">Logistics Echo</option>
                          <option value="Central Command">Central Command</option>
                        </select>
                      ) : (
                        user.team
                      )}
                    </td>

                    {/* Status Column */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isEditing ? (
                        <select 
                          value={editForm?.status} 
                          onChange={(e) => setEditForm(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                          className="px-2 py-1 border border-brand-outline-variant rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
                        >
                          <option value="Live">Live</option>
                          <option value="Offline">Offline</option>
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${
                            user.status === 'Live' ? 'bg-emerald-500 animate-pulse' : 'bg-brand-outline-variant'
                          }`} />
                          <span className="text-sm font-medium text-brand-on-surface-variant">{user.status}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => saveEdit(user.id)}
                            className="p-1.5 hover:bg-brand-primary/10 text-brand-primary rounded-lg transition-colors"
                            title="Save Changes"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={cancelEdit}
                            className="p-1.5 hover:bg-brand-on-surface-variant/15 text-brand-on-surface-variant rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => startEdit(user)}
                            className="p-1.5 hover:bg-brand-surface-container-low text-brand-on-surface-variant hover:text-brand-primary rounded-lg transition-colors"
                            title="Edit Personnel"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              if (confirm(`Are you sure you want to remove ${user.name} from the directory?`)) {
                                onDeleteUser(user.id);
                              }
                            }}
                            className="p-1.5 hover:bg-red-50 text-brand-error rounded-lg transition-colors"
                            title="Delete Personnel"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-brand-outline-variant/30 bg-brand-surface-container-low/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-xs text-brand-on-surface-variant/70">
          Showing {totalItems === 0 ? 0 : (currentPageSanitized - 1) * itemsPerPage + 1}-
          {Math.min(currentPageSanitized * itemsPerPage, totalItems)} of {totalItems} users
          {activeFilter !== 'all' && ` (filtered from ${users.length} total)`}
        </p>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handlePageChange(currentPageSanitized - 1)}
            disabled={currentPageSanitized === 1}
            className={`flex items-center gap-1 px-3 py-1 border border-brand-outline-variant/40 rounded-lg text-xs font-bold transition-all duration-200 ${
              currentPageSanitized === 1 
                ? 'opacity-40 cursor-not-allowed bg-brand-surface-container-low text-brand-on-surface-variant/40' 
                : 'bg-white text-brand-on-surface hover:bg-brand-surface-container-low'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
          
          <button 
            onClick={() => handlePageChange(currentPageSanitized + 1)}
            disabled={currentPageSanitized === totalPages}
            className={`flex items-center gap-1 px-3 py-1 border border-brand-outline-variant/40 rounded-lg text-xs font-bold transition-all duration-200 ${
              currentPageSanitized === totalPages 
                ? 'opacity-40 cursor-not-allowed bg-brand-surface-container-low text-brand-on-surface-variant/40' 
                : 'bg-white text-brand-on-surface hover:bg-brand-surface-container-low'
            }`}
          >
            Next
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
