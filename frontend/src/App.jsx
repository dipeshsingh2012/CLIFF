import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import KanbanBoard from "./components/KanbanBoard";
import JobDetailModal from "./components/JobDetailModal";
import StudioView from "./components/StudioView";
import ProfileManager from "./components/ProfileManager";
import AddJobModal from "./components/AddJobModal";
import { getJobs, updateJobStatus, deleteJob, checkHealth } from "./api";

export default function App() {
  const [currentTab, setCurrentTab] = useState("pipeline"); // pipeline | studio | profile
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isOnline, setIsOnline] = useState(false);

  // Modals & Selection
  const [activeJobModal, setActiveJobModal] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studioJobId, setStudioJobId] = useState(null);
  const [studioSubTab, setStudioSubTab] = useState("resume");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchJobs();
    checkBackendHealth();
    
    // Auto-poll backend every 2 minutes (120,000ms) for newly scraped jobs
    const jobsInterval = setInterval(() => {
      fetchJobs(false);
    }, 120000);

    const healthInterval = setInterval(checkBackendHealth, 120000);


    return () => {
      clearInterval(jobsInterval);
      clearInterval(healthInterval);
    };
  }, []);

  const checkBackendHealth = async () => {
    const ok = await checkHealth();
    setIsOnline(ok);
  };

  const fetchJobs = async (showLoading = true) => {
    if (showLoading) setIsRefreshing(true);
    try {
      const data = await getJobs();
      setJobs(data);
      if (data.length > 0 && !studioJobId) {
        setStudioJobId(data[0].id);
      }
    } catch (err) {
      console.error("Error loading jobs:", err);
    } finally {
      setIsLoadingJobs(false);
      if (showLoading) setIsRefreshing(false);
    }
  };

  const handleUpdateStatus = async (jobId, newStatus, notes = null) => {
    try {
      await updateJobStatus(jobId, newStatus, notes);
      await fetchJobs();
      if (activeJobModal && activeJobModal.id === jobId) {
        setActiveJobModal((prev) => prev ? { ...prev, status: newStatus, notes: notes !== null ? notes : prev.notes } : null);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Are you sure you want to remove this job from CLIFF?")) return;
    try {
      await deleteJob(jobId);
      if (activeJobModal && activeJobModal.id === jobId) {
        setActiveJobModal(null);
      }
      await fetchJobs();
    } catch (err) {
      console.error("Error deleting job:", err);
    }
  };

  const handleOpenStudio = (job, subTab = "resume") => {
    setStudioJobId(job.id);
    setStudioSubTab(subTab);
    setCurrentTab("studio");
    if (activeJobModal) setActiveJobModal(null);
  };

  const handleOpenRoadmap = (job) => {
    handleOpenStudio(job, "roadmap");
  };

  // Metrics
  const totalJobsCount = jobs.length;
  const activeCount = jobs.filter((j) => ["Saved", "Applied", "Interviewing"].includes(j.status)).length;
  const avgScore = totalJobsCount > 0 
    ? Math.round(jobs.reduce((acc, curr) => acc + (curr.match_score || 0), 0) / totalJobsCount) 
    : 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-800 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        jobsCount={totalJobsCount}
        avgScore={avgScore}
        activeCount={activeCount}
        isOnline={isOnline}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onRefresh={() => fetchJobs(true)}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        
        {currentTab === "pipeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">
                  Career Pipeline & Application Tracker
                </h1>
                <p className="text-xs text-stone-500">
                  Visual Kanban board with real-time AI match scores and skills alignment.
                </p>
              </div>
            </div>

            {isLoadingJobs ? (
              <div className="h-64 flex items-center justify-center text-xs text-stone-500">
                Loading saved career opportunities...
              </div>
            ) : (
              <KanbanBoard
                jobs={jobs}
                onSelectJob={(job) => setActiveJobModal(job)}
                onUpdateStatus={handleUpdateStatus}
                onDeleteJob={handleDeleteJob}
                onOpenStudio={(job) => handleOpenStudio(job)}
              />
            )}
          </div>
        )}

        {currentTab === "studio" && (
          <StudioView
            jobs={jobs}
            selectedJobId={studioJobId}
            onSelectJobId={(id) => setStudioJobId(id)}
            initialTab={studioSubTab}
            onSkillGraduated={() => fetchJobs(false)}
          />
        )}

        {currentTab === "profile" && (
          <ProfileManager
            onProfileUpdated={() => fetchJobs()}
          />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-[#FAF8F5] py-4 px-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-stone-600">CLIFF • Private Local-First Career Intelligence</span>
          <span className="text-[11px] text-stone-400">FastAPI • React • Manifest V3 Extension</span>
        </div>
      </footer>

      {/* Job Detail Side-by-side Modal */}
      {activeJobModal && (
        <JobDetailModal
          job={activeJobModal}
          onClose={() => setActiveJobModal(null)}
          onUpdateStatus={handleUpdateStatus}
          onOpenStudio={handleOpenStudio}
          onOpenRoadmap={handleOpenRoadmap}
          onDeleteJob={handleDeleteJob}
        />
      )}

      {/* Add Job Modal */}
      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onJobCreated={() => fetchJobs()}
      />

    </div>
  );
}
