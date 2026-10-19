import React, { useState, useEffect, useRef } from "react";
import { 
  UserCheck, 
  FileText, 
  Plus, 
  X, 
  Check, 
  Save, 
  Briefcase, 
  ShieldCheck, 
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Clock,
  DollarSign,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileUp,
  Layers
} from "lucide-react";
import { 
  getUserProfile, 
  updateUserProfile, 
  uploadResume,
  getSignedUploadUrl,
  uploadDirectToStorage,
  processUploadedResume,
  getResumeUploadStatus
} from "../api";

export default function ProfileManager({ onProfileUpdated }) {
  const [profile, setProfile] = useState(null);
  const [newSkill, setNewSkill] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Resume Upload State
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [expandedBlockIndex, setExpandedBlockIndex] = useState(0);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getUserProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.trim() || !profile) return;
    const trimmed = newSkill.trim();
    if (!profile.skills.includes(trimmed)) {
      setProfile({
        ...profile,
        skills: [...profile.skills, trimmed]
      });
    }
    setNewSkill("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    if (!profile) return;
    setProfile({
      ...profile,
      skills: profile.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(profile);
      setProfile(updated);
      setSaveSuccess(true);
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!["pdf", "docx", "doc", "txt", "md"].includes(ext)) {
      setUploadError("Please upload a PDF, DOCX, or TXT resume document.");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccessMessage("");

    try {
      // 1. Request signed URL and asynchronous tracking task
      setUploadStatus("Checking storage configuration...");
      const signedData = await getSignedUploadUrl(file.name, file.type || "application/pdf").catch(() => ({ mode: "local" }));

      let result;
      if (signedData && signedData.mode === "gcs" && signedData.signed_url) {
        // Direct GCS upload flow (Production Event-Driven)
        setUploadStatus(`Uploading document directly to Google Cloud Storage...`);
        await uploadDirectToStorage(signedData.signed_url, file, signedData.content_type);

        setUploadStatus("Uploaded to bucket! Cloud event dispatched, analyzing with Vertex AI...");

        // 2. Smart Event Status Polling (Checks PostgreSQL task status every 1.5s)
        let attempts = 0;
        const maxAttempts = 35; // 35 * 1.5s = ~50s maximum wait
        let completedTask = null;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          attempts++;

          try {
            const taskData = await getResumeUploadStatus(signedData.task_id);
            if (taskData.stage_message) {
              setUploadStatus(taskData.stage_message);
            }
            if (taskData.status === "COMPLETED") {
              completedTask = taskData;
              break;
            } else if (taskData.status === "FAILED") {
              throw new Error(taskData.error_message || "Async resume parsing failed in cloud event handler.");
            }
          } catch (pollErr) {
            console.warn("[Polling Note]", pollErr.message);
          }
        }

        if (completedTask && completedTask.profile) {
          result = {
            profile: completedTask.profile,
            message: completedTask.stage_message || "Resume extracted and decomposed successfully!",
            rescored_jobs_count: completedTask.rescored_jobs_count
          };
        } else {
          // Backup Direct Trigger: if Pub/Sub push notification is still pending
          setUploadStatus("Finalizing analysis with backup processor...");
          result = await processUploadedResume(signedData.object_name, signedData.bucket_name, signedData.task_id);
        }
      } else {
        // Direct API multipart upload flow (Local Development fallback)
        setUploadStatus(`Extracting text from ${file.name}...`);
        setTimeout(() => {
          setUploadStatus("Decomposing skills & modular experience with AI...");
        }, 800);
        result = await uploadResume(file);
      }

      setProfile(result.profile);
      setUploadSuccessMessage(result.message || "Resume extracted and decomposed successfully!");
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setUploadSuccessMessage(""), 6000);
    } catch (err) {
      console.error(err);
      setUploadError(err.message || "Failed to parse resume document.");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  if (!profile) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        Loading master profile...
      </div>
    );
  }

  const standardAnswers = profile.standard_answers || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Bar with Save button */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-teal-400" />
            Master Candidate Profile & ATS Repository
          </h2>
          <p className="text-xs text-slate-400">
            Source of truth for Chrome extension auto-filling, AI match calculation, and resume tailoring.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center space-x-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-teal-500/10 transition-all active:scale-95"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Profile Saved & Scores Synced!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isSaving ? "Saving & Re-calculating..." : "Save Master Profile"}</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Personal info & ATS Form Repository (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Contact Details */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Identity & Contact (Autofill Fields)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Location / City</label>
                <input
                  type="text"
                  value={profile.location || ""}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={profile.linkedin_url || ""}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">GitHub / Portfolio URL</label>
                <input
                  type="url"
                  value={profile.github_url || ""}
                  onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Standard Form Answers */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Standard ATS Form Answers
            </h3>
            <p className="text-[11px] text-slate-400">
              Injected into Greenhouse, Lever, and Workday forms by the CLIFF Chrome extension.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Work Authorization</label>
                <input
                  type="text"
                  value={standardAnswers.work_authorization || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, work_authorization: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Notice Period / Start Date</label>
                <input
                  type="text"
                  value={standardAnswers.notice_period || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, notice_period: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Target Compensation</label>
                <input
                  type="text"
                  value={standardAnswers.expected_salary || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, expected_salary: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">"Why This Company?" Value Pitch</label>
                <textarea
                  rows={3}
                  value={standardAnswers.why_us || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, why_us: e.target.value }
                  })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-teal-500 resize-none text-xs"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Skills & Master Resume (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Resume Ingestion & AI Extractor Card */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-lg shadow-teal-500/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  Resume Ingestion & AI Extractor (PDF / DOCX)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Drop your resume to automatically decompose your skills, modular experience blocks, and identity.
                </p>
              </div>
            </div>

            {/* Hidden native input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".pdf,.docx,.doc,.txt,.md" 
              className="hidden" 
            />

            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging 
                  ? "border-teal-400 bg-teal-500/10 scale-[1.01]" 
                  : "border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-950/60 bg-slate-950/40"
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-3 space-y-3">
                  <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                  <div className="text-xs font-semibold text-teal-300">{uploadStatus}</div>
                  <p className="text-[11px] text-slate-500">Updating skills matrix & re-scoring job board...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white">Click to upload</span>
                    <span className="text-xs text-slate-400"> or drag and drop your resume</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Supports PDF, DOCX, and TXT (up to 10MB)</p>
                </div>
              )}
            </div>

            {/* Success Banner */}
            {uploadSuccessMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-start space-x-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{uploadSuccessMessage}</div>
                  <div className="text-[11px] text-emerald-400/80 mt-0.5">
                    Match scores across your Kanban pipeline have been re-calculated.
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {uploadError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Upload failed</div>
                  <div className="text-[11px] text-rose-400/80 mt-0.5">{uploadError}</div>
                </div>
              </div>
            )}
          </div>

          {/* Master Skills Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Master Skills Matrix ({profile.skills?.length || 0})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Used directly by the AI parser to compute match scores and detect skill gaps.
                </p>
              </div>
            </div>

            {/* Add skill form */}
            <form onSubmit={handleAddSkill} className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder="Add skill (e.g. PyTorch, Rust, Kubernetes, GraphQL)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            {/* Skills Tags */}
            <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
              {profile.skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1.5 text-xs bg-slate-950 border border-slate-800 hover:border-teal-500/40 text-slate-200 px-3 py-1 rounded-lg transition-colors group"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-slate-500 group-hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Modular Experience Blocks (Ground Truth) */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-400" />
                  Modular Experience Blocks ({profile.experience_blocks?.length || 0})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ground-truth repository used by the AI engine to select relevant bullet points during tailoring & ATS autofill.
                </p>
              </div>
            </div>

            {(!profile.experience_blocks || profile.experience_blocks.length === 0) ? (
              <div className="p-4 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                No experience blocks extracted yet. Upload your resume above to decompose your previous roles automatically.
              </div>
            ) : (
              <div className="space-y-3">
                {profile.experience_blocks.map((block, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3.5 transition-all hover:border-slate-700"
                  >
                    {/* Header */}
                    <div 
                      onClick={() => setExpandedBlockIndex(expandedBlockIndex === idx ? -1 : idx)}
                      className="flex items-start justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-xs text-white flex items-center gap-2">
                          <span>{block.role || "Software Engineer"}</span>
                          <span className="text-teal-400 font-normal">@ {block.company || "Company"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                          {(block.start_date || block.end_date) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-slate-500" />
                              {block.start_date} – {block.end_date || "Present"}
                            </span>
                          )}
                          {block.location && (
                            <span>• {block.location}</span>
                          )}
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-white p-1">
                        {expandedBlockIndex === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expanded Content */}
                    {expandedBlockIndex === idx && (
                      <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5">
                        {block.skills_used && block.skills_used.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {block.skills_used.map((s, sIdx) => (
                              <span key={sIdx} className="text-[10px] bg-slate-900 text-teal-300 border border-teal-500/20 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {block.bullets && block.bullets.length > 0 && (
                          <ul className="space-y-1.5 text-[11px] text-slate-300">
                            {block.bullets.map((b, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-2">
                                <span className="text-teal-400 select-none">•</span>
                                <span>{b}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Master Resume Plain Text */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-teal-400" />
                Master Resume Plain Text
              </h3>
              <span className="text-[11px] text-slate-500">
                {profile.master_resume_text?.length || 0} characters
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              The AI Engine ingests this full text whenever you trigger "Tailor Resume" for a specific job.
            </p>

            <textarea
              rows={12}
              value={profile.master_resume_text || ""}
              onChange={(e) => setProfile({ ...profile, master_resume_text: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-teal-500/60 leading-relaxed"
              placeholder="Paste or upload your complete master resume text here..."
            />
          </div>

        </div>

      </div>

    </div>
  );
}

