import React, { useState } from "react";
import { X, Plus, Sparkles, Building2, MapPin, Link as LinkIcon, FileText } from "lucide-react";
import { createJob } from "../api";

export default function AddJobModal({ isOpen, onClose, onJobCreated }) {
  if (!isOpen) return null;

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("Remote");
  const [url, setUrl] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handlePreFillSample = () => {
    setTitle("Senior Distributed Systems & AI Engineer");
    setCompany("OpenAI / CloudScale");
    setLocation("San Francisco, CA (Hybrid)");
    setUrl(`https://www.linkedin.com/jobs/view/${Math.floor(100000 + Math.random() * 900000)}`);
    setRawDescription(`We are looking for a Senior Systems & AI Engineer to scale our inference microservices and workflow infrastructure.
Responsibilities:
- Architect high-throughput distributed APIs in Python, FastAPI, and TypeScript.
- Build resilient RAG architectures utilizing vector databases (Pinecone, ChromaDB) and Redis.
- Deploy and manage containerized services on AWS using Docker and Kubernetes.
- Drive engineering excellence, CI/CD pipeline automation, and system observability.
Requirements:
- 5+ years of software engineering experience with Python and FastAPI.
- Deep understanding of modern frontend integrations (React, Next.js).
- Strong proficiency in PostgreSQL, Redis, Docker, and AWS.
- Excellent communication and technical leadership skills.`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !company.trim() || !rawDescription.trim()) {
      setError("Please fill in Job Title, Company, and Job Description.");
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      const generatedUrl = url.trim() || `https://cliff.local/jobs/${Date.now()}`;
      await createJob({
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        url: generatedUrl,
        raw_description: rawDescription.trim(),
        status: "Saved",
        source: "Manual / Dashboard"
      });
      onJobCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to ingest job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-stone-200 w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#C25E38]" />
              Ingest Job Description into CLIFF
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              The AI Engine will extract skills, evaluate match score, and detect gaps.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePreFillSample}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-800 px-3 py-1.5 rounded-lg border border-stone-200 transition-colors flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Sample JD</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">Job Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Full-Stack Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] focus:ring-1 focus:ring-[#C25E38]/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">Company *</label>
              <input
                type="text"
                required
                placeholder="e.g. Stripe, Scale AI"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] focus:ring-1 focus:ring-[#C25E38]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Remote (US) or San Francisco, CA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] focus:ring-1 focus:ring-[#C25E38]/20"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-700 block mb-1">Job URL / Source</label>
              <input
                type="text"
                placeholder="e.g. https://www.linkedin.com/jobs/view/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] focus:ring-1 focus:ring-[#C25E38]/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-stone-700 block mb-1">
              Raw Job Description Text *
            </label>
            <textarea
              required
              rows={8}
              placeholder="Paste full job description from LinkedIn or ATS page..."
              value={rawDescription}
              onChange={(e) => setRawDescription(e.target.value)}
              className="w-full bg-[#FAF8F5] border border-stone-300 rounded-xl p-3.5 text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#C25E38] focus:ring-1 focus:ring-[#C25E38]/20 font-sans leading-relaxed resize-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#C25E38] hover:bg-[#A84F2B] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>{isSubmitting ? "Ingesting & Analyzing..." : "Save & Analyze Job"}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

