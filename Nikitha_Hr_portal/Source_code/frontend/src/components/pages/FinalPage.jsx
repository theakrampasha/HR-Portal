import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../../styles.css";
import API from "../../services/api";
import EvaluationForms from "./EvaluationForms";

/* ──────────────────────────────────────────────────────── */
const STAGES = [
  { id: "telephonic",      title: "Telephonic",   subtitle: "Initial Screening",   icon: "📞", color: "#7c3aed", gradient: "linear-gradient(135deg,#7c3aed,#a78bfa)" },
  { id: "telephonic_tech", title: "Telephonic Technical ",  subtitle: "Technical Assessment", icon: "🖥️", color: "#0369a1", gradient: "linear-gradient(135deg,#0369a1,#38bdf8)" },
  { id: "f2f_schedule",    title: "Schedule F2F", subtitle: "Schedule Interview",   icon: "📅", color: "#b45309", gradient: "linear-gradient(135deg,#b45309,#fbbf24)" },
  { id: "f2f",             title: "Face to Face", subtitle: "In-person Interview",  icon: "🤝", color: "#047857", gradient: "linear-gradient(135deg,#047857,#34d399)" },
  { id: "final_interview", title: "Final Interview",subtitle: "Management Round",   icon: "🧑‍💼", color: "#ea580c", gradient: "linear-gradient(135deg,#ea580c,#fb923c)" },
  { id: "negotiation",     title: " Negotion and Offer Letter", subtitle: "Offer & Negotiation",  icon: "🏆", color: "#b91c1c", gradient: "linear-gradient(135deg,#b91c1c,#f87171)" },
];

const DECISION_OPTIONS = [
  { value: "pending",  label: "Pending",  dot: "#f59e0b", bg: "#fffbeb", color: "#92400e", border: "#fde68a" },
  { value: "selected", label: "Selected", dot: "#22c55e", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" },
  { value: "rejected", label: "Rejected", dot: "#ef4444", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" },
];

/* Inject styles once */
const sid = "fp-styles-v5";
if (typeof document !== "undefined" && !document.getElementById(sid)) {
  const el = document.createElement("style");
  el.id = sid;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @keyframes fpFadeUp  { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fpRowIn   { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
    @keyframes ddOpen    { from{opacity:0;transform:translateY(-6px) scale(0.97)} to{opacity:1;transform:translateY(0) scale(1)} }

    .fp-root * { box-sizing: border-box; }
    .fp-root { font-family: 'Plus Jakarta Sans', sans-serif; }

    /* ── Stage pills ── */
    .fp-stage-track {
      display: flex; align-items: center;
      background: #f8fafc; border-radius: 14px; padding: 5px;
      border: 1px solid #e2e8f0; overflow-x: auto; gap: 2px;
      scrollbar-width: none;
    }
    .fp-stage-track::-webkit-scrollbar { display: none; }
    .fp-stage-pill {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 10px;
      font-size: 11.5px; font-weight: 700; white-space: nowrap;
      cursor: default; transition: all 0.2s;
    }
    .fp-sep { color: #d1d5db; font-size: 14px; padding: 0 2px; }

    /* ── Table ── */
    .fp-table-wrap {
      border-radius: 14px; overflow: hidden;
      border: 1px solid #e8ecf1;
    }
    .fp-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .fp-table thead th {
      padding: 14px 16px;
      background: #f8fafc;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #64748b;
      text-align: left; border-bottom: 2px solid #e2e8f0;
      white-space: nowrap; overflow: hidden;
    }
    .fp-table thead th:first-child { border-top-left-radius: 10px; }
    .fp-table thead th:last-child { text-align: center; border-top-right-radius: 10px; }
    .fp-table tbody tr {
      transition: all 0.2s;
      animation: fpRowIn 0.3s ease both;
    }
    .fp-table tbody tr td { border-bottom: 1px solid #f1f5f9; }
    .fp-table tbody tr:last-child td { border-bottom: none; }
    .fp-table tbody tr:hover td { background: #f8fafc; }
    .fp-table tbody tr.row-sel td { background: #f0fdf4; border-bottom-color: #dcfce7; }
    .fp-table tbody tr.row-rej td { background: #fef2f2; border-bottom-color: #fee2e2; }
    .fp-table tbody td {
      padding: 16px 16px;
      font-size: 13.5px; color: #334155;
      vertical-align: middle;
      overflow: hidden;
    }

    /* ── Avatar ── */
    .fp-av {
      width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; color: white;
    }

    /* ── Custom Select Dropdown ── */
    .fp-select-wrap {
      position: relative;
      display: inline-block;
    }
    .fp-select {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 7px 24px 7px 24px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      border: 1.5px solid;
      cursor: pointer;
      transition: all 0.15s;
      user-select: none;
      white-space: nowrap;
      min-width: 120px;
      appearance: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      font-family: inherit;
      height: 32px;
      line-height: 1;
    }
    .fp-select:hover {
      filter: brightness(0.96);
    }
    .fp-select:focus {
      outline: none;
    }

    /* ── Eval badge ── */
    .fp-eval-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 16px;
      font-size: 10.5px; font-weight: 700;
    }

    /* ── Bottom bar ── */
    .fp-bottom {
      padding: 16px 22px;
      background: #fafbfc; border-top: 1px solid #e8ecf1;
      display: flex; justify-content: space-between;
      align-items: center; flex-wrap: wrap; gap: 12px;
    }
    .fp-stat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 5px 12px; border-radius: 20px;
      font-size: 12px; font-weight: 700;
    }

    /* ── Move button ── */
    .fp-move-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 12px 28px; border-radius: 12px; border: none;
      font-size: 13.5px; font-weight: 800; cursor: pointer;
      transition: all 0.22s; font-family: inherit;
    }
    .fp-move-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(0,0,0,0.16); }
    .fp-move-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ── Fill btn ── */
    .fp-fill-btn {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 5px 11px; border-radius: 7px;
      font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0;
      background: white; color: #475569; cursor: pointer;
      transition: all 0.15s;
    }
    .fp-fill-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }
  `;
  document.head.appendChild(el);
}

/* ── Dropdown component ── */
function DecisionDropdown({ value, onChange }) {
  const current = DECISION_OPTIONS.find(o => o.value === value) || DECISION_OPTIONS[0];

  return (
    <div className="fp-select-wrap">
      <span
        style={{
          position: "absolute",
          left: "11px",
          top: "50%",
          transform: "translateY(-50%)",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          background: current.dot,
          pointerEvents: "none",
        }}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fp-select"
        style={{
          borderColor: current.border,
          color: current.color,
          background: current.bg,
        }}
      >
        {DECISION_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: "white", color: "#374151" }}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: "11px",
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: current.color,
          fontSize: "8px",
          display: "flex",
          alignItems: "center",
          fontWeight: "normal",
        }}
      >
        ▼
      </span>
    </div>
  );
}


const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const openGmailCompose = ({ to_email, from_name, subject, body_hint = "" }) => {
  const to = encodeURIComponent(to_email);
  const sub = encodeURIComponent(`Re: ${subject}`);
  const body = encodeURIComponent(
    body_hint ||
    `Dear ${from_name || "Candidate"},\n\nThank you for reaching out.\n\nRegards,\nHR Team`
  );
  window.open(
    `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${sub}&body=${body}`,
    "_blank"
  );
};

function GmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}>
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="currentColor" />
    </svg>
  );
}



// SectionLabel removed — inline labels are used instead

// ── inline styles ─────────────────────────────────────────────────────────────
const styles = {
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  scheduleRow: { display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  muted: { fontSize: 12, color: "var(--text-muted)" },
  nameCell: { display: "flex", alignItems: "center", gap: 8 },
  tableWrapper: { width: "100%", overflowX: "auto", borderRadius: 10, border: "0.5px solid var(--border-color)", marginBottom: 4 },
  table: { width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.5px",
    color: "var(--text-muted)", borderBottom: "0.5px solid var(--border-color)",
    background: "var(--silver-gradient)", whiteSpace: "nowrap",
  },
  td: { padding: "10px 14px", borderBottom: "0.5px solid var(--border-color)", verticalAlign: "middle" },
  notifCard: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 18px", borderRadius: 12,
    background: "rgba(124,92,191,0.1)", border: "0.5px solid rgba(124,92,191,0.35)",
    marginBottom: 20, flexWrap: "wrap",
  },
  notifIcon: { fontSize: 24 },
  notifTitle: { fontSize: 14, fontWeight: 600, color: "var(--text-primary)" },
  notifSub: { fontSize: 12, color: "var(--text-muted)", marginTop: 2 },
  countdown: { fontSize: 15, fontWeight: 700, color: "var(--accent-blue)" },
  notifBadge: {
    background: "rgba(37, 99, 235, 0.08)", color: "var(--accent-blue)",
    border: "0.5px solid rgba(37, 99, 235, 0.2)",
    padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
  },
  statRow: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  statCard: {
    flex: 1, minWidth: 80,
    background: "var(--silver-gradient)",
    border: "var(--silver-border)", borderRadius: 10, padding: "12px 14px",
    boxShadow: "var(--silver-shadow)",
  },
  // Bell
  bellBtn: {
    position: "relative",
    background: "var(--silver-gradient)", border: "var(--silver-border)",
    borderRadius: "50%", width: 36, height: 36,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: 16, transition: "all 0.2s",
    boxShadow: "0 2px 5px rgba(0,0,0,0.05), inset 0 1px 2px rgba(255,255,255,1)",
    borderCollapse: "separate"
  },
  unreadDot: {
    position: "absolute", top: -4, right: -4,
    background: "#ef4444", color: "#fff", borderRadius: "50%",
    width: 16, height: 16, fontSize: 10, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  issuePanel: {
    position: "absolute", top: 44, right: 0, zIndex: 999, width: 400,
    background: "#ffffff",
    border: "var(--silver-border)",
    borderRadius: 14, boxShadow: "0 16px 40px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,1)", overflow: "hidden",
  },
  issuePanelHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", borderBottom: "1px solid var(--border-color)",
  },
  issueBanner: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "8px 14px",
    background: "rgba(232,85,85,0.12)",
    borderBottom: "0.5px solid rgba(232,85,85,0.25)",
    color: "#e85555",
  },
  refreshBtn: {
    background: "transparent", border: "0.5px solid var(--border-color)",
    color: "var(--text-muted)", borderRadius: 8, padding: "4px 10px", fontSize: 11, cursor: "pointer",
  },
  issueItem: { padding: "12px 14px", borderBottom: "0.5px solid var(--border-color)", paddingLeft: 12, textAlign: "left" },
  gmailBtn: {
    display: "flex", alignItems: "center",
    color: "#fff", border: "none", borderRadius: 8,
    padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap",
  },
  gmailBtnInline: {
    display: "flex", alignItems: "center",
    background: "rgba(232,85,85,0.85)", color: "#fff",
    border: "none", borderRadius: 8,
    padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer",
    whiteSpace: "nowrap", flexShrink: 0,
  },
  gmailIconBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(232,85,85,0.15)", color: "#e85555",
    border: "0.5px solid rgba(232,85,85,0.4)", borderRadius: 8,
    padding: "5px 8px", cursor: "pointer", flexShrink: 0,
  },
  // Issue alert card
  issueAlertCard: {
    display: "flex", gap: 12, alignItems: "flex-start",
    padding: "14px 16px", borderRadius: 12,
    background: "rgba(232,85,85,0.08)",
    border: "1px solid rgba(232,85,85,0.3)",
    marginBottom: 12,
    textAlign: "left"
  },
  issueAlertBlock: {
    borderTop: "0.5px solid rgba(232,85,85,0.15)",
    paddingTop: 8,
    marginTop: 6,
  },
  issueAlertRow: {
    display: "flex", alignItems: "center", gap: 10,
    paddingBottom: 6,
  },
  // ── NEW: message box shown below each issue candidate ──
  issueMessageBox: {
    marginLeft: 40,
    marginTop: 4,
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(232,85,85,0.07)",
    border: "0.5px solid rgba(232,85,85,0.25)",
  },
  issueMessageLabel: {
    fontSize: 10, fontWeight: 600, color: "#e85555",
    textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4,
  },
  issueMessageText: {
    fontSize: 12, color: "var(--text-primary)",
    lineHeight: 1.65, whiteSpace: "pre-wrap",
    maxHeight: 90, overflowY: "auto",
  },
  // ── Issue message shown inline inside table row ──
  tableIssueMsg: {
    marginTop: 5,
    fontSize: 11, color: "var(--text-muted)",
    lineHeight: 1.5, whiteSpace: "pre-wrap",
    maxHeight: 54, overflow: "hidden",
    background: "rgba(232,85,85,0.06)",
    border: "0.5px solid rgba(232,85,85,0.2)",
    borderRadius: 6, padding: "4px 8px",
    maxWidth: 280,
  },
  fpIssueRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap"
  }
};

/* ══════════════════════════════════════════════════════════ */
export default function FinalPage() {
  const navigate      = useNavigate();
  const activeJobId   = localStorage.getItem("activeJobId") || "";
  const activeJobName = localStorage.getItem("activeJob")   || "";

  const [candidates,        setCandidates]        = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showFormForRound,  setShowFormForRound]  = useState(null);
  const [f2fDate,           setF2fDate]           = useState("");
  const [sending,           setSending]           = useState(false);
  const [currentTab,        setCurrentTab]        = useState("telephonic");
  const [decisions,         setDecisions]         = useState({});

  const [timeLeft,          setTimeLeft]          = useState("");
  const [bellOpen,          setBellOpen]          = useState(false);
  const [replies,           setReplies]           = useState([]);
  const [loadingBell,       setLoadingBell]       = useState(false);
  const [f2fFormsMode,      setF2fFormsMode]      = useState(false);
  const [isLoaded,          setIsLoaded]          = useState(false);
  const bellRef = useRef(null);

  /* ── Load / Save ── */
  useEffect(() => {
    if (!activeJobId) return;

    const saved    = JSON.parse(localStorage.getItem(`pipeline_${activeJobId}`)            || "{}");
    const sel      = JSON.parse(localStorage.getItem(`selectedCandidates_${activeJobId}`) || "[]");
    const savedDec = localStorage.getItem(`pipeline_decisions_${activeJobId}`);

    // ── 1. Load candidates ──────────────────────────────────────────────────
    // Prefer pipeline state; fall back to freshly-selected from Candidates page
    let loaded = [];
    if (saved.candidates) {
      loaded = saved.candidates.map(c => ({ ...c, stage: c.stage || "telephonic" }));
    } else if (sel.length > 0) {
      // Old ATS-score logic: bring in candidates selected from the Candidates page
      loaded = sel.map(c => ({
        ...c,
        stage:      "telephonic",
        attendance: c.attendance || "pending",
        jobRole:    c.jobRole    || "",
      }));
    }
    setCandidates(loaded);

    // ── 2. Restore f2fDate ──────────────────────────────────────────────────
    if (saved.f2fDate) setF2fDate(saved.f2fDate);

    // ── 3. Smart tab restore ────────────────────────────────────────────────
    // Saved tab is only valid if it still has candidates.
    // Otherwise jump to the most advanced stage that actually has candidates.
    const savedTab = localStorage.getItem(`pipeline_tab_${activeJobId}`);
    const stageOrder = STAGES.map(s => s.id);          // preserves pipeline order
    const mostAdvanced = [...stageOrder].reverse()      // highest stage first
      .find(id => loaded.some(c => c.stage === id));

    if (savedTab && loaded.some(c => c.stage === savedTab)) {
      setCurrentTab(savedTab);                          // saved tab still has candidates ✓
    } else if (mostAdvanced) {
      setCurrentTab(mostAdvanced);                      // jump to where the work is
    }

    // ── 4. Load decisions ───────────────────────────────────────────────────
    if (savedDec) { try { setDecisions(JSON.parse(savedDec)); } catch {} }

    // ── 5. Load F2F Forms Mode ──────────────────────────────────────────────
    const savedF2fMode = localStorage.getItem(`pipeline_f2f_mode_${activeJobId}`);
    if (savedF2fMode === "true") setF2fFormsMode(true);

    setIsLoaded(true);
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJobId || !isLoaded) return;
    localStorage.setItem(`pipeline_${activeJobId}`, JSON.stringify({ candidates, f2fDate }));
  }, [candidates, f2fDate, activeJobId, isLoaded]);
  useEffect(() => {
    if (activeJobId) localStorage.setItem(`pipeline_tab_${activeJobId}`, currentTab);
  }, [currentTab, activeJobId]);
  useEffect(() => {
    if (activeJobId) localStorage.setItem(`pipeline_decisions_${activeJobId}`, JSON.stringify(decisions));
  }, [decisions, activeJobId]);
  useEffect(() => {
    if (activeJobId) localStorage.setItem(`pipeline_f2f_mode_${activeJobId}`, f2fFormsMode);
  }, [f2fFormsMode, activeJobId]);

  /* ── countdown ── */
  useEffect(() => {
    if (!f2fDate || currentTab !== "f2f") return;
    const tick = () => {
      const diff = new Date(f2fDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Interview time reached"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff / 3600000) % 24);
      const m = Math.floor((diff / 60000) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m left` : `${h}h ${m}m ${s}s left`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [f2fDate, currentTab]);

  /* ── fetch replies ── */
  const fetchReplies = useCallback(async (silent = false) => {
    if (!silent) setLoadingBell(true);
    try {
      const res = await API.get("/email-replies");
      if (res.data?.replies) setReplies(res.data.replies);
    } catch { /* silent */ }
    finally { if (!silent) setLoadingBell(false); }
  }, []);

  /* ── poll attendance ── */
  useEffect(() => {
    if (currentTab !== "f2f") return;
    const poll = async () => {
      try {
        const attRes = await API.get("/attendance");
        if (attRes.data?.attendance) {
          const attMap = attRes.data.attendance;
          setCandidates((prev) =>
            prev.map((c) => {
              if (c.stage !== "f2f") return c;
              const key = (c.email || "").toLowerCase().trim();
              const remote = attMap[key];
              if (!remote) return c;

              // Don't overwrite if manual override was set
              if (c.manually_set) return c;

              const mapped =
                remote.status === "Confirmed" ? "confirmed" :
                  remote.status === "Declined" ? "declined" :
                    remote.status === "Issue" ? "issue" : "pending";

              return {
                ...c,
                attendance: mapped,
                repliedAt: remote.replied_at || c.repliedAt,
                replyBody: remote.reply_body || c.replyBody,
              };
            })
          );
        }
        await fetchReplies(true);
      } catch { /* silent */ }
    };
    poll();
    const id = setInterval(poll, 10000);
    return () => clearInterval(id);
  }, [currentTab, fetchReplies]);

  /* ── close bell on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Handlers ── */
  const handleOpenForm = (c, round) => { setSelectedCandidate(c); setShowFormForRound(round); };
  const handleSaveForm = (formData) => {
    setCandidates(prev => prev.map(c =>
      c.email === selectedCandidate.email ? { ...c, [`${showFormForRound}_form`]: formData } : c
    ));
    toast.success("Form saved!");
    setShowFormForRound(null); setSelectedCandidate(null);
  };
  const setDecision = (email, val) => setDecisions(prev => ({ ...prev, [email]: val }));

  const handleOverrideAttendance = (email, status) => {
    setCandidates(prev => prev.map(c =>
      (c.email || "").toLowerCase().trim() === email.toLowerCase().trim()
        ? { ...c, attendance: status, manually_set: true }
        : c
    ));
    toast.success(`Attendance updated to ${status}`);
  };

  const handleScheduleF2F = async () => {
    const list = candidates.filter(c => c.stage === "f2f_schedule");
    if (!list.length) return toast.error("No candidates to schedule");
    if (!f2fDate)     return toast.error("Select a date and time");
    if (new Date(f2fDate) < new Date()) return toast.error("Select a future date and time");
    setSending(true);
    try {
      await API.post("/schedule", { date: f2fDate, candidates: list.map(c => ({ name: c.name, email: c.email, jobRole: activeJobName })) });
      toast.success("F2F Interview mails sent! Switching to Attendance Poll…");
      setCandidates(prev => prev.map(c => c.stage === "f2f_schedule" ? { 
        ...c, 
        stage: "f2f", 
        attendance: "pending",
        repliedAt: null,
        replyBody: null,
        manually_set: false
      } : c));

      // ✅ Reset forms mode to show the attendance poll page
      setF2fFormsMode(false);
      localStorage.setItem(`pipeline_f2f_mode_${activeJobId}`, "false");

      // ✅ Auto-switch to the Face to Face attendance poll page
      setCurrentTab("f2f");
    } catch { toast.error("Failed to send mails"); }
    finally { setSending(false); }
  };

  const handleSendOffers = async () => {
    // Only candidates in negotiation stage AND marked as 'selected'
    const list = candidates.filter(c => {
      if (c.stage !== "negotiation") return false;
      const k = c.email || c.phone || c.name;
      return decisions[k] === "selected";
    });

    const rejectedList = candidates.filter(c => {
      if (c.stage !== "negotiation") return false;
      const k = c.email || c.phone || c.name;
      return decisions[k] === "rejected";
    });

    if (!list.length && !rejectedList.length) {
      return toast.error("Please mark candidate(s) as 'Selected' or 'Rejected' before processing final decisions.");
    }
    
    for (const c of list) {
      const f = c.negotiation_form;
      if (!f?.selectedAs || !f?.ctcPerAnnum || !f?.expectedDateOfJoining) return toast.error(`Fill Final Form for ${c.name}`);
    }
    setSending(true);
    try {
      if (list.length > 0) {
        await API.post("/offer-letter", { 
          candidates: list.map(c => {
            const forms = {};
            Object.keys(c).forEach(key => {
              if (key.endsWith("_form") && c[key]) {
                forms[key] = c[key];
              }
            });
            forms.google_form = {
              degree: c.degree || "",
              specialization: c.specialization || "",
              college: c.college || "",
              experience: c.experience || "",
              location: c.location || "",
              joining: c.joining || "",
              gender: c.gender || "",
              dob: c.dob || "",
              ats_score: c.ats_score || c.score || 0,
              filename: c.filename || ""
            };

            return { 
              name: c.name, 
              email: c.email, 
              jobRole: c.negotiation_form.selectedAs, 
              salary: c.negotiation_form.ctcPerAnnum, 
              joiningDate: c.negotiation_form.expectedDateOfJoining, 
              roleType: "Full-Time", 
              months: "", 
              status: "selected",
              formData: JSON.stringify(forms)
            };
          }) 
        });
        toast.success("Offer letters sent!");
        const hl = JSON.parse(localStorage.getItem("hiredHistory") || "[]");
        list.forEach(c => hl.push({ ...c, hiredAt: new Date().toISOString() }));
        localStorage.setItem("hiredHistory", JSON.stringify(hl));
      }

      if (rejectedList.length > 0) {
        const rl = JSON.parse(localStorage.getItem(`rejectedCandidates_${activeJobId}`) || "[]");
        rejectedList.forEach(c => rl.push({ ...c, stage: "rejected", rejectedAtStage: c.stage }));
        localStorage.setItem(`rejectedCandidates_${activeJobId}`, JSON.stringify(rl));

        await API.post("/send-rejection", {
          candidates: rejectedList.map(c => {
            const forms = {};
            Object.keys(c).forEach(key => {
              if (key.endsWith("_form") && c[key]) {
                forms[key] = c[key];
              }
            });
            forms.google_form = {
              degree: c.degree || "",
              specialization: c.specialization || "",
              college: c.college || "",
              experience: c.experience || "",
              location: c.location || "",
              joining: c.joining || "",
              gender: c.gender || "",
              dob: c.dob || "",
              ats_score: c.ats_score || c.score || 0,
              filename: c.filename || ""
            };

            const stageObj = STAGES.find(s => s.id === c.stage);
            const rejectedRound = stageObj ? stageObj.title : c.stage;
            return {
              name: c.name,
              email: c.email,
              jobRole: activeJobName,
              rejected_round: rejectedRound,
              form_data: JSON.stringify(forms)
            };
          })
        });
        toast.success(`Rejection email(s) sent to ${rejectedList.length} candidate(s)!`);
      }
      
      // Filter out both selected and rejected candidates from the pipeline
      const processedKeys = [...list, ...rejectedList].map(c => c.email || c.phone || c.name);
      const newCandidates = candidates.filter(c => {
        const k = c.email || c.phone || c.name;
        return !processedKeys.includes(k);
      });
      setCandidates(newCandidates);
      
      // Force save pipeline to localStorage before navigating (React batches state updates and unmounts immediately)
      localStorage.setItem(`pipeline_${activeJobId}`, JSON.stringify({ candidates: newCandidates, f2fDate }));
      
      // Also remove them from the original 'selectedCandidates' list so they never respawn at stage 1
      const sel = JSON.parse(localStorage.getItem(`selectedCandidates_${activeJobId}`) || "[]");
      const newSel = sel.filter(c => !processedKeys.includes(c.email || c.phone || c.name));
      localStorage.setItem(`selectedCandidates_${activeJobId}`, JSON.stringify(newSel));

      // Clean decisions
      const newDec = { ...decisions };
      processedKeys.forEach(e => delete newDec[e]);
      setDecisions(newDec);
      
      navigate("/history");
    } catch (err) { 
      toast.error(err.response?.data?.detail || err.message || "Failed to process final decisions"); 
      console.error("Offer Error:", err);
    }
    finally { setSending(false); }
  };

  /* ── Derived ── */
  const currentIdx      = STAGES.findIndex(s => s.id === currentTab);
  const currentStage    = STAGES[currentIdx];
  const nextStageObj    = STAGES[currentIdx + 1] || null;
  const stageCandidates = useMemo(() => candidates.filter(c => c.stage === currentTab), [candidates, currentTab]);

  const selectedCount = stageCandidates.filter((c) => { const k = c.email || c.phone || c.name; return decisions[k] === "selected"; }).length;
  const rejectedCount = stageCandidates.filter((c) => { const k = c.email || c.phone || c.name; return decisions[k] === "rejected"; }).length;
  const pendingCount  = stageCandidates.filter((c) => { const k = c.email || c.phone || c.name; return !decisions[k] || decisions[k] === "pending"; }).length;
  const allDecided    = stageCandidates.length > 0 && pendingCount === 0;

  const confirmedCount = stageCandidates.filter(c => c.attendance === "confirmed").length;
  const declinedCount  = stageCandidates.filter(c => c.attendance === "declined").length;
  const issueCount     = stageCandidates.filter(c => c.attendance === "issue").length;
  const f2fPendingCount = stageCandidates.filter(c => !c.attendance || c.attendance === "pending").length;
  const issueReplies   = replies.filter(r => r.reply_type === "issue");
  const notifCount     = replies.filter(r => r.reply_type !== "confirmed").length;

  /* ── Move to next round ── */
  const handleMoveToNextRound = () => {
    if (!nextStageObj || !allDecided) return;
    const nextId = nextStageObj.id;

    const selectedCandidates = stageCandidates.filter(c => {
      const k = c.email || c.phone || c.name;
      return decisions[k] === "selected";
    });

    const rejectedCandidates = stageCandidates.filter(c => {
      const k = c.email || c.phone || c.name;
      return decisions[k] === "rejected";
    });

    const selectedKeys = selectedCandidates.map(c => c.email || c.phone || c.name);
    const rejectedKeys = rejectedCandidates.map(c => c.email || c.phone || c.name);

    if (rejectedCandidates.length > 0) {
      const rl = JSON.parse(localStorage.getItem(`rejectedCandidates_${activeJobId}`) || "[]");
      rejectedCandidates.forEach(c => rl.push({ ...c, stage: "rejected", rejectedAtStage: c.stage }));
      localStorage.setItem(`rejectedCandidates_${activeJobId}`, JSON.stringify(rl));

      // Also remove them from the original 'selectedCandidates' list so they never respawn at stage 1
      const sel = JSON.parse(localStorage.getItem(`selectedCandidates_${activeJobId}`) || "[]");
      const newSel = sel.filter(c => !rejectedKeys.includes(c.email || c.phone || c.name));
      localStorage.setItem(`selectedCandidates_${activeJobId}`, JSON.stringify(newSel));

      API.post("/send-rejection", {
        candidates: rejectedCandidates.map(c => {
          const forms = {};
          Object.keys(c).forEach(key => {
            if (key.endsWith("_form") && c[key]) {
              forms[key] = c[key];
            }
          });
          const stageObj = STAGES.find(s => s.id === c.stage);
          const rejectedRound = stageObj ? stageObj.title : c.stage;
          return {
            name: c.name,
            email: c.email,
            jobRole: activeJobName,
            rejected_round: rejectedRound,
            form_data: JSON.stringify(forms)
          };
        })
      })
      .then(() => toast.success(`Rejection email(s) sent to ${rejectedCandidates.length} candidate(s)!`))
      .catch(() => toast.error("Failed to send rejection emails"));
    }

    setCandidates(prev => prev
      .filter(c => {
        const k = c.email || c.phone || c.name;
        return !rejectedKeys.includes(k);
      })
      .map(c => {
        const k = c.email || c.phone || c.name;
        return selectedKeys.includes(k) ? { ...c, stage: nextId } : c;
      })
    );

    const newDec = { ...decisions };
    [...selectedKeys, ...rejectedKeys].forEach(e => delete newDec[e]);
    setDecisions(newDec);
    setCurrentTab(nextId);
    toast.success(`${selectedCount} candidate(s) moved to ${nextStageObj.title}!`);
  };

  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="fp-root" style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: "22px", animation: "fpFadeUp 0.3s ease" }}>

      {/* ─── Header ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>
            🚀 Hiring Pipeline
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "13px" }}>
            <span style={{ fontWeight: "700", color: currentStage.color }}>{activeJobName || "Active Role"}</span>
            &nbsp;— sequential round-by-round evaluation
          </p>
        </div>

        {/* Bell notification for f2f stage */}
        {currentTab === "f2f" && (
          <div style={{ position: "relative" }} ref={bellRef}>
            <button
              style={{
                ...styles.bellBtn,
                boxShadow: notifCount > 0
                  ? "0 0 0 2px rgba(232,85,85,0.5), 0 0 12px rgba(232,85,85,0.3)"
                  : "none",
              }}
              title="Candidate replies & issues"
              onClick={() => {
                const opening = !bellOpen;
                setBellOpen(opening);
                if (opening) fetchReplies();
              }}
            >
              🔔
              {notifCount > 0 && (
                <span style={styles.unreadDot}>{notifCount}</span>
              )}
            </button>

            {bellOpen && (
              <div style={styles.issuePanel}>
                {/* Panel header */}
                <div style={styles.issuePanelHeader}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>
                    📬 Candidate Replies
                  </span>
                  <button
                    onClick={() => fetchReplies()}
                    style={styles.refreshBtn}
                    disabled={loadingBell}
                  >
                    {loadingBell ? "…" : "🔄 Refresh"}
                  </button>
                </div>

                {/* Issue alert banner */}
                {issueReplies.length > 0 && (
                  <div style={styles.issueBanner}>
                    <span style={{ fontSize: 13 }}>⚠️</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>
                      {issueReplies.length} candidate{issueReplies.length > 1 ? "s have" : " has"} an issue — reply needed
                    </span>
                  </div>
                )}

                {/* Reply list */}
                <div style={{ maxHeight: 440, overflowY: "auto" }}>
                  {loadingBell ? (
                    <p style={{ ...styles.muted, textAlign: "center", padding: "20px" }}>
                      Checking inbox…
                    </p>
                  ) : replies.length === 0 ? (
                    <p style={{ ...styles.muted, textAlign: "center", padding: "24px" }}>
                      No replies yet
                    </p>
                  ) : (
                    [...replies].sort((a, b) =>
                      a.reply_type === "issue" ? -1 : b.reply_type === "issue" ? 1 : 0
                    ).map((r, i) => (
                      <div
                        key={i}
                        style={{
                          ...styles.issueItem,
                          borderLeft: `3px solid ${r.reply_type === "confirmed" ? "#22c97a" :
                              r.reply_type === "issue" ? "#e85555" : "#f5a623"
                            }`,
                          background: r.reply_type === "issue"
                            ? "rgba(232,85,85,0.04)" : "transparent",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
                              {r.from_name || r.from_email}
                            </p>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                              {r.from_email}
                            </p>
                          </div>
                          <span style={{
                            padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                            background:
                              r.reply_type === "confirmed" ? "#22c97a22" :
                                r.reply_type === "issue" ? "#e8555522" : "#f5a62322",
                            color:
                              r.reply_type === "confirmed" ? "#22c97a" :
                                r.reply_type === "issue" ? "#e85555" : "#f5a623",
                          }}>
                            {r.reply_type === "confirmed" ? "✅ Confirmed" :
                              r.reply_type === "issue" ? "⚠️ Issue" : "❓ Unknown"}
                          </span>
                        </div>

                        <p style={{ ...styles.muted, fontSize: 11, fontStyle: "italic", margin: "0 0 5px" }}>
                          {r.subject}
                        </p>

                        <p style={{
                          fontSize: 12, color: "var(--text-primary)",
                          lineHeight: 1.6, margin: "0 0 10px",
                          maxHeight: 100, overflow: "hidden", overflowY: "auto",
                          whiteSpace: "pre-wrap",
                          background: r.reply_type === "issue" ? "rgba(232,85,85,0.06)" : "rgba(255,255,255,0.03)",
                          border: `0.5px solid ${r.reply_type === "issue" ? "rgba(232,85,85,0.2)" : "var(--border-color)"}`,
                          borderRadius: 8, padding: "8px 10px",
                        }}>
                          {r.body || "—"}
                        </p>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                          <span style={{ ...styles.muted, fontSize: 10 }}>{r.replied_at}</span>
                          <button
                            onClick={() => {
                              setBellOpen(false);
                              openGmailCompose({
                                to_email: r.from_email,
                                from_name: r.from_name,
                                subject: r.subject,
                                body_hint:
                                  r.reply_type === "issue"
                                    ? `Dear ${r.from_name || "Candidate"},\n\nThank you for reaching out regarding your concern.\n\nPlease find the details below:\n\n[Your response here]\n\nRegards,\nHR Team\nNikitha Build Tech`
                                    : "",
                              });
                            }}
                            style={{
                              ...styles.gmailBtn,
                              background:
                                r.reply_type === "issue"
                                  ? "rgba(232,85,85,0.85)"
                                  : "rgba(124,92,191,0.85)",
                            }}
                          >
                            <GmailIcon /> Reply via Gmail
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Stage progress track ─── */}
      <div style={{ background: "white", borderRadius: "16px", border: "1px solid #e8ecf1", padding: "16px 20px", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
        <div className="fp-stage-track">
          {STAGES.map((stage, idx) => {
            const isDone    = currentIdx > idx;
            const isActive  = currentTab === stage.id;
            const isFuture  = idx > currentIdx;
            const count     = candidates.filter(c => c.stage === stage.id).length;
            // A pill is navigable if it's the active tab, a completed stage, or has candidates
            const canNav    = !isFuture || count > 0;
            return (
              <React.Fragment key={stage.id}>
                {idx > 0 && <span className="fp-sep">›</span>}
                <div
                  className="fp-stage-pill"
                  title={canNav ? `Switch to ${stage.title}` : "Complete previous stages first"}
                  onClick={() => canNav && setCurrentTab(stage.id)}
                  style={{
                    background: isActive ? currentStage.gradient : "transparent",
                    color: isActive ? "white" : isDone ? "#22c55e" : count > 0 ? stage.color : "#b0bec5",
                    opacity: isFuture && !count ? 0.4 : 1,
                    cursor: canNav ? "pointer" : "default",
                    outline: count > 0 && !isActive ? `1.5px solid ${stage.color}40` : "none",
                    transition: "all 0.18s",
                  }}
                >
                  <span style={{ fontSize: "13px" }}>{isDone && !count ? "✓" : stage.icon}</span>
                  <span>{stage.title}</span>
                  {count > 0 && (
                    <span style={{
                      background: isActive ? "rgba(255,255,255,0.25)" : `${stage.color}20`,
                      color: isActive ? "white" : stage.color,
                      fontSize: "10px", fontWeight: "800", padding: "1px 7px", borderRadius: "9px",
                    }}>{count}</span>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ flex: 1, height: "4px", background: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((currentIdx + 1) / STAGES.length) * 100}%`, background: currentStage.gradient, borderRadius: "4px", transition: "width 0.4s ease" }} />
          </div>
          <span style={{ fontSize: "11px", fontWeight: "700", color: currentStage.color, whiteSpace: "nowrap" }}>
            Step {currentIdx + 1} / {STAGES.length}
          </span>
        </div>
      </div>

      {/* ─── Current Round Panel ─── */}
      <div style={{ background: "white", borderRadius: "16px", border: `1.5px solid ${currentStage.color}18`, boxShadow: `0 2px 18px ${currentStage.color}07`, overflow: "hidden" }}>

        {/* Round header */}
        <div style={{
          padding: "18px 22px",
          background: `linear-gradient(135deg, ${currentStage.color}07, transparent)`,
          borderBottom: `1px solid ${currentStage.color}12`,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "46px", height: "46px", borderRadius: "13px", background: currentStage.gradient, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", boxShadow: `0 4px 14px ${currentStage.color}28` }}>
              {currentStage.icon}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "17px", fontWeight: "800", color: "#0f172a" }}>{currentStage.title} Round</h2>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                {currentStage.subtitle}
                {stageCandidates.length > 0 && (
                  <> &nbsp;·&nbsp;
                    {currentTab === "f2f" ? (
                      <>
                        <span style={{ color: "#22c55e", fontWeight: "700" }}>{confirmedCount} confirmed</span> &nbsp;·&nbsp;
                        <span style={{ color: "#ef4444", fontWeight: "700" }}>{declinedCount} declined</span> &nbsp;·&nbsp;
                        <span style={{ color: "#f59e0b", fontWeight: "700" }}>{issueCount} issue</span> &nbsp;·&nbsp;
                        <span style={{ color: "#64748b", fontWeight: "700" }}>{f2fPendingCount} pending</span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: "#22c55e", fontWeight: "700" }}>{selectedCount} selected</span> &nbsp;·&nbsp;
                        <span style={{ color: "#ef4444", fontWeight: "700" }}>{rejectedCount} rejected</span> &nbsp;·&nbsp;
                        <span style={{ color: "#f59e0b", fontWeight: "700" }}>{pendingCount} pending</span>
                      </>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* F2F controls */}
          {currentTab === "f2f_schedule" && stageCandidates.length > 0 && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="datetime-local" value={f2fDate} onChange={e => setF2fDate(e.target.value)}
                min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                style={{ fontSize: "12px", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: "8px", outline: "none", fontFamily: "inherit" }} />
              <button onClick={handleScheduleF2F} disabled={sending}
                style={{ padding: "8px 16px", fontWeight: "700", fontSize: "12px", border: "none", borderRadius: "9px", background: "linear-gradient(135deg,#f59e0b,#fbbf24)", color: "white", cursor: "pointer", fontFamily: "inherit" }}>
                {sending ? "Sending…" : "📅 Send Invites"}
              </button>
            </div>
          )}
          {currentTab === "negotiation" && stageCandidates.length > 0 && (
            <span style={{ fontSize: "12px", fontWeight: "800", color: "#b91c1c", background: "#fee2e2", padding: "8px 16px", borderRadius: "8px", display: "inline-flex", alignItems: "center" }}>
              🏆 Final Stage — Send offers below
            </span>
          )}

        </div>

        {/* ── TABLE OR ATTENDANCE POLL VIEW ── */}
        {stageCandidates.length === 0 ? (
          <div style={{ padding: "56px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "42px", opacity: 0.15, marginBottom: "12px" }}>{currentStage.icon}</div>
            <p style={{ fontWeight: "700", fontSize: "15px", color: "#475569", margin: "0 0 6px" }}>No candidates in this round</p>
            <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
              {currentIdx === 0 ? "Upload resumes to begin." : "Move candidates from the previous round."}
            </p>
          </div>
        ) : currentTab === "f2f" && !f2fFormsMode ? (
          /* ══════════════════════════════════════════════════════════
             F2F — PHASE 1: ATTENDANCE POLL VIEW
             ════════════════════════════════════════════════════════ */
          <div style={{ padding: "0 24px 24px" }}>

            {/* Countdown Banner */}
            {timeLeft && (
              <div style={{
                background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                border: "1.5px solid #fde68a",
                borderRadius: "14px",
                padding: "18px 24px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 2px 12px rgba(245,158,11,0.08)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "10px",
                    background: "#fef3c7", border: "1.5px solid #fde68a",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px"
                  }}>🔔</div>
                  <div>
                    <div style={{ fontWeight: "800", color: "#78350f", fontSize: "14px", letterSpacing: "-0.01em" }}>Interview Scheduled</div>
                    <div style={{ fontSize: "12px", color: "#92400e", marginTop: "3px", fontWeight: "500" }}>
                      {f2fDate ? fmtDate(f2fDate) : ""}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: "900", color: "#b45309", letterSpacing: "-0.03em" }}>{timeLeft}</div>
                  <div style={{ fontSize: "11px", color: "#b45309", marginTop: "2px", fontWeight: "600", opacity: 0.8 }}>until interview</div>
                </div>
              </div>
            )}
            {/* Table Card */}
            <div style={{ background: "#ffffff", borderRadius: "14px", border: "1.5px solid #e8ecf1", overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.04)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <colgroup>
                  <col style={{ width: "36px" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" }}>#</th>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>Candidate</th>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>Phone</th>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>Gmail</th>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>Attendance</th>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase" }}>Replied At</th>
                    <th style={{ padding: "13px 12px", fontSize: "11px", fontWeight: "700", color: "#94a3b8", textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase" }}>Override</th>
                  </tr>
                </thead>
                <tbody>
                  {stageCandidates.map((c, i) => {
                    const uniqueKey = c.email || c.phone || c.name;

                    let attendBg, attendColor, attendDot, attendText;
                    if (c.attendance === "confirmed") {
                      attendBg = "#dcfce7"; attendColor = "#166534"; attendDot = "#22c55e"; attendText = "Confirmed";
                    } else if (c.attendance === "declined") {
                      attendBg = "#fee2e2"; attendColor = "#991b1b"; attendDot = "#ef4444"; attendText = "Declined";
                    } else if (c.attendance === "issue") {
                      attendBg = "#fffbeb"; attendColor = "#92400e"; attendDot = "#f59e0b"; attendText = "Issue";
                    } else {
                      attendBg = "#fef9c3"; attendColor = "#854d0e"; attendDot = "#eab308"; attendText = "Pending";
                    }

                    return (
                      <React.Fragment key={uniqueKey}>
                        <tr style={{
                          borderBottom: c.attendance === "issue" ? "none" : "1px solid #f1f5f9",
                          transition: "background 0.15s"
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fafbfc"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          {/* # */}
                          <td style={{ padding: "14px 12px", textAlign: "center", color: "#cbd5e1", fontWeight: "700", fontSize: "13px" }}>
                            {i + 1}
                          </td>

                          {/* Candidate: Avatar + Name only */}
                          <td style={{ padding: "14px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <div style={{
                                width: "38px", height: "38px", borderRadius: "10px", flexShrink: 0,
                                background: currentStage.gradient,
                                boxShadow: `0 3px 10px ${currentStage.color}25`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontWeight: "800", fontSize: "15px"
                              }}>
                                {(c.name || "?")[0].toUpperCase()}
                              </div>
                              <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "13.5px", lineHeight: 1.3 }}>{c.name}</div>
                            </div>
                          </td>

                          {/* Phone */}
                          <td style={{ padding: "14px 12px" }}>
                            {c.phone ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12.5px", color: "#e11d48", fontWeight: "600" }}>
                                <span>📞</span>
                                <span>{c.phone}</span>
                              </div>
                            ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                          </td>

                          {/* Gmail */}
                          <td style={{ padding: "14px 12px", fontSize: "12px", color: "#475569" }}>
                            {c.email ? (
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                <span style={{ fontSize: "13px" }}>✉️</span>
                                <span style={{ fontWeight: "500", wordBreak: "break-all" }}>{c.email}</span>
                              </div>
                            ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                          </td>

                          {/* Attendance Badge */}
                          <td style={{ padding: "14px 12px" }}>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: "5px",
                              background: attendBg, color: attendColor,
                              padding: "4px 10px", borderRadius: "20px",
                              fontSize: "11.5px", fontWeight: "700", letterSpacing: "0.01em"
                            }}>
                              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: attendDot, flexShrink: 0 }} />
                              {attendText}
                            </span>
                          </td>

                          {/* Replied At */}
                          <td style={{ padding: "14px 12px", fontSize: "12px", color: "#475569", fontWeight: "500" }}>
                            {c.repliedAt ? (
                              <div>
                                <div style={{ color: "#334155", fontWeight: "600" }}>{new Date(c.repliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                                <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>{new Date(c.repliedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                              </div>
                            ) : (
                              <span style={{ color: "#cbd5e1" }}>—</span>
                            )}
                          </td>

                          {/* Override Dropdown — color-coded */}
                          <td style={{ padding: "14px 12px", textAlign: "center" }}>
                            <select
                              value={c.attendance || "pending"}
                              onChange={(e) => handleOverrideAttendance(c.email, e.target.value)}
                              style={{
                                background: attendBg,
                                color: attendColor,
                                border: `1.5px solid ${attendDot}`,
                                borderRadius: "10px",
                                padding: "6px 10px",
                                fontSize: "12px",
                                fontWeight: "700",
                                outline: "none",
                                cursor: "pointer",
                                width: "120px",
                                fontFamily: "inherit",
                                boxShadow: `0 1px 4px ${attendDot}30`
                              }}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="declined">Declined</option>
                              <option value="issue">Issue</option>
                            </select>
                          </td>
                        </tr>

                        {/* Issue sub-row */}
                        {c.attendance === "issue" && (
                          <tr>
                            <td colSpan={7} style={{ padding: "12px 24px 16px", background: "#fff1f2", borderBottom: "1px solid #fecdd3" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                                <div style={{ display: "flex", gap: "8px", alignItems: "flex-start", color: "#d97706", fontSize: "12.5px", flex: 1 }}>
                                  <span style={{ fontSize: "14px", marginTop: "1px" }}>⚠️</span>
                                  <div>
                                    <strong style={{ color: "#92400e" }}>Issue reported:</strong>{" "}
                                    <span style={{ color: "#78350f", fontStyle: "italic" }}>
                                      "{c.replyBody || "Stated an issue via mail (no text captured)."}"
                                    </span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => openGmailCompose({
                                    to_email: c.email,
                                    from_name: c.name,
                                    subject: `Regarding your interview for ${c.jobRole || activeJobName || "Interview"}`,
                                    body_hint: `Dear ${c.name},\n\nRegarding the issue you mentioned: "${c.replyBody || ""}"\n\n[Your response here]\n\nRegards,\nHR Team`
                                  })}
                                  style={{
                                    background: "#d97706", color: "#fff",
                                    border: "none", borderRadius: "8px",
                                    padding: "7px 14px", fontSize: "12px",
                                    fontWeight: "700", cursor: "pointer",
                                    display: "inline-flex", alignItems: "center", gap: "6px",
                                    whiteSpace: "nowrap", flexShrink: 0
                                  }}
                                >
                                  📬 Reply
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { count: confirmedCount, dot: "#22c55e", bg: "#f0fdf4", tc: "#166534", label: "Confirmed" },
                  { count: declinedCount,  dot: "#ef4444", bg: "#fef2f2", tc: "#991b1b", label: "Declined"  },
                  { count: issueCount,     dot: "#f59e0b", bg: "#fffbeb", tc: "#92400e", label: "Issue"     },
                  { count: f2fPendingCount, dot: "#94a3b8", bg: "#f1f5f9", tc: "#475569", label: "Pending"  },
                ].map(p => (
                  <span key={p.label} style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    background: p.bg, color: p.tc,
                    padding: "6px 14px", borderRadius: "20px",
                    fontSize: "12px", fontWeight: "700",
                    border: `1px solid ${p.dot}22`
                  }}>
                    <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: p.dot }} />
                    {p.count} {p.label}
                  </span>
                ))}
              </div>

              {currentTab === "f2f" && !f2fFormsMode && stageCandidates.length > 0 && (
                <button
                  onClick={() => {
                    setTimeLeft("");
                    setF2fFormsMode(true);
                    toast.success("Timer stopped — evaluate candidates");
                  }}
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontWeight: "800",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 3px 10px rgba(124, 58, 237, 0.25)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 5px 15px rgba(124, 58, 237, 0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 3px 10px rgba(124, 58, 237, 0.25)"; }}
                >
                  🔴 Move to F2F Interview  ({confirmedCount} confirmed)
                </button>
              )}
            </div>
          </div>

        ) : (
          /* ══════════════════════════════════════════════════════════
             STANDARD TABLE — used for Telephonic, Tech, Schedule,
             Negotiation rounds AND F2F Phase 2 (after Stop Timer)
             ══════════════════════════════════════════════════════════ */
          <div style={{ overflowX: "visible", overflowY: "visible" }}>
            <table className="fp-table" style={{ width: "100%" }}>
              <colgroup>
                <col style={{ width: "5%" }} />
                <col style={{ width: "35%" }} />
                <col style={{ width: "20%" }} />
                {currentTab !== "f2f_schedule" && <col style={{ width: "20%" }} />}
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>#</th>
                  <th>Candidate</th>
                  <th>Phone</th>
                  {currentTab !== "f2f_schedule" && <th>Evaluation</th>}
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stageCandidates.map((c, i) => {
                  const uniqueKey = c.email || c.phone || c.name;
                  const dec     = decisions[uniqueKey] || "pending";
                  const hasForm = currentTab === "f2f" ? (!!c.f2f_form && Object.keys(c.f2f_form).length > 0) : !!c[`${currentTab}_form`];
                  const rowCls  = dec === "selected" ? "row-sel" : dec === "rejected" ? "row-rej" : "";
                  const formRound = currentTab === "f2f" ? "f2f" : currentTab;

                  return (
                    <tr key={uniqueKey} className={rowCls} style={{ animationDelay: `${i * 0.05}s` }}>
                      {/* # */}
                      <td style={{ textAlign: "center", color: "#cbd5e1", fontWeight: "800", fontSize: "12px" }}>
                        {i + 1}
                      </td>

                      {/* Candidate */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="fp-av" style={{ background: currentStage.gradient, boxShadow: `0 3px 10px ${currentStage.color}20`, flexShrink: 0 }}>
                            {(c.name || "?")[0].toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, textAlign: "left" }}>
                            <div style={{ fontWeight: "800", color: "#0f172a", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                            {c.email && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.email}</div>}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155", minWidth: 0 }}>
                          <span style={{ color: "#e11d48", fontSize: "14px", flexShrink: 0 }}>📞</span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{c.phone || "—"}</span>
                        </div>
                      </td>

                      {/* Evaluation */}
                      {currentTab !== "f2f_schedule" && (
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "nowrap" }}>
                            <span className="fp-eval-badge" style={{
                              background: hasForm ? "#dcfce7" : "#fef3c7",
                              color: hasForm ? "#166534" : "#92400e",
                              flexShrink: 0,
                            }}>
                              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: hasForm ? "#22c55e" : "#f59e0b" }} />
                              {hasForm ? "Done" : "Pending"}
                            </span>
                            <button className="fp-fill-btn" onClick={() => handleOpenForm(c, formRound)} style={{ flexShrink: 0 }}>
                              📝 {hasForm ? "Edit" : "Fill"}
                            </button>
                          </div>
                        </td>
                      )}

                      {/* Status dropdown */}
                      <td style={{ textAlign: "center", overflow: "visible" }}>
                        <DecisionDropdown
                          value={dec}
                          onChange={(val) => setDecision(uniqueKey, val)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Bottom bar ── */}
        {!(currentTab === "f2f" && !f2fFormsMode) && (
          <div className="fp-bottom">
            {/* Summary chips */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { count: selectedCount, dot: "#22c55e", bg: "#f0fdf4", tc: "#166534", label: "Selected" },
                { count: rejectedCount, dot: "#ef4444", bg: "#fef2f2", tc: "#991b1b", label: "Rejected" },
                { count: pendingCount,  dot: "#f59e0b", bg: "#fffbeb", tc: "#92400e", label: "Pending"  },
              ].map(p => (
                <span key={p.label} className="fp-stat-chip" style={{ background: p.bg, color: p.tc }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: p.dot }} />
                  {p.count} {p.label}
                </span>
              ))}
            </div>

            {/* Move / warning / final */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {!allDecided && stageCandidates.length > 0 && (
                <span style={{ fontSize: "12px", color: "#f59e0b", fontWeight: "600", display: "flex", alignItems: "center", gap: "5px" }}>
                  ⚠ {pendingCount} candidate{pendingCount !== 1 ? "s" : ""} still pending
                </span>
              )}

              {nextStageObj && (
                <button
                  className="fp-move-btn"
                  onClick={handleMoveToNextRound}
                  disabled={!allDecided || stageCandidates.length === 0}
                  style={{
                    background: allDecided && stageCandidates.length > 0 ? nextStageObj.gradient : "#e2e8f0",
                    color: allDecided && stageCandidates.length > 0 ? "white" : "#94a3b8",
                    boxShadow: allDecided && stageCandidates.length > 0 ? `0 4px 18px ${nextStageObj.color}35` : "none",
                  }}
                >
                  Move {selectedCount} to {nextStageObj.title} →
                </button>
              )}

              {!nextStageObj && currentTab === "negotiation" && stageCandidates.length > 0 && (
                <button
                  onClick={handleSendOffers}
                  disabled={sending}
                  style={{
                    padding: "10px 20px",
                    fontWeight: "800",
                    fontSize: "13px",
                    border: "none",
                    borderRadius: "9px",
                    background: "linear-gradient(135deg,#ef4444,#f87171)",
                    color: "white",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.25)",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(239, 68, 68, 0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(239, 68, 68, 0.25)"; }}
                >
                  {sending ? "Processing…" : "📄 Send Offer Letters"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      {showFormForRound && (
        <EvaluationForms
          candidate={selectedCandidate}
          round={showFormForRound}
          onSave={handleSaveForm}
          onClose={() => { setShowFormForRound(null); setSelectedCandidate(null); }}
        />
      )}
    </div>
  );
}
