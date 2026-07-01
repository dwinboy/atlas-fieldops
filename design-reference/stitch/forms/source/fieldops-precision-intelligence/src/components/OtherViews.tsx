import React, { useState } from 'react';
import { 
  BarChart, 
  Map, 
  Layers, 
  ShieldAlert, 
  Satellite, 
  Activity, 
  CheckCircle, 
  Clock, 
  Users, 
  TrendingUp, 
  Search,
  ChevronRight,
  Sparkles,
  MapPin
} from 'lucide-react';

interface ViewProps {
  userEmail: string;
}

export function DashboardView({ userEmail }: ViewProps) {
  const nodeStatus = [
    { name: 'North America Base (NA-01)', ping: '42ms', load: '32%', status: 'Nominal' },
    { name: 'Euro-Zone Quad (EU-04)', ping: '88ms', load: '45%', status: 'Nominal' },
    { name: 'Asia Pacific Hub (AP-09)', ping: '112ms', load: '14%', status: 'Nominal' },
    { name: 'African Outpost Hub (AF-02)', ping: '210ms', load: '84%', status: 'High Load' }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-xl font-bold text-[#101e1a]">Dashboard Overview</h2>
        <p className="text-xs text-outline mt-0.5">Real-time telemetry and server integrity for FieldOps nodes.</p>
      </div>

      {/* Analytics Gauge Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-primary flex items-center justify-center border border-[#e1f2eb]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-outline font-semibold uppercase tracking-wider block">Network Upstream</span>
            <span className="text-xl font-bold text-[#101e1a]">99.98% Available</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-outline font-semibold uppercase tracking-wider block">Active Field Officers</span>
            <span className="text-xl font-bold text-[#101e1a]">34 Officers Live</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#e1e0ff] text-[#2f2ebe] flex items-center justify-center border border-[#c0c1ff]">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-outline font-semibold uppercase tracking-wider block">Satellite Transceivers</span>
            <span className="text-xl font-bold text-[#101e1a]">5 Active Satellites</span>
          </div>
        </div>
      </div>

      {/* Detailed Node Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Node Hub Latencies</h3>
          <div className="space-y-3">
            {nodeStatus.map((node, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-[#FAFAF8] border border-border-subtle hover:border-primary/20 transition-all">
                <div>
                  <span className="font-bold text-xs text-[#101e1a] block">{node.name}</span>
                  <span className="text-[10px] text-outline font-semibold">Transmission Response Speed: {node.ping}</span>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                    node.status === 'Nominal' ? 'bg-[#edfdf6] text-primary' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {node.status}
                  </span>
                  <span className="text-xs block mt-1 font-semibold text-outline">Load: {node.load}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Visual telemetry card */}
        <div className="bg-[#0C1F1B] text-white rounded-xl p-6 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#9cf5c1] uppercase tracking-widest font-mono">ENCRYPTED TELEMETRY STREAM</span>
            <h3 className="text-lg font-bold text-white mt-1">Field Intelligence Matrix</h3>
            <p className="text-xs text-outline-variant mt-2 leading-relaxed">
              Monitoring regional data packets, sync speeds, and field devices telemetry. Safe mode is fully validated on local container port range.
            </p>
          </div>

          <div className="bg-white/5 rounded border border-white/10 p-4 mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-outline-variant">Authorized Operator:</span>
              <span className="font-bold text-[#9cf5c1] truncate max-w-[150px]">{userEmail}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-outline-variant">Cryptographic Standard:</span>
              <span className="font-bold text-white">TLS 1.3 / AES-256</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-outline-variant">Database Engine:</span>
              <span className="font-bold text-white">Secure Local CryptStorage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsView() {
  const projects = [
    { name: 'Operation Green Canopy', sector: 'AGRI', progress: 84, team: 12, status: 'Active' },
    { name: 'Outreach Clinic Sync', sector: 'HEALTH', progress: 40, team: 8, status: 'Active' },
    { name: 'Midwest Logistics Pipeline', sector: 'LOGISTICS', progress: 100, team: 15, status: 'Completed' },
    { name: 'Global Supply Audit', sector: 'RETAIL', progress: 12, team: 6, status: 'Pending' }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-xl font-bold text-[#101e1a]">Project Registry</h2>
        <p className="text-xs text-outline mt-0.5">Tracking secure field project milestones and deployment groups.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((project, idx) => (
          <div key={idx} className="bg-white border border-border-subtle p-6 rounded-xl hover:shadow-md transition-all space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-black tracking-wider uppercase">
                  {project.sector}
                </span>
                <h3 className="font-bold text-base text-[#101e1a] mt-2">{project.name}</h3>
              </div>
              <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                project.status === 'Completed' ? 'bg-[#edfdf6] text-primary' : 'bg-blue-50 text-blue-800'
              }`}>
                {project.status}
              </span>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold text-outline">
                <span>Deployment Complete</span>
                <span>{project.progress}%</span>
              </div>
              <div className="h-2 w-full bg-[#FAFAF8] rounded-full overflow-hidden border border-border-subtle">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-1000" 
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-outline border-t border-[#FAFAF8] pt-3">
              <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {project.team} Personnel Assigned</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Updated today</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OperationsView() {
  const operationsList = [
    { title: 'Deploy Satellite GPS Transceiver Module', owner: 'Superintendent Vance', priority: 'Critical', status: 'Completed' },
    { title: 'Biometric Terminal Node Authentication', owner: 'Dr. Sarah Miller', priority: 'High', status: 'In Progress' },
    { title: 'Verify Local Storage Database Buffers', owner: 'Field Admin', priority: 'Medium', status: 'Completed' },
    { title: 'Install Redundant Backup Solar Rails', owner: 'Engineer Sato', priority: 'Medium', status: 'Draft' }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-xl font-bold text-[#101e1a]">Field Deployment Tasks</h2>
        <p className="text-xs text-outline mt-0.5">Assessing deployment statuses, security checkpoints, and field operations.</p>
      </div>

      <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 bg-[#edfdf6] border-b border-border-subtle flex justify-between font-bold text-xs text-primary uppercase tracking-wider">
          <span>Deployment Checklist</span>
          <span>Security Clearance verified</span>
        </div>
        <div className="divide-y divide-[#E2E8F0]">
          {operationsList.map((op, idx) => (
            <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAFAF8] transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase ${
                    op.priority === 'Critical' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {op.priority} Priority
                  </span>
                  <span className="text-[10px] text-outline font-semibold">Lead: {op.owner}</span>
                </div>
                <h4 className="font-bold text-sm text-[#101e1a]">{op.title}</h4>
              </div>

              <span className={`text-xs px-3 py-1 rounded-full font-bold text-center self-start md:self-auto ${
                op.status === 'Completed' ? 'bg-[#edfdf6] text-primary' : 'bg-amber-50 text-amber-800'
              }`}>
                {op.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MappingView() {
  const [selectedPin, setSelectedPin] = useState<{ name: string; lat: number; lng: number; desc: string } | null>({
    name: 'Sector 12 Agriculture Plot',
    lat: 38.8951,
    lng: -77.0364,
    desc: 'Actively submitting soil and crop metrics.'
  });

  const activePins = [
    { name: 'Sector 12 Agriculture Plot', lat: 42, lng: 32, desc: 'Actively submitting soil, ambient temperature, and crop baseline indices.' },
    { name: 'Kibera Medical Hub Outpost', lat: 78, lng: 52, desc: 'Live vaccination surveys and clinical health assessments in progress.' },
    { name: 'Regional Cargo Transceiver Terminal', lat: 25, lng: 75, desc: 'Waybill logging and logistics cryptographic proofs processing.' },
    { name: 'Central Inventory Depot ST-04', lat: 55, lng: 18, desc: 'Retail audits completed with zero sync packet drift.' }
  ];

  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-xl font-bold text-[#101e1a]">GIS Mapping Systems</h2>
        <p className="text-xs text-outline mt-0.5">Pulsating live coordinates and geospatial tracking overlays.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Interactive SVG Radar Mapping Canvas */}
        <div className="lg:col-span-2 bg-[#0C1F1B] rounded-xl overflow-hidden border border-border-subtle p-6 flex flex-col justify-between min-h-[400px] relative">
          
          {/* Mapping Overlay grid lines */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-10 pointer-events-none">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-white/50" />
            ))}
          </div>

          <div className="relative z-10 flex justify-between items-center bg-white/5 border border-white/10 rounded-lg p-3 text-white">
            <span className="text-xs font-bold font-mono text-[#9cf5c1] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#006a61] animate-ping" />
              SATELLITE DOWNLINK: GPS-AURA-9
            </span>
            <span className="text-[10px] text-outline-variant font-semibold">Grid System: WGS 84</span>
          </div>

          {/* Graphical Map representation with clickable node plots */}
          <div className="h-64 relative my-4 flex items-center justify-center">
            
            {/* SVG abstract map contours */}
            <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M10,20 C30,10 40,40 60,30 C80,20 90,50 100,60 C100,80 80,90 50,80 C20,70 10,90 0,60 Z" fill="none" stroke="#9cf5c1" strokeWidth="0.5" />
              <path d="M20,40 C40,30 50,60 70,50 C90,40 100,70 100,80 C80,90 60,80 40,90 C10,90 10,60 10,50 Z" fill="none" stroke="#9cf5c1" strokeWidth="0.5" strokeDasharray="2" />
            </svg>

            {/* Clickable pins with pulsating signals */}
            {activePins.map((pin, pIdx) => {
              const isSelected = selectedPin?.name === pin.name;
              return (
                <button
                  key={pIdx}
                  onClick={() => setSelectedPin(pin)}
                  className="absolute group transition-transform hover:scale-110 focus:outline-none"
                  style={{ top: `${pin.lat}%`, left: `${pin.lng}%` }}
                >
                  <div className={`relative flex items-center justify-center w-6 h-6 rounded-full ${
                    isSelected ? 'bg-[#006a61]' : 'bg-primary'
                  }`}>
                    <MapPin className="w-4 h-4 text-white" />
                    <span className="absolute inset-0 rounded-full border border-primary animate-ping opacity-60" />
                  </div>
                  <div className="absolute top-7 left-1/2 -translate-x-1/2 bg-white text-[#101e1a] text-[9px] font-bold px-2 py-0.5 rounded shadow border border-border-subtle whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {pin.name}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="relative z-10 bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-outline-variant text-center">
            Click on any mapped transceiver node pin above to inspect geographic coordinates and active field streams.
          </div>

        </div>

        {/* Selected Coordinate Details Panel */}
        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-primary uppercase tracking-wider">Node Details</h4>

          {selectedPin ? (
            <div className="space-y-3 text-xs">
              <div className="bg-[#edfdf6] p-3 rounded border border-[#e1f2eb] space-y-1">
                <span className="font-bold text-primary text-xs block">{selectedPin.name}</span>
                <p className="text-[11px] text-[#3f4942]">{selectedPin.desc}</p>
              </div>

              <div className="space-y-2 font-mono text-[11px] text-outline">
                <div className="flex justify-between border-b border-[#FAFAF8] pb-1.5">
                  <span>LATITUDE:</span>
                  <span className="font-bold text-[#101e1a]">{selectedPin.lat}° N</span>
                </div>
                <div className="flex justify-between border-b border-[#FAFAF8] pb-1.5">
                  <span>LONGITUDE:</span>
                  <span className="font-bold text-[#101e1a]">{selectedPin.lng}° E</span>
                </div>
                <div className="flex justify-between border-b border-[#FAFAF8] pb-1.5">
                  <span>ELEVATION MEASURED:</span>
                  <span className="font-bold text-[#101e1a]">142m MSL</span>
                </div>
                <div className="flex justify-between">
                  <span>DOP ACCURACY:</span>
                  <span className="font-bold text-[#006a61]">0.8m HDOP</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-outline">No geographic node selected.</p>
          )}
        </div>

      </div>
    </div>
  );
}

export function AnalyticsView() {
  return (
    <div className="space-y-6 text-left animate-fade-in">
      <div className="border-b border-border-subtle pb-4">
        <h2 className="text-xl font-bold text-[#101e1a]">Telemetry &amp; Analytics</h2>
        <p className="text-xs text-outline mt-0.5">Visualizing telemetry streams, latency data and package submission velocity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mock Chart 1: Submission Velocity */}
        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Submissions Speed Telemetry</h3>
          <p className="text-[11px] text-outline">Weekly data packet ingestion velocity across all regional nodes.</p>
          
          {/* Custom high-fidelity inline SVG chart */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {[45, 68, 52, 95, 78, 110, 92].map((val, idx) => {
              const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const heightPercent = `${(val / 120) * 100}%`;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div 
                    className="w-full bg-[#e1f2eb] border-t-2 border-primary group-hover:bg-primary rounded-t transition-all duration-300 relative"
                    style={{ height: heightPercent }}
                  >
                    {/* Tooltip on hover */}
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {val} k/s
                    </span>
                  </div>
                  <span className="text-[10px] text-outline font-semibold">{days[idx]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mock Chart 2: Database Storage Buffers */}
        <div className="bg-white border border-border-subtle p-6 rounded-xl shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Device Buffer Health</h3>
          <p className="text-[11px] text-outline">Available local on-device buffering database blocks status.</p>

          <div className="h-48 flex flex-col justify-center space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span>Buffer Space Available (rugged-secure-node)</span>
                <span>12.4 GB of 16 GB (77%)</span>
              </div>
              <div className="h-3 w-full bg-[#FAFAF8] rounded-full overflow-hidden border border-border-subtle">
                <div className="h-full bg-secondary rounded-full" style={{ width: '77%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-outline mb-1">
                <span>Package Queues In-Flight</span>
                <span>14 Packets buffered</span>
              </div>
              <div className="h-3 w-full bg-[#FAFAF8] rounded-full overflow-hidden border border-border-subtle">
                <div className="h-full bg-[#2f2ebf] rounded-full" style={{ width: '15%' }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
