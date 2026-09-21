'use client';

import React, { useState } from 'react';
import { X, User, Briefcase, Award, Save, Check } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profileData: any) => Promise<void>;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onSaveProfile,
}: ProfileModalProps) {
  const [fullName, setFullName] = useState('Alex Mercer');
  const [email, setEmail] = useState('alex.mercer@apexai.io');
  const [headline, setHeadline] = useState('Enterprise AI & Cloud Infrastructure Specialist');
  const [agencyName, setAgencyName] = useState('Apex Intelligence Solutions');
  const [yearsOfExperience, setYearsOfExperience] = useState(8);
  const [pastExperience, setPastExperience] = useState(
    'Ex-Staff Systems Architect with 8+ years scaling high-throughput distributed architectures, optimizing PostgreSQL/PostGIS engines, and building autonomous LLM agents that cut latency by 74%.'
  );
  const [toolsUtilized, setToolsUtilized] = useState(
    'Python, FastAPI, Kafka, PostgreSQL, PostGIS, Docker, AWS ECS, Kubernetes, CesiumJS, PyTorch'
  );
  const [services, setServices] = useState(
    'Enterprise LLM & Agent Workflow Automation\nPostgreSQL/PostGIS Engine Optimization\nHigh-Throughput Event Streaming (Kafka/AWS)'
  );
  const [targetIndustries, setTargetIndustries] = useState(
    'Logistics & Supply Chain, Fintech, Autonomous Operations, Enterprise SaaS'
  );
  const [targetGeographies, setTargetGeographies] = useState(
    'Pune, Mumbai, Bengaluru, New York, San Francisco, London, Singapore'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        full_name: fullName,
        email,
        headline,
        agency_or_business_name: agencyName,
        bio: pastExperience,
        years_of_experience: Number(yearsOfExperience) || 8,
        profile: {
          services_offered: services.split('\n').filter((s) => s.trim().length > 0),
          tools_utilized: toolsUtilized.split(',').map((s) => s.trim()).filter(Boolean),
          target_industries: targetIndustries.split(',').map((s) => s.trim()),
          target_geographies: targetGeographies.split(',').map((s) => s.trim()),
          skill_matrix: [
            { category: 'AI/ML Engineering', skills: ['PyTorch', 'Gemini API', 'LangChain', 'Vector DBs'], proficiency: 'Expert' },
            { category: 'Distributed Systems', skills: ['Kafka', 'AWS', 'Kubernetes', 'FastAPI'], proficiency: 'Expert' },
            { category: 'Database & Geospatial', skills: ['PostgreSQL', 'PostGIS', 'CesiumJS', 'Redis'], proficiency: 'Expert' }
          ],
        },
      };
      await onSaveProfile(payload);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-xl tactical-glass rounded-panel border border-tactical-border shadow-panelGlow overflow-hidden">
        {/* Sci-Fi Corners */}
        <div className="hud-corner-tl" />
        <div className="hud-corner-br" />

        {/* Modal Header */}
        <div className="p-4 border-b border-tactical-border flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-tactical-cyan" />
            <h3 className="text-sm font-bold font-mono tracking-wider text-tactical-textPrimary">
              OPERATOR PROFILE & SKILL MATRIX INGESTION
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-tactical-textDim hover:text-tactical-textPrimary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
              Headline / Technical Role
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
                Agency / Practice Name
              </label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
                Years of Experience
              </label>
              <input
                type="number"
                min={0}
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
              Tools & Technologies Utilized (Comma-separated)
            </label>
            <input
              type="text"
              value={toolsUtilized}
              onChange={(e) => setToolsUtilized(e.target.value)}
              placeholder="Python, FastAPI, Kafka, PostgreSQL, Docker, AWS, CesiumJS"
              className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
              Past Work Experience & Key Proof Points
            </label>
            <textarea
              rows={2}
              value={pastExperience}
              onChange={(e) => setPastExperience(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
              Services Offered (One per line)
            </label>
            <textarea
              rows={3}
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
              Target Industries (Comma-separated)
            </label>
            <input
              type="text"
              value={targetIndustries}
              onChange={(e) => setTargetIndustries(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-tactical-textSecondary uppercase mb-1">
              Target Geographies (Comma-separated)
            </label>
            <input
              type="text"
              value={targetGeographies}
              onChange={(e) => setTargetGeographies(e.target.value)}
              className="w-full px-3 py-2 rounded-btn bg-black/50 border border-tactical-border text-xs font-mono text-tactical-textPrimary focus:outline-none focus:border-tactical-cyan"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-tactical-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-btn text-xs font-mono border border-tactical-border text-tactical-textSecondary hover:text-tactical-textPrimary hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-btn text-xs font-mono font-bold bg-tactical-cyan text-black hover:bg-tactical-cyan/90 transition-colors flex items-center gap-1.5 shadow-cyanGlow"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  SAVED
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'SAVING...' : 'INGEST PROFILE'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
