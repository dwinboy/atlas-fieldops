import React, { useState } from 'react';
import { Send, Mail } from 'lucide-react';

interface InviteHubProps {
  onSendInvite: (email: string, team: string) => void;
}

export default function InviteHub({ onSendInvite }: InviteHubProps) {
  const [email, setEmail] = useState('');
  const [team, setTeam] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setErrorMsg(null);

    if (!email) {
      setErrorMsg('Please enter an email address.');
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!team || team === 'Select a team...') {
      setErrorMsg('Please select an assigned team.');
      return;
    }

    // Call success handler
    onSendInvite(email, team);
    setSuccessMsg(`Access token sent to ${email}`);
    
    // Reset form
    setEmail('');
    setTeam('');

    // Clear message after 4s
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="bg-brand-surface-container-low/30 border border-brand-outline-variant/40 rounded-xl p-5 shadow-sm relative overflow-hidden transition-all duration-300">
      {/* Background Graphic Send Icon */}
      <div className="absolute -top-3 -right-3 p-4 opacity-10 text-brand-primary">
        <Send className="w-14 h-14 rotate-12" />
      </div>

      <h3 className="text-sm font-bold text-brand-on-surface mb-1 uppercase tracking-wider">Invite Hub</h3>
      <p className="text-xs text-brand-on-surface-variant/75 mb-4">Provision new access tokens for field personnel.</p>

      <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-on-surface-variant/80 mb-1 ml-0.5">
            Email Address
          </label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-1.5 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-brand-on-surface"
            placeholder="e.g. j.doe@atlas.ops"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-brand-on-surface-variant/80 mb-1 ml-0.5">
            Assigned Team
          </label>
          <select 
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="w-full px-3 py-1.5 border border-brand-outline-variant/40 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-brand-on-surface"
          >
            <option value="">Select a team...</option>
            <option value="Agriculture Alpha">Agriculture Alpha</option>
            <option value="Health Outreach">Health Outreach</option>
            <option value="Infrastructure Delta">Infrastructure Delta</option>
            <option value="Logistics Echo">Logistics Echo</option>
          </select>
        </div>

        {errorMsg && (
          <p className="text-xs font-medium text-brand-error mt-1">{errorMsg}</p>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-2 text-xs font-semibold mt-1">
            {successMsg}
          </div>
        )}

        <button 
          type="submit"
          className="w-full py-2 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-primary-container shadow hover:shadow-lg hover:shadow-brand-primary/10 transition-all flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          Send Invitation
        </button>
      </form>
    </div>
  );
}
