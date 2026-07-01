import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Send, 
  MapPin, 
  Fingerprint, 
  Laptop, 
  ShieldCheck, 
  Calendar, 
  User, 
  Layers,
  Database,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Form, Submission, FormField } from '../types';
import { FIELD_AGENTS, LOCATION_PRESETS, generateBiometricHash } from '../data';

interface FormWorkspaceProps {
  form: Form;
  submissions: Submission[];
  onBack: () => void;
  onSubmitData: (submission: Submission) => void;
}

export default function FormWorkspace({ form, submissions, onBack, onSubmitData }: FormWorkspaceProps) {
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<'capture' | 'history'>('capture');
  const [selectedAgent, setSelectedAgent] = useState(FIELD_AGENTS[0]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // Filter submissions matching this form ID
  const formSubmissions = submissions.filter(sub => sub.formId === form.id);

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleFormSubmission = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation check
    for (const field of form.fields) {
      if (field.required && (formData[field.id] === undefined || formData[field.id] === '')) {
        alert(`Validation Failure: The field "${field.label}" is required.`);
        return;
      }
    }

    // Capture random presets for location
    const randomPreset = LOCATION_PRESETS[Math.floor(Math.random() * LOCATION_PRESETS.length)];
    const randomGps = {
      lat: Number((randomPreset.lat + (Math.random() - 0.5) * 0.01).toFixed(4)),
      lng: Number((randomPreset.lng + (Math.random() - 0.5) * 0.01).toFixed(4)),
      locationName: randomPreset.locationName
    };

    const newSubmission: Submission = {
      id: `sub-custom-${Date.now()}`,
      formId: form.id,
      formName: form.name,
      submittedAt: new Date().toISOString(),
      submittedBy: `Agent ${selectedAgent}`,
      data: formData,
      gps: randomGps,
      biometricHash: generateBiometricHash(),
      deviceFingerprint: `rugged-secure-node-sn${Math.floor(Math.random() * 9000 + 1000)}`
    };

    onSubmitData(newSubmission);
    setFormData({}); // Reset inputs
    setShowSuccessAnim(true);
    setTimeout(() => {
      setShowSuccessAnim(false);
      setActiveWorkspaceTab('history'); // Swaps tab to history so they can immediately inspect!
    }, 2000);
  };

  // Helper to render formatting for submissions values
  const renderValue = (val: any) => {
    if (val === true || val === 'true') return 'Yes (Checked)';
    if (val === false || val === 'false') return 'No (Unchecked)';
    return String(val);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 border border-border-subtle rounded-xl flex items-center justify-center hover:bg-surface-container-high hover:text-primary transition-all shadow-sm"
            title="Return to form repository"
          >
            <ArrowLeft className="w-5 h-5 text-[#3f4942]" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">
                {form.sector} Module
              </span>
              <span className="text-xs text-outline font-semibold">Active Node Release: {form.version}</span>
            </div>
            <h2 className="text-xl font-bold text-[#101e1a] mt-1">{form.name}</h2>
          </div>
        </div>

        {/* Tab switching inside Workspace */}
        <div className="flex border border-border-subtle rounded-lg overflow-hidden bg-white h-9">
          <button 
            onClick={() => {
              setActiveWorkspaceTab('capture');
              setSelectedSubmission(null);
            }}
            className={`px-4 text-xs font-bold transition-all border-r border-border-subtle ${
              activeWorkspaceTab === 'capture' 
                ? 'bg-primary text-white' 
                : 'text-outline hover:bg-surface-container-low'
            }`}
          >
            Data Entry Capture
          </button>
          <button 
            onClick={() => setActiveWorkspaceTab('history')}
            className={`px-4 text-xs font-bold transition-all relative ${
              activeWorkspaceTab === 'history' 
                ? 'bg-primary text-white' 
                : 'text-outline hover:bg-surface-container-low'
            }`}
          >
            Submissions Audit ({formSubmissions.length})
          </button>
        </div>
      </div>

      {/* Main Workspace Contents */}
      {activeWorkspaceTab === 'capture' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Dynamic Questionnaire Form Panel */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border-subtle p-6 shadow-sm space-y-6">
            
            <div className="border-b border-border-subtle pb-3">
              <h3 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <Database className="w-4 h-4 text-primary" /> Active Field Intake Questionnaire
              </h3>
              <p className="text-xs text-outline mt-0.5">All responses are encrypted on-device before sync queues.</p>
            </div>

            {showSuccessAnim ? (
              <div className="py-16 text-center space-y-4">
                <div className="w-16 h-16 bg-[#edfdf6] border border-[#006a61] rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-[#006a61]" />
                </div>
                <h4 className="text-lg font-bold text-primary">Intake Packet Created</h4>
                <p className="text-xs text-outline max-w-sm mx-auto">
                  Biometric hash generated. GPS telemetry bound. Records added to the local cryptographic audit trail.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmission} className="space-y-4">
                {/* Agent Selector Section */}
                <div className="bg-[#FAFAF8] p-4 rounded-lg border border-border-subtle space-y-3">
                  <span className="text-[10px] font-bold text-[#006f66] uppercase tracking-wide block">
                    1. Security and Officer Binding
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#101e1a] mb-1">
                        Active Field Officer Identity
                      </label>
                      <select 
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                      >
                        {FIELD_AGENTS.map((agent, aIdx) => (
                          <option key={aIdx} value={agent}>Agent {agent}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 bg-emerald-50/50 p-2 border border-emerald-100 rounded text-xs text-emerald-800">
                      <Lock className="w-4 h-4 text-primary shrink-0" />
                      <div>
                        <span className="font-bold block">Digital Signature Locked</span>
                        <span className="text-[10px] text-outline-variant font-semibold">Coordinates will bind automatically on submit.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form fields intake */}
                <div className="space-y-4 pt-2">
                  <span className="text-[10px] font-bold text-outline uppercase tracking-wide block">
                    2. Data Capture Payload Schema
                  </span>
                  <div className="space-y-4 bg-white">
                    {form.fields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <label className="block text-xs font-bold text-[#101e1a]">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {/* Text Field */}
                        {field.type === 'text' && (
                          <input
                            type="text"
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'Provide text input...'}
                            className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                          />
                        )}

                        {/* Textarea Field */}
                        {field.type === 'textarea' && (
                          <textarea
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'Enter notes or observations...'}
                            className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs h-20"
                          />
                        )}

                        {/* Number Field */}
                        {field.type === 'number' && (
                          <input
                            type="number"
                            step="any"
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            placeholder={field.placeholder || '0.00'}
                            className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                          />
                        )}

                        {/* Select/Dropdown Field */}
                        {field.type === 'select' && (
                          <select
                            required={field.required}
                            value={formData[field.id] || ''}
                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                            className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                          >
                            <option value="">-- Make Selection --</option>
                            {field.options?.map((opt, oIdx) => (
                              <option key={oIdx} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}

                        {/* Checkbox Field */}
                        {field.type === 'checkbox' && (
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-outline select-none py-1">
                            <input
                              type="checkbox"
                              checked={formData[field.id] || false}
                              onChange={(e) => handleInputChange(field.id, e.target.checked)}
                              className="rounded border-border-subtle text-primary focus:ring-primary w-4 h-4"
                            />
                            {field.label}
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Submit trigger */}
                <div className="pt-4 border-t border-border-subtle flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" /> Submit Secure Form Intake
                  </button>
                </div>
              </form>
            )}

          </div>

          {/* Quick Info Box */}
          <div className="bg-deep-emerald-dark text-white rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-bold flex items-center gap-1.5 text-primary-fixed">
              <ShieldCheck className="w-4 h-4" /> Integrity Safeguard
            </h4>
            <div className="space-y-3 text-xs leading-relaxed text-outline-variant">
              <p>
                This form module is bounded under strict **Governance Protocol Directive FOP-SEC-9**. Every submission triggers active security protocols:
              </p>
              <div className="space-y-2 border-l border-white/10 pl-3 pt-1">
                <div>
                  <span className="font-bold text-white block">GPS Geolocation Binding:</span>
                  <span>Physical device coordinates are calculated and embedded within the submission package.</span>
                </div>
                <div>
                  <span className="font-bold text-white block">Device Fingerprinting:</span>
                  <span>Hardware attributes are signed cryptographically to prevent data spoofing.</span>
                </div>
                <div>
                  <span className="font-bold text-white block">Biometric Hash:</span>
                  <span>Officer signatures are secured via a generated biometric identity hash.</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* History & Telemetry Auditing Views */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Submissions List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border-subtle p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-primary uppercase tracking-wider">
              Secure Submission Register ({formSubmissions.length})
            </h3>

            {formSubmissions.length === 0 ? (
              <div className="text-center py-12 text-outline text-xs font-medium bg-[#FAFAF8] rounded border border-dashed border-border-subtle">
                No active ingest packets recorded for this form release. Choose 'Data Entry Capture' to submit records.
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {formSubmissions.map((sub) => {
                  const isSelected = selectedSubmission?.id === sub.id;
                  return (
                    <div 
                      key={sub.id}
                      onClick={() => setSelectedSubmission(sub)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#edfdf6] border-[#006a61] shadow-sm' 
                          : 'bg-[#FAFAF8] border-border-subtle hover:bg-white hover:border-[#006a61]/30'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#101e1a]">{sub.submittedBy}</span>
                            <span className="text-[10px] bg-white text-outline border border-border-subtle px-1.5 py-0.5 rounded font-mono">
                              {sub.id.substring(0, 12)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-outline mt-1 font-semibold">
                            <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(sub.submittedAt).toLocaleDateString()} at {new Date(sub.submittedAt).toLocaleTimeString()}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-secondary" /> {sub.gps.locationName}</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          SECURED
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expanded Crypto Certificate Audit Panel */}
          <div className="bg-white rounded-xl border border-border-subtle p-6 shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-primary" /> Compliance Certificate
            </h4>

            {selectedSubmission ? (
              <div className="space-y-4 text-xs">
                
                {/* Visual Header */}
                <div className="bg-deep-emerald-dark p-3 rounded-lg text-white space-y-1.5 relative overflow-hidden">
                  <div className="absolute top-2 right-2 opacity-15">
                    <Fingerprint className="w-12 h-12 text-white" />
                  </div>
                  <span className="text-[9px] text-[#9cf5c1] font-bold uppercase tracking-widest font-mono">INTEGRITY BLOCK ATTESTED</span>
                  <div className="font-bold text-xs truncate">UID: {selectedSubmission.id}</div>
                  <div className="text-[10px] text-outline-variant font-mono">Bound with AES-256 Signature</div>
                </div>

                {/* Telemetry points */}
                <div className="space-y-3">
                  <div className="border-b border-[#FAFAF8] pb-2">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Submitted By</span>
                    <div className="flex items-center gap-1.5 font-bold text-[#101e1a]">
                      <User className="w-3.5 h-3.5 text-[#006a61]" /> {selectedSubmission.submittedBy}
                    </div>
                  </div>

                  <div className="border-b border-[#FAFAF8] pb-2">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">GPS Location Lock</span>
                    <div className="flex items-center gap-1.5 font-bold text-[#101e1a]">
                      <MapPin className="w-3.5 h-3.5 text-secondary" /> {selectedSubmission.gps.lat}, {selectedSubmission.gps.lng}
                    </div>
                    <span className="text-[10px] text-outline mt-0.5 block">{selectedSubmission.gps.locationName}</span>
                  </div>

                  <div className="border-b border-[#FAFAF8] pb-2">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Hardware Node ID</span>
                    <div className="flex items-center gap-1.5 font-mono text-[#101e1a]">
                      <Laptop className="w-3.5 h-3.5 text-outline/80" /> {selectedSubmission.deviceFingerprint}
                    </div>
                  </div>

                  <div className="border-b border-[#FAFAF8] pb-2">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-0.5">Biometric Hash Authority</span>
                    <div className="p-2 rounded bg-gray-50 border border-gray-100 font-mono text-[9px] text-outline break-all leading-tight">
                      {selectedSubmission.biometricHash}
                    </div>
                  </div>

                  {/* Form Intake Payload */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#006f66] uppercase tracking-wider block">Intake Payload Details</span>
                    <div className="bg-[#edfdf6]/40 rounded border border-[#e1f2eb] p-3 space-y-2">
                      {form.fields.map((field) => {
                        const val = selectedSubmission.data[field.id];
                        return (
                          <div key={field.id} className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-[#e1f2eb]/50 last:border-b-0">
                            <span className="text-outline font-semibold line-clamp-1">{field.label}:</span>
                            <span className="font-bold text-[#101e1a] text-right truncate">
                              {val !== undefined ? renderValue(val) : 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-16 text-outline text-xs leading-relaxed">
                Select a submission entry on the left to verify cryptographic signatures, GPS locks, biometric authority, and payload parameters.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
