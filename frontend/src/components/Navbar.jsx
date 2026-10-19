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
    <header className="bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-30 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Brand Logo & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#C25E38] via-[#D97706] to-[#E58F65] p-0.5 shadow-sm flex items-center justify-center">
            <div className="w-full h-full bg-[#FAF8F5] rounded-[10px] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#C25E38]" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-stone-900">CLIFF</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-[#FDF4EF] text-[#B34B22] border border-[#F2D7CB]">
                Local-First
              </span>
            </div>
            <p className="text-[11px] text-stone-500 font-medium">Career Intelligence & Learning Framework</p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center space-x-1 bg-stone-200/60 p-1 rounded-xl border border-stone-200/80">
          <button
            onClick={() => setCurrentTab("pipeline")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === "pipeline"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-semibold"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#C25E38]" />
            <span>Job Pipeline</span>
          </button>

          <button
            onClick={() => setCurrentTab("studio")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === "studio"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-semibold"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
            <span>AI Studio</span>
          </button>

          <button
            onClick={() => setCurrentTab("profile")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentTab === "profile"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-semibold"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-[#4D7C5F]" />
            <span>Profile & Master ATS</span>
          </button>
        </nav>

        {/* Right: Quick Stats, Status & Add Button */}
        <div className="flex items-center space-x-3.5">
          
          {/* Quick Metrics */}
          <div className="hidden lg:flex items-center space-x-3.5 text-xs text-stone-600 border-r border-stone-200 pr-3.5">
            <div className="flex items-center space-x-1.5">
              <Briefcase className="w-3.5 h-3.5 text-stone-400" />
              <span>Jobs: <strong className="text-stone-900 font-semibold">{jobsCount}</strong></span>
            </div>
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#B34B22]" />
              <span>Avg Match: <strong className="text-[#B34B22] font-semibold">{avgScore}%</strong></span>
            </div>
          </div>

          {/* Backend Status indicator */}
          <div 
            title={isOnline ? "FastAPI Backend is running on port 8000" : "Backend unreachable on port 8000"} 
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
              isOnline ? "bg-[#EFF6F1] border-[#D4E8DC] text-[#2C6E49]" : "bg-rose-50 border-rose-200 text-rose-700"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-[#2C6E49]" : "bg-rose-500"}`} />
            <span>{isOnline ? "API Live" : "API Offline"}</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh job pipeline"
              disabled={isRefreshing}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
            >
              <RotateCw className={`w-3.5 h-3.5 text-stone-500 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          )}

          {/* Add Job Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center space-x-1.5 bg-[#C25E38] hover:bg-[#A84F2B] text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Job</span>
          </button>

        </div>

      </div>
    </header>
  );
}

