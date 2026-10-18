import React from "react";
import { 
  Briefcase, 
  Layers, 
  Sparkles, 
  UserCheck, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Cpu,
  RotateCw
} from "lucide-react";

export default function Navbar({ 
  currentTab, 
  setCurrentTab, 
  jobsCount, 
  avgScore, 
  activeCount, 
  isOnline, 
  onOpenAddModal,
  onRefresh,
  isRefreshing
}) {
  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-emerald-500 to-cyan-400 p-0.5 shadow-lg shadow-teal-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight text-white">CLIFF</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Local-First
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Career Intelligence & Job Framework</p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setCurrentTab("pipeline")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === "pipeline"
                ? "bg-slate-800 text-teal-400 shadow-sm border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Job Pipeline</span>
          </button>

          <button
            onClick={() => setCurrentTab("studio")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === "studio"
                ? "bg-slate-800 text-teal-400 shadow-sm border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Studio</span>
          </button>

          <button
            onClick={() => setCurrentTab("profile")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              currentTab === "profile"
                ? "bg-slate-800 text-teal-400 shadow-sm border border-slate-700/60"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Profile & Master ATS</span>
          </button>
        </nav>

        {/* Right: Quick Stats, Status & Add Button */}
        <div className="flex items-center space-x-4">
          
          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center space-x-4 text-xs text-slate-400 border-r border-slate-800 pr-4">
            <div className="flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-500" />
              <span>Jobs: <strong className="text-white font-semibold">{jobsCount}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
              <span>Avg Match: <strong className="text-teal-400 font-semibold">{avgScore}%</strong></span>
            </div>
          </div>

          {/* Backend Status indicator */}
          <div 
            title={isOnline ? "FastAPI Backend is running on port 8000" : "Backend unreachable on port 8000"} 
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-950/80 border-slate-800"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
            <span className={isOnline ? "text-emerald-400" : "text-rose-400"}>
              {isOnline ? "API Live" : "API Offline"}
            </span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh job pipeline"
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 text-teal-400 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          {/* Add Job Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-semibold text-xs px-3.5 py-2 rounded-lg shadow-md shadow-teal-500/10 transition-all hover:shadow-teal-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Job</span>
          </button>

        </div>

      </div>
    </header>
  );
}

