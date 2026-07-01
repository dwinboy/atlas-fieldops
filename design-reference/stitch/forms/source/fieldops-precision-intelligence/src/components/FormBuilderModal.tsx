import React, { useState } from 'react';
import { X, Plus, Trash2, Eye, FileText, Info } from 'lucide-react';
import { Form, FormField, SectorType } from '../types';

interface FormBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateForm: (form: Form) => void;
}

export default function FormBuilderModal({ isOpen, onClose, onCreateForm }: FormBuilderModalProps) {
  const [formName, setFormName] = useState('');
  const [sector, setSector] = useState<SectorType>('AGRI');
  const [version, setVersion] = useState('v1.0.0');
  const [fields, setFields] = useState<FormField[]>([
    { id: 'f-1', type: 'text', label: 'Operator ID/Name', placeholder: 'Enter full identity', required: true }
  ]);
  const [previewMode, setPreviewMode] = useState(false);

  if (!isOpen) return null;

  const handleAddField = () => {
    const newId = `f-${Date.now()}`;
    setFields([
      ...fields,
      { id: newId, type: 'text', label: `Custom Field ${fields.length + 1}`, placeholder: '', required: false }
    ]);
  };

  const handleRemoveField = (id: string) => {
    if (fields.length <= 1) {
      alert('A form must contain at least one data field.');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
  };

  const handleFieldChange = (id: string, key: keyof FormField, value: any) => {
    setFields(fields.map(f => {
      if (f.id === id) {
        return { ...f, [key]: value };
      }
      return f;
    }));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Please provide a valid Form Name.');
      return;
    }

    // Assign default images based on sector to keep aesthetic consistency
    let sectorImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-R80x3D8hIkn-e2LorTKk7kXMWQZRQh71uu_HstXPz4MAL1h3d9VoxXzSepjPAbmH8ZuGAak1_PaLdLqOmUnLpbsDDo5bvXFGqV2ApfahhrYwUUaZ_4UOMutRp8PQtnvkLrQWRoCI0Ac_uFM-W2YsyV-9SrNlTcXRJKjlQD5Kt7NK2vU4vdv7TgMvAndkn__kSZqp_fycMvIQRD3sLtjsijPvEsV7e4gr2x4UxMZUvZTc6rmENhYc7PBmSaG-oSFhUjY_hp1qFg';
    if (sector === 'HEALTH') {
      sectorImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdoEcbu9fSx2sXG0w7NcPGtJwfEJBoOLp-Wg2Rw1uo8lbM-Hoet3m30Y-qc05obonGXK07y50dFVLJBGaEeN2SlAGohzin7ewQs-TmPhxwfoUDJhxkTGdjKIDoEOTxL0P5C-8io086SlxAEXdiyKKTTlCC2l12kM_UiQZrQmPb7UbPPqml6y6mdn50BVrcgITkUnbleH720XOz3GAolvKR7SbD1SE2OyBEuffr6N_OJqsnNCMNqZEq8IsR8qqLbRGQcx2azfJs7Q';
    } else if (sector === 'RETAIL') {
      sectorImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2VrL1xLQAVTJW7UcyEBfXPS_XjqN8cbhQ0axqSZ8pde4aMkzaCZB54nlHo9W2lsaP3z8Kw20O9iVzKXXzX0pPc979udPn0XuC_37ehBfApg3UgzazcfBTlUcmap0A4Q6aNF2yHJ-eKJCguOB9EwkGGm9fWm2PfFUcq1FsYs_WcHwsO_sxHS9MkLM3L5PS1h9mfLTWZQ3-dGyfjSFtsPwMIuCGFO5gxxi9OfJx2JQlBb_waV4IP4FjqAdoYQr3vU4o78EYj6ynLg';
    } else if (sector === 'LOGISTICS') {
      sectorImage = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBtaV3wK6Gt436bYTUd0YqPs12jGku1dsw0pMUd211uiun8X-7yoCRUxFt-gmGCLe7SspxD9kwKCQ4LSod7XqNZPEk3QBA_9Zf94OJvT09G2aPYD4hgq_FFqdWAynWpURdxYW36zT0yzLSGubTdjWPAfBhlq1kCylv2swV6XDFQ_PSi41IXnabDn0oNmnRYGv4um2bQ6upzZYP2T6wS8twtmbZ1Ie5QDOUXZ8RwGNUDZlsvHCPtrQieCniztdY0fMWdCChnJDcbUQ';
    }

    const newForm: Form = {
      id: `form-custom-${Date.now()}`,
      name: formName.trim(),
      sector,
      version: version.startsWith('v') ? version : `v${version}`,
      createdDate: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
      submissionsCount: 0,
      trend: [0, 0, 0, 0, 0, 0, 0], // Empty submissions trend to start
      status: 'Published',
      verified: false,
      image: sectorImage,
      fields
    };

    onCreateForm(newForm);
    // Reset state
    setFormName('');
    setSector('AGRI');
    setVersion('v1.0.0');
    setFields([{ id: 'f-1', type: 'text', label: 'Operator ID/Name', placeholder: 'Enter full identity', required: true }]);
    setPreviewMode(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#0C1F1B]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-border-subtle shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-border-subtle bg-[#edfdf6]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary">Governance Protocol Form Builder</h3>
              <p className="text-[10px] text-outline font-semibold uppercase tracking-wider">Secured Registry System</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high text-[#3f4942]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Bar: Design vs Preview Tabs */}
          <div className="flex border-b border-border-subtle gap-2 pb-1.5">
            <button
              type="button"
              onClick={() => setPreviewMode(false)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                !previewMode 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-outline hover:bg-surface-container-low'
              }`}
            >
              Configure Schema
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode(true)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                previewMode 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-outline hover:bg-surface-container-low'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Live Preview
            </button>
          </div>

          {!previewMode ? (
            <form onSubmit={handleSaveForm} className="space-y-6">
              {/* Form Metadata Section */}
              <div className="bg-[#FAFAF8] p-4 rounded-lg border border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#101e1a] uppercase tracking-wide mb-1">Form Title</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g., Water Quality Assessment"
                    className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#101e1a] uppercase tracking-wide mb-1">Operational Sector</label>
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value as SectorType)}
                    className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                  >
                    <option value="AGRI">Agriculture (AGRI)</option>
                    <option value="HEALTH">Health Outreach (HEALTH)</option>
                    <option value="RETAIL">Retail Inventory (RETAIL)</option>
                    <option value="LOGISTICS">Logistics (LOGISTICS)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#101e1a] uppercase tracking-wide mb-1">Version Release</label>
                  <input
                    type="text"
                    required
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="e.g., v1.0.0"
                    className="w-full bg-white border border-border-subtle rounded px-3 py-2 text-xs"
                  />
                </div>
              </div>

              {/* Dynamic Form Fields Area */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-[#101e1a] uppercase tracking-wider">Field Definitions Schema</h4>
                  <button
                    type="button"
                    onClick={handleAddField}
                    className="bg-secondary text-white text-[11px] font-bold px-3 py-1.5 rounded flex items-center gap-1 hover:opacity-90 transition-all shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Data Field
                  </button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div 
                      key={field.id}
                      className="p-4 rounded-lg border border-border-subtle bg-white hover:border-[#006a61]/30 transition-colors flex flex-col gap-3"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#edfdf6] text-primary font-bold text-xs flex items-center justify-center border border-[#e1f2eb]">
                          {index + 1}
                        </span>

                        {/* Field Label */}
                        <div className="flex-1 min-w-[150px]">
                          <input
                            type="text"
                            required
                            value={field.label}
                            onChange={(e) => handleFieldChange(field.id, 'label', e.target.value)}
                            placeholder="Data Field Label (e.g. Temperature)"
                            className="w-full bg-[#FAFAF8] border border-border-subtle rounded px-2.5 py-1 text-xs font-bold text-[#101e1a]"
                          />
                        </div>

                        {/* Field Type Selector */}
                        <div className="w-[130px]">
                          <select
                            value={field.type}
                            onChange={(e) => handleFieldChange(field.id, 'type', e.target.value)}
                            className="w-full bg-[#FAFAF8] border border-border-subtle rounded px-2.5 py-1 text-xs"
                          >
                            <option value="text">Text Input</option>
                            <option value="number">Numeric Measure</option>
                            <option value="select">Dropdown Choice</option>
                            <option value="textarea">Multi-line Text</option>
                            <option value="checkbox">Boolean Checkbox</option>
                          </select>
                        </div>

                        {/* Is Required toggle */}
                        <label className="flex items-center gap-1.5 text-xs text-outline font-semibold cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleFieldChange(field.id, 'required', e.target.checked)}
                            className="rounded border-border-subtle text-primary focus:ring-primary w-3.5 h-3.5"
                          />
                          Required
                        </label>

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveField(field.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-outline hover:text-red-600 transition-colors ml-auto"
                          title="Remove Field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Dropdown Options Config (shown only if select type is active) */}
                      {field.type === 'select' && (
                        <div className="bg-[#edfdf6]/40 p-2.5 rounded border border-[#006a61]/10 flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-[#006f66] uppercase tracking-wide flex items-center gap-1">
                            <Info className="w-3 h-3" /> Config Dropdown Choices (comma-separated)
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Option 1, Option 2, Option 3..."
                            value={field.options ? field.options.join(', ') : ''}
                            onChange={(e) => {
                              const opts = e.target.value.split(',').map(o => o.trim()).filter(o => o !== '');
                              handleFieldChange(field.id, 'options', opts);
                            }}
                            className="w-full bg-white border border-border-subtle rounded px-2 py-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* Live Preview Layout */
            <div className="space-y-6">
              <div className="border border-dashed border-border-subtle p-6 rounded-xl bg-white max-w-md mx-auto space-y-4">
                <div className="border-b border-border-subtle pb-3">
                  <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase">
                    {sector} PREVIEW
                  </span>
                  <h3 className="text-base font-bold text-[#101e1a] mt-1.5">{formName || 'Untitled Form Schema'}</h3>
                  <p className="text-xs text-outline mt-0.5">Release Version: {version}</p>
                </div>

                <div className="space-y-3">
                  {fields.map((f, i) => (
                    <div key={f.id} className="space-y-1 text-left">
                      <label className="block text-xs font-bold text-[#101e1a]">
                        {f.label} {f.required && <span className="text-red-500">*</span>}
                      </label>
                      {f.type === 'text' && (
                        <input type="text" disabled placeholder={f.placeholder || 'Text input preview'} className="w-full bg-[#FAFAF8] border border-border-subtle rounded px-3 py-1.5 text-xs opacity-75" />
                      )}
                      {f.type === 'number' && (
                        <input type="number" disabled placeholder={f.placeholder || 'Numeric values only'} className="w-full bg-[#FAFAF8] border border-border-subtle rounded px-3 py-1.5 text-xs opacity-75" />
                      )}
                      {f.type === 'textarea' && (
                        <textarea disabled placeholder={f.placeholder || 'Multi-line notes field...'} className="w-full bg-[#FAFAF8] border border-border-subtle rounded px-3 py-1.5 text-xs opacity-75 h-16" />
                      )}
                      {f.type === 'select' && (
                        <select disabled className="w-full bg-[#FAFAF8] border border-border-subtle rounded px-3 py-1.5 text-xs opacity-75">
                          {f.options && f.options.length > 0 ? (
                            f.options.map((opt, oIdx) => <option key={oIdx}>{opt}</option>)
                          ) : (
                            <option>No options configured</option>
                          )}
                        </select>
                      )}
                      {f.type === 'checkbox' && (
                        <label className="flex items-center gap-2 cursor-not-allowed text-xs text-outline font-semibold select-none">
                          <input type="checkbox" disabled className="rounded border-border-subtle text-primary focus:ring-primary w-3.5 h-3.5 opacity-75" />
                          {f.label}
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#FAFAF8] border-t border-border-subtle flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="border border-border-subtle text-[#3f4942] font-semibold text-xs px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveForm}
            className="bg-primary text-white font-bold text-xs px-5 py-2 rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
          >
            Deploy & Register Form
          </button>
        </div>

      </div>
    </div>
  );
}
