const API_BASE = import.meta.env.VITE_API_BASE || "https://cliff-backend-prod-gimnyg4ehq-uc.a.run.app/api";

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch (err) {
    return false;
  }
}

export async function getJobs(status = null) {
  const url = status ? `${API_BASE}/jobs?status=${encodeURIComponent(status)}` : `${API_BASE}/jobs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function getJobDetail(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error("Failed to fetch job detail");
  return res.json();
}

export async function createJob(jobData) {
  const res = await fetch(`${API_BASE}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobData),
  });
  if (!res.ok) throw new Error("Failed to create job");
  return res.json();
}

export async function updateJobStatus(jobId, status, notes = null) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function deleteJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete job");
  return res.json();
}

export async function getUserProfile() {
  const res = await fetch(`${API_BASE}/profile`);
  if (!res.ok) throw new Error("Failed to fetch user profile");
  return res.json();
}

export async function updateUserProfile(profileData) {
  const res = await fetch(`${API_BASE}/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData),
  });
  if (!res.ok) throw new Error("Failed to update profile");
  return res.json();
}

export async function tailorResume(payload) {
  const res = await fetch(`${API_BASE}/ai/tailor-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to tailor resume");
  return res.json();
}

export async function generateCoverLetter(payload) {
  const res = await fetch(`${API_BASE}/ai/cover-letter`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to generate cover letter");
  return res.json();
}

export async function generateLearningRoadmap(jobIdOrPayload) {
  const payload = typeof jobIdOrPayload === "object" 
    ? jobIdOrPayload 
    : { job_id: jobIdOrPayload };

  const res = await fetch(`${API_BASE}/ai/learning-roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to generate learning roadmap");
  return res.json();
}

export async function draftAnswer(question, jobContext = "") {
  const res = await fetch(`${API_BASE}/ai/draft-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, job_context: jobContext }),
  });
  if (!res.ok) throw new Error("Failed to draft answer");
  return res.json();
}

export async function uploadResume(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/profile/upload-resume`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Failed to upload and parse resume");
  }
  return res.json();
}

export async function getSignedUploadUrl(filename, contentType = "application/pdf") {
  const res = await fetch(`${API_BASE}/storage/signed-upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content_type: contentType }),
  });
  if (!res.ok) throw new Error("Failed to request storage upload URL");
  return res.json();
}

export async function uploadDirectToStorage(signedUrl, file, signedContentType = null) {
  const contentType = signedContentType || file.type || "application/pdf";
  const headers = {};
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers,
    body: file
  });
  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`Direct storage upload failed (HTTP ${res.status}): ${errorBody || res.statusText}`);
  }
  return true;
}

export async function processUploadedResume(objectName, bucketName = null, taskId = null) {
  const res = await fetch(`${API_BASE}/profile/process-uploaded-resume`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ object_name: objectName, bucket_name: bucketName, task_id: taskId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Processing failed" }));
    throw new Error(err.detail || "Failed to process uploaded resume from storage");
  }
  return res.json();
}

export async function getResumeUploadStatus(taskId) {
  const res = await fetch(`${API_BASE}/profile/upload-status/${taskId}`);
  if (!res.ok) throw new Error("Failed to fetch upload task status");
  return res.json();
}

// CLIFF Academy / Mini-LMS
export async function getLmsModules(jobId) {
  const res = await fetch(`${API_BASE}/lms/jobs/${jobId}/modules`);
  if (!res.ok) throw new Error("Failed to fetch learning modules");
  return res.json();
}

export async function generateLmsTrack(jobId) {
  const res = await fetch(`${API_BASE}/lms/jobs/${jobId}/generate-track`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to generate learning track");
  return res.json();
}

export async function getLmsModuleDetail(moduleId) {
  const res = await fetch(`${API_BASE}/lms/modules/${moduleId}`);
  if (!res.ok) throw new Error("Failed to fetch module details");
  return res.json();
}

export async function submitLmsQuiz(moduleId, answers) {
  const res = await fetch(`${API_BASE}/lms/modules/${moduleId}/submit-quiz`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers })
  });
  if (!res.ok) throw new Error("Failed to submit quiz");
  return res.json();
}

export async function graduateLmsSkill(moduleId) {
  const res = await fetch(`${API_BASE}/lms/modules/${moduleId}/graduate`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to graduate skill");
  return res.json();
}





