import React, { useState } from "react";
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  CheckCircle, 
  AlertTriangle, 
  Briefcase, 
  MapPin, 
  Building2, 
  Calendar, 
  DollarSign,
  ArrowRight,
  GraduationCap,
  FileText,
  Clock,
  Zap,
  User,
  Users,
  Globe,
  Trash2
} from "lucide-react";

export default function JobDetailModal({ 
  job, 
  onClose, 
  onUpdateStatus, 
  onOpenStudio, 
  onOpenRoadmap,
  onDeleteJob
}) {
  if (!job) return null;

  const [notes, setNotes] = useState(job.notes || "");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const intel = job.intelligence || {};
  const matchedSkills = intel.matched_skills || [];
  const missingSkills = intel.missing_skills || [];
  const responsibilities = intel.role_responsibilities || [];

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    await onUpdateStatus(job.id, job.status, notes);
    setIsSavingNotes(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 65) return "text-teal-400";
    if (score >= 50) return "text-amber-400";
    return "text-slate-400";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-start justify-between bg-slate-950/40">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-400 border border-slate-700">
                {job.source || "LinkedIn"}
              </span>

              {job.is_easy_apply && (
                <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-emerald-400" />
                  <span>Easy Apply</span>
                </span>
              )}

              {job.workplace_type && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 font-semibold border ${
                  job.workplace_type.toLowerCase().includes("remote") ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" :
                  job.workplace_type.toLowerCase().includes("hybrid") ? "bg-purple-500/15 text-purple-300 border-purple-500/30" :
                  job.workplace_type.toLowerCase().includes("on-site") || job.workplace_type.toLowerCase().includes("onsite") ? "bg-blue-500/15 text-blue-300 border-blue-500/30" :
                  "bg-slate-800/90 text-slate-300 border-slate-700/80"
                }`}>
                  <Briefcase className="w-3 h-3 text-teal-400" />
                  <span>{job.workplace_type}</span>
                </span>
              )}

              {job.employment_type && (
                <span className="text-xs bg-slate-800/90 text-slate-300 border border-slate-700/80 px-2.5 py-0.5 rounded-full">
                  {job.employment_type}
                </span>
              )}

              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                {job.company_logo ? (
                  <img 
                    src={job.company_logo} 
                    alt={job.company} 
                    className="w-4 h-4 rounded object-contain bg-white/5 border border-slate-700 shrink-0" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                )}
                {job.company_url ? (
                  <a href={job.company_url} target="_blank" rel="noreferrer" className="hover:text-teal-300 underline flex items-center gap-1">
                    {job.company}
                  </a>
                ) : (
                  <span>{job.company}</span>
                )}
              </span>

              {job.location && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {job.location}
                </span>
              )}

              {job.applicant_count && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-500" />
                  {job.applicant_count}
                </span>
              )}

              {job.posted_date && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {job.posted_date}
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-white tracking-tight">{job.title}</h2>
          </div>

          <div className="flex items-center space-x-2">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
              >
                <span>Original Posting</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {onDeleteJob && (
              <button
                onClick={() => onDeleteJob(job.id)}
                className="flex items-center space-x-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/30 transition-colors"
                title="Delete this job from CLIFF"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          
          {/* Left Column: Intelligence, Match & Skills (5 cols) */}
          <div className="lg:col-span-5 p-6 space-y-5 overflow-y-auto bg-slate-950/20">
            
            {/* Hiring Team / Recruiter Card */}
            {job.hiring_manager?.name && (
              <div className="bg-gradient-to-r from-teal-950/50 to-slate-900 border border-teal-500/40 rounded-xl p-3.5 space-y-2 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Hiring Team & Recruiter
                  </span>
                  {job.hiring_manager.profile_url && (
                    <a
                      href={job.hiring_manager.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-teal-300 hover:text-white flex items-center gap-1 font-medium underline"
                    >
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{job.hiring_manager.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{job.hiring_manager.title || "Talent Acquisition / Recruiter"}</div>
                </div>
              </div>
            )}

            {/* Match Score Card */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Computed AI Match</span>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className={`text-3xl font-extrabold ${getScoreColor(job.match_score)}`}>
                    {job.match_score}%
                  </span>
                  <span className="text-xs text-slate-400">alignment</span>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="text-slate-300">
                  Required Level: <strong className="text-teal-400 font-semibold">{intel.experience_level_required || job.seniority_level || "Mid-Senior"}</strong>
                </div>
                {job.salary_range && (
                  <div className="text-emerald-400 font-medium">{job.salary_range}</div>
                )}
                {job.company_size && (
                  <div className="text-slate-400 text-[11px]">Size: {job.company_size}</div>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Application Status
              </label>
              <div className="grid grid-cols-5 gap-1.5 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
                {["Saved", "Applied", "Interviewing", "Offer", "Rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => onUpdateStatus(job.id, st)}
                    className={`text-[11px] font-medium py-1.5 rounded-lg transition-all ${
                      job.status === st
                        ? "bg-teal-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    {st === "Interviewing" ? "Interview" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Side-by-Side Skill Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Skill Alignment Breakdown</span>
                <span className="text-[10px] text-slate-500 lowercase">
                  {matchedSkills.length} matched / {missingSkills.length} missing
                </span>
              </h3>

              {/* Matched Skills */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 mb-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Your Matched Skills ({matchedSkills.length})</span>
                </div>
                {matchedSkills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No direct keyword matches found</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {matchedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing Skills */}
              <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Skill Gaps ({missingSkills.length})</span>
                  </div>
                  {missingSkills.length > 0 && (
                    <button
                      onClick={() => onOpenRoadmap(job)}
                      className="text-[10px] font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-0.5"
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span>Bridge Gaps</span>
                    </button>
                  )}
                </div>
                {missingSkills.length === 0 ? (
                  <p className="text-xs text-emerald-400/80 font-medium">100% skill requirements matched!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Extracted Core Responsibilities */}
            {responsibilities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Key Extracted Responsibilities
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-teal-400 font-bold">•</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions: AI Studio Trigger */}
            <div className="pt-2">
              <button
                onClick={() => onOpenStudio(job)}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm py-2.5 rounded-xl shadow-lg shadow-teal-500/10 transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Tailor Resume & Generate Cover Letter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Right Column: Original Job Description & Notes (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto">
            
            {/* Notes Section */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-400" />
                  Personal Application Notes
                </span>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="text-[11px] bg-slate-800 hover:bg-slate-700 text-teal-400 px-2.5 py-1 rounded font-medium transition-colors"
                >
                  {isSavingNotes ? "Saving..." : "Save Note"}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Recruiter reached out on LinkedIn, interviewed with Jane (VP Eng), asked about vector indexing..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/60 resize-none"
              />
            </div>

            {/* Original Job Description */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Original Job Description</span>
                <span className="text-[10px] text-slate-500">
                  {job.raw_description?.length || 0} characters
                </span>
              </h3>
              
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                {job.raw_description || "No description provided."}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

