import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Award,
  ArrowRight,
  RefreshCw,
  Building2,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb
} from "lucide-react";
import {
  getLmsModules,
  generateLmsTrack,
  submitLmsQuiz,
  graduateLmsSkill
} from "../api";

export default function MiniLmsAcademy({ job, onSkillGraduated }) {
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [activeTab, setActiveTab] = useState("reading"); // "reading" | "quiz"
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  // Graduation state
  const [isGraduating, setIsGraduating] = useState(false);
  const [graduationSuccess, setGraduationSuccess] = useState(null);

  // Load modules when job changes
  useEffect(() => {
    if (!job?.id) return;
    loadModules(job.id);
  }, [job?.id]);

  const loadModules = async (jobId) => {
    setIsLoading(true);
    try {
      const data = await getLmsModules(jobId);
      const mods = data.modules || [];
      setModules(mods);
      if (mods.length > 0) {
        setActiveModuleId(mods[0].id);
      } else {
        setActiveModuleId(null);
      }
      setSelectedAnswers({});
      setQuizResult(null);
    } catch (err) {
      console.warn("Could not load modules or none exist yet:", err);
      setModules([]);
      setActiveModuleId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTrack = async () => {
    if (!job?.id) return;
    setIsGenerating(true);
    try {
      const data = await generateLmsTrack(job.id);
      const mods = data.modules || [];
      setModules(mods);
      if (mods.length > 0) {
        setActiveModuleId(mods[0].id);
      }
      setSelectedAnswers({});
      setQuizResult(null);
    } catch (err) {
      console.error("Failed to generate track:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const activeModule = modules.find((m) => m.id === activeModuleId) || modules[0];

  // Handle Quiz Option Selection
  const handleSelectOption = (questionIndex, optionIndex) => {
    if (quizResult) return; // Locked once submitted until reset
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex
    }));
  };

  // Submit Quiz to Backend
  const handleSubmitQuiz = async () => {
    if (!activeModule) return;
    const questions = activeModule.quiz_questions || [];
    const answersArray = questions.map((_, i) =>
      selectedAnswers[i] !== undefined ? selectedAnswers[i] : -1
    );

    setIsSubmittingQuiz(true);
    try {
      const result = await submitLmsQuiz(activeModule.id, answersArray);
      setQuizResult(result);

      // Update current module status in list
      setModules((prev) =>
        prev.map((m) =>
          m.id === activeModule.id
            ? {
                ...m,
                status: result.status,
                best_score: result.best_score,
                attempts_count: result.attempts_count
              }
            : m
        )
      );
    } catch (err) {
      console.error("Quiz submission error:", err);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizResult(null);
  };

  const handleGraduateSkill = async () => {
    if (!activeModule) return;
    setIsGraduating(true);
    try {
      const res = await graduateLmsSkill(activeModule.id);
      setGraduationSuccess(res.message);
      setModules((prev) =>
        prev.map((m) =>
          m.id === activeModule.id ? { ...m, graduated_to_profile: true } : m
        )
      );
      if (onSkillGraduated) {
        onSkillGraduated(activeModule.skill_gap);
      }
      setTimeout(() => setGraduationSuccess(null), 5000);
    } catch (err) {
      console.error("Graduation error:", err);
    } finally {
      setIsGraduating(false);
    }
  };

  // Clean Markdown Renderer for Theoretical Briefing
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("# ")) {
        return (
          <h2 key={idx} className="text-lg font-bold text-teal-300 mt-6 mb-3 pb-1 border-b border-slate-800">
            {trimmed.replace("# ", "")}
          </h2>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h3 key={idx} className="text-sm font-bold text-teal-400 mt-5 mb-2.5 flex items-center gap-2">
            <span className="w-1.5 h-3.5 bg-teal-500 rounded-sm"></span>
            {trimmed.replace("## ", "")}
          </h3>
        );
      }
      if (trimmed.startsWith("### ")) {
        return (
          <h4 key={idx} className="text-xs font-bold text-slate-200 mt-4 mb-2">
            {trimmed.replace("### ", "")}
          </h4>
        );
      }
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const bulletText = trimmed.substring(2);
        return (
          <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300 my-1.5 pl-2">
            <span className="text-teal-400 font-bold shrink-0">•</span>
            <span>{formatBold(bulletText)}</span>
          </div>
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div key={idx} className="flex items-start space-x-2 text-xs text-slate-300 my-1.5 pl-2">
            <span className="text-teal-400 font-semibold shrink-0">{trimmed.split(". ")[0]}.</span>
            <span>{formatBold(trimmed.substring(trimmed.indexOf(". ") + 2))}</span>
          </div>
        );
      }
      if (!trimmed) {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed my-2">
          {formatBold(trimmed)}
        </p>
      );
    });
  };

  const formatBold = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const masteredCount = modules.filter((m) => m.status === "MASTERED").length;
  const progressPercent = modules.length > 0 ? Math.round((masteredCount / modules.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Academy Track Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-teal-950/40 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">CLIFF Academy: Skill Bridging Track</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  Mini-LMS
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-slate-500" />
                Targeting: <strong className="text-slate-200">{job.company}</strong>
                {job.company_industry && <span className="text-slate-500">• {job.company_industry}</span>}
                {job.company_size && <span className="text-slate-500">• {job.company_size}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {modules.length > 0 && (
              <div className="text-right">
                <div className="text-xs font-bold text-white">
                  {masteredCount} of {modules.length} Gaps Mastered
                </div>
                <div className="text-[11px] text-teal-400 font-medium">
                  {progressPercent}% Complete
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateTrack}
              disabled={isGenerating}
              className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 flex items-center space-x-1.5 shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Modules...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>{modules.length > 0 ? "Re-Generate Track" : "Generate Bridging Track"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {modules.length > 0 && (
          <div className="w-full bg-slate-950/80 rounded-full h-2 border border-slate-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-teal-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      {/* Graduation Success Toast */}
      {graduationSuccess && (
        <div className="bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{graduationSuccess}</span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isGenerating && modules.length === 0 && (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <Award className="w-10 h-10 text-teal-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Context-Aware Skill Bridging Modules</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            CLIFF Academy analyzes {job.company}'s scale, industry sector, and seniority requirements to craft theoretical reading briefings and scenario-based judgment quizzes. No toy projects—pure architectural mastery.
          </p>
          <button
            onClick={handleGenerateTrack}
            className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 inline-flex items-center space-x-2"
          >
            <Sparkles className="w-4 h-4 fill-slate-950" />
            <span>Build Job Learning Track</span>
          </button>
        </div>
      )}

      {/* Loading state */}
      {(isLoading || isGenerating) && modules.length === 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <RefreshCw className="w-8 h-8 text-teal-400 mx-auto animate-spin" />
          <h4 className="text-sm font-semibold text-slate-200">Synthesizing Job-Anchored LMS Modules...</h4>
          <p className="text-xs text-slate-500">
            Analyzing {job.company} domain, scale ({job.company_size || "enterprise"}), and {job.seniority_level || "senior"} requirements
          </p>
        </div>
      )}

      {/* LMS Content Grid */}
      {modules.length > 0 && activeModule && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Module Selector Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              Identified Skill Gap Modules ({modules.length})
            </span>

            <div className="space-y-2">
              {modules.map((m) => {
                const isSelected = m.id === activeModuleId;
                const isMastered = m.status === "MASTERED";
                const isInProgress = m.status === "IN_PROGRESS";

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveModuleId(m.id);
                      setSelectedAnswers({});
                      setQuizResult(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-slate-800/90 border-teal-500/50 shadow-md ring-1 ring-teal-500/30"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-white truncate">
                        {m.skill_gap}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-950 text-slate-300 border border-slate-800 shrink-0">
                        {m.difficulty_level}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        {isMastered ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Mastered {m.best_score ? `(${m.best_score}%)` : ""}
                          </span>
                        ) : isInProgress ? (
                          <span className="text-amber-400 font-semibold">
                            In Progress ({m.best_score || 0}%)
                          </span>
                        ) : (
                          <span className="text-slate-500">Not Started</span>
                        )}
                      </div>

                      {m.graduated_to_profile && (
                        <span className="text-[10px] text-teal-400 font-medium">
                          🎓 In Profile
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Module Detail & Workspace (8 cols) */}
          <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            {/* Header with Title and Mode Switcher */}
            <div className="border-b border-slate-800 pb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                      {activeModule.skill_gap}
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {activeModule.difficulty_level} Level
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {activeModule.module_title}
                  </h3>
                </div>

                {/* Status indicator */}
                <div>
                  {activeModule.status === "MASTERED" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mastered ({activeModule.best_score}%)
                    </span>
                  ) : activeModule.status === "IN_PROGRESS" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <TrendingUp className="w-3.5 h-3.5" />
                      In Progress ({activeModule.best_score || 0}%)
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
                      Not Started
                    </span>
                  )}
                </div>
              </div>

              {/* Company context callout */}
              {activeModule.company_context_summary && (
                <div className="bg-teal-950/40 border border-teal-500/30 rounded-xl p-3 flex items-start space-x-2.5">
                  <Lightbulb className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-teal-200 leading-relaxed">
                    <strong>Why this matters at {job.company}:</strong> {activeModule.company_context_summary}
                  </p>
                </div>
              )}

              {/* Sub-tab switcher: Reading vs Quiz */}
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setActiveTab("reading")}
                  className={`text-xs px-4 py-2 rounded-xl font-medium transition-all flex items-center space-x-1.5 ${
                    activeTab === "reading"
                      ? "bg-teal-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>1. Theoretical Reading Brief</span>
                </button>

                <button
                  onClick={() => setActiveTab("quiz")}
                  className={`text-xs px-4 py-2 rounded-xl font-medium transition-all flex items-center space-x-1.5 ${
                    activeTab === "quiz"
                      ? "bg-teal-500 text-slate-950 font-bold shadow-sm"
                      : "text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800"
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>2. Scenario Evaluation Quiz ({activeModule.quiz_questions?.length || 3} Questions)</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Theoretical Reading */}
            {activeTab === "reading" && (
              <div className="space-y-6">
                <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 text-slate-200">
                  {renderMarkdown(activeModule.reading_markdown)}
                </div>

                {/* Footer action to jump to quiz */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-400">
                    Finished reading? Test your architectural judgment.
                  </span>
                  <button
                    onClick={() => setActiveTab("quiz")}
                    className="bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white text-xs font-semibold px-4 py-2 rounded-xl border border-teal-500/30 flex items-center space-x-1.5 transition-all"
                  >
                    <span>Proceed to Scenario Quiz</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Scenario Quiz */}
            {activeTab === "quiz" && (
              <div className="space-y-6">
                {/* Result banner if evaluated */}
                {quizResult && (
                  <div
                    className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                      quizResult.passed
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                        : "bg-rose-950/60 border-rose-500/40 text-rose-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {quizResult.passed ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                      )}
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {quizResult.passed
                            ? `Mastery Achieved! Score: ${quizResult.score}% (Passing: 80%)`
                            : `Keep Practicing! Score: ${quizResult.score}% (Passing: 80%)`}
                        </h4>
                        <p className="text-xs opacity-90">
                          {quizResult.passed
                            ? "You demonstrated strong situational judgment. Graduate this skill to update your Master Profile and re-score saved jobs!"
                            : "Review the question rationales below, re-read the technical brief, and try again."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleResetQuiz}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                      >
                        Retake Quiz
                      </button>

                      {quizResult.passed && !activeModule.graduated_to_profile && (
                        <button
                          onClick={handleGraduateSkill}
                          disabled={isGraduating}
                          className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-4 py-1.5 rounded-lg shadow transition-all active:scale-95 flex items-center space-x-1"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>{isGraduating ? "Graduating..." : "Graduate to Profile"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Graduate button if already mastered */}
                {activeModule.status === "MASTERED" && !quizResult && !activeModule.graduated_to_profile && (
                  <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl flex items-center justify-between">
                    <span className="text-xs text-emerald-300">
                      🏆 You have already mastered this module with <strong>{activeModule.best_score}%</strong>.
                    </span>
                    <button
                      onClick={handleGraduateSkill}
                      disabled={isGraduating}
                      className="text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 px-3.5 py-1.5 rounded-lg shadow hover:opacity-90 transition-all flex items-center space-x-1"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>{isGraduating ? "Graduating..." : "Graduate to Master Profile"}</span>
                    </button>
                  </div>
                )}

                {activeModule.graduated_to_profile && (
                  <div className="bg-teal-950/40 border border-teal-500/30 p-3 rounded-xl text-xs text-teal-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>This skill has been added to your Master Profile, and jobs are dynamically re-scored.</span>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-6">
                  {activeModule.quiz_questions?.map((q, qIdx) => {
                    const resultItem = quizResult?.detailed_results?.find(
                      (r) => r.question_id === q.id || r.question_id === qIdx + 1
                    );

                    return (
                      <div
                        key={q.id || qIdx}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 space-y-4"
                      >
                        {/* Question scenario */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                            Scenario {qIdx + 1}
                          </span>
                          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                            {q.scenario}
                          </p>
                          <h4 className="text-xs font-bold text-white pt-1">
                            {q.question}
                          </h4>
                        </div>

                        {/* Options */}
                        <div className="space-y-2">
                          {q.options?.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[qIdx] === optIdx;
                            let optionStyle = "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300";

                            if (quizResult && resultItem) {
                              if (optIdx === q.correct_index) {
                                optionStyle = "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-semibold";
                              } else if (isSelected && !resultItem.is_correct) {
                                optionStyle = "bg-rose-950/60 border-rose-500 text-rose-300";
                              } else {
                                optionStyle = "bg-slate-900/40 border-slate-800/50 text-slate-500";
                              }
                            } else if (isSelected) {
                              optionStyle = "bg-teal-500/10 border-teal-500 text-teal-200 font-semibold ring-1 ring-teal-500/50";
                            }

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                disabled={Boolean(quizResult)}
                                onClick={() => handleSelectOption(qIdx, optIdx)}
                                className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start space-x-2.5 ${optionStyle}`}
                              >
                                <span className="font-mono font-bold text-[11px] shrink-0 mt-0.5 text-slate-400">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span className="flex-1">{opt}</span>
                                {quizResult && optIdx === q.correct_index && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                                {quizResult && isSelected && !resultItem.is_correct && (
                                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation breakdown after submit */}
                        {quizResult && resultItem && (
                          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-1">
                            <span className="text-[11px] font-bold text-teal-400 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3" />
                              Theoretical Rationale
                            </span>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {resultItem.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Submit Quiz Action Bar */}
                {!quizResult && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-500">
                      Answer all {activeModule.quiz_questions?.length || 3} questions. 80%+ required to Master.
                    </span>
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={
                        isSubmittingQuiz ||
                        Object.keys(selectedAnswers).length <
                          (activeModule.quiz_questions?.length || 3)
                      }
                      className="bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center space-x-1.5"
                    >
                      {isSubmittingQuiz ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Evaluating Answers...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Submit & Evaluate Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
