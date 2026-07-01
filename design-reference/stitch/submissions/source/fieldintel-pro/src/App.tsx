import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Check, 
  Plus, 
  FileSpreadsheet, 
  Trash2, 
  Info,
  Shield, 
  Wrench, 
  Signal, 
  Cpu, 
  UserCheck, 
  Heart,
  TrendingUp,
  Award,
  Database
} from 'lucide-react';
import { INITIAL_RECORDS } from './data';
import { SubmissionRecord, SectorType, StatusType, OperationsStats } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import KPIBlock from './components/KPIBlock';
import FilterBar from './components/FilterBar';
import DetailPanel from './components/DetailPanel';
import NewReportModal from './components/NewReportModal';

export default function App() {
  // --- Persistent State ---
  const [records, setRecords] = useState<SubmissionRecord[]>(() => {
    const saved = localStorage.getItem('field_ops_records');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved records', e);
      }
    }
    return INITIAL_RECORDS;
  });

  useEffect(() => {
    localStorage.setItem('field_ops_records', JSON.stringify(records));
  }, [records]);

  // --- UI States ---
  const [currentTab, setCurrentTab] = useState<string>('operations');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(() => {
    return records.length > 0 ? records[0].id : '';
  });
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set(['#FO-8921']));
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  
  // --- Search & Filtering States ---
  const [globalSearch, setGlobalSearch] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedSector, setSelectedSector] = useState<SectorType | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<StatusType | 'ALL'>('ALL');
  const [selectedDateRange, setSelectedDateRange] = useState('Last 30 Days');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // --- Modals ---
  const [isNewReportModalOpen, setIsNewReportModalOpen] = useState(false);

  // --- Alert Helper ---
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --- Recalculating Dynamic Metrics (KPIs) ---
  // Baseline stats defined in screenshot are: Pending=412, Awaiting=84, AvgTime=1.4h, Quality=96%
  // We'll calculate adjustments based on user's action on our current interactive list.
  const calculateStats = (): OperationsStats => {
    // Count how many In Review/Pending in our mock db
    const currentPending = records.filter(r => r.status === 'Pending' || r.status === 'In Review').length;
    const currentReturned = records.filter(r => r.status === 'Returned').length;
    const currentApproved = records.filter(r => r.status === 'Approved').length;

    // Offset baselines based on deviation from original mock records (which had 3 pending/in review, 1 returned, 2 approved)
    // original: pending/in_review = 3 (8921, 8920, 8916 is in review), returned = 2 (8918, 8914), approved = rest
    const basePending = 412 - (3 - currentPending);
    const baseAwaiting = 84 + (currentReturned - 2);
    
    // Dynamic Quality score
    const totalReviewed = currentApproved + currentReturned;
    const calculatedQuality = totalReviewed > 0 
      ? Math.round((currentApproved / totalReviewed) * 100) 
      : 96;

    // Constrain outputs to reasonable bounds
    return {
      pendingReviewCount: Math.max(0, basePending),
      awaitingCorrectionCount: Math.max(0, baseAwaiting),
      avgReviewTimeHours: 1.4 + (currentPending * 0.05) - (currentApproved * 0.02),
      qualityScorePercent: Math.min(100, Math.max(70, calculatedQuality)),
      totalCount: records.length,
    };
  };

  const stats = calculateStats();

  // --- Filter Logic ---
  const getFilteredRecords = () => {
    return records.filter((rec) => {
      // 1. Global Search Filter
      const searchStr = globalSearch.toLowerCase();
      const matchesGlobal = !globalSearch || 
        rec.id.toLowerCase().includes(searchStr) ||
        rec.entityName.toLowerCase().includes(searchStr) ||
        rec.subTitle.toLowerCase().includes(searchStr) ||
        rec.fieldOfficer.name.toLowerCase().includes(searchStr);

      // 2. Filter Bar Search
      const filterStr = filterSearch.toLowerCase();
      const matchesFilterSearch = !filterSearch ||
        rec.id.toLowerCase().includes(filterStr) ||
        rec.entityName.toLowerCase().includes(filterStr) ||
        rec.subTitle.toLowerCase().includes(filterStr) ||
        rec.fieldOfficer.name.toLowerCase().includes(filterStr);

      // 3. Sector
      const matchesSector = selectedSector === 'ALL' || rec.sector === selectedSector;

      // 4. Status
      const matchesStatus = selectedStatus === 'ALL' || rec.status === selectedStatus;

      return matchesGlobal && matchesFilterSearch && matchesSector && matchesStatus;
    });
  };

  const filteredRecords = getFilteredRecords();

  // Pagination bounds
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Auto-reset page if bounds exceed
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [filteredRecords.length, totalPages, currentPage]);

  // Selected Record reference
  const activeRecord = records.find(r => r.id === selectedRecordId) || null;

  // --- Record Actions ---
  const handleApprove = (id: string) => {
    setRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return { ...rec, status: 'Approved' };
      }
      return rec;
    }));
    showToast(`Record ${id} has been Approved and added to official audit history.`);
    setNotificationMessage(`Successfully approved submission ${id}`);
    setShowNotificationToast(true);
    setNotificationCount(c => Math.max(0, c - 1));
  };

  const handleReturn = (id: string) => {
    setRecords(prev => prev.map(rec => {
      if (rec.id === id) {
        return { ...rec, status: 'Returned' };
      }
      return rec;
    }));
    showToast(`Record ${id} has been Returned to the field officer for corrections.`);
    setNotificationMessage(`Returned submission ${id} to field officer`);
    setShowNotificationToast(true);
    setNotificationCount(c => c + 1);
  };

  const handleNewReportSubmit = (newRecord: SubmissionRecord) => {
    setRecords(prev => [newRecord, ...prev]);
    setSelectedRecordId(newRecord.id);
    setIsNewReportModalOpen(false);
    showToast(`New Report ${newRecord.id} successfully created and queued for review.`);
  };

  // --- Selection Helpers ---
  const toggleSelectAll = () => {
    if (selectedRecords.size === paginatedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      const newSel = new Set<string>();
      paginatedRecords.forEach(r => newSel.add(r.id));
      setSelectedRecords(newSel);
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSel = new Set(selectedRecords);
    if (newSel.has(id)) {
      newSel.delete(id);
    } else {
      newSel.add(id);
    }
    setSelectedRecords(newSel);
  };

  // --- Export Action ---
  const handleBulkExport = () => {
    if (selectedRecords.size === 0) {
      alert('Please select at least one record to export.');
      return;
    }
    const selectedItems = records.filter(r => selectedRecords.has(r.id));
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(selectedItems, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `FieldIntel_Ops_Export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported ${selectedRecords.size} records securely as JSON document.`);
  };

  // Reset database helper
  const handleResetDatabase = () => {
    if (window.confirm('Reset local database to initial demonstration values? This will erase custom records.')) {
      setRecords(INITIAL_RECORDS);
      setSelectedRecordId(INITIAL_RECORDS[0].id);
      setSelectedRecords(new Set(['#FO-8921']));
      setCurrentPage(1);
      setGlobalSearch('');
      setFilterSearch('');
      setSelectedSector('ALL');
      setSelectedStatus('ALL');
      showToast('Local database restored to baseline specifications.');
    }
  };

  return (
    <div className="min-h-screen mesh-gradient-bg flex">
      {/* Sidebar - fixed */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setGlobalSearch('');
          setFilterSearch('');
        }}
        onNewReportClick={() => setIsNewReportModalOpen(true)}
      />

      {/* Main Content Pane */}
      <div className="ml-64 flex-1 flex flex-col min-h-screen">
        {/* Header bar */}
        <Header 
          searchQuery={globalSearch} 
          onSearchChange={setGlobalSearch}
          title={
            currentTab === 'operations' ? 'Field Operations' :
            currentTab === 'assets' ? 'Asset Tracking Division' :
            currentTab === 'staff' ? 'Field Staff Directory' :
            currentTab === 'intelligence' ? 'Operational Intelligence' :
            currentTab === 'compliance' ? 'Compliance Governance' : 'System Settings'
          }
          notificationCount={notificationCount}
          onNotificationClick={() => {
            alert('Notifications cleared. You have no new urgent audits.');
            setNotificationCount(0);
          }}
        />

        {/* Dynamic Inner Tab Container */}
        <div className="p-8 flex-1 flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {currentTab === 'operations' && (
              <motion.div
                key="operations-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col gap-6"
              >
                {/* Module Heading */}
                <div className="flex justify-between items-end flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
                      <span className="text-on-surface-variant font-extrabold text-[11px] uppercase tracking-widest">
                        Operational Audit
                      </span>
                    </div>
                    <h1 className="text-3xl font-extrabold text-primary flex items-baseline gap-3 tracking-tight">
                      Submissions Review
                      <span className="font-semibold text-sm text-on-surface-variant tracking-normal">
                        {filteredRecords.length} records segment found
                      </span>
                    </h1>
                  </div>
                  
                  {/* Top Header Controls */}
                  <div className="flex gap-3">
                    <button
                      id="btn-bulk-export-header"
                      onClick={handleBulkExport}
                      className="flex items-center gap-2 bg-white border border-outline-variant px-5 py-2.5 rounded-xl text-xs font-bold text-primary hover:bg-surface-container-high transition-all active:scale-95 shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      Bulk Export ({selectedRecords.size})
                    </button>
                    <button
                      onClick={handleResetDatabase}
                      className="flex items-center gap-2 bg-white border border-outline-variant px-4 py-2.5 rounded-xl text-xs font-bold text-on-surface-variant hover:text-error hover:bg-red-50 transition-all active:scale-95 shadow-sm cursor-pointer"
                      title="Reset Database to baseline"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Reset Demo
                    </button>
                  </div>
                </div>

                {/* Intelligence KPI Cards */}
                <KPIBlock 
                  pendingReviewCount={stats.pendingReviewCount} 
                  awaitingCorrectionCount={stats.awaitingCorrectionCount} 
                  avgReviewTime={stats.avgReviewTimeHours} 
                  qualityScore={stats.qualityScorePercent} 
                />

                {/* Filters Row */}
                <FilterBar 
                  searchText={filterSearch}
                  onSearchChange={setFilterSearch}
                  selectedSector={selectedSector}
                  onSectorChange={setSelectedSector}
                  selectedStatus={selectedStatus}
                  onStatusChange={setSelectedStatus}
                  selectedDateRange={selectedDateRange}
                  onDateRangeClick={() => {
                    const ranges = ['Last 30 Days', 'Last 7 Days', 'Last 90 Days', 'All Time'];
                    const nextIdx = (ranges.indexOf(selectedDateRange) + 1) % ranges.length;
                    setSelectedDateRange(ranges[nextIdx]);
                    showToast(`Segment changed to: ${ranges[nextIdx]}`);
                  }}
                  onApplyFilters={() => showToast('Filters locked in and verified against database schemas.')}
                  onResetFilters={() => {
                    setFilterSearch('');
                    setSelectedSector('ALL');
                    setSelectedStatus('ALL');
                    showToast('Cleared search filters.');
                  }}
                />

                {/* Double Split View: Data Table on left, Review Panel on right */}
                <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch min-h-[500px]">
                  
                  {/* Table Container */}
                  <div className="flex-1 bg-white rounded-2xl border border-outline-variant flex flex-col shadow-sm overflow-hidden min-h-[400px]">
                    <div className="flex-1 overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-outline-variant bg-surface-container-lowest text-xs font-bold text-on-surface-variant">
                            <th className="p-4 w-12 text-center">
                              <input 
                                type="checkbox"
                                className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                checked={paginatedRecords.length > 0 && selectedRecords.size === paginatedRecords.length}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th className="p-4">ID</th>
                            <th className="p-4">Entity</th>
                            <th className="p-4">Sector</th>
                            <th className="p-4">Field Officer</th>
                            <th className="p-4">Date Submitted</th>
                            <th className="p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant">
                          {paginatedRecords.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="p-12 text-center text-on-surface-variant text-sm font-medium">
                                No records match the search filter segment. Try resetting filters.
                              </td>
                            </tr>
                          ) : (
                            paginatedRecords.map((rec) => {
                              const isSelected = selectedRecordId === rec.id;
                              const isChecked = selectedRecords.has(rec.id);
                              
                              return (
                                <tr
                                  key={rec.id}
                                  id={`row-${rec.id}`}
                                  onClick={() => setSelectedRecordId(rec.id)}
                                  className={`transition-colors cursor-pointer text-sm group ${
                                    isSelected 
                                      ? 'bg-primary/5 hover:bg-primary/10' 
                                      : 'hover:bg-surface-container/50'
                                  }`}
                                >
                                  {/* Checkbox */}
                                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                      type="checkbox"
                                      className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer w-4 h-4"
                                      checked={isChecked}
                                      onChange={() => toggleSelectRow(rec.id)}
                                    />
                                  </td>

                                  {/* ID with pulse effect if In Review/Pending */}
                                  <td className="p-4">
                                    <span className={`font-mono text-xs font-bold ${
                                      rec.status === 'In Review' || rec.status === 'Pending' 
                                        ? 'status-pulse text-blue-600' 
                                        : 'text-on-surface'
                                    }`}>
                                      {rec.id}
                                    </span>
                                  </td>

                                  {/* Entity Name & subtitle */}
                                  <td className="p-4">
                                    <div>
                                      <p className="font-extrabold text-on-surface group-hover:text-primary transition-colors">
                                        {rec.entityName}
                                      </p>
                                      <p className="text-[11px] text-on-surface-variant font-medium">
                                        {rec.subTitle}
                                      </p>
                                    </div>
                                  </td>

                                  {/* Sector Tag */}
                                  <td className="p-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                                      rec.sector === 'HEALTH' 
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                        : rec.sector === 'AGRI'
                                        ? 'bg-primary-fixed text-primary border border-primary-fixed-dim'
                                        : 'bg-secondary-container text-secondary border border-secondary-fixed-dim'
                                    }`}>
                                      {rec.sector === 'AGRI' ? 'AGRI' : rec.sector === 'HEALTH' ? 'HEALTH' : 'INFRA'}
                                    </span>
                                  </td>

                                  {/* Field Officer */}
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      {rec.fieldOfficer.avatarUrl ? (
                                        <img 
                                          className="w-6 h-6 rounded-full object-cover border border-outline-variant"
                                          src={rec.fieldOfficer.avatarUrl} 
                                          alt={rec.fieldOfficer.name} 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-slate-200" />
                                      )}
                                      <span className="font-medium text-on-surface">
                                        {rec.fieldOfficer.name}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Date Submitted */}
                                  <td className="p-4 text-on-surface-variant font-medium">
                                    {rec.dateSubmitted}
                                  </td>

                                  {/* Status Icon Indicator */}
                                  <td className="p-4">
                                    <span className={`flex items-center gap-1.5 font-bold text-xs ${
                                      rec.status === 'Approved' ? 'text-primary' :
                                      rec.status === 'Returned' ? 'text-error' :
                                      rec.status === 'In Review' ? 'text-blue-600' : 'text-orange-600'
                                    }`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                      {rec.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="mt-auto p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row justify-between items-center gap-4">
                      <p className="text-xs font-bold text-on-surface-variant">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 border border-outline-variant rounded hover:bg-surface-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-xs font-bold border rounded transition-all cursor-pointer ${
                              currentPage === pageNum 
                                ? 'bg-primary text-white border-primary shadow-sm' 
                                : 'border-outline-variant hover:bg-surface-container text-on-surface'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}

                        <button
                          onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 border border-outline-variant rounded hover:bg-surface-container transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right hand Detail review panel */}
                  <DetailPanel 
                    record={activeRecord}
                    onClose={() => setSelectedRecordId('')}
                    onApprove={handleApprove}
                    onReturn={handleReturn}
                  />

                </div>
              </motion.div>
            )}

            {/* Simulated Roster tab */}
            {currentTab === 'assets' && (
              <motion.div
                key="assets-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-outline-variant p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-secondary-container text-secondary rounded-xl">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary">Field Assets Catalogue</h2>
                    <p className="text-xs text-on-surface-variant font-medium">Remote inventory monitoring & logistics compliance</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { name: 'Cold Chain Vaccine Storage #9', code: 'AS-CC-09', battery: '92%', status: 'Nominal', sector: 'HEALTH', location: 'Cluster B Outpost' },
                    { name: 'GIS Geo-Tracker Handheld', code: 'AS-GT-11', battery: '45%', status: 'Low Battery', sector: 'INFRA', location: 'Water Dept Rig 2' },
                    { name: 'Grain Moisture Sensor Kit', code: 'AS-MS-04', battery: '100%', status: 'Nominal', sector: 'AGRI', location: 'Abuja Co-op Warehouse' },
                    { name: 'Solar Mini-Grid Controller', code: 'AS-SG-01', battery: 'Grid Powered', status: 'Nominal', sector: 'INFRA', location: 'Solar Bridge North' },
                    { name: 'Insulated Vaccine Carrier Bag', code: 'AS-VC-22', battery: 'Passive Cool', status: 'Nominal', sector: 'HEALTH', location: 'Lagos Education Wing' },
                    { name: 'Water Flow Telemetry Kit', code: 'AS-WT-14', battery: '80%', status: 'Syncing', sector: 'INFRA', location: 'Borehole Audit #4' }
                  ].map((asset, i) => (
                    <div key={i} className="p-5 border border-outline-variant rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                          asset.sector === 'HEALTH' ? 'bg-blue-50 text-blue-700' :
                          asset.sector === 'AGRI' ? 'bg-primary-fixed text-primary' : 'bg-secondary-container text-secondary'
                        }`}>{asset.sector}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant font-bold">{asset.code}</span>
                      </div>
                      <h4 className="font-bold text-sm text-on-surface mb-1">{asset.name}</h4>
                      <p className="text-xs text-on-surface-variant font-medium mb-3">Location: {asset.location}</p>
                      <div className="flex justify-between items-center text-xs border-t border-outline-variant pt-3">
                        <span className="flex items-center gap-1 font-semibold text-on-surface-variant">
                          <Signal className="w-3.5 h-3.5 text-primary" /> {asset.battery}
                        </span>
                        <span className={`font-bold ${asset.status === 'Low Battery' ? 'text-error' : 'text-primary'}`}>
                          ● {asset.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Field Staff Directory */}
            {currentTab === 'staff' && (
              <motion.div
                key="staff-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-outline-variant p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary-fixed text-primary rounded-xl">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary">Active Field Officers Directory</h2>
                    <p className="text-xs text-on-surface-variant font-medium">Verify credentials and live audit assignments</p>
                  </div>
                </div>

                <div className="divide-y divide-outline-variant">
                  {[
                    { name: 'Sarah Jenkins', role: 'Senior Health Operations Lead', region: 'Cluster B (Zaria)', audits: 42, status: 'Active Field Audit', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100' },
                    { name: 'David Okafor', role: 'Agriculture & Soil Assessor', region: 'Central Plains (Kano)', audits: 29, status: 'At Regional HQ', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100' },
                    { name: 'Elena Rodriguez', role: 'Cold Chain Compliance Lead', region: 'Coastal Port Cluster', audits: 51, status: 'Active Field Audit', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=100' },
                    { name: 'Marcus Thorne', role: 'Civil & Energy Grid Inspector', region: 'Northern Bridge Grid', audits: 33, status: 'Standby / Reporting', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100' }
                  ].map((staff, idx) => (
                    <div key={idx} className="py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div className="flex items-center gap-4">
                        <img className="w-12 h-12 rounded-full object-cover border" src={staff.avatar} alt={staff.name} referrerPolicy="no-referrer" />
                        <div>
                          <h4 className="font-bold text-on-surface">{staff.name}</h4>
                          <p className="text-xs text-on-surface-variant font-medium">{staff.role} • <span className="font-bold text-primary">{staff.region}</span></p>
                        </div>
                      </div>
                      <div className="text-right flex items-center sm:flex-col gap-2 sm:gap-0">
                        <p className="text-xs font-extrabold text-on-surface-variant">{staff.audits} Certified Audits</p>
                        <p className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mt-1">● {staff.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Operational Intelligence (Graphs & Data) */}
            {currentTab === 'intelligence' && (
              <motion.div
                key="intel-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-outline-variant p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary">Intelligence & Analytics</h2>
                    <p className="text-xs text-on-surface-variant font-medium">Compliance performance metrics across agricultural, infrastructure and medical grids</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-6 border border-outline-variant rounded-xl bg-surface-container-lowest">
                    <h3 className="font-bold text-sm text-primary mb-4">Submission Volume by Sector</h3>
                    <div className="space-y-4">
                      {[
                        { sector: 'Health & Medical', count: 182, percent: '75%', color: 'bg-blue-600' },
                        { sector: 'Agriculture & Storage', count: 120, percent: '55%', color: 'bg-primary' },
                        { sector: 'Infrastructure Bridge & Water', count: 110, percent: '50%', color: 'bg-secondary' }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{item.sector}</span>
                            <span className="text-on-surface-variant">{item.count} submissions</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5">
                            <div className={`${item.color} h-2.5 rounded-full`} style={{ width: item.percent }}></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-6 border border-outline-variant rounded-xl bg-surface-container-lowest flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-primary mb-2">Officer Compliance Quality Score</h3>
                      <p className="text-xs text-on-surface-variant mb-4">Percentage of submissions approved without correction requests.</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full border-8 border-primary border-r-transparent flex items-center justify-center text-xl font-extrabold text-primary">
                        96%
                      </div>
                      <div className="space-y-2 text-xs">
                        <p className="flex items-center gap-1.5 font-semibold text-on-surface"><span className="w-2.5 h-2.5 bg-primary rounded-full"></span> 96% Standard Approved First-pass</p>
                        <p className="flex items-center gap-1.5 font-semibold text-on-surface-variant"><span className="w-2.5 h-2.5 bg-error rounded-full"></span> 4% Returned for Verification</p>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">Target first-pass rate is 95%. Currently exceeding the compliance threshold by 1%.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Compliance Checklist */}
            {currentTab === 'compliance' && (
              <motion.div
                key="compliance-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-outline-variant p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 text-error rounded-xl">
                    <Shield className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary">Compliance Governance Rules</h2>
                    <p className="text-xs text-on-surface-variant font-medium">WHO Cold Chain Logistics, Soil Audit and Bridge safety criteria checklist</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { rule: 'WHO Standard Cold Chain Fridge Temp Log', description: 'Refrigerated medical supplies must remain within +2°C and +8°C. Audited on submission.', verified: true },
                    { rule: 'Crop Humidity Moisture Upper Boundary (14.5%)', description: 'Agricultural silos must verify grain humidity sits under 14.5% to avoid rot and pest issues.', verified: true },
                    { rule: 'Bridge Pier Silt Structural Integrity Verification', description: 'Infrastructure inspections must measure waterbed silt levels to prevent pier shifts during rains.', verified: false },
                    { rule: 'Borehole Water Flow rate Minimal (15L/min) Check', description: 'Newly drilled boreholes must yield at least 15 liters per minute water extraction rate.', verified: true }
                  ].map((rule, idx) => (
                    <div key={idx} className="p-4 border border-outline-variant rounded-xl flex items-start gap-4">
                      <div className={`p-1.5 rounded-full ${rule.verified ? 'bg-primary/10 text-primary' : 'bg-red-50 text-error'}`}>
                        {rule.verified ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 rotate-45" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-on-surface">{rule.rule}</h4>
                        <p className="text-xs text-on-surface-variant font-medium mt-0.5">{rule.description}</p>
                        <p className={`text-[10px] font-extrabold mt-1 uppercase ${rule.verified ? 'text-primary' : 'text-error'}`}>
                          {rule.verified ? '✓ Verified Compliant' : '⚠ Action required (Review Needed)'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Simulated Settings */}
            {currentTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl border border-outline-variant p-8 shadow-sm flex flex-col gap-6"
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-surface-container text-on-surface rounded-xl">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-extrabold text-primary">System Settings & Data Control</h2>
                    <p className="text-xs text-on-surface-variant font-medium">Configure demo state, variables and reset local caching</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 border border-outline-variant rounded-xl">
                    <h3 className="font-bold text-sm text-on-surface mb-2">Simulated Offline Sync</h3>
                    <p className="text-xs text-on-surface-variant mb-3">Enable mock background syncing when mobile network drops</p>
                    <button 
                      onClick={() => alert('Offline sync is active and configured. Changes will queue in IndexedDB inside browser in premium.')}
                      className="px-4 py-2 bg-primary text-white font-bold text-xs rounded-lg hover:bg-primary-container hover:text-on-primary-container cursor-pointer transition-all"
                    >
                      Configure Offline Sync
                    </button>
                  </div>

                  <div className="p-4 border border-outline-variant rounded-xl">
                    <h3 className="font-bold text-sm text-error mb-2">Factory Reset State</h3>
                    <p className="text-xs text-on-surface-variant mb-3">Clear local state, custom entries and reload defaults</p>
                    <button 
                      onClick={handleResetDatabase}
                      className="px-4 py-2 border border-error text-error font-bold text-xs rounded-lg hover:bg-error-container transition-all cursor-pointer"
                    >
                      Reset Local Storage
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Action Submit Report Modal */}
      <NewReportModal 
        isOpen={isNewReportModalOpen} 
        onClose={() => setIsNewReportModalOpen(false)} 
        onSubmit={handleNewReportSubmit} 
      />

      {/* Interactive Global Alerts & Notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-deep-emerald-dark text-white border border-outline-variant px-5 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-[100] max-w-sm"
          >
            <Info className="w-5 h-5 text-primary-fixed shrink-0" />
            <span className="text-xs font-semibold leading-normal">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotificationToast && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-6 bg-white text-on-surface border border-primary px-5 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-50 max-w-sm"
          >
            <div className="w-2.5 h-2.5 bg-primary rounded-full animate-ping shrink-0" />
            <div className="text-xs font-semibold">
              <span className="text-primary font-bold">Action Logged:</span> {notificationMessage}
            </div>
            <button 
              onClick={() => setShowNotificationToast(false)} 
              className="text-xs font-extrabold hover:text-error ml-auto cursor-pointer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
