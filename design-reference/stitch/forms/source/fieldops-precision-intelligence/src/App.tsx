import React, { useState, useEffect } from 'react';
import { Plus, Database, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPICard from './components/KPICard';
import FormCard from './components/FormCard';
import FormBuilderModal from './components/FormBuilderModal';
import FormWorkspace from './components/FormWorkspace';
import GovernancePanel from './components/GovernancePanel';
import { 
  DashboardView, 
  ProjectsView, 
  OperationsView, 
  MappingView, 
  AnalyticsView 
} from './components/OtherViews';

// Data & Types
import { Form, Submission, AuditLog, SectorType } from './types';
import { INITIAL_FORMS, INITIAL_AUDIT_LOGS, SAMPLE_SUBMISSIONS } from './data';

export default function App() {
  // Navigation & UI state
  const [activeTab, setActiveTab] = useState<string>('forms');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [sectorFilter, setSectorFilter] = useState<string>('Sector: All');
  const [repoTab, setRepoTab] = useState<'All Forms' | 'Published' | 'Drafts'>('All Forms');

  // Core Data States (Synced to localStorage)
  const [forms, setForms] = useState<Form[]>(() => {
    const saved = localStorage.getItem('fieldops_forms');
    return saved ? JSON.parse(saved) : INITIAL_FORMS;
  });

  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('fieldops_submissions');
    return saved ? JSON.parse(saved) : SAMPLE_SUBMISSIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('fieldops_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // Sync state to local storage when state modifications occur
  useEffect(() => {
    localStorage.setItem('fieldops_forms', JSON.stringify(forms));
  }, [forms]);

  useEffect(() => {
    localStorage.setItem('fieldops_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('fieldops_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Handle addition of a newly designed form
  const handleCreateForm = (newForm: Form) => {
    setForms(prev => [newForm, ...prev]);

    // Create system audit log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      type: 'publish',
      title: `Form published: ${newForm.name}`,
      description: `${newForm.version} • Just now`,
      timestamp: 'Just now',
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Handle data-entry form submission
  const handleFormSubmit = (newSubmission: Submission) => {
    setSubmissions(prev => [newSubmission, ...prev]);

    // Update submission count and trends on target form
    setForms(prevForms => prevForms.map(form => {
      if (form.id === newSubmission.formId) {
        // Shift trend sparkline graph
        const newTrend = [...form.trend];
        newTrend.shift();
        newTrend.push(Math.floor(Math.random() * 30 + 70)); // Add strong positive trend value on submit
        
        return {
          ...form,
          submissionsCount: form.submissionsCount + 1,
          trend: newTrend
        };
      }
      return form;
    }));

    // Generate new Audit Log
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      type: 'submission',
      title: `New submission: ${newSubmission.formName}`,
      description: `${newSubmission.submittedBy} • Just now`,
      timestamp: 'Just now',
      status: 'success'
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Clear or Reset State
  const handleClearLogs = () => {
    if (confirm('Are you sure you want to reset all telemetry state and audit trails back to secure presets?')) {
      localStorage.removeItem('fieldops_forms');
      localStorage.removeItem('fieldops_submissions');
      localStorage.removeItem('fieldops_audit_logs');
      setForms(INITIAL_FORMS);
      setSubmissions(SAMPLE_SUBMISSIONS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setSelectedForm(null);
    }
  };

  // KPI Calculations
  const totalSubmissionsAcrossNodes = forms.reduce((sum, f) => sum + f.submissionsCount, 0);
  const activeFormsCount = forms.length;

  // Filter forms based on tab selection, search bar and sector filter
  const filteredForms = forms.filter(form => {
    // 1. Repository Tabs (All Forms vs Published vs Drafts)
    if (repoTab === 'Published' && form.status !== 'Published') return false;
    if (repoTab === 'Drafts' && form.status !== 'Draft') return false;

    // 2. Sector Filter dropdown
    if (sectorFilter !== 'Sector: All') {
      if (form.sector !== sectorFilter) return false;
    }

    // 3. Magnifying Search Query (Title match)
    if (searchQuery.trim() !== '') {
      return form.name.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  return (
    <div className="min-h-screen text-[#101e1a] bg-[#FAFAF8] flex">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container Wrapper */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header and Search Utilities */}
        <Header 
          activeTab={activeTab} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          userEmail="edwinndiforngang@gmail.com"
        />

        {/* Dynamic Screen Content Wrapper */}
        <main className="p-8 max-w-[1400px] w-full mx-auto flex-1 flex flex-col gap-8">
          
          {activeTab === 'forms' ? (
            /* Forms Module Core View */
            <div className="space-y-8 flex-1">
              
              {!selectedForm ? (
                /* Primary Grid View */
                <>
                  {/* Module Title & Action */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-border-subtle pb-4">
                    <div className="text-left">
                      <h1 className="text-2xl font-bold text-[#101e1a] tracking-tight">Form Module</h1>
                      <p className="text-sm text-outline mt-0.5">Manage enterprise-grade data capture workflows and governance protocols.</p>
                    </div>
                    <button 
                      onClick={() => setIsBuilderOpen(true)}
                      className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Create New Form
                    </button>
                  </div>

                  {/* Intelligence Shards (KPIs) - Animated row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* KPI 1 */}
                    <KPICard 
                      title="Total Active Forms"
                      value={activeFormsCount}
                      badge="+4%"
                      badgeColor="green"
                      iconType="layers"
                      footer={
                        <div className="h-1 w-full bg-surface-container rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: '75%' }} />
                        </div>
                      }
                    />

                    {/* KPI 2 */}
                    <KPICard 
                      title="Offline Sync Reliability"
                      value="99.9%"
                      badge="Stable"
                      badgeColor="teal"
                      iconType="sync"
                      footer={
                        <div className="flex gap-[3px]">
                          <div className="h-1 flex-1 bg-secondary rounded-full" />
                          <div className="h-1 flex-1 bg-secondary rounded-full" />
                          <div className="h-1 flex-1 bg-secondary rounded-full" />
                          <div className="h-1 flex-1 bg-secondary rounded-full" />
                          <div className="h-1 flex-1 bg-[#86f2e4]/30 rounded-full" />
                        </div>
                      }
                    />

                    {/* KPI 3 */}
                    <KPICard 
                      title="Awaiting Review"
                      value="812"
                      badge="+128"
                      badgeColor="red"
                      iconType="check"
                      footer={
                        <span className="text-[10px] font-semibold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Requires immediate audit
                        </span>
                      }
                    />

                    {/* KPI 4 */}
                    <KPICard 
                      title="Version Drift"
                      value="2.4%"
                      badge="Low"
                      badgeColor="purple"
                      iconType="drift"
                      footer={
                        <span className="text-[10px] font-semibold text-outline">Across 14 regional nodes</span>
                      }
                    />
                  </div>

                  {/* Form Repository Filter Bar & Grid */}
                  <section className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-[#101e1a]">Form Repository</h2>
                        
                        {/* Repository Published/Drafts Tabs */}
                        <div className="flex border border-border-subtle rounded-lg overflow-hidden bg-white h-8">
                          {(['All Forms', 'Published', 'Drafts'] as const).map((tab) => (
                            <button
                              key={tab}
                              onClick={() => setRepoTab(tab)}
                              className={`px-3.5 text-xs font-semibold border-r border-border-subtle last:border-none transition-colors ${
                                repoTab === tab 
                                  ? 'bg-[#e1f2eb] text-[#005232] font-bold' 
                                  : 'text-outline hover:bg-surface-container-low'
                              }`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Sector Dropdown Filter */}
                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="text-xs font-semibold text-outline">Filter by:</span>
                        <select 
                          value={sectorFilter}
                          onChange={(e) => setSectorFilter(e.target.value)}
                          className="bg-white border border-border-subtle rounded-lg text-xs font-semibold px-3 py-1.5 focus:ring-primary focus:border-primary text-[#101e1a] shadow-sm cursor-pointer"
                        >
                          <option value="Sector: All">Sector: All</option>
                          <option value="AGRI">AGRI</option>
                          <option value="HEALTH">HEALTH</option>
                          <option value="RETAIL">RETAIL</option>
                          <option value="LOGISTICS">LOGISTICS</option>
                        </select>
                      </div>
                    </div>

                    {/* Form Grid */}
                    {filteredForms.length === 0 ? (
                      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-border-subtle space-y-2">
                        <Database className="w-10 h-10 text-outline mx-auto opacity-40" />
                        <h3 className="font-bold text-[#101e1a] text-sm">No Matching Forms Found</h3>
                        <p className="text-xs text-outline max-w-xs mx-auto">
                          Adjust your query filter, clear search fields, or deploy a new custom form.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {filteredForms.map((form) => (
                          <FormCard 
                            key={form.id} 
                            form={form} 
                            onSelect={setSelectedForm} 
                          />
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Governance Protocol & Audit timeline logs */}
                  <GovernancePanel 
                    auditLogs={auditLogs} 
                    onClearLogs={handleClearLogs} 
                  />
                </>
              ) : (
                /* Selected Form Workspace Focal Overlay */
                <FormWorkspace 
                  form={selectedForm} 
                  submissions={submissions}
                  onBack={() => setSelectedForm(null)}
                  onSubmitData={handleFormSubmit}
                />
              )}

            </div>
          ) : (
            /* Render alternative screens based on activeTab selection */
            <div className="flex-1">
              {activeTab === 'dashboard' && <DashboardView userEmail="edwinndiforngang@gmail.com" />}
              {activeTab === 'projects' && <ProjectsView />}
              {activeTab === 'operations' && <OperationsView />}
              {activeTab === 'mapping' && <MappingView />}
              {activeTab === 'analytics' && <AnalyticsView />}
            </div>
          )}

        </main>
      </div>

      {/* Form Builder Dialog Sheet */}
      <FormBuilderModal 
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onCreateForm={handleCreateForm}
      />
    </div>
  );
}
