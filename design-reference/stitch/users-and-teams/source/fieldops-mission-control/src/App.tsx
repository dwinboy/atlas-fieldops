import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  X, 
  Terminal, 
  HelpCircle, 
  CheckCircle2, 
  Bell,
  ShieldCheck,
  Plus
} from 'lucide-react';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatsGrid from './components/StatsGrid';
import OrganizationDirectory from './components/OrganizationDirectory';
import TeamHierarchy from './components/TeamHierarchy';
import InviteHub from './components/InviteHub';
import DataIntegrity from './components/DataIntegrity';
import { User } from './types';

export default function App() {
  // Mobile drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState('users-teams');

  // Search and invite counters
  const [globalSearch, setGlobalSearch] = useState('');
  const [pendingInvitesCount, setPendingInvitesCount] = useState(12);
  const [fieldTeamsCount, setFieldTeamsCount] = useState(42);
  const [notificationCount, setNotificationCount] = useState(3);
  const [notifications, setNotifications] = useState([
    { id: '1', message: 'New access token approved for Agriculture Alpha.', time: '5m ago' },
    { id: '2', message: 'Security scan complete: Optimum health status.', time: '1h ago' },
    { id: '3', message: 'Arthur Vance went offline from Central Command.', time: '2h ago' }
  ]);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Modals state
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isCreateTeamModalOpen, setIsCreateTeamModalOpen] = useState(false);
  const [isAuditLogModalOpen, setIsAuditLogModalOpen] = useState(false);

  // Forms state
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    role: 'Officer' as 'Supervisor' | 'Officer' | 'Admin',
    team: 'Agriculture Alpha' as any,
    status: 'Live' as 'Live' | 'Offline'
  });

  const [newTeamForm, setNewTeamForm] = useState({
    name: '',
    description: '',
    memberCount: 1
  });

  // Mock initial personnel directory
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Elena Rodriguez',
      email: 'e.rodriguez@atlas.ops',
      role: 'Supervisor',
      team: 'Agriculture Alpha',
      status: 'Live',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoGwfafw2RBAU5EL94e1nXQcquWLU5ml7q70goC6_PKutjD8sdQ74-L8WlfRVEPPJmQ7l4JrMM-shoqt7Fg-OoMlhO2TLezxn6DlYXggb_5-TXwAMsj-xGnHYo5k4jtQBBFAk53Npwt1znyz2NvzF3pELVOYxwd4-6YJWgkntYD9rqJuCeHlaA9BZwLoJLdcFG_0IkWn5pX_zEikFrHM-DhzNwUqIYmKvzkOynhCIcI4moMF2xw5SqpaCFGa9_HWFdjKfnMspqdg'
    },
    {
      id: '2',
      name: 'Marcus Sterling',
      email: 'm.sterling@atlas.ops',
      role: 'Officer',
      team: 'Health Outreach',
      status: 'Live',
      initials: 'MS'
    },
    {
      id: '3',
      name: 'Arthur Vance',
      email: 'a.vance@atlas.ops',
      role: 'Admin',
      team: 'Central Command',
      status: 'Offline',
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD9muVzi4Yg_Sdm5-vSA4DtY_riWBhWI90IxdLMMFQ-ZFsjaACVRwRDWVzksiJ9efTdMtpXKyFaPXyXGgrRXFwsanJwA5Xsd-yF2MhXSL6gogqD3hp33hUQ0H690bL8b5HDReYWTplLEwPZp4XOlslC27-QAKS5yr7ir-jvNoE1NPoJlYSSb_5MgaQXCJKrE-clvsAnzeMv40lS1XNNuAQ9TbKCxlnY4wcaGxqP5Fs9uXJr7nfyptdtilZD9ZyOqAWv7WweA1HPTg'
    },
    {
      id: '4',
      name: 'Sarah Jenkins',
      email: 's.jenkins@atlas.ops',
      role: 'Supervisor',
      team: 'Infrastructure Delta',
      status: 'Live',
      initials: 'SJ'
    },
    {
      id: '5',
      name: 'David Kross',
      email: 'd.kross@atlas.ops',
      role: 'Officer',
      team: 'Agriculture Alpha',
      status: 'Live',
      initials: 'DK'
    },
    {
      id: '6',
      name: 'Chloe Dupont',
      email: 'c.dupont@atlas.ops',
      role: 'Officer',
      team: 'Health Outreach',
      status: 'Offline',
      initials: 'CD'
    },
    {
      id: '7',
      name: 'James Vance',
      email: 'j.vance@atlas.ops',
      role: 'Officer',
      team: 'Logistics Echo',
      status: 'Live',
      initials: 'JV'
    },
    {
      id: '8',
      name: 'Amira Patel',
      email: 'a.patel@atlas.ops',
      role: 'Supervisor',
      team: 'Logistics Echo',
      status: 'Live',
      initials: 'AP'
    },
    {
      id: '9',
      name: 'Robert Chen',
      email: 'r.chen@atlas.ops',
      role: 'Officer',
      team: 'Infrastructure Delta',
      status: 'Offline',
      initials: 'RC'
    },
    {
      id: '10',
      name: 'Sophia Martinez',
      email: 's.martinez@atlas.ops',
      role: 'Officer',
      team: 'Agriculture Alpha',
      status: 'Live',
      initials: 'SM'
    },
    {
      id: '11',
      name: 'Liam O\'Connor',
      email: 'l.oconnor@atlas.ops',
      role: 'Supervisor',
      team: 'Health Outreach',
      status: 'Live',
      initials: 'LO'
    },
    {
      id: '12',
      name: 'Yuki Tanaka',
      email: 'y.tanaka@atlas.ops',
      role: 'Officer',
      team: 'Central Command',
      status: 'Offline',
      initials: 'YT'
    }
  ]);

  // Operations/Audit logs
  const [auditLogs, setAuditLogs] = useState([
    { timestamp: '14:02:11', user: 'Commander Atlas', event: 'Initiated security protocol check' },
    { timestamp: '13:50:44', user: 'Elena Rodriguez', event: 'Approved access tokens for sub-grid Alpha' },
    { timestamp: '12:11:05', user: 'System Control', event: 'Routine sync verified (OPS-992-SEC)' },
    { timestamp: '11:45:19', user: 'Marcus Sterling', event: 'Assigned dispatch role for District 8' },
    { timestamp: '09:30:12', user: 'Arthur Vance', event: 'Disconnected session from node CC-4' }
  ]);

  // Add Log event helper
  const addAuditLog = (user: string, event: string) => {
    const timeStr = new Date().toLocaleTimeString('en-US', { hour12: false });
    setAuditLogs(prev => [
      { timestamp: timeStr, user, event },
      ...prev
    ]);
  };

  // Operation Actions
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      alert('Please fill out all required fields.');
      return;
    }

    const newUser: User = {
      id: String(Date.now()),
      name: newUserForm.name,
      email: newUserForm.email,
      role: newUserForm.role,
      team: newUserForm.team,
      status: newUserForm.status,
      initials: newUserForm.name.split(' ').map(n => n[0]).join('').toUpperCase()
    };

    setUsers(prev => [newUser, ...prev]);
    addAuditLog('Commander Atlas', `Added user: ${newUser.name} to ${newUser.team}`);
    
    // Increment notification count
    setNotificationCount(prev => prev + 1);
    setNotifications(prev => [
      { id: String(Date.now()), message: `User ${newUser.name} was added.`, time: 'Just now' },
      ...prev
    ]);

    // Reset and close
    setNewUserForm({
      name: '',
      email: '',
      role: 'Officer',
      team: 'Agriculture Alpha',
      status: 'Live'
    });
    setIsAddUserModalOpen(false);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamForm.name) {
      alert('Please enter a team name.');
      return;
    }

    setFieldTeamsCount(prev => prev + 1);
    addAuditLog('Commander Atlas', `Configured tactical squad: ${newTeamForm.name}`);

    // Push notification
    setNotificationCount(prev => prev + 1);
    setNotifications(prev => [
      { id: String(Date.now()), message: `New team squad configured: ${newTeamForm.name}`, time: 'Just now' },
      ...prev
    ]);

    setNewTeamForm({ name: '', description: '', memberCount: 1 });
    setIsCreateTeamModalOpen(false);
  };

  const handleSendInvite = (email: string, team: string) => {
    setPendingInvitesCount(prev => prev + 1);
    addAuditLog('Commander Atlas', `Issued access invitation for: ${email}`);
    
    setNotifications(prev => [
      { id: String(Date.now()), message: `Invite sent to ${email} for ${team}`, time: 'Just now' },
      ...prev
    ]);
    setNotificationCount(prev => prev + 1);
  };

  const handleDeleteUser = (id: string) => {
    const deletedUser = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    if (deletedUser) {
      addAuditLog('Commander Atlas', `Removed user: ${deletedUser.name} from roster`);
    }
  };

  const handleEditUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    addAuditLog('Commander Atlas', `Modified credentials for user: ${updatedUser.name}`);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-surface-bg relative">
      
      {/* Side Navigation panel */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onShowAuditLog={() => setIsAuditLogModalOpen(true)}
      />

      {/* Main content body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navbar */}
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          notificationCount={notificationCount}
          onNotificationClick={() => {
            setShowNotificationsDropdown(!showNotificationsDropdown);
            if (notificationCount > 0) setNotificationCount(0); // Mark read
          }}
        />

        {/* Notifications Dropdown Drawer */}
        {showNotificationsDropdown && (
          <div className="absolute right-4 md:right-16 top-16 w-80 bg-white border border-brand-outline-variant/40 rounded-xl shadow-xl z-50 p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-brand-outline-variant/20 pb-2 mb-3">
              <h4 className="text-xs font-bold text-brand-on-surface uppercase tracking-wider flex items-center gap-2">
                <Bell className="w-4 h-4 text-brand-primary" />
                Mission Notifications
              </h4>
              <button 
                onClick={() => setShowNotificationsDropdown(false)}
                className="text-brand-on-surface-variant hover:text-brand-on-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
              {notifications.map(n => (
                <div key={n.id} className="p-2 hover:bg-brand-surface-container-low rounded-lg transition-all text-xs">
                  <p className="text-brand-on-surface font-medium leading-normal">{n.message}</p>
                  <span className="text-[10px] text-brand-on-surface-variant/60 block mt-1 font-mono">{n.time}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                setNotifications([]);
                setShowNotificationsDropdown(false);
              }}
              className="w-full text-center text-[11px] font-bold text-brand-primary hover:underline mt-3 pt-2 border-t border-brand-outline-variant/10 block"
            >
              Clear All Alerts
            </button>
          </div>
        )}

        {/* Scrollable Workstage Canvas */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
          
          {/* Breadcrumb path & Action Trigger buttons */}
          <div className="mb-6">
            <nav className="flex items-center gap-2 mb-2 text-xs font-semibold text-brand-on-surface-variant/70">
              <span className="hover:text-brand-primary cursor-pointer transition-colors">Home</span>
              <span className="text-brand-outline-variant text-[10px]">&gt;</span>
              <span className="hover:text-brand-primary cursor-pointer transition-colors">Administration</span>
              <span className="text-brand-outline-variant text-[10px]">&gt;</span>
              <span className="text-brand-on-surface font-semibold">Users & Teams</span>
            </nav>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-3">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-brand-on-surface tracking-tight leading-none">
                  Users & Teams
                </h2>
                <p className="text-sm text-brand-on-surface-variant/85 mt-1.5 leading-relaxed max-w-xl">
                  Manage operational personnel, permissions, and tactical squad hierarchy.
                </p>
              </div>

              {/* Grid Actions */}
              <div className="flex gap-2.5">
                <button 
                  onClick={() => setIsCreateTeamModalOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 border border-brand-primary/60 text-brand-primary font-bold text-xs rounded-xl hover:bg-brand-primary/5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Create Team
                </button>
                <button 
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white font-bold text-xs rounded-xl hover:bg-brand-primary-container hover:shadow-lg hover:shadow-brand-primary/20 transition-all border-t border-white/10"
                >
                  <UserPlus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>
          </div>

          {/* Stats KPI panel row */}
          <StatsGrid 
            totalActiveUsersCount={users.length + 1416} // dynamic base matching original 1,428 starting size
            fieldTeamsCount={fieldTeamsCount}
            pendingInvitesCount={pendingInvitesCount}
            securityHealthStatus="Optimum"
          />

          {/* Core bento split layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left columns (2/3 width) - Organization Directory */}
            <div className="lg:col-span-2 space-y-6">
              <OrganizationDirectory 
                users={users} 
                onDeleteUser={handleDeleteUser}
                onEditUser={handleEditUser}
              />
            </div>

            {/* Right column (1/3 width) - Contextual utility hub */}
            <div className="space-y-6">
              <TeamHierarchy 
                users={users} 
                onTeamClick={(team) => {
                  alert(`Filtering directory directory to display members of team: ${team}`);
                }}
              />
              
              <InviteHub onSendInvite={handleSendInvite} />

              <DataIntegrity />
            </div>

          </div>
        </main>
      </div>

      {/* --- ADD USER MODAL --- */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white border border-brand-outline-variant/40 rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAddUserModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-on-surface-variant hover:bg-brand-surface-container-low transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-brand-outline-variant/10 pb-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-bold text-brand-on-surface">Add New Personnel</h3>
                <p className="text-xs text-brand-on-surface-variant/70">Register tactical operatives in the security roster.</p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                  Full Name
                </label>
                <input 
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  placeholder="e.g. Liam Sterling"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                  Email Address
                </label>
                <input 
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  placeholder="e.g. l.sterling@atlas.ops"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                    Roster Role
                  </label>
                  <select 
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    <option value="Supervisor">Supervisor</option>
                    <option value="Officer">Officer</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                    Roster Status
                  </label>
                  <select 
                    value={newUserForm.status}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  >
                    <option value="Live">Live</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                  Assigned Squad Team
                </label>
                <select 
                  value={newUserForm.team}
                  onChange={(e) => setNewUserForm(prev => ({ ...prev, team: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                >
                  <option value="Agriculture Alpha">Agriculture Alpha</option>
                  <option value="Health Outreach">Health Outreach</option>
                  <option value="Infrastructure Delta">Infrastructure Delta</option>
                  <option value="Logistics Echo">Logistics Echo</option>
                  <option value="Central Command">Central Command</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-brand-outline-variant/10">
                <button 
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low font-semibold text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white font-semibold text-xs rounded-lg hover:bg-brand-primary-container transition-all"
                >
                  Add Personnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE TEAM MODAL --- */}
      {isCreateTeamModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white border border-brand-outline-variant/40 rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsCreateTeamModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-on-surface-variant hover:bg-brand-surface-container-low transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-brand-outline-variant/10 pb-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-bold text-brand-on-surface">Configure Tactical Squad</h3>
                <p className="text-xs text-brand-on-surface-variant/70">Establish active operations, remits, and hierarchies.</p>
              </div>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                  Squad Team Name
                </label>
                <input 
                  type="text"
                  required
                  value={newTeamForm.name}
                  onChange={(e) => setNewTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary"
                  placeholder="e.g. Security Omega"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-brand-on-surface-variant mb-1.5">
                  Squad Description / Purpose
                </label>
                <textarea 
                  value={newTeamForm.description}
                  onChange={(e) => setNewTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary h-20 resize-none"
                  placeholder="Operational scope, tactical responsibilities, and District boundaries..."
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-brand-outline-variant/10">
                <button 
                  type="button"
                  onClick={() => setIsCreateTeamModalOpen(false)}
                  className="px-4 py-2 border border-brand-outline-variant/40 text-brand-on-surface-variant hover:bg-brand-surface-container-low font-semibold text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white font-semibold text-xs rounded-lg hover:bg-brand-primary-container transition-all"
                >
                  Confirm Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- AUDIT LOGS MODAL --- */}
      {isAuditLogModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-brand-deep-emerald-dark border border-white/10 rounded-xl max-w-lg w-full shadow-2xl p-6 relative text-white animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsAuditLogModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-brand-outline-variant hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-3 border-b border-white/10 pb-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Terminal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-md font-bold tracking-wide">Live Operations Audit Logs</h3>
                <p className="text-xs text-brand-outline-variant">Real-time log stream of system actions and permission updates.</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-1 no-scrollbar">
              {auditLogs.map((log, index) => (
                <div key={index} className="p-2.5 bg-white/5 rounded border border-white/5 flex gap-3 text-brand-outline-variant leading-relaxed">
                  <span className="text-emerald-400 font-bold select-none">{log.timestamp}</span>
                  <div>
                    <span className="text-white font-semibold">{log.user}: </span>
                    <span>{log.event}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10 mt-5">
              <button 
                type="button"
                onClick={() => setIsAuditLogModalOpen(false)}
                className="px-4 py-2 bg-white/10 text-white hover:bg-white/15 font-semibold text-xs rounded-lg transition-colors"
              >
                Close Stream
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
