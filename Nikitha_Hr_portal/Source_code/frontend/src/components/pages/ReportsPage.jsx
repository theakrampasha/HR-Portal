import React, { useEffect, useState, useRef, useCallback } from "react";
import "../../styles.css";
import { motion, AnimatePresence } from "framer-motion";
import API from "../../services/api";
import html2pdf from "html2pdf.js";
import toast from "react-hot-toast";

// ==========================================
// CUSTOM SVG DONUT CHART
// ==========================================
const SVGDonutChart = ({ value, total, label, color = "#10b981", secondaryColor = "#ef4444" }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      position: "relative"
    }}>
      <div style={{ position: "relative", width: "150px", height: "150px" }}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
          {/* Background circle (e.g. Rejected) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={secondaryColor}
            strokeWidth="9"
            className="donut-segment-hoverable"
          >
            <title>{`Rejected: ${total - value} (${total > 0 ? ((total - value) / total * 100).toFixed(0) : 0}%)`}</title>
          </circle>
          {/* Foreground circle (e.g. Shortlisted) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth="9"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="donut-segment-hoverable"
            style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
          >
            <title>{`Shortlisted: ${value} (${total > 0 ? (value / total * 100).toFixed(0) : 0}%)`}</title>
          </circle>
        </svg>
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1.2
        }}>
          <span style={{ fontSize: "22px", fontWeight: "900", color: "#0f172a" }}>
            {percentage.toFixed(0)}%
          </span>
          <span style={{ fontSize: "9px", fontWeight: "800", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>
            {label} ({value})
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// CUSTOM SVG VERTICAL BAR CHART
// ==========================================
const ResumesBarChart = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 5);
  const chartHeight = 150;
  const chartWidth = 320;
  const paddingBottom = 25;
  const paddingLeft = 30;

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`} style={{ width: "100%", height: "100%" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const y = chartHeight * (1 - ratio);
        return (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8}
              y={y + 4}
              fontSize="9"
              fontWeight="700"
              fill="#94a3b8"
              textAnchor="end"
            >
              {Math.round(maxCount * ratio)}
            </text>
          </g>
        );
      })}

      {/* Axis lines */}
      <line
        x1={paddingLeft}
        y1={chartHeight}
        x2={chartWidth}
        y2={chartHeight}
        stroke="#e2e8f0"
        strokeWidth="2"
      />
      <line
        x1={paddingLeft}
        y1={0}
        x2={paddingLeft}
        y2={chartHeight}
        stroke="#e2e8f0"
        strokeWidth="2"
      />

      {/* Bars */}
      {data.map((item, idx) => {
        const barWidth = 24;
        const spacing = (chartWidth - paddingLeft - 20) / Math.max(data.length, 1);
        const x = paddingLeft + 10 + idx * spacing;
        const height = maxCount > 0 ? (item.count / maxCount) * chartHeight : 0;
        const y = chartHeight - height;

        return (
          <g key={idx}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(height, 2)}
              rx="4"
              fill="url(#blueGradient)"
              className="chart-hoverable"
            >
              <title>{`${item.label}: ${item.count} Resumes`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={chartHeight + 16}
              fontSize="9.5"
              fontWeight="800"
              fill="#64748b"
              textAnchor="middle"
            >
              {item.label}
            </text>
            {item.count > 0 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fontSize="10"
                fontWeight="900"
                fill="#3b82f6"
                textAnchor="middle"
              >
                {item.count}
              </text>
            )}
          </g>
        );
      })}

      {/* Gradients */}
      <defs>
        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// ==========================================
// CUSTOM SVG GROUPED BAR CHART
// ==========================================
const GroupedBarChart = ({ data }) => {
  const maxVal = Math.max(...data.flatMap(d => [d.total, d.shortlisted, d.rejected]), 5);
  const chartHeight = 150;
  const chartWidth = 320;
  const paddingBottom = 25;
  const paddingLeft = 30;

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`} style={{ width: "100%", height: "100%" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const y = chartHeight * (1 - ratio);
        return (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8}
              y={y + 4}
              fontSize="9"
              fontWeight="700"
              fill="#94a3b8"
              textAnchor="end"
            >
              {Math.round(maxVal * ratio)}
            </text>
          </g>
        );
      })}

      {/* Axis lines */}
      <line
        x1={paddingLeft}
        y1={chartHeight}
        x2={chartWidth}
        y2={chartHeight}
        stroke="#e2e8f0"
        strokeWidth="2"
      />

      {/* Grouped Bars */}
      {data.map((item, idx) => {
        const groupSpacing = (chartWidth - paddingLeft) / Math.max(data.length, 1);
        const groupX = paddingLeft + idx * groupSpacing;
        const barWidth = 8;
        const spacingBetweenBars = 3;

        const totalH = maxVal > 0 ? (item.total / maxVal) * chartHeight : 0;
        const shortH = maxVal > 0 ? (item.shortlisted / maxVal) * chartHeight : 0;
        const rejectH = maxVal > 0 ? (item.rejected / maxVal) * chartHeight : 0;

        return (
          <g key={idx}>
            {/* Total bar */}
            <rect
              x={groupX + 8}
              y={chartHeight - totalH}
              width={barWidth}
              height={Math.max(totalH, 1)}
              rx="2"
              fill="#3b82f6"
              className="chart-hoverable"
            >
              <title>{`Total candidates: ${item.total}`}</title>
            </rect>
            {/* Shortlisted bar */}
            <rect
              x={groupX + 8 + barWidth + spacingBetweenBars}
              y={chartHeight - shortH}
              width={barWidth}
              height={Math.max(shortH, 1)}
              rx="2"
              fill="#10b981"
              className="chart-hoverable"
            >
              <title>{`Shortlisted: ${item.shortlisted}`}</title>
            </rect>
            {/* Rejected bar */}
            <rect
              x={groupX + 8 + 2 * (barWidth + spacingBetweenBars)}
              y={chartHeight - rejectH}
              width={barWidth}
              height={Math.max(rejectH, 1)}
              rx="2"
              fill="#ef4444"
              className="chart-hoverable"
            >
              <title>{`Rejected: ${item.rejected}`}</title>
            </rect>

            <text
              x={groupX + 8 + (3 * barWidth + 2 * spacingBetweenBars) / 2}
              y={chartHeight + 16}
              fontSize="10"
              fontWeight="800"
              fill="#64748b"
              textAnchor="middle"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ==========================================
// CUSTOM SVG LINE TREND CHART
// ==========================================
const SourcingTrendChart = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.count), 5);
  const chartHeight = 150;
  const chartWidth = 320;
  const paddingBottom = 25;
  const paddingLeft = 30;

  // Calculate coordinates
  const points = data.map((item, idx) => {
    const spacing = (chartWidth - paddingLeft - 20) / Math.max(data.length - 1, 1);
    const x = paddingLeft + 10 + idx * spacing;
    const y = maxVal > 0 ? chartHeight - (item.count / maxVal) * chartHeight : chartHeight;
    return { x, y, label: item.label, count: item.count };
  });

  const pathD = points.length > 0 
    ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ")
    : "";

  return (
    <svg viewBox={`0 0 ${chartWidth} ${chartHeight + paddingBottom}`} style={{ width: "100%", height: "100%" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
        const y = chartHeight * (1 - ratio);
        return (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={y}
              x2={chartWidth}
              y2={y}
              stroke="#f1f5f9"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={paddingLeft - 8}
              y={y + 4}
              fontSize="9"
              fontWeight="700"
              fill="#94a3b8"
              textAnchor="end"
            >
              {Math.round(maxVal * ratio)}
            </text>
          </g>
        );
      })}

      {/* Axis lines */}
      <line
        x1={paddingLeft}
        y1={chartHeight}
        x2={chartWidth}
        y2={chartHeight}
        stroke="#e2e8f0"
        strokeWidth="2"
      />

      {/* Path Line */}
      {pathD && (
        <path
          d={pathD}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* Points */}
      {points.map((p, idx) => (
        <g key={idx}>
          <circle
            cx={p.x}
            cy={p.y}
            r="5"
            fill="#ffffff"
            stroke="#3b82f6"
            strokeWidth="3.5"
            className="chart-hoverable"
          >
            <title>{`${p.label}: ${p.count} Resumes`}</title>
          </circle>
          <text
            x={p.x}
            y={chartHeight + 16}
            fontSize="9.5"
            fontWeight="800"
            fill="#64748b"
            textAnchor="middle"
          >
            {p.label}
          </text>
          {p.count > 0 && (
            <text
              x={p.x}
              y={p.y - 10}
              fontSize="10"
              fontWeight="900"
              fill="#1e293b"
              textAnchor="middle"
            >
              {p.count}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ReportsPage() {
  const [candidates, setCandidates] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters State
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [rolesList, setRolesList] = useState(["All Roles"]);
  const [selectedKpiFilter, setSelectedKpiFilter] = useState("Total Uploads");



  const printRef = useRef(null);
  const tableRef = useRef(null);

  const handleKpiClick = (label) => {
    setSelectedKpiFilter(label);
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Fetch both active (in-memory) and historical (db) candidate records
  const loadData = useCallback(async (start, end) => {
    try {
      setLoading(true);
      setError("");

      const [candidatesRes, activeRes, reportsRes] = await Promise.all([
        API.get(`/reports/candidates?start_date=${start}&end_date=${end}`),
        API.get("/candidates"),
        API.get(`/reports?start_date=${start}&end_date=${end}`)
      ]);

      const dbList = candidatesRes.data.candidates || [];
      const activeList = activeRes.data || [];
      const rawReports = reportsRes.data.reports || [];
      setReportsData(rawReports);

      // Merge candidates by email
      const merged = new Map();

      dbList.forEach(c => {
        merged.set(c.email.toLowerCase().trim(), {
          name: c.name,
          email: c.email,
          job_role: c.job_role || "Full Stack Developer",
          score: c.score || c.ats_score || 0,
          status: c.status,
          created_at: c.created_at || new Date().toISOString()
        });
      });

      // 1. Fallback: merge backend active list
      activeList.forEach(c => {
        const emailKey = c.email.toLowerCase().trim();
        let status = c.status || "pending";
        if (status === "ai-selected") status = "shortlisted";

        const score = c.ats_score || c.score || 0;

        if (!merged.has(emailKey) || (merged.get(emailKey).status !== "selected" && merged.get(emailKey).status !== "rejected")) {
          merged.set(emailKey, {
            name: c.name,
            email: c.email,
            job_role: c.job_role || "Full Stack Developer",
            score: score,
            status: status,
            created_at: c.created_at || new Date().toISOString()
          });
        }
      });

      // 2. Primary: merge active candidates from localStorage to guarantee correct roles and statuses
      try {
        const savedJobs = JSON.parse(localStorage.getItem("jobs") || "[]");
        savedJobs.forEach(job => {
          const parsed = JSON.parse(localStorage.getItem(`candidates_${job.id}`) || "[]");
          const pipelineData = JSON.parse(localStorage.getItem(`pipeline_${job.id}`) || "{}");
          const pipelineCandidates = pipelineData.candidates || [];

          // Map by email to merge active state for this specific job
          const jobCandidatesMap = new Map();

          parsed.forEach(c => {
            const emailKey = (c.email || "").toLowerCase().trim();
            if (emailKey) {
              jobCandidatesMap.set(emailKey, {
                name: c.name,
                email: c.email,
                job_role: job.name,
                score: c.score || c.ats_score || 0,
                status: "pending",
                created_at: c.created_at || new Date().toISOString()
              });
            }
          });

          pipelineCandidates.forEach(c => {
            const emailKey = (c.email || "").toLowerCase().trim();
            if (emailKey) {
              let status = "shortlisted";
              if (c.stage === "selected") status = "selected";
              else if (c.stage === "rejected") status = "rejected";
              
              jobCandidatesMap.set(emailKey, {
                name: c.name,
                email: c.email,
                job_role: job.name,
                score: c.score || c.ats_score || 0,
                status: status,
                created_at: c.created_at || new Date().toISOString()
              });
            }
          });

          // Overlay into merged Map
          jobCandidatesMap.forEach((c, emailKey) => {
            if (!merged.has(emailKey) || (merged.get(emailKey).status !== "selected" && merged.get(emailKey).status !== "rejected")) {
              merged.set(emailKey, c);
            }
          });
        });
      } catch (err_ls) {
        console.error("Error reading localStorage candidates in reports:", err_ls);
      }

      const list = Array.from(merged.values());
      setCandidates(list);

      // Extract unique roles list
      const roles = new Set(["All Roles"]);
      list.forEach(c => {
        if (c.job_role) roles.add(c.job_role);
      });
      setRolesList(Array.from(roles));

    } catch (err) {
      console.error("Failed to load reports:", err);
      setError("Failed to fetch recruitment analytical metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Update date ranges when filter changes
  useEffect(() => {
    const now = new Date();
    let start = "";
    let end = now.toISOString().split("T")[0];

    if (dateFilter === "Last 7 Days") {
      const d = new Date();
      d.setDate(now.getDate() - 7);
      start = d.toISOString().split("T")[0];
    } else if (dateFilter === "Last 30 Days") {
      const d = new Date();
      d.setDate(now.getDate() - 30);
      start = d.toISOString().split("T")[0];
    } else if (dateFilter === "This Month") {
      start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    } else if (dateFilter === "Last Month") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      start = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
    }

    if (dateFilter !== "Custom Range") {
      setStartDate(start);
      setEndDate(end);
      loadData(start, end);
    }
  }, [dateFilter, loadData]);

  // Apply filters on candidates
  const filteredCandidates = candidates.filter(c => {
    // 1. Role Filter
    if (selectedRole !== "All Roles" && c.job_role !== selectedRole) {
      return false;
    }
    // 2. Custom Date Filter
    if (startDate && endDate) {
      const cDate = c.created_at.split("T")[0];
      if (cDate < startDate || cDate > endDate) {
        return false;
      }
    }
    return true;
  });

  // Calculate funnel metrics dynamically
  const totalUploads = filteredCandidates.length;
  const shortlistedCount = filteredCandidates.filter(c => c.status === "shortlisted").length;
  const selectedCount = filteredCandidates.filter(c => c.status === "selected" || c.status === "hired").length;
  const rejectedCount = filteredCandidates.filter(c => c.status === "rejected").length;
  const pendingCount = filteredCandidates.filter(c => c.status === "pending").length;

  // Google Form Sent vs Filled stats
  let formSent = 0;
  let formFilled = 0;
  if (selectedRole === "All Roles") {
    reportsData.forEach(r => {
      formSent += r.google_form_sent || 0;
      formFilled += r.google_form_filled || 0;
    });
  } else {
    const rData = reportsData.find(r => r.job_role.toLowerCase().trim() === selectedRole.toLowerCase().trim());
    if (rData) {
      formSent = rData.google_form_sent || 0;
      formFilled = rData.google_form_filled || 0;
    } else {
      // Fallback calculation from filtered candidates
      formSent = filteredCandidates.filter(c => c.status !== "pending").length;
      formFilled = filteredCandidates.filter(c => c.status === "shortlisted" || c.status === "selected" || c.status === "rejected").length;
    }
  }

  // Ensure logical validation: forms completed/filled should not exceed forms sent
  if (formFilled > formSent) {
    formSent = formFilled;
  }

  // Ensure consistent ratios
  const shortlistRatio = totalUploads > 0 ? Math.round(((shortlistedCount + selectedCount) / totalUploads) * 100) : 0;
  const avgATS = filteredCandidates.length > 0 ? (filteredCandidates.reduce((acc, c) => acc + parseFloat(c.score || 0), 0) / filteredCandidates.length).toFixed(2) : "0.00";
  const highestATS = filteredCandidates.length > 0 ? Math.max(...filteredCandidates.map(c => parseFloat(c.score || 0))).toFixed(2) : "0.00";



  // Export PDF Report
  const handleExportPDF = () => {
    const element = printRef.current;
    if (!element) return;

    const opt = {
      margin: 10,
      filename: `Recruitment_Report_${selectedRole.replace(/\s+/g, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };
    html2pdf().set(opt).from(element).save();
    toast.success("Exported report as PDF!");
  };

  // Export CSV Records
  const handleExportCSV = () => {
    if (filteredCandidates.length === 0) {
      toast.error("No records available to export");
      return;
    }
    const headers = ["Candidate Name", "Job Role", "Resume Score", "Status", "Upload Date"];
    const rows = filteredCandidates.map(c => [
      c.name,
      c.job_role,
      `${c.score}%`,
      c.status.toUpperCase(),
      c.created_at.split("T")[0]
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nikitha_Recruitment_Report_${selectedRole.replace(/\s+/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported report as CSV!");
  };

  // Prepare chart datasets based on filtered candidates
  const uploadsByDay = (() => {
    const days = {};
    filteredCandidates.forEach(c => {
      const date = c.created_at.split("T")[0].slice(5); // MM-DD
      days[date] = (days[date] || 0) + 1;
    });
    // Fallback if empty to show structured trend
    if (Object.keys(days).length === 0) {
      return [{ label: "06-16", count: 0 }];
    }
    return Object.keys(days).sort().map(d => ({ label: d, count: days[d] }));
  })();

  const funnelByRole = (() => {
    const roles = {};
    filteredCandidates.forEach(c => {
      const role = c.job_role || "Unknown";
      if (!roles[role]) {
        roles[role] = { total: 0, shortlisted: 0, rejected: 0 };
      }
      roles[role].total += 1;
      if (c.status === "shortlisted" || c.status === "selected") {
        roles[role].shortlisted += 1;
      }
      if (c.status === "rejected") {
        roles[role].rejected += 1;
      }
    });
    return Object.keys(roles).map(r => ({
      label: r.length > 10 ? `${r.slice(0, 10)}.` : r,
      total: roles[r].total,
      shortlisted: roles[r].shortlisted,
      rejected: roles[r].rejected
    }));
  })();

  // Role wise Table
  const roleWiseSummary = (() => {
    const roles = {};
    filteredCandidates.forEach(c => {
      const role = c.job_role || "Unknown";
      if (!roles[role]) {
        roles[role] = { total: 0, shortlisted: 0, totalScore: 0 };
      }
      roles[role].total += 1;
      roles[role].totalScore += parseFloat(c.score || 0);
      if (c.status === "shortlisted" || c.status === "selected") {
        roles[role].shortlisted += 1;
      }
    });
    return Object.keys(roles).map(r => ({
      role: r,
      total: roles[r].total,
      shortlisted: roles[r].shortlisted,
      avgScore: (roles[r].totalScore / roles[r].total).toFixed(2)
    }));
  })();

  const topCandidates = [...filteredCandidates]
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
    .slice(0, 5);

  // Filter candidates for bottom table based on clicked KPI card
  const candidatesForTable = filteredCandidates.filter(c => {
    const cleanFilter = selectedKpiFilter.toLowerCase();
    if (cleanFilter === "total uploads") return true;
    if (cleanFilter === "shortlisted") return c.status === "shortlisted";
    if (cleanFilter === "selected") return c.status === "selected" || c.status === "hired";
    if (cleanFilter === "rejected") return c.status === "rejected";
    if (cleanFilter === "pending") return c.status === "pending";
    if (cleanFilter === "form filled") return c.status !== "pending";
    if (cleanFilter === "shortlist ratio") return c.status === "shortlisted" || c.status === "selected" || c.status === "hired";
    if (cleanFilter === "avg ats score" || cleanFilter === "highest score") return true;
    return true;
  });

  // Sort candidates by score descending if we are looking at Avg ATS Score or Highest Score
  if (selectedKpiFilter === "Avg ATS Score" || selectedKpiFilter === "Highest Score") {
    candidatesForTable.sort((a, b) => parseFloat(b.score || 0) - parseFloat(a.score || 0));
  }

  return (
    <div style={{ padding: "0 24px 40px 24px", color: "#1e293b", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        .chart-hoverable {
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .chart-hoverable:hover {
          filter: brightness(0.85);
          opacity: 0.9;
        }
        .donut-segment-hoverable {
          cursor: pointer;
          transition: all 0.2s ease-in-out;
        }
        .donut-segment-hoverable:hover {
          stroke-width: 12px;
        }
        @keyframes draw-beam {
          0% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            opacity: 0;
          }
          30% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          70% {
            stroke-dashoffset: 0;
            opacity: 1;
          }
          100% {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            opacity: 0;
          }
        }
        .peb-beam-col1 {
          animation: draw-beam 2.5s ease-in-out infinite;
        }
        .peb-beam-col2 {
          animation: draw-beam 2.5s ease-in-out infinite;
          animation-delay: 0.15s;
        }
        .peb-beam-col3 {
          animation: draw-beam 2.5s ease-in-out infinite;
          animation-delay: 0.3s;
        }
        .peb-beam-roof1 {
          animation: draw-beam 2.5s ease-in-out infinite;
          animation-delay: 0.45s;
        }
        .peb-beam-roof2 {
          animation: draw-beam 2.5s ease-in-out infinite;
          animation-delay: 0.6s;
        }
        .peb-beam-brace1 {
          animation: draw-beam 2.5s ease-in-out infinite;
          animation-delay: 0.75s;
        }
        .peb-beam-brace2 {
          animation: draw-beam 2.5s ease-in-out infinite;
          animation-delay: 0.9s;
        }
        @keyframes dot-flash {
          0% { opacity: 0.1; }
          50% { opacity: 1; }
          100% { opacity: 0.1; }
        }
        .loading-dot {
          animation: dot-flash 1.4s infinite linear;
        }
      `}</style>
      
      {/* TITLE BAR & EXPORT ACTIONS */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", flexWrap: "wrap", gap: "15px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            📊 Analytics & Reports
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleExportPDF}
            className="btn-primary"
            style={{ background: "#dc2626", color: "#ffffff", padding: "10px 20px", borderRadius: "14px", fontWeight: "800", boxShadow: "0 4px 12px rgba(220, 38, 38, 0.2)" }}
          >
            📕 Export PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{ background: "#10b981", color: "#ffffff", padding: "10px 20px", borderRadius: "14px", fontWeight: "800", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.2)" }}
          >
            📗 Export CSV
          </button>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "24px",
        padding: "20px 24px",
        display: "flex",
        flexWrap: "wrap",
        gap: "20px",
        alignItems: "flex-end",
        marginBottom: "30px",
        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.02)"
      }}>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>Date Filter</label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "14px", fontSize: "13.5px", fontWeight: "700", color: "#334155", background: "#f8fafc" }}
          >
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>Custom Range</option>
          </select>
        </div>

        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setDateFilter("Custom Range"); }}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "14px", fontSize: "13.5px", fontWeight: "700", color: "#334155", background: "#f8fafc" }}
          />
        </div>

        <div style={{ flex: 1, minWidth: "150px" }}>
          <label style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setDateFilter("Custom Range"); }}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "14px", fontSize: "13.5px", fontWeight: "700", color: "#334155", background: "#f8fafc" }}
          />
        </div>

        <div style={{ flex: 1.5, minWidth: "200px" }}>
          <label style={{ fontSize: "10px", fontWeight: "800", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "8px" }}>Job Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "14px", fontSize: "13.5px", fontWeight: "700", color: "#334155", background: "#f8fafc", textTransform: "capitalize" }}
          >
            {rolesList.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => loadData(startDate, endDate)}
          className="btn-primary"
          style={{ padding: "12px 24px", borderRadius: "14px", fontSize: "13.5px", fontWeight: "800", background: "#2563eb", border: "none", color: "#ffffff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ 
          textAlign: "center", 
          padding: "120px 40px", 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "24px" 
        }}>
          {/* Branded PEB Structural Frame Animation */}
          <div style={{ width: "120px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="120" height="90" viewBox="0 0 120 90" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Ground line */}
              <line x1="10" y1="80" x2="110" y2="80" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
              
              {/* Columns */}
              <line className="peb-beam-col1" x1="30" y1="80" x2="30" y2="40" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
              <line className="peb-beam-col2" x1="90" y1="80" x2="90" y2="40" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
              <line className="peb-beam-col3" x1="60" y1="80" x2="60" y2="25" stroke="#10b981" strokeWidth="4" strokeLinecap="round" />
              
              {/* Rafters / Roof */}
              <line className="peb-beam-roof1" x1="30" y1="40" x2="60" y2="25" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              <line className="peb-beam-roof2" x1="90" y1="40" x2="60" y2="25" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
              
              {/* Bracing diagonals */}
              <line className="peb-beam-brace1" x1="30" y1="80" x2="60" y2="52.5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
              <line className="peb-beam-brace2" x1="90" y1="80" x2="60" y2="52.5" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 4" strokeLinecap="round" />
            </svg>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: "24px", 
              fontWeight: "900", 
              background: "linear-gradient(135deg, #1e3a8a, #2563eb)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px"
            }}>
              Nikitha Build Tech
            </h2>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "14px", fontWeight: "650" }}>
              <span>Loading recruitment analytics</span>
              <span className="loading-dot">.</span>
              <span className="loading-dot">.</span>
              <span className="loading-dot">.</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* METRICS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(135px, 1fr))", gap: "16px", marginBottom: "25px" }}>
            {/* Cards */}
            {[
              { val: totalUploads, label: "Total Uploads", color: "#3b82f6", icon: "📁" },
              { val: shortlistedCount, label: "Shortlisted", color: "#10b981", icon: "👥" },
              { val: selectedCount, label: "Selected", color: "#059669", icon: "🏆" },
              { val: rejectedCount, label: "Rejected", color: "#ef4444", icon: "🚫" },
              { val: pendingCount, label: "Pending", color: "#ea580c", icon: "⏳" },
              { val: formFilled, label: "Form Filled", color: "#8b5cf6", icon: "📝" },
              { val: `${shortlistRatio}%`, label: "Shortlist Ratio", color: "#6366f1", icon: "🎯" },
              { val: `${avgATS}%`, label: "Avg ATS Score", color: "#f59e0b", icon: "⚡" },
              { val: `${highestATS}%`, label: "Highest Score", color: "#eab308", icon: "🏆" }
            ].map((c, i) => {
              const isClickable = [
                "Total Uploads",
                "Shortlisted",
                "Selected",
                "Rejected",
                "Pending",
                "Form Filled",
                "Shortlist Ratio",
                "Avg ATS Score",
                "Highest Score"
              ].includes(c.label);
              
              const isSelected = selectedKpiFilter === c.label;
              
              return (
                <motion.div 
                  key={i} 
                  onClick={() => isClickable && handleKpiClick(c.label)}
                  whileHover={isClickable ? { scale: 1.02, translateY: -2 } : {}}
                  whileTap={isClickable ? { scale: 0.98 } : {}}
                  style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    padding: "12px 14px 12px 18px",
                    border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: isSelected ? "0 8px 20px rgba(59, 130, 246, 0.15)" : "0 4px 10px rgba(0,0,0,0.01)",
                    cursor: isClickable ? "pointer" : "default",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "border 0.2s ease, box-shadow 0.2s ease"
                  }}
                >
                  {/* Left color indicator bar */}
                  <div style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: "5px",
                    background: c.color
                  }} />

                  {/* Icon */}
                  <div style={{
                    fontSize: "18px",
                    background: `${c.color}15`,
                    color: c.color,
                    minWidth: "36px",
                    height: "36px",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1
                  }}>
                    {c.icon}
                  </div>
                  
                  {/* Text */}
                  <div style={{ minWidth: 0, flex: 1, zIndex: 1 }}>
                    <div style={{ fontSize: "20px", fontWeight: "900", color: "#0f172a", marginBottom: "2px", lineHeight: 1 }}>{c.val}</div>
                    <div style={{ 
                      fontSize: "9px", 
                      fontWeight: "800", 
                      color: "#94a3b8", 
                      textTransform: "uppercase", 
                      letterSpacing: "0.5px",
                      lineHeight: "1.2"
                    }}>
                      {c.label}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* CHARTS GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "25px", marginBottom: "30px" }}>
            
            {/* Chart 1: Donut */}
            <div className="glass-card" style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Shortlisted vs Rejected Ratio
              </h3>
              <div style={{ height: "160px" }}>
                <SVGDonutChart
                  value={shortlistedCount + selectedCount}
                  total={totalUploads}
                  label="Shortlisted"
                  color="#10b981"
                  secondaryColor="#ef4444"
                />
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "14px" }}>
                <motion.button
                  onClick={() => handleKpiClick("Shortlisted")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="badge badge-green"
                  style={{ 
                    fontSize: "11px", 
                    padding: "6px 12px", 
                    border: "none", 
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                  }}
                >
                  Shortlisted: {shortlistedCount + selectedCount}
                </motion.button>
                <motion.button
                  onClick={() => handleKpiClick("Rejected")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="badge badge-red"
                  style={{ 
                    fontSize: "11px", 
                    padding: "6px 12px", 
                    border: "none", 
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.05)"
                  }}
                >
                  Rejected: {rejectedCount}
                </motion.button>
              </div>
            </div>

            {/* Chart 2: Vertical Bars */}
            <div className="glass-card" style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Resumes Uploaded by Day
              </h3>
              <div style={{ height: "200px" }}>
                <ResumesBarChart data={uploadsByDay} />
              </div>
            </div>

            {/* Chart 3: Grouped Bars */}
            <div className="glass-card" style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Applications &amp; Funnel by Job Role
              </h3>
              <div style={{ height: "200px" }}>
                <GroupedBarChart data={funnelByRole} />
              </div>
            </div>

            {/* Chart 4: Trend */}
            <div className="glass-card" style={{ background: "#ffffff", padding: "24px", borderRadius: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Recruitment Sourcing Activity Trend
              </h3>
              <div style={{ height: "200px" }}>
                <SourcingTrendChart data={uploadsByDay} />
              </div>
            </div>

          </div>

          {/* PIPELINE & GAUGE GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "25px", marginBottom: "30px", alignItems: "stretch" }}>
            
            {/* Horizontal Bar Chart stages */}
            <div style={{ background: "#ffffff", padding: "26px", borderRadius: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Candidate Pipeline Distribution Bar Chart
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Resumes Screened", count: totalUploads, color: "#6366f1" },
                  { label: "Google Form Sent", count: formSent, color: "#0ea5e9" },
                  { label: "Google Form Filled", count: formFilled, color: "#8b5cf6" },
                  { label: "Telephonic Screening", count: shortlistedCount + selectedCount, color: "#cbd5e1" },
                  { label: "Telephonic Tech", count: selectedCount, color: "#cbd5e1" },
                  { label: "Face to Face", count: selectedCount, color: "#cbd5e1" }
                ].map((item, idx) => {
                  const maxCount = Math.max(totalUploads, 1);
                  const widthPct = (item.count / maxCount) * 100;
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: "140px", textAlign: "right", fontSize: "12px", fontWeight: "800", color: "#475569" }}>{item.label}</div>
                      <div style={{ flex: 1, height: "24px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", width: `${widthPct}%`, background: item.color, borderRadius: "6px" }} />
                        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "10.5px", fontWeight: "900", color: widthPct > 20 ? "#ffffff" : "#475569" }}>
                          {item.count} candidates
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Circular engagement ring */}
            <div style={{ background: "#ffffff", padding: "26px", borderRadius: "24px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Google Form Engagement
              </h3>
              <div style={{ display: "flex", justifyContent: "center", margin: "20px 0" }}>
                <SVGDonutChart
                  value={formFilled}
                  total={formSent}
                  label="Response Completion"
                  color="#2563eb"
                  secondaryColor="#cbd5e1"
                />
              </div>
              <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "12.5px", fontWeight: "750" }}>
                <div className="flex-between"><span style={{ color: "#64748b" }}>Forms Sent:</span><span>{formSent}</span></div>
                <div className="flex-between"><span style={{ color: "#64748b" }}>Forms Completed:</span><span style={{ color: "#059669" }}>{formFilled}</span></div>
                <div className="flex-between"><span style={{ color: "#64748b" }}>No Responses:</span><span style={{ color: "#ef4444" }}>{formSent - formFilled}</span></div>
              </div>
            </div>

          </div>

          {/* ROLE WISE & TOP CANDIDATES ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "25px", marginBottom: "30px" }}>
            
            {/* Table: Role performance */}
            <div style={{ background: "#ffffff", padding: "26px", borderRadius: "24px", border: "1px solid #e2e8f0", overflowX: "auto" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                💼 Role-Wise Performance Analytics
              </h3>
              <table className="modern-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Job Role</th>
                    <th>Application Received</th>
                    <th>Shortlisted</th>
                    <th>Avg ATS</th>
                  </tr>
                </thead>
                <tbody>
                  {roleWiseSummary.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "700", textTransform: "capitalize" }}>{item.role}</td>
                      <td>{item.total}</td>
                      <td>{item.shortlisted}</td>
                      <td>
                        <span className="badge badge-green" style={{ fontSize: "11px", fontWeight: "800" }}>{item.avgScore}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Top 5 list */}
            <div style={{ background: "#ffffff", padding: "26px", borderRadius: "24px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                🏆 Top Candidates (Top 5)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {topCandidates.map((c, idx) => (
                  <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "14px", fontWeight: "900", color: "#3b82f6" }}>{idx + 1}.</span>
                      <div>
                        <div style={{ fontSize: "12.5px", fontWeight: "800", color: "#0f172a" }}>{c.name}</div>
                        <div style={{ fontSize: "10.5px", color: "#64748b", textTransform: "capitalize" }}>{c.job_role}</div>
                      </div>
                    </div>
                    <span className="badge badge-green" style={{ fontSize: "11.5px", fontWeight: "900" }}>{parseFloat(c.score).toFixed(2)}%</span>
                  </div>
                ))}
                {topCandidates.length === 0 && (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px", fontSize: "13px" }}>No candidate records</div>
                )}
              </div>
            </div>

          </div>

          {/* CANDIDATE RESUME RECORDS TABLE */}
          <div ref={tableRef} style={{ background: "#ffffff", padding: "26px", borderRadius: "24px", border: "1px solid #e2e8f0", marginBottom: "30px" }}>
            <h3 style={{ margin: "0 0 20px 0", fontSize: "13px", fontWeight: "850", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              📋 Candidate Resume Records ({candidatesForTable.length})
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table className="modern-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Job Role</th>
                    <th>Resume Score</th>
                    <th>Status</th>
                    <th>Upload Date</th>
                  </tr>
                </thead>
                <tbody>
                  {candidatesForTable.map((c, idx) => {
                    let badgeClass = "badge-yellow";
                    if (c.status === "selected" || c.status === "hired") badgeClass = "badge-green";
                    if (c.status === "shortlisted") badgeClass = "badge-blue";
                    if (c.status === "rejected") badgeClass = "badge-red";
                    if (c.status === "pending") badgeClass = "badge-yellow";

                    return (
                      <tr key={idx}>
                        <td style={{ fontWeight: "700" }}>{c.name}</td>
                        <td style={{ textTransform: "capitalize" }}>{c.job_role}</td>
                        <td>
                          <span className={`badge ${parseFloat(c.score) >= 50 ? "badge-green" : "badge-red"}`} style={{ fontSize: "11px", fontWeight: "800" }}>
                            {parseFloat(c.score).toFixed(2)}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`} style={{ fontSize: "10px", fontWeight: "900", textTransform: "uppercase" }}>
                            {c.status}
                          </span>
                        </td>
                        <td>{c.created_at.split("T")[0]}</td>
                      </tr>
                    );
                  })}
                  {candidatesForTable.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>No candidate records matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>



        </>
      )}

      {/* HIDDEN PRINT-READY ELEMENT */}
      <div style={{ display: "none" }}>
        <div ref={printRef} style={{ background: "#ffffff", padding: "20px", color: "#000000", fontFamily: "Arial, sans-serif" }}>
          <div style={{ textAlign: "center", borderBottom: "2px solid #000000", paddingBottom: "12px", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: "bold", margin: "0 0 4px 0", textTransform: "uppercase" }}>
              Nikitha Build Tech Pvt. Ltd.
            </h1>
            <p style={{ margin: 0, fontSize: "11px", color: "#555555" }}>
              Plot No. 42, Phase-II, Peenya Industrial Area, Bengaluru - 560058
            </p>
            <h2 style={{ fontSize: "15px", fontWeight: "bold", textTransform: "uppercase", margin: "14px 0 0 0", letterSpacing: "0.5px" }}>
              Monthly Recruitment Funnel Performance Report
            </h2>
            <p style={{ margin: "5px 0 0 0", fontSize: "11px", fontWeight: "bold" }}>
              Date Range: {startDate} to {endDate}
            </p>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "bold", width: "25%" }}>Job Domain:</td>
                <td style={{ border: "1px solid #000", padding: "6px 8px", width: "25%", textTransform: "capitalize" }}>{selectedRole}</td>
                <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "bold", width: "25%" }}>Filter Duration:</td>
                <td style={{ border: "1px solid #000", padding: "6px 8px", width: "25%" }}>{startDate} to {endDate}</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "bold" }}>Total Uploaded:</td>
                <td style={{ border: "1px solid #000", padding: "6px 8px" }}>{totalUploads} Resumes</td>
                <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "bold" }}>Total Onboarded/Hired:</td>
                <td style={{ border: "1px solid #000", padding: "6px 8px", color: "green", fontWeight: "bold" }}>{selectedCount} Hired</td>
              </tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: "13px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "4px", marginBottom: "12px", textTransform: "uppercase" }}>
            1. Pipeline Flow Metrics
          </h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr style={{ backgroundColor: "#f2f2f2" }}>
                <th style={{ border: "1px solid #000", padding: "6px", textAlign: "left", fontSize: "11px" }}>Recruitment Stage</th>
                <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px", width: "15%" }}>Count</th>
                <th style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px", width: "20%" }}>Conversion Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: "1px solid #000", padding: "6px", fontSize: "11px" }}>Resume Screening &amp; Upload</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>{totalUploads}</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>100%</td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "6px", fontSize: "11px" }}>Google Form Sent</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>{formSent}</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>
                  {totalUploads > 0 ? ((formSent / totalUploads) * 100).toFixed(0) : 0}%
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "6px", fontSize: "11px" }}>Google Form Completed</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>{formFilled}</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>
                  {formSent > 0 ? ((formFilled / formSent) * 100).toFixed(0) : 0}%
                </td>
              </tr>
              <tr>
                <td style={{ border: "1px solid #000", padding: "6px", fontSize: "11px" }}>Shortlisted &amp; Scheduled</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>{shortlistedCount + selectedCount}</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>
                  {totalUploads > 0 ? (((shortlistedCount + selectedCount) / totalUploads) * 100).toFixed(0) : 0}%
                </td>
              </tr>
              <tr style={{ fontWeight: "bold", backgroundColor: "#e8f8f5" }}>
                <td style={{ border: "1px solid #000", padding: "6px", fontSize: "11px" }}>Onboarded / Hired</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px" }}>{selectedCount}</td>
                <td style={{ border: "1px solid #000", padding: "6px", textAlign: "center", fontSize: "11px", color: "green" }}>
                  {totalUploads > 0 ? ((selectedCount / totalUploads) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            </tbody>
          </table>



          <div style={{ marginTop: "50px", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold" }}>
            <div>
              <div style={{ borderTop: "1px solid #000", width: "150px", textAlign: "center", paddingTop: "5px" }}>
                Prepared by HR Executive
              </div>
            </div>
            <div>
              <div style={{ borderTop: "1px solid #000", width: "150px", textAlign: "center", paddingTop: "5px" }}>
                Approved by HR Manager
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
