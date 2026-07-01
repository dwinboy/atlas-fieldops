import React, { useState } from 'react';
import { Plus, Compass, Activity, CheckSquare, Users, AlertCircle, HardHat, ExternalLink, RefreshCw } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KpiCards from './components/KpiCards';
import TeamScheduleTable from './components/TeamScheduleTable';
import LiveFeed from './components/LiveFeed';
import WorkflowSection from './components/WorkflowSection';
import LiveMapSlider from './components/LiveMapSlider';
import NewAssignmentModal from './components/NewAssignmentModal';
import { kpiCards, initialFieldTeams, initialFeedItems, sidebarItems } from './data';
import { FieldTeam, FeedItem } from './types';

export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('field_ops');
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isNewAssignmentOpen, setIsNewAssignmentOpen] = useState(false);
  
  // State for teams and feeds
  const [teams, setTeams] = useState<FieldTeam[]>(initialFieldTeams);
  const [feedItems, setFeedItems] = useState<FeedItem[]>(initialFeedItems);
  
  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Handle adding a new field assignment
  const handleNewAssignment = (newTeam: FieldTeam) => {
    setTeams((prevTeams) => [newTeam, ...prevTeams]);
    
    // Create automatic live feed action
    const newFeed: FeedItem = {
      id: `feed-${Date.now()}`,
      type: 'submission',
      author: newTeam.name,
      time: 'Just now',
      title: 'Dispatched ',
      subtitle: `${newTeam.letter}-Survey Unit`,
      extra: `Focus Area: ${newTeam.currentFocus} with ${newTeam.officersCount} Officers.`,
    };
    
    setFeedItems((prevFeed) => [newFeed, ...prevFeed]);
    setIsNewAssignmentOpen(false);
    
    // Show top temporary toast
    setToastMessage(`Dispatched ${newTeam.name} to ${newTeam.currentFocus}`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Get dynamic title for Header based on active tab
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'projects': return 'Project Repositories';
      case 'forms': return 'Standard Operational Forms';
      case 'field_ops': return 'Mission Control';
      case 'mapping': return 'GIS Land Mapping';
      case 'analytics': return 'Performance Analytics';
      default: return 'Mission Control';
    }
  };

  return (
    <div className="min-h-screen bg-surface-bg text-text-main flex font-sans antialiased">
      {/* 1. Sidebar Navigation */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeItem={activeTab}
        onSelect={(id) => setActiveTab(id)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        
        {/* 2. Top App Bar */}
        <Header 
          onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)} 
          activeTitle={getTabTitle()}
        />

        {/* 3. Sliding temporary toast banner */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 max-w-sm bg-brand-primary text-white text-xs font-bold px-4 py-3 rounded-xl shadow-shard-lg flex items-center gap-2 animate-bounce border border-brand-primary-light/20">
            <Activity className="w-4 h-4 animate-pulse text-[#93ecb8]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* 4. Scrollable Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Render layout based on selected tab */}
          {activeTab === 'field_ops' ? (
            <>
              {/* Page Title & Floating Trigger */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-text-main tracking-tight">
                    Field Operations
                  </h2>
                  <p className="text-xs sm:text-sm text-text-outline font-medium mt-0.5">
                    Manage real-time geolocation teams, active survey assignments, and remote plan metrics.
                  </p>
                </div>
                <button 
                  onClick={() => setIsNewAssignmentOpen(true)}
                  className="bg-brand-primary hover:bg-brand-primary-container text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-shard hover:-translate-y-0.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Assignment</span>
                </button>
              </div>

              {/* 5. KPI Summary Cards */}
              <KpiCards cards={kpiCards} />

              {/* 6. Main Dashboard Column Split */}
              <div className="grid grid-cols-12 gap-8 items-start">
                
                {/* Left Area: Work Plan & Workflow */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                  {/* Team table with Search & Sorting */}
                  <TeamScheduleTable teams={teams} />

                  {/* Workflow Overview Visualizer */}
                  <WorkflowSection />
                </div>

                {/* Right Area: Live Feed */}
                <div className="col-span-12 lg:col-span-4">
                  <LiveFeed feedItems={feedItems} />
                </div>

              </div>
            </>
          ) : (
            // Fallback screen for other tabs to keep the interface realistic and beautiful
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 border border-dashed border-text-border rounded-2xl bg-white/40">
              <div className="w-16 h-16 rounded-full bg-brand-primary/5 flex items-center justify-center text-brand-primary mb-4">
                <HardHat className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-text-main">
                {sidebarItems.find(item => item.id === activeTab)?.label} Module
              </h3>
              <p className="text-xs text-text-outline max-w-sm mt-1 mb-6">
                This screen represents a visual reference layer of the FieldOps architecture. The active deployment workspace is located in the **Field Operations** portal.
              </p>
              <button 
                onClick={() => setActiveTab('field_ops')}
                className="px-4 py-2 bg-brand-primary hover:bg-brand-primary-container text-white text-xs font-bold rounded-xl transition-all shadow-shard"
              >
                Return to Mission Control
              </button>
            </div>
          )}

        </main>
      </div>

      {/* 7. Floating GIS Live Map Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsMapOpen(true)}
          className="bg-[#0C1F1B] hover:bg-brand-primary text-white p-4 rounded-full shadow-2xl flex items-center gap-2.5 transition-all group scale-100 hover:scale-105 cursor-pointer border border-[#006d44]/20"
          id="mapToggle"
          aria-label="Toggle Live Map"
        >
          <Compass className="w-5 h-5 text-[#06B6D4] group-hover:rotate-45 transition-transform duration-300" />
          <span className="font-bold text-xs pr-1">Live GIS Map</span>
        </button>
      </div>

      {/* 8. Sliding GIS Map Panel Drawer */}
      <LiveMapSlider 
        isOpen={isMapOpen} 
        onClose={() => setIsMapOpen(false)} 
        teams={teams}
      />

      {/* 9. Interactive New Assignment Dialog Drawer */}
      <NewAssignmentModal 
        isOpen={isNewAssignmentOpen} 
        onClose={() => setIsNewAssignmentOpen(false)} 
        onSubmit={handleNewAssignment}
      />
    </div>
  );
}
