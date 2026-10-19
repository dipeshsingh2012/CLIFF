import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  FileText, 
  Mail, 
  GraduationCap, 
  Copy, 
  Check, 
  RefreshCw, 
  Building2, 
  Send,
  Lightbulb,
  CheckCircle2,
  ExternalLink,
  Sliders,
  ArrowRight
} from "lucide-react";
import { tailorResume, generateCoverLetter, generateLearningRoadmap } from "../api";

export default function StudioView({ jobs, selectedJobId, onSelectJobId, initialTab = "resume" }) {
  const [activeSubTab, setActiveSubTab] = useState(initialTab);
  const [selectedJob, setSelectedJob] = useState(null);

  // Resume State
  const [resumeData, setResumeData] = useState(null);
  const [isTailoringResume, setIsTailoringResume] = useState(false);

  // Cover Letter State
  const [coverLetterData, setCoverLetterData] = useState(null);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [tone, setTone] = useState("Confident & Professional");

  // Learning Roadmap State
  const [roadmapData, setRoadmapData] = useState(null);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);

  // Copy feedback states
  const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    if (jobs.length > 0) {
      const current = jobs.find(j => j.id === selectedJobId) || jobs[0];
      setSelectedJob(current);
    }
  }, [jobs, selectedJobId]);

  // Handle generating tailored resume
  const handleTailorResume = async (jobToTailor = selectedJob) => {
    if (!jobToTailor) return;
    setIsTailoringResume(true);
    try {
      const data = await tailorResume({ job_id: jobToTailor.id });
      setResumeData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTailoringResume(false);
    }
  };

  // Handle generating cover letter
  const handleGenerateCoverLetter = async (jobTarget = selectedJob, currentTone = tone) => {
    if (!jobTarget) return;
    setIsGeneratingCoverLetter(true);
    try {
      const data = await generateCoverLetter({ job_id: jobTarget.id, tone: currentTone });
      setCoverLetterData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  // Handle generating learning roadmap
  const handleGenerateRoadmap = async (jobTarget = selectedJob) => {
    if (!jobTarget) return;
    setIsGeneratingRoadmap(true);
    try {
      const data = await generateLearningRoadmap(jobTarget.id);
      setRoadmapData(data);
    } catch (err) {
      console.error("Roadmap generation error:", err);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Auto-load on job switch if empty
  useEffect(() => {
    if (selectedJob) {
      setResumeData(null);
      setCoverLetterData(null);
      setRoadmapData(null);
    }
  }, [selectedJob?.id]);

  if (!selectedJob) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto">
        <Sparkles className="w-10 h-10 text-teal-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Jobs Tracked Yet</h3>
        <p className="text-sm text-slate-400 mb-6">
          Add a job from LinkedIn with the CLIFF extension or manual form to use the AI Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Studio Header Bar: Job Selector & Sub-Tabs */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
        
        {/* Left: Job Switcher */}
        <div className="flex items-center space-x-3 min-w-[300px]">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Job:</span>
          <select
            value={selectedJob.id}
            onChange={(e) => {
              const newId = Number(e.target.value);
              onSelectJobId(newId);
              const found = jobs.find(j => j.id === newId);
              setSelectedJob(found);
            }}
            className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-200 focus:outline-none focus:border-teal-500"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.title} @ {j.company} ({j.match_score}%)
              </option>
            ))}
          </select>
        </div>

        {/* Right: Studio Sub-tabs */}
        <div className="flex items-center space-x-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveSubTab("resume")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === "resume"
                ? "bg-slate-800 text-teal-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tailored Resume</span>
          </button>

          <button
            onClick={() => setActiveSubTab("cover_letter")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === "cover_letter"
                ? "bg-slate-800 text-teal-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Cover Letter & Outreach</span>
          </button>

          <button
            onClick={() => setActiveSubTab("roadmap")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === "roadmap"
                ? "bg-slate-800 text-teal-400 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Skill Gap Roadmap</span>
          </button>
        </div>

      </div>

      {/* Sub-Tab 1: Tailored Resume */}
      {activeSubTab === "resume" && (
        <div className="space-y-6">
          {!resumeData && !isTailoringResume && (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
              <Sparkles className="w-10 h-10 text-teal-400 mx-auto" />
              <h3 className="text-base font-bold text-white">AI Resume Tailoring Engine</h3>
              <p className="text-xs text-slate-400">
                CLIFF will analyze your master resume against "{selectedJob.title}" at {selectedJob.company}, rewording achievements with quantifiable STAR bullets and emphasizing matched technical proficiencies.
              </p>
              <button
                onClick={() => handleTailorResume()}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/10 transition-all active:scale-95 inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Generate Tailored Resume Bullets</span>
              </button>
            </div>
          )}

          {isTailoringResume && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-400 mx-auto animate-spin" />
              <h4 className="text-sm font-semibold text-slate-200">Synthesizing Tailored Profile...</h4>
              <p className="text-xs text-slate-500">Mapping master achievements to {selectedJob.company}'s requirements</p>
            </div>
          )}

          {resumeData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Tailored Summary & Experience (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Tailored Professional Summary */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Tailored Executive Summary
                    </span>
                    <button
                      onClick={() => handleCopy(resumeData.tailored_summary, "summary")}
                      className="text-xs flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedKey === "summary" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "summary" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                    {resumeData.tailored_summary}
                  </p>
                </div>

                {/* Tailored Experience Bullets */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Role-Targeted Impact Bullets
                    </span>
                    <button
                      onClick={() => {
                        const allBullets = resumeData.tailored_experience?.map(e => `${e.role}\n` + e.bullets.map(b => `• ${b}`).join("\n")).join("\n\n") || "";
                        handleCopy(allBullets, "all_bullets");
                      }}
                      className="text-xs flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-800 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedKey === "all_bullets" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "all_bullets" ? "Copied All" : "Copy All Bullets"}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {resumeData.tailored_experience?.map((exp, idx) => (
                      <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                        <h4 className="text-sm font-bold text-slate-100">{exp.role}</h4>
                        <ul className="space-y-2">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="text-xs text-slate-300 leading-relaxed flex items-start space-x-2">
                              <span className="text-teal-400 font-bold text-sm leading-none mt-0.5">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Skills to Highlight & Interview Pitch Strategy (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Skills To Feature */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Priority Skills for ATS Filtering
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.highlighted_skills?.map((sk, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2.5 py-1 rounded-lg font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Strategy Notes */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Interview Pitch Strategy
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    {resumeData.match_strategy_notes}
                  </p>
                </div>

                {/* Re-generate button */}
                <button
                  onClick={() => handleTailorResume()}
                  className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium py-2 rounded-xl border border-slate-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Generate Tailored Resume</span>
                </button>

              </div>

            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 2: Cover Letter & Outreach */}
      {activeSubTab === "cover_letter" && (
        <div className="space-y-6">
          
          {/* Tone Selector & Generator bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-slate-300">Tone Persona:</span>
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {["Confident & Professional", "Enthusiastic & High-Energy", "Executive & Strategic"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTone(t);
                      if (coverLetterData) handleGenerateCoverLetter(selectedJob, t);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                      tone === t
                        ? "bg-teal-500 text-slate-950 font-bold shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {t.split(" & ")[0]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleGenerateCoverLetter()}
              disabled={isGeneratingCoverLetter}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
              <span>{isGeneratingCoverLetter ? "Generating..." : "Generate Cover Letter & DM"}</span>
            </button>
          </div>

          {!coverLetterData && !isGeneratingCoverLetter && (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
              <Mail className="w-10 h-10 text-teal-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Cover Letter & Recruiter Outreach Generator</h3>
              <p className="text-xs text-slate-400">
                Click generate above to craft a compelling cover letter with concrete metrics plus a short, high-response LinkedIn InMail message for hiring managers.
              </p>
            </div>
          )}

          {isGeneratingCoverLetter && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-400 mx-auto animate-spin" />
              <h4 className="text-sm font-semibold text-slate-200">Writing Tailored Outreach...</h4>
              <p className="text-xs text-slate-500">Injecting impact metrics and aligning with {selectedJob.company}</p>
            </div>
          )}

          {coverLetterData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Full Cover Letter (8 cols) */}
              <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-white">Application Cover Letter</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{coverLetterData.subject_line}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(coverLetterData.cover_letter, "cover_letter")}
                    className="text-xs flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    {copiedKey === "cover_letter" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "cover_letter" ? "Copied Letter" : "Copy Cover Letter"}</span>
                  </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                  {coverLetterData.cover_letter}
                </div>
              </div>

              {/* Recruiter Outreach DM & Hooks (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* LinkedIn / Email DM */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Recruiter Cold InMail / DM
                    </span>
                    <button
                      onClick={() => handleCopy(coverLetterData.recruiter_dm, "dm")}
                      className="text-[11px] flex items-center space-x-1 text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded transition-colors"
                    >
                      {copiedKey === "dm" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "dm" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {selectedJob.hiring_manager?.name && (
                    <div className="text-[11px] text-teal-300 bg-teal-950/60 border border-teal-500/30 px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span className="truncate">Recipient: <strong>{selectedJob.hiring_manager.name}</strong></span>
                      {selectedJob.hiring_manager.profile_url && (
                        <a href={selectedJob.hiring_manager.profile_url} target="_blank" rel="noreferrer" className="text-teal-400 hover:text-white underline text-[10px] shrink-0 ml-2">
                          View Profile
                        </a>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    {coverLetterData.recruiter_dm}
                  </p>
                </div>

                {/* Key Hooks */}
                {coverLetterData.key_hooks && (
                  <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Value Proposition Hooks
                    </h4>
                    <ul className="space-y-2">
                      {coverLetterData.key_hooks.map((hook, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          <span>{hook}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>

            </div>
          )}

        </div>
      )}

      {/* Sub-Tab 3: Skill Gap Roadmap */}
      {activeSubTab === "roadmap" && (
        <div className="space-y-6">
          {!roadmapData && !isGeneratingRoadmap && (
            <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
              <GraduationCap className="w-10 h-10 text-teal-400 mx-auto" />
              <h3 className="text-base font-bold text-white">14-Day Skill Bridging Roadmap</h3>
              <p className="text-xs text-slate-400">
                Targeting gaps: {selectedJob.intelligence?.missing_skills?.join(", ") || "General cloud & architecture competencies"}.
                Generate concrete project tutorials and interview talking points to prove proficiency.
              </p>
              <button
                onClick={() => handleGenerateRoadmap()}
                className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Build Skill Gap Roadmap</span>
              </button>
            </div>
          )}

          {isGeneratingRoadmap && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
              <RefreshCw className="w-8 h-8 text-teal-400 mx-auto animate-spin" />
              <h4 className="text-sm font-semibold text-slate-200">Structuring Learning Paths...</h4>
              <p className="text-xs text-slate-500">Analyzing free resources and project blueprints</p>
            </div>
          )}

          {roadmapData && (
            <div className="space-y-6">
              
              {/* Overview banner */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 block mb-1">
                  Strategic Overview
                </span>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {roadmapData.overview}
                </p>
              </div>

              {/* Topics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmapData.key_topics?.map((topic, idx) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{topic.skill}</span>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                        topic.priority === "High" ? "bg-rose-500/10 text-rose-400 border-rose-500/30" : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                      }`}>
                        {topic.priority} Priority
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="text-slate-400">
                        <strong className="text-slate-200">Goal:</strong> {topic.learning_goal}
                      </div>
                      <div className="text-slate-400">
                        <strong className="text-slate-200">Resource:</strong> {topic.recommended_resource}
                      </div>
                      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 mt-2 text-slate-300">
                        <span className="text-teal-400 font-semibold block mb-0.5">⚡ 48-Hour Hands-on Project:</span>
                        {topic.fast_track_project}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interview Talking Points */}
              {roadmapData.interview_talking_points && (
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    How to Handle Skill Gaps During Technical Interviews
                  </h4>
                  <ul className="space-y-2">
                    {roadmapData.interview_talking_points.map((pt, idx) => (
                      <li key={idx} className="text-xs text-slate-300 flex items-start space-x-2">
                        <span className="text-teal-400 font-bold">•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}

