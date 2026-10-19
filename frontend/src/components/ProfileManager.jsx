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
      if (updated && (updated.full_name || updated.skills || updated.email)) {
        setProfile(updated);
      }
      setSaveSuccess(true);
      if (onProfileUpdated) onProfileUpdated();
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Save profile error:", err);
      alert("Failed to save profile: " + (err.message || "Network error"));
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
      const signedData = await getSignedUploadUrl(file.name, file.type || "application/pdf").catch((err) => {
        console.warn("Could not request signed URL, falling back to direct upload:", err);
        return { mode: "local" };
      });

      let result;
      if (signedData && signedData.mode === "gcs" && signedData.signed_url) {
        // Direct GCS upload flow (Production Event-Driven)
        setUploadStatus(`Uploading document directly to Google Cloud Storage...`);
        await uploadDirectToStorage(signedData.signed_url, file, signedData.content_type);

        setUploadStatus("Uploaded to bucket! Cloud event dispatched, analyzing with Vertex AI...");

        // 2. Smart Event Status Polling (Checks PostgreSQL task status every 3s)
        let attempts = 0;
        const maxAttempts = 20; // 20 * 3s = 60s maximum wait
        let completedTask = null;

        while (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
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
              console.warn("[Async Task Failed]", taskData.error_message);
              // Break early so backup processor can attempt recovery or surface specific error
              break;
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
      <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-500 shadow-xs">
        Loading master profile...
      </div>
    );
  }

  const standardAnswers = profile.standard_answers || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header Bar with Save button */}
      <div className="bg-[#FAF8F5]/95 border border-stone-200 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#C25E38]" />
            Master Candidate Profile & ATS Repository
          </h2>
          <p className="text-xs text-stone-500">
            Source of truth for Chrome extension auto-filling, AI match calculation, and resume tailoring.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center space-x-2 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 ${
            saveSuccess
              ? "bg-[#2C6E49] hover:bg-[#23583a]"
              : "bg-[#C25E38] hover:bg-[#B34B22]"
          }`}
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
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Identity & Contact (Autofill Fields)
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-600 block mb-1 font-medium">Full Legal Name</label>
                <input
                  type="text"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">Email Address</label>
                <input
                  type="email"
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">Phone Number</label>
                <input
                  type="text"
                  value={profile.phone || ""}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">Location / City</label>
                <input
                  type="text"
                  value={profile.location || ""}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">LinkedIn Profile URL</label>
                <input
                  type="url"
                  value={profile.linkedin_url || ""}
                  onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">GitHub / Portfolio URL</label>
                <input
                  type="url"
                  value={profile.github_url || ""}
                  onChange={(e) => setProfile({ ...profile, github_url: e.target.value })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Standard Form Answers */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#C25E38] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Standard ATS Form Answers
            </h3>
            <p className="text-[11px] text-stone-500">
              Injected into Greenhouse, Lever, and Workday forms by the CLIFF Chrome extension.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-600 block mb-1 font-medium">Work Authorization</label>
                <input
                  type="text"
                  value={standardAnswers.work_authorization || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, work_authorization: e.target.value }
                  })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">Notice Period / Start Date</label>
                <input
                  type="text"
                  value={standardAnswers.notice_period || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, notice_period: e.target.value }
                  })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">Target Compensation</label>
                <input
                  type="text"
                  value={standardAnswers.expected_salary || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, expected_salary: e.target.value }
                  })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg px-3 py-2 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="text-stone-600 block mb-1 font-medium">"Why This Company?" Value Pitch</label>
                <textarea
                  rows={3}
                  value={standardAnswers.why_us || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    standard_answers: { ...standardAnswers, why_us: e.target.value }
                  })}
                  className="w-full bg-[#FAF8F5] border border-stone-300 rounded-lg p-2.5 text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white resize-none text-xs transition-colors"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Skills & Master Resume (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Resume Ingestion & AI Extractor Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C25E38]" />
                  Resume Ingestion & AI Extractor (PDF / DOCX)
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
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
                  ? "border-[#C25E38] bg-[#FDF4EF] scale-[1.01]" 
                  : "border-stone-300 hover:border-[#C25E38]/50 hover:bg-[#FAF8F5] bg-[#FAF8F5]/50"
              }`}
            >
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-3 space-y-3">
                  <Loader2 className="w-8 h-8 text-[#C25E38] animate-spin" />
                  <div className="text-xs font-semibold text-[#C25E38]">{uploadStatus}</div>
                  <p className="text-[11px] text-stone-500">Updating skills matrix & re-scoring job board...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-[#FDF4EF] border border-[#F2D7C9] flex items-center justify-center text-[#C25E38]">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-stone-900">Click to upload</span>
                    <span className="text-xs text-stone-500"> or drag and drop your resume</span>
                  </div>
                  <p className="text-[10px] text-stone-400 font-medium">Supports PDF, DOCX, and TXT (up to 10MB)</p>
                </div>
              )}
            </div>

            {/* Success Banner */}
            {uploadSuccessMessage && (
              <div className="bg-[#F0F5F2] border border-[#C3D9CB] rounded-xl p-3 flex items-start space-x-2 text-xs text-[#2C6E49]">
                <CheckCircle2 className="w-4 h-4 text-[#2C6E49] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">{uploadSuccessMessage}</div>
                  <div className="text-[11px] text-[#2C6E49]/80 mt-0.5">
                    Match scores across your Kanban pipeline have been re-calculated.
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {uploadError && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start space-x-2 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Upload failed</div>
                  <div className="text-[11px] text-rose-700/80 mt-0.5">{uploadError}</div>
                </div>
              </div>
            )}
          </div>

          {/* Master Skills Matrix */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
                  Master Skills Matrix ({profile.skills?.length || 0})
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
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
                className="flex-1 bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-[#C25E38] focus:bg-white transition-colors"
              />
              <button
                type="submit"
                className="bg-stone-100 hover:bg-stone-200 text-[#C25E38] font-semibold text-xs px-4 py-2 rounded-xl border border-stone-200 transition-colors flex items-center space-x-1"
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
                  className="inline-flex items-center space-x-1.5 text-xs bg-[#FAF8F5] border border-stone-200 hover:border-[#C25E38]/40 text-stone-800 px-3 py-1 rounded-lg transition-colors group"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-stone-400 group-hover:text-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Modular Experience Blocks (Ground Truth) */}
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#C25E38]" />
                  Modular Experience Blocks ({profile.experience_blocks?.length || 0})
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Ground-truth repository used by the AI engine to select relevant bullet points during tailoring & ATS autofill.
                </p>
              </div>
            </div>

            {(!profile.experience_blocks || profile.experience_blocks.length === 0) ? (
              <div className="p-4 border border-dashed border-stone-200 rounded-xl text-center text-xs text-stone-500">
                No experience blocks extracted yet. Upload your resume above to decompose your previous roles automatically.
              </div>
            ) : (
              <div className="space-y-3">
                {profile.experience_blocks.map((block, idx) => (
                  <div 
                    key={idx}
                    className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-3.5 transition-all hover:border-stone-300"
                  >
                    {/* Header */}
                    <div 
                      onClick={() => setExpandedBlockIndex(expandedBlockIndex === idx ? -1 : idx)}
                      className="flex items-start justify-between cursor-pointer"
                    >
                      <div>
                        <div className="font-semibold text-xs text-stone-900 flex items-center gap-2">
                          <span>{block.role || "Software Engineer"}</span>
                          <span className="text-[#C25E38] font-medium">@ {block.company || "Company"}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-stone-500 mt-1">
                          {(block.start_date || block.end_date) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-2.5 h-2.5 text-stone-400" />
                              {block.start_date} – {block.end_date || "Present"}
                            </span>
                          )}
                          {block.location && (
                            <span>• {block.location}</span>
                          )}
                        </div>
                      </div>
                      <button className="text-stone-400 hover:text-stone-700 p-1">
                        {expandedBlockIndex === idx ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expanded Content */}
                    {expandedBlockIndex === idx && (
                      <div className="mt-3 pt-3 border-t border-stone-200 space-y-2.5">
                        {block.skills_used && block.skills_used.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {block.skills_used.map((s, sIdx) => (
                              <span key={sIdx} className="text-[10px] bg-white text-[#C25E38] border border-[#F2D7C9] px-2 py-0.5 rounded font-medium">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        {block.bullets && block.bullets.length > 0 && (
                          <ul className="space-y-1.5 text-[11px] text-stone-700">
                            {block.bullets.map((b, bIdx) => (
                              <li key={bIdx} className="flex items-start gap-2">
                                <span className="text-[#C25E38] select-none font-bold">•</span>
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
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#C25E38]" />
                Master Resume Plain Text
              </h3>
              <span className="text-[11px] text-stone-400">
                {profile.master_resume_text?.length || 0} characters
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              The AI Engine ingests this full text whenever you trigger "Tailor Resume" for a specific job.
            </p>

            <textarea
              rows={12}
              value={profile.master_resume_text || ""}
              onChange={(e) => setProfile({ ...profile, master_resume_text: e.target.value })}
              className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl p-4 text-xs font-mono text-stone-900 focus:outline-none focus:border-[#C25E38] focus:bg-white leading-relaxed"
              placeholder="Paste or upload your complete master resume text here..."
            />
          </div>

        </div>

      </div>

    </div>
  );
}

