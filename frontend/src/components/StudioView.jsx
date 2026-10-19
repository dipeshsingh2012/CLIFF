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
import MiniLmsAcademy from "./MiniLmsAcademy";

export default function StudioView({ jobs, selectedJobId, onSelectJobId, initialTab = "resume", onSkillGraduated }) {
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
      <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-xl mx-auto shadow-xs">
        <Sparkles className="w-10 h-10 text-[#C25E38] mx-auto mb-4" />
        <h3 className="text-lg font-bold text-stone-900 mb-2">No Jobs Tracked Yet</h3>
        <p className="text-sm text-stone-600 mb-6">
          Add a job from LinkedIn with the CLIFF extension or manual form to use the AI Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Studio Header Bar: Job Selector & Sub-Tabs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between shadow-xs">
        
        {/* Left: Job Switcher */}
        <div className="flex items-center space-x-3 min-w-[300px]">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Target Job:</span>
          <select
            value={selectedJob.id}
            onChange={(e) => {
              const newId = Number(e.target.value);
              onSelectJobId(newId);
              const found = jobs.find(j => j.id === newId);
              setSelectedJob(found);
            }}
            className="bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-1.5 text-sm font-medium text-stone-900 focus:outline-none focus:border-[#C25E38]"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>
                {j.title} @ {j.company} ({j.match_score}%)
              </option>
            ))}
          </select>
        </div>

        {/* Right: Studio Sub-tabs */}
        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
          <button
            onClick={() => setActiveSubTab("resume")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === "resume"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#C25E38]" />
            <span>Tailored Resume</span>
          </button>

          <button
            onClick={() => setActiveSubTab("cover_letter")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === "cover_letter"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-[#C25E38]" />
            <span>Cover Letter & Outreach</span>
          </button>

          <button
            onClick={() => setActiveSubTab("roadmap")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSubTab === "roadmap"
                ? "bg-white text-stone-900 shadow-xs border border-stone-200/80 font-bold"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#C25E38]" />
            <span>CLIFF Academy (LMS)</span>
          </button>
        </div>

      </div>

      {/* Sub-Tab 1: Tailored Resume */}
      {activeSubTab === "resume" && (
        <div className="space-y-6">
          {!resumeData && !isTailoringResume && (
            <div className="bg-[#FAF8F5] border border-dashed border-stone-300 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
              <Sparkles className="w-10 h-10 text-[#C25E38] mx-auto" />
              <h3 className="text-base font-bold text-stone-900">AI Resume Tailoring Engine</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                CLIFF will analyze your master resume against "{selectedJob.title}" at {selectedJob.company}, rewording achievements with quantifiable STAR bullets and emphasizing matched technical proficiencies.
              </p>
              <button
                onClick={() => handleTailorResume()}
                className="bg-[#C25E38] hover:bg-[#B34B22] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4 fill-white" />
                <span>Generate Tailored Resume Bullets</span>
              </button>
            </div>
          )}

          {isTailoringResume && (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3 shadow-xs">
              <RefreshCw className="w-8 h-8 text-[#C25E38] mx-auto animate-spin" />
              <h4 className="text-sm font-semibold text-stone-900">Synthesizing Tailored Profile...</h4>
              <p className="text-xs text-stone-500">Mapping master achievements to {selectedJob.company}'s requirements</p>
            </div>
          )}

          {resumeData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column: Tailored Summary & Experience (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Tailored Professional Summary */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C25E38] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Tailored Executive Summary
                    </span>
                    <button
                      onClick={() => handleCopy(resumeData.tailored_summary, "summary")}
                      className="text-xs flex items-center space-x-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedKey === "summary" ? <Check className="w-3.5 h-3.5 text-[#2C6E49]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "summary" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-sm text-stone-800 leading-relaxed bg-[#FAF8F5] p-4 rounded-xl border border-stone-200">
                    {resumeData.tailored_summary}
                  </p>
                </div>

                {/* Tailored Experience Bullets */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C25E38] flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Role-Targeted Impact Bullets
                    </span>
                    <button
                      onClick={() => {
                        const allBullets = resumeData.tailored_experience?.map(e => `${e.role}\n` + e.bullets.map(b => `• ${b}`).join("\n")).join("\n\n") || "";
                        handleCopy(allBullets, "all_bullets");
                      }}
                      className="text-xs flex items-center space-x-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 px-2.5 py-1 rounded-md transition-colors"
                    >
                      {copiedKey === "all_bullets" ? <Check className="w-3.5 h-3.5 text-[#2C6E49]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "all_bullets" ? "Copied All" : "Copy All Bullets"}</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {resumeData.tailored_experience?.map((exp, idx) => (
                      <div key={idx} className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-4 space-y-2.5">
                        <h4 className="text-sm font-bold text-stone-900">{exp.role}</h4>
                        <ul className="space-y-2">
                          {exp.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="text-xs text-stone-700 leading-relaxed flex items-start space-x-2">
                              <span className="text-[#C25E38] font-bold text-sm leading-none mt-0.5">•</span>
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
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Priority Skills for ATS Filtering
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {resumeData.highlighted_skills?.map((sk, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-[#FDF4EF] text-[#C25E38] border border-[#F2D7C9] px-2.5 py-1 rounded-lg font-medium"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Strategy Notes */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Interview Pitch Strategy
                  </h4>
                  <p className="text-xs text-stone-700 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-stone-200">
                    {resumeData.match_strategy_notes}
                  </p>
                </div>

                {/* Re-generate button */}
                <button
                  onClick={() => handleTailorResume()}
                  className="w-full flex items-center justify-center space-x-2 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 text-xs font-medium py-2 rounded-xl border border-stone-200 transition-colors"
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
          <div className="bg-white border border-stone-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center space-x-3">
              <Sliders className="w-4 h-4 text-[#C25E38]" />
              <span className="text-xs font-semibold text-stone-700">Tone Persona:</span>
              <div className="flex space-x-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
                {["Confident & Professional", "Enthusiastic & High-Energy", "Executive & Strategic"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTone(t);
                      if (coverLetterData) handleGenerateCoverLetter(selectedJob, t);
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
                      tone === t
                        ? "bg-stone-900 text-white font-bold shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
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
              className="bg-[#C25E38] hover:bg-[#B34B22] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 inline-flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>{isGeneratingCoverLetter ? "Generating..." : "Generate Cover Letter & DM"}</span>
            </button>
          </div>

          {!coverLetterData && !isGeneratingCoverLetter && (
            <div className="bg-[#FAF8F5] border border-dashed border-stone-300 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-3">
              <Mail className="w-10 h-10 text-[#C25E38] mx-auto" />
              <h3 className="text-base font-bold text-stone-900">Cover Letter & Recruiter Outreach Generator</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Click generate above to craft a compelling cover letter with concrete metrics plus a short, high-response LinkedIn InMail message for hiring managers.
              </p>
            </div>
          )}

          {isGeneratingCoverLetter && (
            <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3 shadow-xs">
              <RefreshCw className="w-8 h-8 text-[#C25E38] mx-auto animate-spin" />
              <h4 className="text-sm font-semibold text-stone-900">Writing Tailored Outreach...</h4>
              <p className="text-xs text-stone-500">Injecting impact metrics and aligning with {selectedJob.company}</p>
            </div>
          )}

          {coverLetterData && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Full Cover Letter (8 cols) */}
              <div className="lg:col-span-8 bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">Application Cover Letter</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{coverLetterData.subject_line}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(coverLetterData.cover_letter, "cover_letter")}
                    className="text-xs flex items-center space-x-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors"
                  >
                    {copiedKey === "cover_letter" ? <Check className="w-3.5 h-3.5 text-[#2C6E49]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === "cover_letter" ? "Copied Letter" : "Copy Cover Letter"}</span>
                  </button>
                </div>

                <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-5 text-xs text-stone-800 leading-relaxed font-sans whitespace-pre-wrap">
                  {coverLetterData.cover_letter}
                </div>
              </div>

              {/* Recruiter Outreach DM & Hooks (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* LinkedIn / Email DM */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C25E38] flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      Recruiter Cold InMail / DM
                    </span>
                    <button
                      onClick={() => handleCopy(coverLetterData.recruiter_dm, "dm")}
                      className="text-[11px] flex items-center space-x-1 text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-200 transition-colors"
                    >
                      {copiedKey === "dm" ? <Check className="w-3 h-3 text-[#2C6E49]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "dm" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>

                  {selectedJob.hiring_manager?.name && (
                    <div className="text-[11px] text-[#2C6E49] bg-[#F0F5F2] border border-[#C3D9CB] px-3 py-1.5 rounded-xl flex items-center justify-between">
                      <span className="truncate">Recipient: <strong>{selectedJob.hiring_manager.name}</strong></span>
                      {selectedJob.hiring_manager.profile_url && (
                        <a href={selectedJob.hiring_manager.profile_url} target="_blank" rel="noreferrer" className="text-[#2C6E49] hover:underline text-[10px] shrink-0 ml-2 font-medium">
                          View Profile
                        </a>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-stone-800 leading-relaxed bg-[#FAF8F5] p-3.5 rounded-xl border border-stone-200">
                    {coverLetterData.recruiter_dm}
                  </p>
                </div>

                {/* Key Hooks */}
                {coverLetterData.key_hooks && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Value Proposition Hooks
                    </h4>
                    <ul className="space-y-2">
                      {coverLetterData.key_hooks.map((hook, idx) => (
                        <li key={idx} className="text-xs text-stone-700 flex items-start space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2C6E49] shrink-0 mt-0.5" />
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

      {/* Sub-Tab 3: CLIFF Academy / Mini-LMS */}
      {activeSubTab === "roadmap" && (
        <MiniLmsAcademy 
          job={selectedJob} 
          onSkillGraduated={onSkillGraduated} 
        />
      )}

    </div>
  );
}

