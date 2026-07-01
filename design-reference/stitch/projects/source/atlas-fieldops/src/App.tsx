import { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  Network,
  LineChart,
  Map,
  Settings,
  Grid,
  List,
  Filter,
  Plus,
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  Cpu,
  Database,
  ArrowRight,
  Globe,
  Users,
  Terminal,
  Activity as ActivityIcon
} from 'lucide-react';
import { Project, Activity, KpiItem } from './types';
import { INITIAL_PROJECTS, INITIAL_KPIS } from './data';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiGrid from './components/KpiGrid';
import ProjectCard from './components/ProjectCard';
import DetailPanel from './components/DetailPanel';
import NewProjectDialog from './components/NewProjectDialog';
import ReportModal from './components/ReportModal';

export default function App() {
  // Application states
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('PRJ-9421-AG');
  const [activeSection, setActiveSection] = useState<string>('projects');
  const [activeNav, setActiveNav] = useState<string>('Projects');
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Agriculture' | 'Health' | 'Retail'>('All');
  const [isGridMode, setIsGridMode] = useState<boolean>(true);
  
  // Dialog and Modal open states
  const [isNewProjectOpen, setIsNewProjectOpen] = useState<boolean>(false);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [reportProject, setReportProject] = useState<Project | null>(null);

  // Notifications and Help mock logs
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Find the currently selected project
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || projects[0] || null;
  }, [projects, selectedProjectId]);

  // Filter project list based on search term and selected category
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch =
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.locationLabel.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'All' || project.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [projects, searchTerm, selectedCategory]);

  // Handle adding a manual activity log in the sidebar
  const handleAddActivity = (projectId: string, newActivity: Omit<Activity, 'id'>) => {
    setProjects((prev) =>
      prev.map((project) => {
        if (project.id === projectId) {
          const updatedActivity: Activity = {
            ...newActivity,
            id: `act-${Date.now()}`,
          };
          return {
            ...project,
            activities: [updatedActivity, ...project.activities],
          };
        }
        return project;
      })
    );
    showToast(`Successfully logged audit event for ${projectId}`);
  };

  // Handle adding a brand new project
  const handleCreateProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setSelectedProjectId(newProject.id);
    showToast(`Project ${newProject.id} initialized and selected.`);
  };

  // Handle deleting a project
  const handleDeleteProject = (projectId: string) => {
    // Prevent deleting all projects
    if (projects.length <= 1) {
      showToast('Cannot delete the last remaining project in repository.');
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProjectId === projectId) {
      const remaining = projects.filter((p) => p.id !== projectId);
      setSelectedProjectId(remaining[0]?.id || '');
    }
    showToast(`Project ${projectId} removed from repository.`);
  };

  // View report trigger
  const handleViewReport = (project: Project) => {
    setReportProject(project);
    setIsReportOpen(true);
  };

  // Static KPI metadata items
  const kpisList = INITIAL_KPIS;

  // Render Section Selector Content
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Dashboard Overview Intro Banner */}
            <div className="bg-primary text-on-primary p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-primary/10">
              <div>
                <h2 className="text-xl font-bold tracking-tight mb-1">Global Operational Telemetry Panel</h2>
                <p className="text-xs text-primary-fixed/80">
                  Node integrity status: Optimal. Continuous sync with 3 cluster hubs is live.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => showToast('Triggered full node sync sequence.')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Sync Nodes
                </button>
              </div>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest border border-border-subtle p-5 rounded-xl text-center">
                <span className="text-xs font-bold text-on-surface-variant/60 uppercase block mb-1">Total Submissions</span>
                <span className="text-2xl font-bold text-primary font-display">12,482</span>
                <span className="text-[10px] text-secondary font-bold block mt-1">+8.4% this week</span>
              </div>
              <div className="bg-surface-container-lowest border border-border-subtle p-5 rounded-xl text-center">
                <span className="text-xs font-bold text-on-surface-variant/60 uppercase block mb-1">Average Sync Delay</span>
                <span className="text-2xl font-bold text-primary font-display">1.22 ms</span>
                <span className="text-[10px] text-secondary font-bold block mt-1">Status: Stable</span>
              </div>
              <div className="bg-surface-container-lowest border border-border-subtle p-5 rounded-xl text-center">
                <span className="text-xs font-bold text-on-surface-variant/60 uppercase block mb-1">System Audit Integrity</span>
                <span className="text-2xl font-bold text-primary font-display">99.98%</span>
                <span className="text-[10px] text-secondary font-bold block mt-1">Verified secure</span>
              </div>
            </div>

            {/* Simulated Live Terminal & Operations log */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-deep-emerald-dark rounded-xl p-5 text-white/90 font-mono text-xs flex flex-col h-72 justify-between shadow-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                  <span className="flex items-center gap-1.5 font-bold tracking-tight text-primary-fixed">
                    <Terminal className="w-4 h-4" /> Node Console Output
                  </span>
                  <span className="text-[10px] text-white/40">ONLINE // UTC-0</span>
                </div>
                <div className="flex-grow space-y-2.5 overflow-y-auto custom-scrollbar pr-2 select-none">
                  <p className="text-white/40">[2026-06-30 07:50:11] INITIALIZING SECURE SHELL SESSION...</p>
                  <p className="text-primary-fixed">✔ SSH Handshake verified with Cluster Nigeria-04</p>
                  <p className="text-white/60">&gt; npm run audit:location --id PRJ-9421-AG</p>
                  <p className="text-secondary-fixed">✔ Coordinates match target: 9.0820° N, 8.6753° E</p>
                  <p className="text-white/60">&gt; fetch --status-node --all</p>
                  <p className="text-primary-fixed">✔ All 12 distributed field entities reporting 200 OK</p>
                  <p className="text-white/40">[2026-06-30 07:54:12] SESSION PERSISTED IN SECURE CONTAINER</p>
                </div>
                <button
                  onClick={() => showToast('Command executed: run --diagnostics')}
                  className="mt-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-center text-[10px] font-bold text-primary-fixed tracking-wider uppercase cursor-pointer"
                >
                  Run Node Diagnostics
                </button>
              </div>

              {/* Cluster health overview graph */}
              <div className="bg-surface-container-lowest border border-border-subtle p-5 rounded-xl flex flex-col justify-between h-72">
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">Entity Categories Distribution</h3>
                  <p className="text-xs text-on-surface-variant/60">Relative proportions of active field projects.</p>
                </div>

                <div className="flex items-end justify-around h-36 border-b border-border-subtle/50 pb-2">
                  <div className="flex flex-col items-center gap-2 w-12">
                    <div className="bg-primary w-full rounded-t-lg transition-all duration-700 h-28" />
                    <span className="text-[10px] font-bold text-on-surface-variant/80">Agri</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 w-12">
                    <div className="bg-tertiary w-full rounded-t-lg transition-all duration-700 h-20" />
                    <span className="text-[10px] font-bold text-on-surface-variant/80">Health</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 w-12">
                    <div className="bg-cyan-accent w-full rounded-t-lg transition-all duration-700 h-16" />
                    <span className="text-[10px] font-bold text-on-surface-variant/80">Retail</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs mt-3 text-on-surface-variant/70 font-semibold">
                  <span>Primary Lead: Agriculture</span>
                  <button
                    onClick={() => setActiveSection('projects')}
                    className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    View Repository <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'intelligence':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-surface-container-lowest border border-border-subtle p-6 rounded-2xl">
              <h2 className="text-md font-bold text-primary mb-1">High-Fidelity Intelligence & Security Analyzer</h2>
              <p className="text-xs text-on-surface-variant/60">
                Audit location coordinates, digital keys, and cryptographic integrity scores.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Security integrity checklist */}
                <div className="space-y-3.5 bg-surface-bg p-5 rounded-xl border border-border-subtle">
                  <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Node Security Guard</h3>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-secondary font-bold text-md">✔</span>
                    <span className="text-on-surface-variant">Host URL: Verified secure SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-secondary font-bold text-md">✔</span>
                    <span className="text-on-surface-variant">Gemini Core Node: Encoded server-side secret API</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-secondary font-bold text-md">✔</span>
                    <span className="text-on-surface-variant">Field Client Hash matches central repository integrity</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-medium">
                    <span className="text-secondary font-bold text-md">✔</span>
                    <span className="text-on-surface-variant">Biometric identity tokens certified</span>
                  </div>
                  <button
                    onClick={() => showToast('All operational systems verified secure.')}
                    className="w-full mt-4 py-2.5 bg-primary text-white hover:opacity-95 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Audit Core Infrastructure
                  </button>
                </div>

                {/* Audit speed visualization */}
                <div className="bg-surface-bg p-5 rounded-xl border border-border-subtle flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Sync Latency & Integrity Metrics</h3>
                    <p className="text-xs text-on-surface-variant/60 leading-relaxed">
                      Sync speed is regulated to prevent node friction. Standard target operates within 1.2ms bounds.
                    </p>
                  </div>
                  <div className="space-y-3 mt-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-on-surface mb-1">
                        <span>Cluster US-EAST</span>
                        <span>99.9% // Optimal</span>
                      </div>
                      <div className="w-full bg-surface-variant h-1.5 rounded-full">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: '99.9%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-on-surface mb-1">
                        <span>Cluster EU-CENTRAL</span>
                        <span>98.7% // Stable</span>
                      </div>
                      <div className="w-full bg-surface-variant h-1.5 rounded-full">
                        <div className="bg-secondary h-1.5 rounded-full" style={{ width: '98.7%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold text-on-surface mb-1">
                        <span>Cluster APAC-SOUTH</span>
                        <span>99.2% // Stable</span>
                      </div>
                      <div className="w-full bg-surface-variant h-1.5 rounded-full">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: '99.2%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="space-y-6 animate-fade-in h-full flex flex-col justify-between">
            <div className="bg-deep-emerald-dark rounded-2xl p-6 text-white h-[450px] relative overflow-hidden flex flex-col justify-between shadow-xl">
              {/* Map background grid representing tactical GIS display */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#80d8a6_1px,transparent_1px)] [background-size:16px_16px]" />
              
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <Globe className="w-80 h-80 text-primary-fixed" />
              </div>

              {/* Header inside map */}
              <div className="z-10 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-primary-fixed tracking-wider uppercase font-bold bg-primary/20 px-2.5 py-1 rounded-md">
                    Tactical GIS Display
                  </span>
                  <h3 className="text-md font-bold mt-2">Active Field Coordinates</h3>
                </div>
                <div className="text-right text-[10px] text-surface-variant/40 font-mono">
                  <span>GPS // ACCURACY &lt; 0.5M</span>
                </div>
              </div>

              {/* Coordinate pins based on projects */}
              <div className="absolute inset-0 pointer-events-auto">
                {/* Coordinates represented as beautiful positioned pins */}
                {projects.map((proj, idx) => {
                  const positions = [
                    { top: '35%', left: '25%' },
                    { top: '60%', left: '55%' },
                    { top: '45%', left: '80%' },
                    { top: '25%', left: '65%' },
                    { top: '70%', left: '35%' },
                  ];
                  const pos = positions[idx % positions.length] || { top: '50%', left: '50%' };
                  const isProjSelected = proj.id === selectedProjectId;

                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        showToast(`Focused map telemetry on ${proj.name}`);
                      }}
                      style={{ top: pos.top, left: pos.left }}
                      className="absolute group/pin p-2 cursor-pointer focus:outline-none -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 z-20"
                    >
                      {/* Ring ripple */}
                      <span className={`absolute inset-0 rounded-full w-8 h-8 -left-0 -top-0 animate-ping opacity-75 ${
                        isProjSelected ? 'bg-secondary' : 'bg-primary-fixed'
                      }`} />
                      
                      {/* Active pin indicator */}
                      <div className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-lg relative ${
                        isProjSelected ? 'bg-secondary' : 'bg-primary-fixed-dim'
                      }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Tooltip on hover */}
                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white text-on-surface px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-xl whitespace-nowrap opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none border border-border-subtle z-30">
                        <p>{proj.name}</p>
                        <p className="text-primary text-[8px] tracking-wide font-mono mt-0.5">{proj.locationLabel}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Map Footer showing selected project coordinates */}
              <div className="z-10 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                  <span className="text-xs font-semibold">Focused on: <span className="font-extrabold text-primary-fixed">{selectedProject?.name}</span></span>
                </div>
                <span className="text-[10px] font-mono font-bold tracking-widest text-primary-fixed/80 uppercase">
                  Sector: {selectedProject?.locationLabel || 'Unknown'} // Region: {selectedProject?.region}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg text-on-surface font-sans overflow-hidden flex flex-row">
      
      {/* 1. Left Sidebar Navigation rail */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={(sec) => {
          setActiveSection(sec);
          showToast(`Switched navigation view to ${sec}`);
        }}
        onOpenSettings={() => showToast('Authorized system administrator settings console.')}
      />

      {/* 2. Main content container */}
      <div className="ml-20 flex-grow min-h-screen flex flex-col overflow-hidden">
        
        {/* Header App Bar */}
        <Header
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          activeNav={activeNav}
          setActiveNav={(nav) => {
            setActiveNav(nav);
            showToast(`Switched tabs to ${nav}`);
          }}
          onNotificationsClick={() => showToast('All telemetry data synchronizations are fully up-to-date.')}
          onHelpClick={() => showToast('Documentation is loaded. Standard operation limits are verified.')}
        />

        {/* 3. Main layout stage with bottom and right details */}
        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden relative">
          
          {/* Scrollable Main Stage */}
          <div className="flex-grow overflow-y-auto p-6 custom-scrollbar pb-24 lg:pb-12">
            
            {activeSection === 'projects' ? (
              <div className="space-y-8 animate-fade-in">
                {/* Dynamic KPI Stats Row */}
                <KpiGrid kpiItems={kpisList} actualProjectsCount={projects.length} />

                {/* Section Header with dynamic controls */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-primary tracking-tight font-display">
                        Project Repository
                      </h2>
                      <p className="text-sm text-on-surface-variant/60">
                        Manage and monitor enterprise-grade field initiatives.
                      </p>
                    </div>

                    {/* Filter & Add Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Grid vs List view Toggle */}
                      <div className="flex bg-surface-container p-1 rounded-xl border border-outline-variant/10">
                        <button
                          onClick={() => setIsGridMode(true)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isGridMode ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-primary'
                          }`}
                          aria-label="Grid view"
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsGridMode(false)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            !isGridMode ? 'bg-white shadow-xs text-primary' : 'text-on-surface-variant hover:text-primary'
                          }`}
                          aria-label="List view"
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Filter by category dropdown select */}
                      <div className="relative">
                        <select
                          value={selectedCategory}
                          onChange={(e) => {
                            setSelectedCategory(e.target.value as any);
                            showToast(`Filter set: ${e.target.value}`);
                          }}
                          className="appearance-none bg-white border border-outline-variant/30 pl-3 pr-8 py-2 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-all outline-none focus:border-primary"
                        >
                          <option value="All">All Categories</option>
                          <option value="Agriculture">Agriculture</option>
                          <option value="Health">Health</option>
                          <option value="Retail">Retail</option>
                        </select>
                        <Filter className="w-3 h-3 absolute right-3.5 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                      </div>

                      {/* New Project Action Button */}
                      <button
                        onClick={() => setIsNewProjectOpen(true)}
                        className="flex items-center gap-1.5 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-xs font-bold hover:opacity-90 shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        New Project
                      </button>
                    </div>
                  </div>

                  {/* Filter Status Badge overview */}
                  {(selectedCategory !== 'All' || searchTerm) && (
                    <div className="flex items-center gap-2 animate-fade-in">
                      <span className="text-xs font-medium text-on-surface-variant/60">Active Filters:</span>
                      {selectedCategory !== 'All' && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          Cluster: {selectedCategory}
                          <button onClick={() => setSelectedCategory('All')} className="hover:text-error ml-1">×</button>
                        </span>
                      )}
                      {searchTerm && (
                        <span className="bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                          Query: "{searchTerm}"
                          <button onClick={() => setSearchTerm('')} className="hover:text-error ml-1">×</button>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Grid of cards or List layout */}
                {filteredProjects.length === 0 ? (
                  <div className="bg-white border border-border-subtle p-12 text-center rounded-2xl animate-fade-in">
                    <AlertCircle className="w-12 h-12 text-outline mx-auto mb-3" />
                    <h3 className="text-md font-bold text-on-surface mb-1">No Projects Match Criteria</h3>
                    <p className="text-xs text-on-surface-variant/60 max-w-sm mx-auto">
                      Adjust your search query or operational cluster filter to find field deployment assets.
                    </p>
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setSelectedCategory('All');
                      }}
                      className="mt-4 px-4 py-2 border border-outline-variant/30 text-xs font-bold hover:bg-surface-container rounded-xl transition-all cursor-pointer"
                    >
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className={isGridMode ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
                    {filteredProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isSelected={project.id === selectedProjectId}
                        onSelect={() => setSelectedProjectId(project.id)}
                        onDelete={handleDeleteProject}
                      />
                    ))}
                  </div>
                )}

                {/* Visual Premium Promotion Banner */}
                <section className="bg-on-primary-fixed rounded-2xl p-6 relative overflow-hidden text-white mt-12 shadow-lg shadow-deep-emerald-dark/15">
                  <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-[radial-gradient(#9cf5c1_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
                  
                  <div className="relative z-10 max-w-lg">
                    <div className="inline-flex items-center gap-1.5 bg-primary/30 text-primary-fixed px-3 py-1 rounded-full text-xs font-bold mb-5 border border-primary-fixed/20">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Enterprise Architecture
                    </div>
                    <h3 className="text-2xl font-bold font-display text-primary-fixed mb-3 tracking-tight">
                      Seamless Mission Integration
                    </h3>
                    <p className="text-sm text-surface-variant/70 leading-relaxed mb-6">
                      Our architecture links field intelligence directly to executive decision layers. Securely manage cross-sector initiatives with audited precision.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-variant/5 border border-white/10 p-4 rounded-xl backdrop-blur-xs">
                        <div className="text-xl font-bold text-primary-fixed font-display">99.9%</div>
                        <div className="text-[10px] text-surface-variant/55 uppercase font-bold tracking-wider mt-0.5">Uptime Reliability</div>
                      </div>
                      <div className="bg-surface-variant/5 border border-white/10 p-4 rounded-xl backdrop-blur-xs">
                        <div className="text-xl font-bold text-primary-fixed font-display">1.2ms</div>
                        <div className="text-[10px] text-surface-variant/55 uppercase font-bold tracking-wider mt-0.5">Data Sync Latency</div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              renderSectionContent()
            )}
          </div>

          {/* 4. Right Side Detail Telemetry Sidebar Panel */}
          {activeSection === 'projects' && (
            <DetailPanel
              project={selectedProject}
              onAddActivity={handleAddActivity}
              onViewReport={handleViewReport}
            />
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-24 bg-deep-emerald-dark text-white border border-primary-fixed/20 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-[100] animate-slide-in text-xs font-semibold tracking-wide">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Slide-over dialogue for initializing a new project */}
      <NewProjectDialog
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* Modal for detail intelligence reports */}
      <ReportModal
        project={reportProject}
        isOpen={isReportOpen}
        onClose={() => {
          setIsReportOpen(false);
          setReportProject(null);
        }}
      />

      {/* Fixed bottom FAB for quick project creation */}
      <button
        onClick={() => setIsNewProjectOpen(true)}
        className="fixed bottom-6 right-6 lg:right-[400px] w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center group hover:scale-105 active:scale-95 transition-all z-[60] cursor-pointer"
        aria-label="Add project"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
        <span className="absolute right-16 bg-deep-emerald-dark text-on-primary text-xs font-bold px-3 py-2 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-3 group-hover:translate-x-0 transition-all pointer-events-none border border-primary-fixed/10">
          New Deployment
        </span>
      </button>
    </div>
  );
}

