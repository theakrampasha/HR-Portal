import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import "../../styles.css";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 100, damping: 15 } 
  }
};

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [jobs, setJobs] = useState(() => {
    const savedJobs = localStorage.getItem("jobs");
    return savedJobs ? JSON.parse(savedJobs) : [];
  });
  const [selectedJob, setSelectedJob] = useState(() => {
    const savedSelectedJob = localStorage.getItem("selectedJob");
    return savedSelectedJob ? Number(savedSelectedJob) : null;
  });

  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalRoleName, setModalRoleName] = useState("");
  const [deleteJobId, setDeleteJobId] = useState(null);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const navigate = useNavigate();
  const currentJob = jobs.find(
    job => job.id === selectedJob
  );

  useEffect(() => {
    if (selectedJob) {
      localStorage.setItem("selectedJob", String(selectedJob));
      localStorage.setItem("activeJobId", String(selectedJob));
      const cur = jobs.find(j => j.id === selectedJob);
      if (cur) {
        localStorage.setItem("activeJob", cur.name);
      }
    }
  }, [selectedJob, jobs]);

  useEffect(() => {
    if (
      jobs.length > 0 &&
      !jobs.some(job => job.id === selectedJob)
    ) {
      setSelectedJob(jobs[0].id);
    }
  }, [jobs, selectedJob]);

  // Sync with localStorage so UploadPage updates when App.js or Header changes jobs/selectedJob
  useEffect(() => {
    const syncJobs = () => {
      const savedJobsRaw = localStorage.getItem("jobs");
      if (savedJobsRaw) {
        try {
          const savedJobs = JSON.parse(savedJobsRaw);
          setJobs(prevJobs => {
            const mergedJobs = savedJobs.map(sj => {
              const prev = prevJobs.find(p => p.id === sj.id);
              if (prev) {
                return { ...sj, jd: prev.jd || sj.jd, jdFile: prev.jdFile || null };
              }
              return sj;
            });
            const prevStr = JSON.stringify(prevJobs.map(j => ({ ...j, jdFile: null })));
            const mergedStr = JSON.stringify(mergedJobs.map(j => ({ ...j, jdFile: null })));
            if (prevStr !== mergedStr) {
              return mergedJobs;
            }
            return prevJobs;
          });
        } catch (e) {}
      }

      const savedSelectedJob = localStorage.getItem("selectedJob");
      if (savedSelectedJob) {
        setSelectedJob(prev => {
          const num = Number(savedSelectedJob);
          return prev !== num ? num : prev;
        });
      }
    };

    window.addEventListener("storage", syncJobs);
    const interval = setInterval(syncJobs, 1000);
    return () => {
      window.removeEventListener("storage", syncJobs);
      clearInterval(interval);
    };
  }, []);

  // ================= FILE SELECT =================
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
    toast.success("Files added 🚀");
  };

  // ================= REMOVE FILE =================
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ================= DRAG =================
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);
    toast.success("Files dropped 🎯");
  };

  // ================= JD FILE SELECT =================
 const handleJdFile = (e) => {
  const file = e.target.files[0];

  if (!file || !selectedJob) return;

  setJobs(prev =>
    prev.map(job =>
      job.id === selectedJob
        ? { ...job, jdFile: file }
        : job
    )
  );
};

  // ================= UPLOAD =================
  const handleUpload = async () => {
    if (files.length === 0) {
      return toast.error("Upload resumes");
    }

    if (!currentJob?.jd && !currentJob?.jdFile) {
  return toast.error("Provide Job Description");
}

    const formData = new FormData();
    formData.append(
  "job_id",
  currentJob.name
);

    // ✅ resumes
    files.forEach((file) => formData.append("files", file));

    // ✅ JD (file or text)
     if (currentJob?.jdFile) {
  formData.append("jd_file", currentJob.jdFile);
} else {
  formData.append("jd", currentJob?.jd || "");
}

    try {
      setLoading(true);

      const res = await API.post("/analyze", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      localStorage.setItem(
        `candidates_${currentJob.id}`,
        JSON.stringify(res.data.candidates)
      );
      localStorage.setItem(
        `reports_candidates_${currentJob.id}`,
        JSON.stringify(res.data.candidates)
      );

      localStorage.setItem("activeJobId", String(currentJob.id));
      localStorage.setItem("activeJob", currentJob.name); // legacy compat

      // Report funnel stats to backend
      try {
        await API.post("/reports/funnel-stats", {
          job_id: String(currentJob.id),
          job_role: currentJob.name,
          total_uploaded: res.data.total_candidates || (res.data.candidates ? res.data.candidates.length : 0)
        });
      } catch (e_stats) {
        console.error("Failed to update funnel stats:", e_stats);
      }

      // Check if any candidate's ai_analysis contains a quota exceeded indicator
      const hasQuotaExceeded = res.data.candidates?.some(
        (cand) =>
          cand.ai_analysis &&
          (cand.ai_analysis.toLowerCase().includes("quota exceeded") ||
            cand.ai_analysis.toLowerCase().includes("ai unavailable"))
      );

      if (hasQuotaExceeded) {
        toast.error("Gemini API Quota Exceeded! Fallback ATS scoring was used.", {
          duration: 6000,
        });
      } else {
        toast.success("Analysis Done 🚀");
      }

      navigate("/candidates");

    } catch (err) {
      console.error("UPLOAD ERROR:", err.response?.data || err);
      const errMsg = err.response?.data?.detail || err.message || "";
      if (
        errMsg.toLowerCase().includes("quota") ||
        errMsg.toLowerCase().includes("limit") ||
        errMsg.toLowerCase().includes("rate") ||
        errMsg.toLowerCase().includes("429")
      ) {
        toast.error("Gemini API Quota Exceeded! Please try again later.", {
          duration: 6000,
        });
      } else {
        toast.error("Upload failed ❌");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      className="upload-container"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >

      {/* HERO */}
      <motion.div className="hero" variants={itemVariants}>
        <h1>Nikitha Resume Analyzer</h1>
        <p>Upload resumes & analyze candidates instantly</p>

        {/* Unified Pill tabs including New Hiring button */}
        <div className="role-tabs-container">
          {jobs.map(job => (
            <div
              key={job.id}
              onClick={() => {
                setSelectedJob(job.id);
                localStorage.setItem("selectedJob", String(job.id));
                localStorage.setItem("activeJobId", String(job.id));
                localStorage.setItem("activeJob", job.name);
                setFiles([]);
              }}
              className={`role-tab ${selectedJob === job.id ? "active" : ""}`}
            >
              <span>📑 {job.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteJobId(job.id);
                }}
                className="role-tab-delete-btn"
                title={`Delete ${job.name}`}
              >
                ×
              </button>
            </div>
          ))}
          
          <button
            onClick={() => setShowAddModal(true)}
            className="role-tab-new-btn"
          >
            ➕ New Hiring
          </button>
        </div>
      </motion.div>

      {/* MAIN */}
      <div className="main-grid">

        {/* LEFT — Job Description */}
<motion.div className="glass-card" variants={itemVariants}>

  {currentJob && (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
      {/* Active Job Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(37, 99, 235, 0.08)",
          color: "var(--accent-blue)",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "700",
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-blue)", display: "inline-block" }} />
        Active Job: {currentJob.name}
      </div>

      {/* JD Words Badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: "rgba(124, 92, 191, 0.08)",
          color: "#7c5cbf",
          padding: "6px 14px",
          borderRadius: "20px",
          fontSize: "13px",
          fontWeight: "700",
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7c5cbf", display: "inline-block" }} />
        JD Words: {currentJob?.jdFile
          ? "File"
          : currentJob?.jd
            ? currentJob.jd.split(/\s+/).filter(Boolean).length
            : 0}
      </div>
    </div>
  )}

 <h3 className="upload-card-title">
  <span
    style={{
      fontSize: "20px",
      background: "var(--silver-gradient)",
      border: "1px solid #cbd5e1",
      padding: "8px 10px",
      borderRadius: "10px",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "inset 0 1px 2px rgba(255,255,255,1)"
    }}
  >
    📑
  </span>
  Job Description
 </h3>

          {/* JD FILE - Stylized premium choose file pill */}
          <div style={{ marginBottom: "18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button
                type="button"
                onClick={() => document.getElementById("jdFileInput").click()}
                style={{
                  background: "var(--accent-blue)",
                  color: "#ffffff",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(30, 58, 138, 0.3), inset 0 2px 4px rgba(255,255,255,0.2)",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => { e.target.style.background = "var(--accent-blue-hover)"; e.target.style.transform = "translateY(-1px)" }}
                onMouseOut={(e) => { e.target.style.background = "var(--accent-blue)"; e.target.style.transform = "translateY(0)" }}
              >
                Choose File
              </button>
              <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "500" }}>
               {currentJob?.jdFile
                ? currentJob.jdFile.name
                : "No file chosen"}
              </span>
              <input
                id="jdFileInput"
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={handleJdFile}
              />
            </div>
          </div>

          {currentJob?.jdFile && (
            <motion.div 
              className="jd-file-item"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <span>📄 {currentJob.jdFile.name}</span>
              <button
  onClick={() => {
    setJobs(prev =>
      prev.map(job =>
        job.id === selectedJob
          ? { ...job, jdFile: null }
          : job
      )
    );
  }}
  style={{
    border: "none",
    background: "none",
    cursor: "pointer",
    color: "var(--text-main)"
  }}
>
  ✖
</button>
            </motion.div>
          )}

          <div className="divider">OR</div>

           <textarea
  className="jd-textarea"
  placeholder="Paste your job description requirements..."
  value={currentJob?.jd || ""}
  onChange={(e) => {
    const value = e.target.value;

    setJobs(prev =>
      prev.map(job =>
        job.id === selectedJob
          ? { ...job, jd: value }
          : job
      )
    );
  }}
/>


        </motion.div>

        {/* RIGHT — Upload Resumes */}
        <motion.div className="glass-card" variants={itemVariants}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
            <h3 className="upload-card-title" style={{ marginBottom: 0 }}>
              <span style={{ fontSize: "20px", background: "var(--silver-gradient)", border: "1px solid #cbd5e1", padding: "8px 10px", borderRadius: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center", boxShadow: "inset 0 1px 2px rgba(255,255,255,1)" }}>📂</span> 
              Upload Resumes
            </h3>

            {/* Resumes Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(37, 99, 235, 0.08)",
                color: "var(--accent-blue)",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-blue)", display: "inline-block" }} />
              Resumes: {files.length}
            </div>
          </div>

          <motion.div
            className={`drop-zone ${dragActive ? "active" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput").click()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <motion.div 
              className="icon"
              animate={dragActive ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : { y: [0, -6, 0] }}
              transition={dragActive ? { repeat: Infinity, duration: 1.5 } : { repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            >
              ☁️
            </motion.div>
            <p>{files.length ? "✅ Files Selected" : "Drag & Drop Resumes here"}</p>
            <span>or click to browse your folders</span>
          </motion.div>

          <div className="file-list">
            {files.map((file, i) => (
              <motion.div 
                key={i} 
                className="file-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                <p>📄 {file.name}</p>
                <button onClick={() => removeFile(i)}>×</button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ANALYZE BUTTON (OUTSIDE THE GRID, CENTERED AT THE BOTTOM) */}
      <motion.div 
        className="action-container" 
        variants={itemVariants}
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "40px",
          marginBottom: "20px"
        }}
      >
        <motion.button
          className="btn-primary analyze-btn"
          style={{
            minWidth: "320px",
            padding: "16px 36px",
            fontSize: "16px",
            fontWeight: "800",
            borderRadius: "30px",
            background: "linear-gradient(135deg, var(--accent-blue), #1e40af)",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(29, 78, 216, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.2)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "all 0.2s"
          }}
          onClick={handleUpload}
          disabled={loading}
          whileHover={{ scale: 1.05, boxShadow: "0 12px 30px rgba(29, 78, 216, 0.5)" }}
          whileTap={{ scale: 0.97 }}
        >
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{ display: "inline-block", fontSize: "18px" }}
              >
                🔄
              </motion.span>
              Processing Resumes...
            </div>
          ) : (
            "🚀 Analyze Candidates "
          )}
        </motion.button>
      </motion.div>

      {/* NEW HIRING MODAL */}
      {showAddModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "450px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "10px" }}>➕ New Hiring Session</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px" }}>
              Create a fresh recruitment pipeline for a new role.
            </p>
            <input
              type="text"
              placeholder="e.g. Design Lead"
              value={modalRoleName}
              onChange={(e) => setModalRoleName(e.target.value)}
              className="modern-input"
              style={{ marginBottom: "20px", background: "#fcfaf7" }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!modalRoleName.trim()) return;
                  const newJob = {
                    id: Date.now(),
                    name: modalRoleName.trim(),
                    jd: "",
                    jdFile: null
                  };
                  const updatedJobs = [...jobs, newJob];
                  setJobs(updatedJobs);
                  localStorage.setItem("jobs", JSON.stringify(updatedJobs));
                  setSelectedJob(newJob.id);
                  localStorage.setItem("selectedJob", String(newJob.id));
                  localStorage.setItem("activeJobId", String(newJob.id));
                  localStorage.setItem("activeJob", newJob.name);
                  setModalRoleName("");
                  setShowAddModal(false);
                  toast.success("New hiring session created! 🚀");
                }}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL — STEP 1: Warning */}
      {deleteJobId && deleteStep === 1 && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "420px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: "40px", textAlign: "center", marginBottom: "12px" }}>⚠️</div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px", textAlign: "center" }}>Delete Hiring Pipeline?</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "20px", textAlign: "center", lineHeight: "1.6" }}>
              This will permanently remove <strong style={{ color: "#ef4444" }}>{jobs.find(j => j.id === deleteJobId)?.name}</strong> and all its associated candidate data. This action <strong>cannot be undone</strong>.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setDeleteJobId(null); setDeleteStep(1); setDeleteConfirmText(""); }}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() => setDeleteStep(2)}
                style={{
                  flex: 1,
                  background: "#f59e0b",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)"
                }}
              >
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL — STEP 2: Type domain name */}
      {deleteJobId && deleteStep === 2 && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "450px", border: "1px solid rgba(255,255,255,0.15)" }}>
            <div style={{ fontSize: "40px", textAlign: "center", marginBottom: "12px" }}>🔐</div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", marginBottom: "8px", textAlign: "center" }}>Confirm Deletion</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "16px", textAlign: "center", lineHeight: "1.6" }}>
              To confirm, please type the domain name below:
            </p>
            <div style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "10px 16px",
              textAlign: "center",
              marginBottom: "16px",
              fontWeight: "800",
              color: "#dc2626",
              fontSize: "16px",
              letterSpacing: "0.5px"
            }}>
              {jobs.find(j => j.id === deleteJobId)?.name}
            </div>
            <input
              type="text"
              placeholder="Type the domain name to confirm..."
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="modern-input"
              style={{
                marginBottom: "20px",
                background: "#fcfaf7",
                border: deleteConfirmText && deleteConfirmText === jobs.find(j => j.id === deleteJobId)?.name
                  ? "2px solid #22c55e"
                  : deleteConfirmText
                    ? "2px solid #ef4444"
                    : "1px solid #cbd5e1"
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => { setDeleteJobId(null); setDeleteStep(1); setDeleteConfirmText(""); }}
                className="btn-outline"
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button
                disabled={deleteConfirmText !== jobs.find(j => j.id === deleteJobId)?.name}
                onClick={() => {
                  const jobToDelete = jobs.find(j => j.id === deleteJobId);
                  const updatedJobs = jobs.filter(j => j.id !== deleteJobId);
                  setJobs(updatedJobs);
                  localStorage.setItem("jobs", JSON.stringify(updatedJobs));

                  // Clean up all related localStorage data
                  localStorage.removeItem(`candidates_${deleteJobId}`);
                  localStorage.removeItem(`reports_candidates_${deleteJobId}`);
                  localStorage.removeItem(`reports_shortlisted_${deleteJobId}`);
                  localStorage.removeItem(`final_${deleteJobId}`);
                  if (jobToDelete) {
                    localStorage.removeItem(`candidates_${jobToDelete.name}`);
                    localStorage.removeItem(`reports_candidates_${jobToDelete.name}`);
                    localStorage.removeItem(`reports_shortlisted_${jobToDelete.name}`);
                    localStorage.removeItem(`final_${jobToDelete.name}`);
                  }

                  // If the deleted job was selected, switch to another
                  if (selectedJob === deleteJobId) {
                    if (updatedJobs.length > 0) {
                      setSelectedJob(updatedJobs[0].id);
                      localStorage.setItem("selectedJob", String(updatedJobs[0].id));
                      localStorage.setItem("activeJobId", String(updatedJobs[0].id));
                      localStorage.setItem("activeJob", updatedJobs[0].name);
                    } else {
                      setSelectedJob(null);
                      localStorage.removeItem("selectedJob");
                      localStorage.removeItem("activeJobId");
                      localStorage.removeItem("activeJob");
                    }
                  }

                  setDeleteJobId(null);
                  setDeleteStep(1);
                  setDeleteConfirmText("");
                  setFiles([]);
                  toast.success("Hiring pipeline deleted 🗑️");
                }}
                style={{
                  flex: 1,
                  background: deleteConfirmText === jobs.find(j => j.id === deleteJobId)?.name ? "#ef4444" : "#d1d5db",
                  color: "#ffffff",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: deleteConfirmText === jobs.find(j => j.id === deleteJobId)?.name ? "pointer" : "not-allowed",
                  boxShadow: deleteConfirmText === jobs.find(j => j.id === deleteJobId)?.name ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "none",
                  opacity: deleteConfirmText === jobs.find(j => j.id === deleteJobId)?.name ? 1 : 0.6,
                  transition: "all 0.2s"
                }}
              >
                🗑️ Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}