import React, { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import "../../styles.css";
import API from "../../services/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export default function CandidatesPage() {
  const navigate = useNavigate();

  // =========================================
  // STATES
  // =========================================
  const [candidates, setCandidates] = useState([]);
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [googleCandidates, setGoogleCandidates] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);

  // =========================================
  // ATS MODAL
  // =========================================
  const [showATSModal, setShowATSModal] = useState(false);
  const [minATS, setMinATS] = useState("");

  // =========================================
  // GOOGLE FORM MODAL
  // =========================================
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [closeTime, setCloseTime] = useState("");

  // =========================================
  // TIMER
  // =========================================
  const [remainingTime, setRemainingTime] = useState("");

  // =========================================
  // FILTERS
  // =========================================
  const [search, setSearch] = useState("");
  const [degreeFilter, setDegreeFilter] = useState("");
  const [experienceFilter, setExperienceFilter] = useState("");
  const [noticeFilter, setNoticeFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [atsScoreFilter, setAtsScoreFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // =========================================
  // SHOW FINAL VIEW
  // =========================================
  const [showFilters, setShowFilters] = useState(false);
  const activeJob = localStorage.getItem("activeJobId") || "";
  const dedupeByEmail = (list) => {
  
    const seen = new Set();
    return list.filter((c) => {
      const email = (c.email || "").toLowerCase().trim();
      if (!email || !email.includes("@") || seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  };

  // =========================================
  // LOAD GOOGLE FORM CANDIDATES
  //
  // KEY CHANGE: After loading Google Form
  // responses, we MERGE them with the
  // shortlisted candidates so the RESUME
  // ATS score (c.score) is preserved and
  // used instead of any google form score.
  // =========================================
  const loadGoogleCandidates = useCallback(async () => {
    setLoading(true);
    setGoogleCandidates([]);
    setFilteredData([]);

    try {
      const res = await API.get("/google-form-candidates");
      const raw = res.data.candidates || [];

      const normalize = (val) =>
        val === undefined ||
          val === null ||
          String(val).toLowerCase() === "nan"
          ? ""
          : String(val).trim();

      // Load shortlisted to get resume ATS scores
      const shortlisted =JSON.parse(localStorage.getItem(`shortlistedCandidates_${activeJob}`)) || [];

      const data = raw.map((c) => {
        // Find the matching shortlisted candidate by email
        const resumeCandidate = shortlisted.find(
          (s) => s.email && c.email &&
            s.email.toLowerCase().trim() === normalize(c.email).toLowerCase()
        );

        // Use RESUME ATS score — fall back to google score only if no match
        const resumeScore = resumeCandidate ? Number(resumeCandidate.score || 0) : 0;

        return {
          ...c,
          name: normalize(c.name),
          email: normalize(c.email),
          phone: normalize(c.phone),
          degree: normalize(c.degree),
          experience: normalize(c.experience),
          location: normalize(c.location),
          joining: normalize(c.joining || c.notice_period),
          gender: normalize(c.gender),
          // ✅ Always use resume ATS score
          ats_score: resumeScore,
          // Keep filename for resume viewing
          filename: resumeCandidate ? resumeCandidate.filename : "",
          selected: false,
        };
      });

      if (data.length === 0) {
        toast.error(
          "No responses found yet. Google Sheets can take ~1 min to sync. Click Retry to check again.",
          { duration: 6000 }
        );
        setGoogleCandidates([]);
        setFilteredData([]);
        return;
      }

      const unique = dedupeByEmail(data);
      setGoogleCandidates(unique);
      setFilteredData(unique);

      // Report google_form_filled count to backend reports stats
      const activeJobName = localStorage.getItem("activeJob") || "";
      try {
        await API.post("/reports/funnel-stats", {
          job_id: String(activeJob),
          job_role: activeJobName,
          google_form_filled: unique.length
        });
      } catch (e_stats) {
        console.error("Failed to update google_form_filled funnel stats:", e_stats);
      }

      toast.success(`${data.length} candidates loaded`);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to load candidates";
      toast.error(errMsg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  }, [activeJob]);

  // =========================================
  // LOAD PAGE
  // =========================================
  useEffect(() => {
    const activeJob =
  localStorage.getItem("activeJobId") || "";

const stored = JSON.parse(
  localStorage.getItem(
    `candidates_${activeJob}`
  )
) || [];
    const data = stored.map((c) => ({ ...c, selected: false }));
    setCandidates(data);

    const currentBatch = JSON.stringify(data.map((c) => c.email));
    const savedBatch = localStorage.getItem(
  `candidateBatch_${activeJob}`
);

    // NEW BATCH
    if (currentBatch && currentBatch !== "[]" && currentBatch !== savedBatch) {
      setShowATSModal(true);
      localStorage.setItem(
  `candidateBatch_${activeJob}`,
  currentBatch
);
      localStorage.removeItem(
  `shortlistedCandidates_${activeJob}`
);
      localStorage.removeItem(
  `closeTime_${activeJob}`
);
      localStorage.removeItem(
  `googleFormCompleted_${activeJob}`
);
    }
    // EXISTING BATCH — restore previous state
    else {
      const shortlisted =
  JSON.parse(
    localStorage.getItem(
      `shortlistedCandidates_${activeJob}`
    )
  ) || [];
      setShortlistedCandidates(shortlisted);

      const savedCloseTime = localStorage.getItem(`closeTime_${activeJob}`);
      if (savedCloseTime) setCloseTime(savedCloseTime);

      const completed = localStorage.getItem(`googleFormCompleted_${activeJob}`);
      if (completed === "true") {
        setShowFilters(true);
        loadGoogleCandidates();
      }
    }
  }, [loadGoogleCandidates]);

  // =========================================
  // ATS FILTER — shortlist from resume batch
  // =========================================
  const applyATSFilter = () => {
    if (!minATS) {
      toast.error("Enter ATS Score");
      return;
    }

    const filtered = candidates.filter(
      (c) => Number(c.score) >= Number(minATS)
    );
    setShortlistedCandidates(filtered);
    localStorage.setItem(`shortlistedCandidates_${activeJob}`,JSON.stringify(filtered));
    setShowATSModal(false);
    toast.success(`${filtered.length} candidates shortlisted`);
  };

  // =========================================
  // COUNTDOWN TIMER
  // =========================================
  useEffect(() => {
    if (!closeTime) return;

    const interval = setInterval(() => {
      const end = new Date(closeTime).getTime();
      const now = new Date().getTime();
      const distance = end - now;

      if (distance <= 0) {
        clearInterval(interval);
        setRemainingTime("Google Form Closed");
        localStorage.setItem(`googleFormCompleted_${activeJob}`, "true");
        setShowFilters(true);
        loadGoogleCandidates();
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setRemainingTime(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [closeTime, loadGoogleCandidates, activeJob]);



  // =========================================
  // FULL RESET — clears everything
  // =========================================
  const handleFullReset = () => {
    localStorage.removeItem(`candidateBatch_${activeJob}`);
    localStorage.removeItem(`shortlistedCandidates_${activeJob}`);
    localStorage.removeItem(`closeTime_${activeJob}`);
    localStorage.removeItem(`googleFormCompleted_${activeJob}`);
    localStorage.removeItem(`candidates_${activeJob}`);
    localStorage.removeItem(`selectedCandidates_${activeJob}`);
    localStorage.removeItem(`pipeline_${activeJob}`);

    API.post("/reset-batch").catch(() => { });

    setCandidates([]);
    setShortlistedCandidates([]);
    setGoogleCandidates([]);
    setFilteredData([]);
    setShowFilters(false);
    setCloseTime("");
    setRemainingTime("");
    resetFilters();
  };

  // =========================================
  // RESET FILTERS
  // =========================================
  const resetFilters = () => {
    setSearch("");
    setDegreeFilter("");
    setExperienceFilter("");
    setNoticeFilter("");
    setLocationFilter("");
    setAtsScoreFilter("");
    setGenderFilter("");
    setStatusFilter("");
  };

  // =========================================
  // FILTER LOGIC
  //
  // KEY CHANGE: After filtering, auto-select
  // all candidates that match the filters.
  // Any candidate NOT matching a filter is
  // deselected. This way the user just sets
  // filters and clicks "Move to Final Round"
  // without manually ticking checkboxes.
  // =========================================
  useEffect(() => {
    if (!showFilters) return;

    let data = googleCandidates.map((c) => ({ ...c }));

    const hasAnyFilter =
      search || degreeFilter || experienceFilter ||
      noticeFilter || locationFilter || atsScoreFilter ||
      genderFilter || statusFilter;

    const matched = data.map((c) => {
      let matches = true;

      if (search && !(c.name || "").toLowerCase().includes(search.toLowerCase())) {
        matches = false;
      }

      if (degreeFilter && !(c.degree || "").toLowerCase().includes(degreeFilter.toLowerCase())) {
        matches = false;
      }

      if (experienceFilter && !(c.experience || "").toLowerCase().includes(experienceFilter.toLowerCase())) {
        matches = false;
      }

      if (noticeFilter && !(c.joining || "").toLowerCase().includes(noticeFilter.toLowerCase())) {
        matches = false;
      }

      if (locationFilter && !(c.location || "").toLowerCase().includes(locationFilter.toLowerCase())) {
        matches = false;
      }

      if (atsScoreFilter && Number(c.ats_score || 0) < Number(atsScoreFilter)) {
        matches = false;
      }

      if (genderFilter && !(c.gender || "").toLowerCase().includes(genderFilter.toLowerCase())) {
        matches = false;
      }

      if (statusFilter && (c.status || "").toLowerCase() !== statusFilter.toLowerCase()) {
        matches = false;
      }

      // Auto-select candidates that match filters;
      // if no filter is active, keep existing selection
      return {
        ...c,
        selected: hasAnyFilter ? matches : c.selected,
      };
    });

    // Show only matched candidates when filters are active
    const filtered = hasAnyFilter ? matched.filter((c) => c.selected) : matched;
    setFilteredData(filtered);
  }, [
    search,
    degreeFilter,
    experienceFilter,
    noticeFilter,
    locationFilter,
    atsScoreFilter,
    genderFilter,
    statusFilter,
    googleCandidates,
    showFilters,
  ]);

  // =========================================
  // SELECT / DESELECT CANDIDATE
  // =========================================
  const toggleSelect = (index) => {
    const updated = [...filteredData];
    updated[index].selected = !updated[index].selected;
    setFilteredData(updated);

    // Sync back to googleCandidates so filter re-runs keep selection
    const email = updated[index].email;
    setGoogleCandidates((prev) =>
      prev.map((c) =>
        c.email === email ? { ...c, selected: updated[index].selected } : c
      )
    );
  };

  // =========================================
  // SELECT ALL / DESELECT ALL
  // =========================================
  const toggleSelectAll = () => {
    const allSelected = filteredData.every((c) => c.selected);
    const updated = filteredData.map((c) => ({ ...c, selected: !allSelected }));
    setFilteredData(updated);

    // Sync back to googleCandidates
    const emailSet = new Set(updated.map((c) => c.email));
    setGoogleCandidates((prev) =>
      prev.map((c) =>
        emailSet.has(c.email) ? { ...c, selected: !allSelected } : c
      )
    );
  };

  // =========================================
  // VIEW RESUME
  // =========================================
  const viewResume = (file) => {
    if (!file) {
      toast.error("Resume not found");
      return;
    }
    window.open(`http://localhost:8000/uploads/${file}`, "_blank");
  };

  // =========================================
  // SEND GOOGLE FORM
  // =========================================
  const sendGoogleForm = async () => {
    if (!closeTime) {
      toast.error("Select end time");
      return;
    }

    if (new Date(closeTime) < new Date()) {
      toast.error("Select a future date and time");
      return;
    }

    try {
      const candidatesData = shortlistedCandidates.map((c) => ({
        name: c.name || "Candidate",
        email: c.email,
      }));

      await API.post("/send-google-form", {
        candidates: candidatesData,
        close_time: closeTime,
      });

      // Report google_form_sent count to backend reports stats
      const activeJobName = localStorage.getItem("activeJob") || "";
      try {
        await API.post("/reports/funnel-stats", {
          job_id: String(activeJob),
          job_role: activeJobName,
          google_form_sent: candidatesData.length
        });
      } catch (e_stats) {
        console.error("Failed to update google_form_sent funnel stats:", e_stats);
      }

      localStorage.setItem(`closeTime_${activeJob}`, closeTime);
      toast.success("Google Form Sent Successfully ✅");
      setShowGoogleModal(false);
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.detail || "Failed to send form ❌";
      toast.error(errMsg);
    }
  };

  // =========================================
  // STOP TIMER
  // =========================================
  const stopTimer = () => {
    localStorage.removeItem(`closeTime_${activeJob}`);
    localStorage.setItem(`googleFormCompleted_${activeJob}`, "true");

    setCloseTime("");
    setRemainingTime("");
    setShowFilters(true);
    resetFilters();

    loadGoogleCandidates();
    toast.success("Timer Stopped");
  };

  // =========================================
  // MOVE TO FINAL ROUND
  //
  // KEY CHANGE: Use filteredData selected
  // candidates. Pass full candidate object
  // including resume filename & ATS score.
  // =========================================
  const goToFinal = () => {
    const selected = dedupeByEmail(filteredData.filter((c) => c.selected));

    if (selected.length === 0) {
      toast.error("Select at least one candidate");
      return;
    }

    // Enrich with resume data from shortlisted candidates
    const shortlisted =
      JSON.parse(localStorage.getItem(`shortlistedCandidates_${activeJob}`)) || [];

    const activeJobName = localStorage.getItem("activeJob") || "";

    const enriched = selected.map((c) => {
      const resumeData = shortlisted.find(
        (s) => s.email && s.email.toLowerCase().trim() === c.email.toLowerCase().trim()
      );
      return {
        ...c,
        // Ensure resume ATS score is passed
        score: c.ats_score || (resumeData ? resumeData.score : 0),
        filename: c.filename || (resumeData ? resumeData.filename : ""),
        // Default pipeline fields
        status: "selected",
        roleType: "Full-Time",
        jobRole: c.jobRole || activeJobName,
        salary: "",
        joiningDate: "",
      };
    });

    const pipelineCandidates = enriched.map((c) => ({
      ...c,
      attendance: "pending",
      roleType: c.roleType || "Full-Time",
      jobRole: c.jobRole || activeJobName,
    }));

    localStorage.setItem(`selectedCandidates_${activeJob}`, JSON.stringify(pipelineCandidates));
    localStorage.setItem(
      `pipeline_${activeJob}`,
      JSON.stringify({ stage: "telephonic", dateTime: "", candidates: pipelineCandidates })
    );

    localStorage.removeItem(`candidateBatch_${activeJob}`);
    localStorage.removeItem(`shortlistedCandidates_${activeJob}`);
    localStorage.removeItem(`closeTime_${activeJob}`);
    localStorage.removeItem(`googleFormCompleted_${activeJob}`);
    localStorage.removeItem(`candidates_${activeJob}`);

    toast.success("Candidates moved to scheduling");
    navigate("/final");
  };

  // =========================================
  // BADGE COLOR BY SCORE
  // =========================================
  const getScoreClass = (score) => {
    if (score >= 75) return "badge badge-green";
    if (score >= 50) return "badge badge-yellow";
    return "badge badge-red";
  };

  // =========================================
  // RENDER
  // =========================================
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-col gap-4"
    >
      {/* ===== ATS MODAL ===== */}
      {showATSModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "450px", textAlign: "center" }}
          >
            <h1>🎯 ATS Filter</h1>
            <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
              Enter minimum ATS score to shortlist candidates
            </p>
            <input
              type="number"
              className="modern-input"
              placeholder="e.g. 60"
              value={minATS}
              onChange={(e) => setMinATS(e.target.value)}
            />
            <button
              className="btn-primary"
              style={{ width: "100%", marginTop: "20px" }}
              onClick={applyATSFilter}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ===== GOOGLE FORM MODAL ===== */}
      {showGoogleModal && (
        <div className="modal-overlay">
          <div
            className="modal-content"
            style={{ maxWidth: "450px", textAlign: "center" }}
          >
            <h1>📨 Send Google Form</h1>
            <p style={{ color: "#94a3b8", marginBottom: "20px" }}>
              Set a deadline for candidates to fill the form
            </p>
            <input
              type="datetime-local"
              className="modern-input"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                className="btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowGoogleModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={sendGoogleForm}
              >
                Send Form
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CARD ===== */}
      <div className="glass-card">

        {/* HEADER */}
        <div className="hero mb-4">
          <h1>👥 Candidates Dashboard</h1>
          <p className="text-muted">AI ATS Recruitment System</p>
        </div>

        {/* TIMER BANNER */}
        {remainingTime && (
          <div
            style={{
              background: "var(--silver-gradient)",
              border: "var(--silver-border)",
              padding: "25px",
              borderRadius: "20px",
              marginBottom: "25px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxShadow: "var(--silver-shadow)",
            }}
          >
            <div>
              <h2 style={{ color: "var(--text-main)", fontSize: "20px", fontWeight: "800", marginBottom: "4px" }}>⏳ Google Form Active</h2>
              <p style={{ color: "var(--accent-blue)", fontSize: "28px", fontWeight: "800", fontFamily: "monospace" }}>
                {remainingTime}
              </p>
            </div>
            <button
              className="btn-outline"
              style={{ background: "#ffffff", color: "var(--text-main)", fontWeight: "700", border: "1px solid #cbd5e1", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}
              onClick={stopTimer}
            >
              Stop Timer
            </button>
          </div>
        )}

        {/* ===== SHORTLISTED VIEW (before form filled) ===== */}
        {!showFilters && (
          <div className="glass-card">
            <div className="flex-between mb-4">
              <h3 className="upload-card-title">
                📄 ATS Shortlisted Candidates
                <span style={{ marginLeft: "10px", fontSize: "14px", color: "#94a3b8" }}>
                  ({shortlistedCandidates.length} candidates)
                </span>
              </h3>
              {!remainingTime && (
                <button
                  className="btn-primary"
                  onClick={() => setShowGoogleModal(true)}
                >
                  📨 Send Google Form
                </button>
              )}
            </div>

            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Resume ATS Score</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {shortlistedCandidates.length > 0 ? (
                    shortlistedCandidates.map((c, i) => (
                      <tr key={i}>
                        <td>{c.name || "—"}</td>
                        <td>{c.email || "—"}</td>
                        <td>{c.phone || "—"}</td>
                        <td>
                          <span className={getScoreClass(c.score)}>
                            {c.score}%
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-outline"
                            onClick={() => viewResume(c.filename)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}
                      >
                        No candidates shortlisted yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== GOOGLE FORM FILLED VIEW (after form closed) ===== */}
        {showFilters && (
          <>
            {/* LOADING STATE */}
            {loading && (
              <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                ⏳ Loading candidates from Google Form...
              </div>
            )}

            {/* NO CANDIDATES — show retry instead of resetting */}
            {!loading && googleCandidates.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "50px 20px",
                  background: "var(--bg-card)",
                  backdropFilter: "var(--glass-blur)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "20px",
                  marginTop: "20px",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                <p style={{ fontSize: "48px", marginBottom: "16px" }}>📭</p>
                <h3 style={{ color: "#0f172a", marginBottom: "8px", fontWeight: "800" }}>
                  No responses found yet
                </h3>
                <p style={{ color: "#94a3b8", marginBottom: "24px", fontSize: "14px" }}>
                  Google Sheets can take up to 1 minute to sync after a form submission.
                  <br />
                  Check that the candidate submitted to the correct form, then click Retry.
                </p>
                <button
                  className="btn-primary"
                  onClick={loadGoogleCandidates}
                  style={{ marginRight: "12px", display: "inline-flex" }}
                >
                  🔄 Retry
                </button>
                <button
                  className="btn-outline"
                  onClick={async () => {
                    await API.post("/reset-batch").catch(() => { });
                    handleFullReset();
                  }}
                  style={{ display: "inline-flex" }}
                >
                  ↩ Reset & Start Over
                </button>
              </div>
            )}

            {!loading && googleCandidates.length > 0 && (
              <>
                {/* FILTER BAR */}
                <div
                  style={{
                    marginTop: "20px",
                    marginBottom: "20px",
                    padding: "24px",
                    background: "var(--bg-card)",
                    backdropFilter: "var(--glass-blur)",
                    borderRadius: "20px",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "16px", fontWeight: "500" }}>
                    🎯 Set filters below — matching candidates will be <strong style={{ color: "var(--accent-secondary)" }}>auto-selected</strong> for Final Round
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    {/* Search by name */}
                    <input
                      type="text"
                      placeholder="🔍 Search by Name"
                      className="modern-input"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />

                    {/* Degree */}
                    <select
                      className="modern-input"
                      value={degreeFilter}
                      onChange={(e) => setDegreeFilter(e.target.value)}
                    >
                      <option value="">All Degrees</option>
                      <option>B.E</option>
                      <option>B.Tech</option>
                      <option>BSC</option>
                      <option>MCA</option>
                      <option>MBA</option>
                      <option>M.Tech</option>
                      <option>MSC</option>
                      <option>PhD</option>
                    </select>

                    {/* Experience */}
                    <select
                      className="modern-input"
                      value={experienceFilter}
                      onChange={(e) => setExperienceFilter(e.target.value)}
                    >
                      <option value="">All Experience</option>
                      <option>Fresher</option>
                      <option>Experience(1 to 5 years)</option>
                      <option>Experience(5 to 10 years)</option>
                      <option>Experience(10 to 15 years)</option>
                      <option>Experience(15 to 20 years)</option>
                    </select>

                    {/* Notice Period */}
                    <select
                      className="modern-input"
                      value={noticeFilter}
                      onChange={(e) => setNoticeFilter(e.target.value)}
                    >
                      <option value="">Joining Period</option>
                      <option>Immediate joiner</option>
                      <option>Notice Period </option>

                    </select>

                    {/* Location */}
                    <input
                      type="text"
                      placeholder="📍 Filter by Location"
                      className="modern-input"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />

                    {/* Min Resume ATS Score */}
                    <input
                      type="number"
                      placeholder="Min Resume ATS Score"
                      className="modern-input"
                      value={atsScoreFilter}
                      onChange={(e) => setAtsScoreFilter(e.target.value)}
                    />

                    {/* Gender */}
                    <select
                      className="modern-input"
                      value={genderFilter}
                      onChange={(e) => setGenderFilter(e.target.value)}
                    >
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>

                    </select>

                    {/* Status */}
                    <select
                      className="modern-input"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Status</option>
                      <option>Selected</option>
                      <option>Review</option>
                      <option>Rejected</option>
                    </select>
                  </div>
                </div>

                {/* RESET FILTERS */}
                <div style={{ marginBottom: "20px", textAlign: "right" }}>
                  <button className="btn-outline" onClick={resetFilters}>
                    🔄 Reset Filters
                  </button>
                </div>

                {/* CANDIDATES TABLE */}
                <div className="glass-card">
                  <div className="flex-between" style={{ marginBottom: "20px" }}>
                    <h3 className="upload-card-title">
                      ✅ Google Form Filled Candidates
                      <span style={{ marginLeft: "10px", fontSize: "14px", color: "#94a3b8" }}>
                        ({filteredData.filter((c) => c.selected).length} selected / {filteredData.length} shown)
                      </span>
                    </h3>
                    <button className="btn-primary" onClick={goToFinal}>
                      🚀 Move To Final Round
                    </button>
                  </div>

                  <div className="table-container">
                    <table className="modern-table">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              onChange={toggleSelectAll}
                              checked={
                                filteredData.length > 0 &&
                                filteredData.every((c) => c.selected)
                              }
                              title="Select / Deselect All"
                            />
                          </th>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Phone</th>
                          <th>Degree</th>
                          <th>Experience</th>
                          <th>Location</th>
                          <th>Notice Period</th>
                          <th>Gender</th>
                          <th>Resume ATS Score</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.length > 0 ? (
                          filteredData.map((c, i) => (
                            <tr
                              key={i}
                              className={c.selected ? "selected" : ""}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={c.selected || false}
                                  onChange={() => toggleSelect(i)}
                                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                />
                              </td>
                              <td>{c.name || "—"}</td>
                              <td>{c.email || "—"}</td>
                              <td>{c.phone || "—"}</td>
                              <td>{c.degree || "—"}</td>
                              <td>{c.experience || "—"}</td>
                              <td>{c.location || "—"}</td>
                              <td>{c.joining || "—"}</td>
                              <td>{c.gender || "—"}</td>
                              <td>
                                {/* ✅ Always shows RESUME ATS score */}
                                <span className={getScoreClass(c.ats_score || 0)}>
                                  {c.ats_score || 0}%
                                </span>
                              </td>
                              <td>
                                <span
                                  style={{
                                    padding: "4px 12px",
                                    borderRadius: "100px",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    background:
                                      c.status === "Selected"
                                        ? "rgba(16, 185, 129, 0.12)"
                                        : c.status === "Review"
                                          ? "rgba(245, 158, 11, 0.12)"
                                          : "rgba(244, 63, 94, 0.12)",
                                    color:
                                      c.status === "Selected"
                                        ? "#047857"
                                        : c.status === "Review"
                                          ? "#b45309"
                                          : "#be123c",
                                    border:
                                      c.status === "Selected"
                                        ? "1px solid rgba(16, 185, 129, 0.2)"
                                        : c.status === "Review"
                                          ? "1px solid rgba(245, 158, 11, 0.2)"
                                          : "1px solid rgba(244, 63, 94, 0.2)",
                                    display: "inline-flex",
                                    alignItems: "center",
                                  }}
                                >
                                  {c.status || "—"}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="11"
                              style={{
                                textAlign: "center",
                                padding: "30px",
                                color: "#94a3b8",
                              }}
                            >
                              No Candidates Found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
