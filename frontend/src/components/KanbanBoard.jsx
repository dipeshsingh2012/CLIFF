import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  MapPin, 
  Building2, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  ChevronRight,
  SlidersHorizontal,
  DollarSign,
  ArrowRightCircle,
  MoreVertical,
  CheckCircle2,
  Clock,
  XCircle,
  Award,
  Zap,
  User,
  Briefcase
} from "lucide-react";

const COLUMNS = [
  { id: "Saved", label: "Saved", icon: Clock, color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/5" },
  { id: "Applied", label: "Applied", icon: ArrowRightCircle, color: "text-teal-400", border: "border-teal-500/30", bg: "bg-teal-500/5" },
  { id: "Interviewing", label: "Interviewing", icon: Sparkles, color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/5" },
  { id: "Offer", label: "Offer", icon: Award, color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/5" },
  { id: "Rejected", label: "Archived / Rejected", icon: XCircle, color: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/5" }
];

export default function KanbanBoard({ 
  jobs, 
  onSelectJob, 
  onUpdateStatus, 
  onDeleteJob, 
  onOpenStudio 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [modeFilter, setModeFilter] = useState("ALL");

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesScore = (job.match_score || 0) >= minScore;
    
    const matchesMode = modeFilter === "ALL" || 
      (job.workplace_type && job.workplace_type.toLowerCase() === modeFilter.toLowerCase());

    return matchesSearch && matchesScore && matchesMode;
  });

  const getScoreBadgeColor = (score) => {
    if (score >= 80) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (score >= 65) return "bg-teal-500/10 text-teal-300 border-teal-500/30";
    if (score >= 50) return "bg-amber-500/10 text-amber-300 border-amber-500/30";
    return "bg-slate-800 text-slate-400 border-slate-700";
  };

  const getWorkplaceBadgeStyle = (type) => {
    if (!type) return "bg-slate-950/80 text-slate-300 border-slate-800";
    const t = type.toLowerCase();
    if (t.includes("remote")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold";
    if (t.includes("hybrid")) return "bg-purple-500/15 text-purple-300 border-purple-500/30 font-semibold";
    if (t.includes("on-site") || t.includes("onsite")) return "bg-blue-500/15 text-blue-300 border-blue-500/30 font-semibold";
    return "bg-slate-950/80 text-slate-300 border-slate-800";
  };

  return (
    <div className="space-y-6">
      
      {/* Controls Bar: Search, Mode of Work & Score Filter */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 flex flex-wrap gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by job title, company, or location..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500/60 transition-colors"
          />
        </div>

        {/* Mode of Work Filter Pills */}
        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: "ALL", label: "All Modes" },
            { id: "Remote", label: "🏡 Remote" },
            { id: "Hybrid", label: "⚡ Hybrid" },
            { id: "On-site", label: "🏢 On-site" }
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setModeFilter(m.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                modeFilter === m.id
                  ? "bg-teal-500 text-slate-950 shadow-sm font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Match Score Filter */}
        <div className="flex items-center space-x-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
          <SlidersHorizontal className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
            Min Match Score: <strong className="text-teal-400">{minScore}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-28 accent-teal-500 cursor-pointer"
          />
          {minScore > 0 && (
            <button 
              onClick={() => setMinScore(0)} 
              className="text-[11px] text-slate-500 hover:text-slate-300 underline"
            >
              Reset
            </button>
          )}
        </div>

      </div>

      {/* Active Filter Indicator */}
      {(searchTerm || minScore > 0 || modeFilter !== "ALL") && (
        <div className="flex items-center justify-between text-xs bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredJobs.length}</strong> of <strong className="text-white">{jobs.length}</strong> jobs
            {modeFilter !== "ALL" && <span className="text-teal-400 ml-1.5 font-medium">• Mode: {modeFilter}</span>}
            {searchTerm && <span className="text-teal-400 ml-1.5 font-medium">• Search: "{searchTerm}"</span>}
            {minScore > 0 && <span className="text-teal-400 ml-1.5 font-medium">• Min Score: {minScore}%</span>}
          </div>
          <button
            onClick={() => { setSearchTerm(""); setMinScore(0); setModeFilter("ALL"); }}
            className="text-teal-400 hover:text-teal-300 underline font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
        {COLUMNS.map(col => {
          const colJobs = filteredJobs.filter(j => j.status === col.id);
          const ColIcon = col.icon;

          return (
            <div 
              key={col.id} 
              className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 min-h-[580px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 px-1">
                <div className="flex items-center space-x-2">
                  <ColIcon className={`w-4 h-4 ${col.color}`} />
                  <h3 className="font-semibold text-sm text-slate-200">{col.label}</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colJobs.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-slate-800/60 rounded-xl text-slate-500 text-xs text-center p-3">
                    <span>No jobs in {col.label.toLowerCase()}</span>
                  </div>
                ) : (
                  colJobs.map(job => (
                    <div
                      key={job.id}
                      className="group bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/40 rounded-xl p-3.5 transition-all shadow-sm hover:shadow-md hover:shadow-teal-500/5 relative flex flex-col justify-between"
                    >
                      {/* Top Row: Company & Match Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 truncate">
                          {job.company_logo ? (
                            <img 
                              src={job.company_logo} 
                              alt={job.company} 
                              className="w-4 h-4 rounded object-contain bg-white/5 border border-slate-700/50 shrink-0" 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className="truncate">{job.company}</span>
                        </span>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {job.is_easy_apply && (
                            <span 
                              className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                              title="LinkedIn Easy Apply available"
                            >
                              <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                              <span>Easy</span>
                            </span>
                          )}
                          <div 
                            className={`text-xs font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${getScoreBadgeColor(job.match_score)}`}
                            title={`Computed match score: ${job.match_score}%`}
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>{job.match_score}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Job Title */}
                      <h4 
                        onClick={() => onSelectJob(job)}
                        className="font-semibold text-sm text-slate-100 group-hover:text-teal-300 cursor-pointer transition-colors line-clamp-2 mb-2"
                      >
                        {job.title}
                      </h4>

                      {/* Metadata Badges: Workplace, Seniority & Recruiter */}
                      {(job.workplace_type || job.hiring_manager?.name || job.posted_date) && (
                        <div className="flex flex-wrap items-center gap-1 mb-2 text-[10px]">
                          {job.workplace_type && (
                            <span className={`px-2 py-0.5 rounded border flex items-center gap-1 font-medium ${getWorkplaceBadgeStyle(job.workplace_type)}`}>
                              <Briefcase className="w-2.5 h-2.5 shrink-0" />
                              <span>{job.workplace_type}</span>
                            </span>
                          )}
                          {job.hiring_manager?.name && (
                            <span 
                              className="bg-teal-950/50 text-teal-300 border border-teal-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[150px]"
                              title={`Hiring Team: ${job.hiring_manager.name} (${job.hiring_manager.title || 'Recruiter'})`}
                            >
                              <User className="w-2.5 h-2.5 shrink-0 text-teal-400" />
                              <span className="truncate">{job.hiring_manager.name}</span>
                            </span>
                          )}
                          {job.posted_date && (
                            <span className="text-slate-500">
                              • {job.posted_date}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Location & Salary */}
                      <div className="space-y-1 mb-3 text-[11px] text-slate-400">
                        {job.location && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </div>
                        )}
                        {job.salary_range && (
                          <div className="flex items-center gap-1 text-emerald-400 font-medium truncate">
                            <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{job.salary_range}</span>
                          </div>
                        )}
                      </div>

                      {/* Skills Preview */}
                      {job.intelligence?.matched_skills && job.intelligence.matched_skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {job.intelligence.matched_skills.slice(0, 3).map((skill, idx) => (
                            <span 
                              key={idx}
                              className="text-[10px] bg-slate-950/80 text-teal-400/90 border border-teal-500/20 px-1.5 py-0.5 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.intelligence.matched_skills.length > 3 && (
                            <span className="text-[10px] text-slate-500 self-center">
                              +{job.intelligence.matched_skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
                        
                        {/* Status Switcher Dropdown */}
                        <select
                          value={job.status}
                          onChange={(e) => onUpdateStatus(job.id, e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-teal-500"
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        <div className="flex items-center space-x-1">
                          {/* Studio Shortcut */}
                          <button
                            onClick={() => onOpenStudio(job)}
                            title="Open AI Studio (Tailor resume & cover letter)"
                            className="p-1 rounded text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>

                          {/* External link */}
                          {job.url && (
                            <a
                              href={job.url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open original job posting"
                              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => onDeleteJob(job.id)}
                            title="Delete Job"
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>

                    </div>
                  ))
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

