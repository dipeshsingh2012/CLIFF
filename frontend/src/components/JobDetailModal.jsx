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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-stone-200 flex items-start justify-between bg-[#FAF8F5]">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider px-2.5 py-0.5 rounded-full bg-white text-stone-700 border border-stone-200">
                {job.source || "LinkedIn"}
              </span>

              {job.is_easy_apply && (
                <span className="text-xs font-semibold bg-[#EFF6F1] text-[#2C6E49] border border-[#D4E8DC] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-[#2C6E49]" />
                  <span>Easy Apply</span>
                </span>
              )}

              {job.workplace_type && (
                <span className="text-xs bg-white text-stone-700 border border-stone-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                  <Briefcase className="w-3 h-3 text-[#C25E38]" />
                  <span>{job.workplace_type}</span>
                </span>
              )}

              {job.employment_type && (
                <span className="text-xs bg-white text-stone-600 border border-stone-200 px-2.5 py-0.5 rounded-full">
                  {job.employment_type}
                </span>
              )}

              <span className="text-xs text-stone-600 flex items-center gap-1.5">
                {job.company_logo ? (
                  <img 
                    src={job.company_logo} 
                    alt={job.company} 
                    className="w-4 h-4 rounded object-contain bg-white border border-stone-200 shrink-0" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-stone-400" />
                )}
                {job.company_url ? (
                  <a href={job.company_url} target="_blank" rel="noreferrer" className="hover:text-[#B34B22] underline flex items-center gap-1">
                    {job.company}
                  </a>
                ) : (
                  <span className="font-medium text-stone-800">{job.company}</span>
                )}
              </span>

              {job.location && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  {job.location}
                </span>
              )}

              {job.applicant_count && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Users className="w-3 h-3 text-stone-400" />
                  {job.applicant_count}
                </span>
              )}

              {job.posted_date && (
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  {job.posted_date}
                </span>
              )}
            </div>
            
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">{job.title}</h2>
          </div>

          <div className="flex items-center space-x-2">
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors shadow-xs"
              >
                <span>Original Posting</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {onDeleteJob && (
              <button
                onClick={() => onDeleteJob(job.id)}
                className="flex items-center space-x-1.5 text-xs font-medium text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-colors"
                title="Delete this job from CLIFF"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
          
          {/* Left Column: Intelligence, Match & Skills (5 cols) */}
          <div className="lg:col-span-5 p-6 space-y-5 overflow-y-auto bg-[#FAF8F5]/50">
            
            {/* Hiring Team / Recruiter Card */}
            {job.hiring_manager?.name && (
              <div className="bg-white border border-[#F2D7CB] rounded-xl p-3.5 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B34B22] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Hiring Team & Recruiter
                  </span>
                  {job.hiring_manager.profile_url && (
                    <a
                      href={job.hiring_manager.profile_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#B34B22] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-900">{job.hiring_manager.name}</div>
                  <div className="text-xs text-stone-500 mt-0.5">{job.hiring_manager.title || "Talent Acquisition / Recruiter"}</div>
                </div>
              </div>
            )}

            {/* Match Score Card */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between shadow-xs">
              <div>
                <span className="text-xs text-stone-500 font-medium">Computed AI Match</span>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className={`text-3xl font-extrabold ${getScoreColor(job.match_score)}`}>
                    {job.match_score}%
                  </span>
                  <span className="text-xs text-stone-400">alignment</span>
                </div>
              </div>
              <div className="text-right text-xs space-y-1">
                <div className="text-stone-600">
                  Required Level: <strong className="text-stone-900 font-semibold">{intel.experience_level_required || job.seniority_level || "Mid-Senior"}</strong>
                </div>
                {job.salary_range && (
                  <div className="text-[#2C6E49] font-medium">{job.salary_range}</div>
                )}
                {job.company_size && (
                  <div className="text-stone-500 text-[11px]">Size: {job.company_size}</div>
                )}
              </div>
            </div>

            {/* Quick Status Bar */}
            <div>
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block mb-2">
                Application Status
              </label>
              <div className="grid grid-cols-5 gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-200">
                {["Saved", "Applied", "Interviewing", "Offer", "Rejected"].map((st) => (
                  <button
                    key={st}
                    onClick={() => onUpdateStatus(job.id, st)}
                    className={`text-[11px] font-medium py-1.5 rounded-lg transition-all ${
                      job.status === st
                        ? "bg-stone-900 text-white font-bold shadow-xs"
                        : "text-stone-600 hover:text-stone-900 hover:bg-white"
                    }`}
                  >
                    {st === "Interviewing" ? "Interview" : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Side-by-Side Skill Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                <span>Skill Alignment Breakdown</span>
                <span className="text-[10px] text-stone-400 lowercase">
                  {matchedSkills.length} matched / {missingSkills.length} missing
                </span>
              </h3>

              {/* Matched Skills */}
              <div className="bg-[#EFF6F1] border border-[#D4E8DC] rounded-xl p-3.5">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#2C6E49] mb-2">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Your Matched Skills ({matchedSkills.length})</span>
                </div>
                {matchedSkills.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">No direct keyword matches found</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {matchedSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white text-[#2C6E49] border border-[#D4E8DC] px-2 py-0.5 rounded-md font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Missing Skills */}
              <div className="bg-[#FDF4EF] border border-[#F2D7CB] rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#B34B22]">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Skill Gaps ({missingSkills.length})</span>
                  </div>
                  {missingSkills.length > 0 && (
                    <button
                      onClick={() => onOpenRoadmap(job)}
                      className="text-[10px] font-semibold text-[#B34B22] hover:underline flex items-center gap-0.5"
                    >
                      <GraduationCap className="w-3 h-3" />
                      <span>Bridge Gaps</span>
                    </button>
                  )}
                </div>
                {missingSkills.length === 0 ? (
                  <p className="text-xs text-[#2C6E49] font-medium">100% skill requirements matched!</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {missingSkills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white text-[#B34B22] border border-[#F2D7CB] px-2 py-0.5 rounded-md font-medium"
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
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Key Extracted Responsibilities
                </h4>
                <ul className="space-y-1.5 text-xs text-stone-700">
                  {responsibilities.map((resp, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <span className="text-[#C25E38] font-bold">•</span>
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
                className="w-full flex items-center justify-center space-x-2 bg-[#C25E38] hover:bg-[#A84F2B] text-white font-bold text-sm py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.99]"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Tailor Resume & Generate Cover Letter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Right Column: Original Job Description & Notes (7 cols) */}
          <div className="lg:col-span-7 p-6 space-y-6 overflow-y-auto bg-white">
            
            {/* Notes Section */}
            <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#C25E38]" />
                  Personal Application Notes
                </span>
                <button
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="text-[11px] bg-stone-900 hover:bg-stone-800 text-white px-2.5 py-1 rounded font-medium transition-colors"
                >
                  {isSavingNotes ? "Saving..." : "Save Note"}
                </button>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="E.g., Recruiter reached out on LinkedIn, interviewed with Jane (VP Eng), asked about vector indexing..."
                rows={2}
                className="w-full bg-white border border-stone-200 rounded-lg p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] resize-none"
              />
            </div>

            {/* Original Job Description */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center justify-between">
                <span>Original Job Description</span>
                <span className="text-[10px] text-stone-400">
                  {job.raw_description?.length || 0} characters
                </span>
              </h3>
              
              <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-4 text-xs text-stone-700 font-sans whitespace-pre-wrap leading-relaxed max-h-[460px] overflow-y-auto">
                {job.raw_description || "No description provided."}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

