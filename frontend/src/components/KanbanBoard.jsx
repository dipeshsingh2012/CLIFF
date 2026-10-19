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
  { id: "Saved", label: "Saved", icon: Clock, color: "text-stone-600", border: "border-stone-300", bg: "bg-stone-50" },
  { id: "Applied", label: "Applied", icon: ArrowRightCircle, color: "text-[#B34B22]", border: "border-[#F0D5C9]", bg: "bg-[#FDF4EF]" },
  { id: "Interviewing", label: "Interviewing", icon: Sparkles, color: "text-[#B45309]", border: "border-amber-200", bg: "bg-amber-50" },
  { id: "Offer", label: "Offer", icon: Award, color: "text-[#2C6E49]", border: "border-[#D4E8DC]", bg: "bg-[#EFF6F1]" },
  { id: "Rejected", label: "Archived / Rejected", icon: XCircle, color: "text-stone-500", border: "border-stone-200", bg: "bg-stone-50" }
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
    if (score >= 80) return "bg-[#EFF6F1] text-[#2C6E49] border-[#D4E8DC]";
    if (score >= 65) return "bg-[#FDF4EF] text-[#B34B22] border-[#F2D7CB]";
    if (score >= 50) return "bg-amber-50 text-amber-800 border-amber-200";
    return "bg-stone-100 text-stone-600 border-stone-200";
  };

  const getWorkplaceBadgeStyle = (type) => {
    if (!type) return "bg-stone-100 text-stone-600 border-stone-200";
    const t = type.toLowerCase();
    if (t.includes("remote")) return "bg-[#EFF6F1] text-[#2C6E49] border-[#D4E8DC] font-medium";
    if (t.includes("hybrid")) return "bg-stone-100 text-stone-800 border-stone-200 font-medium";
    if (t.includes("on-site") || t.includes("onsite")) return "bg-amber-50 text-amber-800 border-amber-200 font-medium";
    return "bg-stone-100 text-stone-600 border-stone-200";
  };

  return (
    <div className="space-y-6">
      
      {/* Controls Bar: Search, Mode of Work & Score Filter */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-[0_1px_3px_rgba(28,25,23,0.04)] flex flex-wrap gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by job title, company, or location..."
            className="w-full bg-[#FAF8F5] border border-stone-200 rounded-xl pl-10 pr-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] focus:ring-1 focus:ring-[#C25E38]/20 transition-all"
          />
        </div>

        {/* Mode of Work Filter Pills */}
        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
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
                  ? "bg-white text-stone-900 shadow-xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Match Score Filter */}
        <div className="flex items-center space-x-3 bg-stone-50 px-4 py-2 rounded-xl border border-stone-200">
          <SlidersHorizontal className="w-4 h-4 text-[#C25E38]" />
          <span className="text-xs font-medium text-stone-600 whitespace-nowrap">
            Min Match: <strong className="text-stone-900">{minScore}%</strong>
          </span>
          <input
            type="range"
            min="0"
            max="90"
            step="5"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="w-28 accent-[#C25E38] cursor-pointer"
          />
          {minScore > 0 && (
            <button 
              onClick={() => setMinScore(0)} 
              className="text-[11px] text-stone-400 hover:text-stone-700 underline"
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
              className="bg-[#F5F2EB]/60 border border-stone-200/90 rounded-2xl p-3.5 min-h-[580px] flex flex-col"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200/80 px-1">
                <div className="flex items-center space-x-2">
                  <ColIcon className={`w-4 h-4 ${col.color}`} />
                  <h3 className="font-semibold text-sm text-stone-900">{col.label}</h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-stone-600 border border-stone-200/80">
                  {colJobs.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colJobs.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center border border-dashed border-stone-200 rounded-xl text-stone-400 text-xs text-center p-3">
                    <span>No jobs in {col.label.toLowerCase()}</span>
                  </div>
                ) : (
                  colJobs.map(job => (
                    <div
                      key={job.id}
                      className="group bg-white hover:bg-[#FAF8F5] border border-stone-200 hover:border-stone-300 rounded-xl p-3.5 transition-all shadow-xs hover:shadow-sm relative flex flex-col justify-between"
                    >
                      {/* Top Row: Company & Match Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5 truncate">
                          {job.company_logo ? (
                            <img 
                              src={job.company_logo} 
                              alt={job.company} 
                              className="w-4 h-4 rounded object-contain bg-stone-50 border border-stone-200 shrink-0" 
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          )}
                          <span className="truncate">{job.company}</span>
                        </span>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {job.is_easy_apply && (
                            <span 
                              className="text-[10px] font-semibold bg-[#EFF6F1] text-[#2C6E49] border border-[#D4E8DC] px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                              title="LinkedIn Easy Apply available"
                            >
                              <Zap className="w-2.5 h-2.5 fill-[#2C6E49]" />
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
                        className="font-semibold text-sm text-stone-900 group-hover:text-[#B34B22] cursor-pointer transition-colors line-clamp-2 mb-2"
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
                              className="bg-[#FDF4EF] text-[#B34B22] border border-[#F2D7CB] px-1.5 py-0.5 rounded flex items-center gap-1 truncate max-w-[150px]"
                              title={`Hiring Team: ${job.hiring_manager.name} (${job.hiring_manager.title || 'Recruiter'})`}
                            >
                              <User className="w-2.5 h-2.5 shrink-0 text-[#B34B22]" />
                              <span className="truncate">{job.hiring_manager.name}</span>
                            </span>
                          )}
                          {job.posted_date && (
                            <span className="text-stone-400">
                              • {job.posted_date}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Location & Salary */}
                      <div className="space-y-1 mb-3 text-[11px] text-stone-500">
                        {job.location && (
                          <div className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate">{job.location}</span>
                          </div>
                        )}
                        {job.salary_range && (
                          <div className="flex items-center gap-1 text-[#2C6E49] font-medium truncate">
                            <DollarSign className="w-3 h-3 text-[#2C6E49] shrink-0" />
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
                              className="text-[10px] bg-stone-100 text-stone-700 border border-stone-200 px-1.5 py-0.5 rounded"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.intelligence.matched_skills.length > 3 && (
                            <span className="text-[10px] text-stone-400 self-center">
                              +{job.intelligence.matched_skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-1 text-xs">
                        
                        {/* Status Switcher Dropdown */}
                        <select
                          value={job.status}
                          onChange={(e) => onUpdateStatus(job.id, e.target.value)}
                          className="bg-[#FAF8F5] border border-stone-200 rounded px-1.5 py-1 text-[11px] text-stone-700 focus:outline-none focus:border-[#C25E38]"
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
                            className="p-1 rounded text-stone-400 hover:text-[#C25E38] hover:bg-stone-100 transition-colors"
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
                              className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          {/* Delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteJob(job.id);
                            }}
                            title="Delete Job"
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

