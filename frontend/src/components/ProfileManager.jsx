import React, { useState, useEffect } from "react";
import { 
  UserCheck, 
  FileText, 
  Plus, 
  X, 
  Check, 
  Save, 
  Briefcase, 
  ShieldCheck, 
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { getUserProfile, updateUserProfile } from "../api";

export default function ProfileManager({ onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim() || !profile) return;
    const trimmed = newSkill.trim();
    if (!profile.skills.includes(trimmed)) {
      setProfile({
        ...profile,
        skills: [...profile.skills, trimmed]
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(profile);
      setProfile(updated);
      setSaveSuccess(true);
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        Loading master profile...
      </div>
    );
  }

  const standardAnswers = profile.standard_answers || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Bar with Save button */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-400" />
            Master Candidate Profile & ATS Repository
          </h2>
          <p className="text-xs text-slate-400">
            Source of truth for Chrome extension auto-filling, AI match calculation, and resume tailoring.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/10 transition-all active:scale-95"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Profile Saved & Scores Synced!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving & Re-calculating..." : "Save Master Profile"}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Personal info & ATS Form Repository (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Contact Details */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Identity & Contact (Autofill Fields)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Location / City</label>
                <input
                  type="text"
                  value={profile.location || ""}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={profile.linkedin_url || ""}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">GitHub / Portfolio URL</label>
                <input
                  type="url"
                  value={profile.github_url || ""}
                  onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Standard Form Answers */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Standard ATS Form Answers
            </h3>
            <p className="text-[11px] text-slate-400">
              Injected into Greenhouse, Lever, and Workday forms by the CLIFF Chrome extension.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Work Authorization</label>
                <input
                  type="text"
                  value={standardAnswers.work_authorization || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, work_authorization: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notice Period / Start Date</label>
                <input
                  type="text"
                  value={standardAnswers.notice_period || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, notice_period: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Compensation</label>
                <input
                  type="text"
                  value={standardAnswers.expected_salary || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, expected_salary: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">"Why This Company?" Value Pitch</label>
                <textarea
                  rows={3}
                  value={standardAnswers.why_us || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, why_us: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500 resize-none text-xs"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Skills & Master Resume (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Master Skills Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Master Skills Matrix ({profile.skills?.length || 0})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Used directly by the AI parser to compute match scores and detect skill gaps.
                </p>
              </div>
            </div>

            {/* Add skill form */}
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add skill (e.g. PyTorch, Rust, Kubernetes, GraphQL)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
              {profile.skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 text-xs bg-slate-950 border border-slate-800 hover:border-teal-500/40 text-slate-200 px-3 py-1 rounded-lg transition-colors group"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-500 group-hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Master Resume Text */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-400" />
                Master Resume Plain Text
              </h3>
              <span className="text-[11px] text-slate-500">
                {profile.master_resume_text?.length || 0} characters
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              The AI Engine ingests this full text whenever you trigger "Tailor Resume" for a specific job.
            </p>

            <textarea
              rows={16}
              value={profile.master_resume_text || ""}
              onChange={(e) => setProfile({ ...profile, master_resume_text: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500/60 leading-relaxed"
              placeholder="Paste your complete master resume text here..."
            />
          </div>

        </div>

      </div>

    </div>
  );
}

