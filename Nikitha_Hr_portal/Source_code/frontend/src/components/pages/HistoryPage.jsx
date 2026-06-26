import React, { useEffect, useState } from "react";
import "../../styles.css";
import { motion } from "framer-motion";
import API from "../../services/api";
import html2pdf from "html2pdf.js";

export default function HistoryPage() {
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [statusFilter, setStatusFilter] = useState("Hired"); // "All", "Hired", "Rejected"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [counts, setCounts] = useState({ hired: 0, rejected: 0 });

  const [activeSettingsMenu, setActiveSettingsMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Modal State for viewing forms
  const [selectedCandidateForms, setSelectedCandidateForms] = useState(null);

  // Inject print styles dynamically
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      /* Screen preview styles */
      .printable-form-container {
        background: #f1f5f9;
        padding: 20px 0;
      }
      .printable-page {
        background: #ffffff;
        width: 210mm;
        height: 297mm;
        padding: 10mm 15mm;
        margin: 0 auto 30px auto;
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        border: 1px solid #cbd5e1;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
      }
      .printable-page table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 12px;
        font-family: Arial, sans-serif;
        font-size: 11px;
        color: #000000;
      }
      .printable-page td, .printable-page th {
        border: 1px solid #000000;
        padding: 4px 6px;
        line-height: 1.25;
        text-align: left;
        vertical-align: middle;
        background: transparent !important;
      }
      .printable-page th {
        font-weight: bold;
      }
      .printable-page .centered-header {
        text-align: center;
        font-weight: bold;
        font-size: 12px;
        background: transparent !important;
      }
      .printable-page .main-title {
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .printable-page .subtitle {
        text-align: center;
        font-weight: bold;
        font-size: 11px;
        color: #000000;
        margin-bottom: 5px;
      }
      .printable-page .section-header {
        font-weight: bold;
        text-align: center;
        text-transform: uppercase;
        font-size: 11px;
        background: transparent !important;
      }
      .printable-page .left-header {
        font-weight: bold;
        text-align: left;
        font-size: 11px;
      }

      /* Modern Candidate Dashboard Screen Styles */
      .history-title {
        font-size: 26px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        letter-spacing: -0.75px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 20px;
        margin-bottom: 25px;
      }
      .stat-card-premium {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 18px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.01);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      .stat-card-premium:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 25px rgba(0,0,0,0.04);
        border-color: #cbd5e1;
      }
      .stat-card-premium::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 3px;
        opacity: 0.6;
      }
      .stat-card-blue::after { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
      .stat-card-green::after { background: linear-gradient(90deg, #10b981, #34d399); }
      .stat-card-red::after { background: linear-gradient(90deg, #ef4444, #f87171); }

      .stat-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        flex-shrink: 0;
      }
      .icon-bg-blue { background: #eff6ff; color: #3b82f6; }
      .icon-bg-green { background: #ecfdf5; color: #10b981; }
      .icon-bg-red { background: #fef2f2; color: #ef4444; }

      .stat-info {
        display: flex;
        flex-direction: column;
      }
      .stat-label {
        font-size: 10px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.75px;
        margin-bottom: 2px;
      }
      .stat-value {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.1;
      }
      .stat-subtext {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
        margin-top: 3px;
      }

      .filter-panel {
        padding: 24px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 24px;
        box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.02);
        margin-bottom: 30px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .segmented-control {
        display: inline-flex;
        padding: 6px;
        background: #f1f5f9;
        border-radius: 16px;
        width: fit-content;
        border: 1px solid #e2e8f0;
        gap: 4px;
      }
      .segmented-tab {
        padding: 10px 24px;
        font-size: 13.5px;
        font-weight: 700;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        color: #64748b;
        background: transparent;
        font-family: inherit;
      }
      .segmented-tab.active-hired {
        background: #ffffff;
        color: #059669;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
      }
      .segmented-tab.active-rejected {
        background: #ffffff;
        color: #dc2626;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
      }
      .segmented-tab:hover:not(.active-hired):not(.active-rejected) {
        color: #0f172a;
        background: rgba(255, 255, 255, 0.6);
      }
      .tab-count-badge {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 20px;
        font-weight: 700;
      }
      .badge-hired-tab { background: #e6fbf2; color: #059669; }
      .badge-rejected-tab { background: #fde8e8; color: #dc2626; }
      .segmented-tab:not(.active-hired):not(.active-rejected) .tab-count-badge {
        background: #e2e8f0;
        color: #64748b;
      }

      .controls-row {
        display: flex;
        gap: 16px;
        align-items: center;
        flex-wrap: wrap;
      }
      .search-wrapper {
        position: relative;
        flex: 1;
        min-width: 260px;
      }
      .search-icon {
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
        color: #94a3b8;
        pointer-events: none;
      }
      .search-input {
        width: 100%;
        padding: 14px 16px 14px 44px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 16px;
        font-size: 14px;
        color: #1e293b;
        outline: none;
        transition: all 0.2s ease;
        box-sizing: border-box;
        font-family: inherit;
      }
      .search-input:focus {
        border-color: #3b82f6;
        background: #ffffff;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      }
      .select-dropdown {
        padding: 14px 38px 14px 16px;
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 16px;
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        outline: none;
        appearance: none;
        background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 16px center;
        transition: all 0.2s ease;
        font-family: inherit;
        min-width: 180px;
      }
      .select-dropdown:focus {
        border-color: #3b82f6;
        background: #ffffff;
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
      }
      .candidate-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 24px;
      }
      .profile-card {
        background: #ffffff;
        border-radius: 24px;
        padding: 24px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.015);
        border: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 20px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .profile-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01);
      }
      .profile-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        transition: all 0.3s ease;
      }
      .profile-card.card-hired::before {
        background: linear-gradient(to bottom, #10b981, #059669);
      }
      .profile-card.card-rejected::before {
        background: linear-gradient(to bottom, #ef4444, #dc2626);
      }
      .profile-card.card-hired:hover {
        border-color: rgba(16, 185, 129, 0.3);
      }
      .profile-card.card-rejected:hover {
        border-color: rgba(239, 68, 68, 0.3);
      }
      .avatar-ring {
        padding: 3px;
        border-radius: 19px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: fit-content;
      }
      .avatar-ring-hired {
        border: 2px solid rgba(16, 185, 129, 0.15);
        background: rgba(16, 185, 129, 0.03);
      }
      .avatar-ring-rejected {
        border: 2px solid rgba(239, 68, 68, 0.15);
        background: rgba(239, 68, 68, 0.03);
      }
      .profile-avatar {
        width: 46px;
        height: 46px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 15px;
        color: #ffffff;
      }
      .avatar-hired {
        background: linear-gradient(135deg, #10b981, #059669);
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2);
      }
      .avatar-rejected {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        box-shadow: 0 4px 10px rgba(239, 68, 68, 0.2);
      }
      .card-settings-btn {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        width: 36px;
        height: 36px;
        border-radius: 12px;
        cursor: pointer;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      .card-settings-btn:hover {
        background: #f1f5f9;
        color: #0f172a;
        border-color: #cbd5e1;
      }
      .status-pill {
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        width: fit-content;
      }
      .status-pill-hired {
        background: #ecfdf5;
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.15);
      }
      .status-pill-rejected {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.15);
      }
      .status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
      }
      .status-dot-hired {
        background: #10b981;
        box-shadow: 0 0 6px #10b981;
      }
      .status-dot-rejected {
        background: #ef4444;
        box-shadow: 0 0 6px #ef4444;
      }
      .info-item-label {
        font-size: 9px;
        color: #94a3b8;
        display: flex;
        gap: 4px;
        align-items: center;
        margin-bottom: 4px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.7px;
      }
      .info-item-value {
        font-size: 13.5px;
        font-weight: 700;
        color: #1e293b;
      }
      .view-form-btn {
        flex: 1;
        padding: 12px 14px;
        border-radius: 14px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        background: #ffffff;
        border: 1.5px solid #cbd5e1;
        color: #334155;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 4px rgba(0,0,0,0.01);
        font-family: inherit;
      }
      .view-form-btn:hover {
        background: #0f172a;
        color: #ffffff;
        border-color: #0f172a;
        box-shadow: 0 8px 16px -4px rgba(15, 23, 42, 0.25);
        transform: scale(1.01);
      }
      .settings-dropdown-menu {
        position: absolute;
        top: 42px;
        right: 0;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        z-index: 10;
        width: 130px;
        overflow: hidden;
        animation: ddOpen 0.2s ease-out;
      }
      @keyframes ddOpen {
        from { opacity: 0; transform: translateY(-4px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* Modern Table Format Style overrides for HistoryPage */
      .modern-table th, .modern-table td {
        white-space: nowrap;
        vertical-align: middle;
        padding: 12px 14px;
      }
      .table-avatar-wrapper {
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .table-avatar {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        color: #ffffff;
      }
      .table-avatar-hired {
        background: linear-gradient(135deg, #10b981, #059669);
        box-shadow: 0 4px 10px rgba(16, 185, 129, 0.15);
      }
      .table-avatar-rejected {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        box-shadow: 0 4px 10px rgba(239, 68, 68, 0.15);
      }
      .btn-report {
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border: none;
        transition: all 0.2s ease;
        font-family: inherit;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
        white-space: nowrap;
      }
      .btn-report:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.06);
      }
      .btn-report-hired {
        background: #10b981;
        color: #ffffff;
      }
      .btn-report-hired:hover {
        background: #059669;
      }
      .btn-report-rejected {
        background: #ef4444;
        color: #ffffff;
      }
      .btn-report-rejected:hover {
        background: #dc2626;
      }
      .table-badge {
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .table-badge-hired {
        background: #ecfdf5;
        color: #059669;
        border: 1px solid rgba(16, 185, 129, 0.15);
      }
      .table-badge-rejected {
        background: #fef2f2;
        color: #dc2626;
        border: 1px solid rgba(239, 68, 68, 0.15);
      }
      .table-actions-dropdown-wrapper {
        position: relative;
        display: inline-block;
      }
      .table-actions-btn {
        background: transparent;
        border: none;
        font-size: 18px;
        color: #94a3b8;
        cursor: pointer;
        padding: 6px 10px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        line-height: 1;
      }
      .table-actions-btn:hover {
        color: #0f172a;
        background-color: #f1f5f9;
      }
      .table-action-menu {
        position: absolute;
        top: 32px;
        right: 0;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        z-index: 100;
        width: 190px;
        overflow: hidden;
        animation: ddOpen 0.2s ease-out;
      }
      .table-action-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 14px;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 600;
        color: #334155;
        transition: background 0.15s;
        font-family: inherit;
      }
      .table-action-item:hover {
        background: #f8fafc;
        color: #0f172a;
      }
      .table-action-item.delete {
        color: #ef4444;
        border-top: 1px solid #f1f5f9;
      }
      .table-action-item.delete:hover {
        background: #fef2f2;
        color: #dc2626;
      }
      .table-edit-input {
        width: 100%;
        padding: 8px 10px;
        border: 1.5px solid #3b82f6;
        border-radius: 8px;
        font-size: 12.5px;
        font-weight: 600;
        outline: none;
        background: #ffffff;
        color: #1e293b;
        font-family: inherit;
        box-sizing: border-box;
      }
      .table-edit-input:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      @media print {
        html, body {
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
        }
        body * {
          visibility: hidden !important;
        }
        .printable-form-modal-overlay, .printable-form-modal-overlay * {
          visibility: visible !important;
        }
        .printable-form-modal-overlay {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
          background: white !important;
          padding: 0 !important;
          margin: 0 !important;
          display: block !important;
          z-index: auto !important;
        }
        .printable-modal-card {
          border: none !important;
          box-shadow: none !important;
          height: auto !important;
          overflow: visible !important;
          max-width: 100% !important;
          width: 100% !important;
          background: white !important;
        }
        .no-print {
          display: none !important;
        }
        .printable-page {
          border: none !important;
          box-shadow: none !important;
          padding: 10mm 15mm !important;
          margin: 0 !important;
          width: 210mm !important;
          height: 297mm !important;
          box-sizing: border-box !important;
          overflow: hidden !important;
          background: white !important;
        }
        .printable-page + .printable-page {
          page-break-before: always !important;
          break-before: page !important;
        }
        .printable-page table {
          width: 100% !important;
          font-size: 11px !important;
        }
        .printable-page td, .printable-page th {
          padding: 4px 6px !important;
          line-height: 1.2 !important;
        }
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");
    try {
      const [hiredRes, rejectedRes] = await Promise.all([
        API.get("/history"),
        API.get("/history/rejected")
      ]);
      const hiredRows = (hiredRes.data.candidates || []).map((c) => ({
        ...c,
        status: "hired",
        sent_at: c.created_at || c.sent_at,
      }));
      const rejectedRows = (rejectedRes.data.candidates || []).map((c) => ({
        ...c,
        status: "rejected",
        sent_at: c.created_at || c.sent_at,
      }));
      const combined = [...hiredRows, ...rejectedRows].sort((a, b) => {
        const dateA = new Date(a.sent_at || a.created_at || 0);
        const dateB = new Date(b.sent_at || b.created_at || 0);
        return dateB - dateA;
      });
      setHistory(combined);
      setCounts({
        hired: hiredRows.length,
        rejected: rejectedRows.length
      });
    } catch {
      setError("Could not load history from database. Is the backend running?");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    setEditingId(null);
    setActiveSettingsMenu(null);
  }, []);

  const updateField = async (id, status, field, value) => {
    setHistory((prev) =>
      prev.map((c) => (c.id === id && c.status === status ? { ...c, [field]: value } : c))
    );
    try {
      if (status === "hired") {
        await API.put(`/history/${id}`, { [field]: value });
      }
    } catch {
      setError("Failed to update candidate details.");
    }
  };

  const deleteCandidate = async (id, status) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) return;
    try {
      const endpoint = status === "hired" ? `/history/${id}` : `/history/rejected/${id}`;
      await API.delete(endpoint);
      setHistory((prev) => prev.filter((c) => c.id !== id || c.status !== status));
      fetchHistory();
    } catch {
      setError("Failed to delete candidate.");
    }
  };


  // Download PDF format of the assessment report
  const handleDownloadReport = (candidate) => {
    const element = document.querySelector(".printable-form-container");
    if (!element) return;
    
    const opt = {
      margin:       0,
      filename:     `AssessmentReport_${(candidate.name || "Candidate").replace(/\s+/g, "_")}.pdf`,
      image:        { type: 'jpeg', quality: 1.0 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 800 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  // Open modal and parse form_data
  const handleOpenFormsModal = (c) => {
    let parsedForms = {};
    try {
      if (c.form_data) {
        parsedForms = typeof c.form_data === "string" ? JSON.parse(c.form_data) : c.form_data;
      }
    } catch (e) {
      console.error("Error parsing form_data", e);
    }
    setSelectedCandidateForms({
      candidate: c,
      forms: parsedForms
    });
  };

  // Trigger Print with Auto-file name
  const handlePrint = (candidate) => {
    const originalTitle = document.title;
    // Set document title to the candidate's name so Chrome print PDF dialog names it correctly
    document.title = `${(candidate.name || "Candidate").replace(/\s+/g, "_")}_Assessment_Form`;
    window.print();
    document.title = originalTitle;
  };

  // Extract unique domains (job roles) and include predefined defaults
  const defaultDomains = ["java Developeer", "General Manager", "Civil Engineer", "Trainee Software Engineer"];
  const fetchedDomains = Array.from(new Set(history.map((c) => c.job_role || "Unspecified Role")));
  
  const domains = [
    "All",
    ...new Set([...defaultDomains, ...fetchedDomains])
  ];

  const filtered = history.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.job_role || "").toLowerCase().includes(search.toLowerCase());

    const matchesDomain =
      selectedDomain === "All" ||
      (c.job_role || "Unspecified Role") === selectedDomain;

    const matchesStatus =
      statusFilter === "All" ||
      (statusFilter === "Hired" && c.status === "hired") ||
      (statusFilter === "Rejected" && c.status === "rejected");

    return matchesSearch && matchesDomain && matchesStatus;
  });

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      const dateObj = new Date(d);
      return dateObj.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return d;
    }
  };

  const getIsoDate = (d) => {
    if (!d) return "";
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch { return ""; }
  };

  const initials = (name = "") =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  // Render modal containing combined sheets matching the PDF screenshot format
  const renderPrintableModal = () => {
    if (!selectedCandidateForms) return null;
    const c = selectedCandidateForms.candidate;
    const forms = selectedCandidateForms.forms;

    let telephonic = forms.telephonic_form || {};
    let tech = forms.telephonic_tech_form || {};
    let f2f = forms.f2f_form || {};
    let negotiation = forms.negotiation_form || {};
    let finalInt = forms.final_interview_form || {};
    let googleForm = forms.google_form || {};

    const getStageStatus = (stageId) => {
      const sequence = ["google_form", "telephonic", "telephonic_tech", "f2f", "final_interview", "negotiation"];
      if (c.status === "hired") {
        return "passed";
      }
      const rejRound = (c.rejectedAtStage || c.rejected_round || c.stage || "").trim().toLowerCase();
      
      const STAGE_TITLE_TO_ID = {
        "telephonic": "telephonic",
        "telephonic technical": "telephonic_tech",
        "telephonic technical ": "telephonic_tech",
        "schedule f2f": "f2f",
        "face to face": "f2f",
        "final interview": "final_interview",
        "negotion and offer letter": "negotiation",
        " negotion and offer letter": "negotiation",
      };

      const targetRejId = STAGE_TITLE_TO_ID[rejRound] || "telephonic";
      const rejIdx = sequence.indexOf(targetRejId);
      const currentIdx = sequence.indexOf(stageId);

      if (currentIdx < rejIdx) {
        return "passed";
      } else if (currentIdx === rejIdx) {
        return "failed";
      } else {
        return "unreached";
      }
    };

    const getStageDetails = (stageId) => {
      switch (stageId) {
        case "google_form":
          const gfScore = googleForm.ats_score || c.ats_score || 0;
          return gfScore ? `ATS: ${gfScore}%` : "Passed";
        case "telephonic":
          const telStatus = getStageStatus("telephonic");
          return telStatus === "passed" ? "Cleared" : telStatus === "failed" ? "Failed" : "";
        case "telephonic_tech":
          const techStatus = getStageStatus("telephonic_tech");
          return techStatus === "passed" ? "Cleared" : techStatus === "failed" ? "Failed" : "";
        case "f2f":
          let f2fSum = 0;
          let f2fCount = 0;
          ["I. Skills", "II. Knowledge", "III. Self-Image", "IV. Traits", "V. Motives"].forEach(cat => {
            const catData = f2f.ratings?.[cat];
            if (catData && typeof catData === 'object') {
              Object.values(catData).forEach(val => {
                const num = parseFloat(val);
                if (!isNaN(num)) {
                  f2fSum += num;
                  f2fCount++;
                }
              });
            }
          });
          const avg = f2fCount > 0 ? (f2fSum / f2fCount).toFixed(1) : null;
          return avg ? `Rating: ${avg}/10` : (getStageStatus("f2f") === "passed" ? "Cleared" : getStageStatus("f2f") === "failed" ? "Failed" : "");
        case "final_interview":
          const fiStatus = getStageStatus("final_interview");
          return fiStatus === "passed" ? "Cleared" : fiStatus === "failed" ? "Failed" : "";
        case "negotiation":
          if (c.status === "hired") {
            return c.salary ? `₹ ${c.salary} LPA` : "Hired";
          }
          return getStageStatus("negotiation") === "failed" ? "Declined" : "";
        default:
          return "";
      }
    };

    const renderCandidatePipelineGraph = () => {
      const stagesList = [
        { id: "google_form", title: "Google Form", icon: "📝", shortName: "Google Form" },
        { id: "telephonic", title: "Telephonic", icon: "📞", shortName: "Telephonic" },
        { id: "telephonic_tech", title: "Technical Tel", icon: "🖥️", shortName: "Tech Tel" },
        { id: "f2f", title: "Face to Face", icon: "🤝", shortName: "F2F" },
        { id: "final_interview", title: "Final Interview", icon: "🧑‍💼", shortName: "Final" },
        { id: "negotiation", title: "Hired / Offer", icon: "🏆", shortName: "Hired" }
      ];

      return (
        <div style={{
          background: "#f8fafc",
          borderRadius: "14px",
          padding: "16px 12px",
          border: "1px solid #cbd5e1",
          margin: "15px 0"
        }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: "10px", fontWeight: "bold", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Pipeline Progress Graph
          </h4>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", width: "100%" }}>
            {stagesList.map((stage, idx) => {
              const status = getStageStatus(stage.id);
              const details = getStageDetails(stage.id);
              
              let circleBg = "#e2e8f0";
              let circleColor = "#94a3b8";
              let lineBg = "#cbd5e1";
              let iconVal = stage.icon;

              if (status === "passed") {
                circleBg = "#10b981";
                circleColor = "#ffffff";
                lineBg = "#10b981";
                iconVal = "✔";
              } else if (status === "failed") {
                circleBg = "#ef4444";
                circleColor = "#ffffff";
                lineBg = "#ef4444";
                iconVal = "✘";
              }

              const showLine = idx < stagesList.length - 1;

              return (
                <div key={stage.id} style={{ display: "flex", flex: 1, alignItems: "center", position: "relative" }}>
                  {/* Step Circle & Details */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2, position: "relative", minWidth: "70px", margin: "0 auto" }}>
                    <div style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: circleBg,
                      color: circleColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "11px",
                      border: status === "unreached" ? "1.5px solid #94a3b8" : "none"
                    }}>
                      {iconVal}
                    </div>
                    <span style={{ fontSize: "9.5px", fontWeight: "bold", color: "#1e293b", marginTop: "4px", textAlign: "center" }}>
                      {stage.shortName}
                    </span>
                    {details && (
                      <span style={{ fontSize: "8.5px", fontWeight: "bold", color: status === "failed" ? "#ef4444" : status === "passed" ? "#059669" : "#64748b", marginTop: "1px" }}>
                        {details}
                      </span>
                    )}
                  </div>

                  {/* Connecting Line */}
                  {showLine && (
                    <div style={{
                      position: "absolute",
                      top: "12px",
                      left: "55%",
                      right: "-45%",
                      height: "2px",
                      background: lineBg,
                      zIndex: 1
                    }}></div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    const ratingVal = (cat, p) => {
      if (!f2f || !f2f.ratings) return "";
      const catData = f2f.ratings[cat];
      if (!catData) return "";
      
      const clean = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetClean = clean(p);
      
      for (const [key, value] of Object.entries(catData)) {
        if (clean(key) === targetClean) {
          return value || "";
        }
      }
      return "";
    };

    const checkMark = (val) => val ? "✔" : "";

    return (
      <div className="printable-form-modal-overlay" style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}>
        <div className="printable-modal-card" style={{
          background: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "850px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden"
        }}>
          {/* Modal Header */}
          <div className="no-print" style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc"
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>
                Assessment Report (Paper Layout)
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                {c.name} — {c.job_role || "Unspecified Role"}
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={() => handlePrint(c)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13px",
                  border: "none",
                  background: "#3b82f6",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                🖨️ Print / Save PDF
              </button>
              <button
                onClick={() => handleDownloadReport(c)}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "13px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#334155",
                  cursor: "pointer"
                }}
              >
                📥 Download PDF
              </button>
              <button
                onClick={() => setSelectedCandidateForms(null)}
                style={{
                  background: "#e2e8f0",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "#475569",
                  fontWeight: "bold"
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "30px",
            background: "#f1f5f9"
          }}>
            {/* The printable form layout container */}
            <div className="printable-form-container">
              
              {/* PAGE 1: INTERVIEW ASSESSMENT FORM */}
              <div className="printable-page">
                <table style={{ width: "100%", tableLayout: "fixed", marginBottom: "0", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: "bold", width: "55%", fontSize: "12px", padding: "12px 10px", verticalAlign: "middle" }}>
                        Profile No. Nikitha /HR /
                      </td>
                      <td style={{ width: "45%", textAlign: "center", padding: "8px 10px", verticalAlign: "middle" }}>
                        <img src="/logo.png?v=2" alt="Nikitha Logo" style={{ height: "45px", objectFit: "contain" }} />
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="main-title" style={{ padding: "6px" }}>
                        Interview Assessment Form
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="subtitle" style={{ padding: "4px" }}>
                        Private &amp; Confidential
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Position Applied For</td>
                      <td>{telephonic.positionAppliedFor || c.job_role || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Department</td>
                      <td>{telephonic.department || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Location</td>
                      <td>{telephonic.location || ""}</td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="section-header" style={{ padding: "6px" }}>
                        Personal Information of Candidate
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Name of candidate</td>
                      <td>{telephonic.name || c.name || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Date of Birth &amp; Age</td>
                      <td>{telephonic.dob || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Qualification</td>
                      <td>{telephonic.qualification || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Year of Passing</td>
                      <td>{telephonic.yearOfPassing || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Presently working with</td>
                      <td>{telephonic.currentCompany || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Designation</td>
                      <td>{telephonic.currentDesignation || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Previous Firm</td>
                      <td>{telephonic.previousFirm || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Designation</td>
                      <td>{telephonic.previousDesignation || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Overall Experience (In Years)</td>
                      <td>{telephonic.overallExperience || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Relevant Experience for the post applied (In Years)</td>
                      <td>{telephonic.relevantExperience || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Salary drawn in the previous/current employment</td>
                      <td>{telephonic.currentSalary || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Expected Salary:</td>
                      <td>{telephonic.expectedSalary || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Specializations If any (Computer/Software)</td>
                      <td>{telephonic.specializations || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold", verticalAlign: "top" }}>Address:</td>
                      <td style={{ height: "50px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{telephonic.address || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Contact No.</td>
                      <td>{telephonic.phone || c.phone || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Referred by:</td>
                      <td>{telephonic.referredBy || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Notice Period:</td>
                      <td>{telephonic.noticePeriod || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold", verticalAlign: "top" }}>1.Telephonic Interview remarks by HR</td>
                      <td style={{ height: "65px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{telephonic.hrRemarks || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Signature:</td>
                      <td>{telephonic.hrSignature || ""}</td>
                    </tr>
                    <tr>
                      <td colSpan="2" className="section-header" style={{ padding: "6px" }}>
                        2. Telephonic / Face to Face Interview by Department
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Professional Experience</td>
                      <td>{tech.deptProfessionalExperience || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Professional Knowledge</td>
                      <td>{tech.deptProfessionalKnowledge || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Recommended for Final Interview</td>
                      <td>{tech.deptRecommended || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Rejected</td>
                      <td>{tech.deptRejected || ""}</td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ height: "65px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Remarks</div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{tech.deptRemarks || ""}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Name of Interviewer:</td>
                      <td>{tech.deptInterviewerName || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Signature:</td>
                      <td style={{ height: "35px", verticalAlign: "top" }}>{tech.deptSignature || ""}</td>
                    </tr>
                  </tbody>
                </table>
              </div>



              {/* PAGE 2: FACE TO FACE INTERVIEW HR */}
              <div className="printable-page">
                {/* Table 1: Face to Face Interview Parameters */}
                <table style={{ width: "100%", tableLayout: "fixed", marginBottom: "15px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th colSpan="2" className="centered-header" style={{ padding: "6px", fontSize: "13px" }}>
                        Face to Face Interview- HR
                      </th>
                    </tr>
                    <tr>
                      <th style={{ width: "75%", fontWeight: "bold" }}>Parameters</th>
                      <th style={{ width: "25%", fontWeight: "bold", textAlign: "center" }}>Ratings</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="2" style={{ fontWeight: "bold" }}>I Skills</td>
                    </tr>
                    {["Communication Skills", "Persuasion Skills", "Rapport Building", "Telephone Etiquettes", "Selling Skills", "Negotiating Skills", "Listening Skills", "Questioning Skills"].map(p => (
                      <tr key={p}>
                        <td style={{ paddingLeft: "15px" }}>{p}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{ratingVal("I. Skills", p)}</td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan="2" style={{ fontWeight: "bold" }}>II. Knowledge</td>
                    </tr>
                    {["Microsoft Word, Excel, PowerPoint", "Internet Usage & Data Finding"].map(p => (
                      <tr key={p}>
                        <td style={{ paddingLeft: "15px" }}>{p}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{ratingVal("II. Knowledge", p)}</td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan="2" style={{ fontWeight: "bold" }}>III. Self-Image</td>
                    </tr>
                    {["Confident", "Go Getter"].map(p => (
                      <tr key={p}>
                        <td style={{ paddingLeft: "15px" }}>{p}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{ratingVal("III. Self-Image", p)}</td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan="2" style={{ fontWeight: "bold" }}>IV. Traits</td>
                    </tr>
                    {["High Energy", "Persistent", "Willingness to learn", "Hospitable", "Honest"].map(p => (
                      <tr key={p}>
                        <td style={{ paddingLeft: "15px" }}>{p}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{ratingVal("IV. Traits", p)}</td>
                      </tr>
                    ))}

                    <tr>
                      <td colSpan="2" style={{ fontWeight: "bold" }}>V. Motives</td>
                    </tr>
                    {["Hungry for Personal Growth", "Win-Win Philosophy"].map(p => (
                      <tr key={p}>
                        <td style={{ paddingLeft: "15px" }}>{p}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{ratingVal("V. Motives", p)}</td>
                      </tr>
                    ))}

                    <tr>
                      <td style={{ fontWeight: "bold", background: "#eef2ff" }}>Overall Score (Average)</td>
                      <td style={{ textAlign: "center", fontWeight: "bold", background: "#eef2ff", color: "#1a3fa6" }}>
                        {(() => {
                          let sum = 0;
                          let count = 0;
                          ["I. Skills", "II. Knowledge", "III. Self-Image", "IV. Traits", "V. Motives"].forEach(cat => {
                            const catData = f2f.ratings?.[cat];
                            if (catData && typeof catData === 'object') {
                              Object.values(catData).forEach(val => {
                                const num = parseFloat(val);
                                if (!isNaN(num)) {
                                  sum += num;
                                  count++;
                                }
                              });
                            }
                          });
                          return count > 0 ? (sum / count).toFixed(2) : "0.00";
                        })()} / 10
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ fontWeight: "bold" }}>Remarks by HR</td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ height: "75px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>
                        {f2f.overallRemarks || ""}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Table 2: Verification of Documents */}
                <table style={{ width: "100%", tableLayout: "fixed", marginBottom: "0", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th colSpan="3" className="centered-header" style={{ padding: "6px" }}>
                        Verification of documents &amp; Reference check
                      </th>
                    </tr>
                    <tr>
                      <th style={{ width: "60%", fontWeight: "bold" }}>Documents</th>
                      <th style={{ width: "20%", fontWeight: "bold", textAlign: "center" }}>Checked</th>
                      <th style={{ width: "20%", fontWeight: "bold", textAlign: "center" }}>Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Academics Certificates & Marks Card's", key: "docsAcademics" },
                      { label: "Pay slips", key: "docsPayslips" },
                      { label: "Experience/Relieving Letters", key: "docsExperience" },
                      { label: "Address Proof & ID Proof", key: "docsIdProof" },
                      { label: "Two Reference check", key: "docsTwoRef" }
                    ].map(({ label, key }) => (
                      <tr key={key}>
                        <td>{label}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{checkMark(f2f[`${key}_checked`])}</td>
                        <td style={{ textAlign: "center", fontWeight: "bold" }}>{checkMark(f2f[`${key}_verified`])}</td>
                      </tr>
                    ))}
                    <tr>
                      <td style={{ height: "40px" }}></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>



              {/* PAGE 3: FINAL INTERVIEW & BENEFITS */}
              <div className="printable-page">
                {/* Table 1: Final Interview */}
                <table style={{ width: "100%", tableLayout: "fixed", marginBottom: "15px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th colSpan="3" className="centered-header" style={{ padding: "6px" }}>
                        Final Interview
                      </th>
                    </tr>
                    <tr>
                      <th style={{ width: "35%", fontWeight: "bold" }}>Reviewed by</th>
                      <th style={{ width: "20%", fontWeight: "bold", textAlign: "center" }}>Date</th>
                      <th style={{ width: "45%", fontWeight: "bold" }}>Assessment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'deptTechTest', label: 'Dept. Technical Test', height: "40px" },
                      { key: 'deptTechF2F', label: 'Dept. /Technical Interview-Face to face', height: "75px" },
                      { key: 'hrManagerIntv', label: 'Interview- HR Manager', height: "75px" },
                      { key: 'directorIntv', label: 'Interview - Director', height: "75px" }
                    ].map(row => (
                      <tr key={row.key}>
                        <td style={{ fontWeight: "bold", verticalAlign: "top" }}>{row.label}</td>
                        <td style={{ textAlign: "center", verticalAlign: "top" }}>{fmtDate(finalInt[`${row.key}_date`])}</td>
                        <td style={{ whiteSpace: "pre-wrap", height: row.height, verticalAlign: "top" }}>
                          {finalInt[`${row.key}_assessment`] || ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table 2: Employee Benefits */}
                <table style={{ width: "100%", tableLayout: "fixed", marginBottom: "15px", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th colSpan="2" className="centered-header" style={{ padding: "6px" }}>
                        Employee Benefits
                      </th>
                    </tr>
                    <tr>
                      <th style={{ width: "50%", fontWeight: "bold" }}>Benefits</th>
                      <th style={{ width: "50%", fontWeight: "bold" }}>Eligibility</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Accommodation', key: 'benAccommodation' },
                      { label: 'Food Allowance', key: 'benFood' },
                      { label: 'Transportation', key: 'benTransport' },
                      { label: 'SIM', key: 'benSIM' },
                      { label: 'Email ID & ERP', key: 'benEmail' },
                      { label: 'Laptop', key: 'benLaptop' }
                    ].map(b => (
                      <tr key={b.key}>
                        <td>{b.label}</td>
                        <td>{negotiation[b.key] || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table 3: Final Assessment Sheet */}
                <table style={{ width: "100%", tableLayout: "fixed", marginBottom: "0", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th colSpan="2" className="centered-header" style={{ padding: "6px" }}>
                        Final Assessment Sheet (For HR Only)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="2" style={{ padding: "10px 12px", lineHeight: "1.6", fontSize: "12px" }}>
                        Mr/Mrs/Ms. <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "bold" }}>{negotiation.selectedName || c.name || "____________________"}</span> selected as <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "bold" }}>{negotiation.selectedAs || c.job_role || "____________________"}</span> and gross salary will be Rs. <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "bold" }}>{negotiation.ctcPerMonth || "____________"}</span> Per month and Rs <span style={{ textDecoration: "underline", padding: "0 4px", fontWeight: "bold" }}>{negotiation.ctcPerAnnum || c.salary || "____________"}</span> Gross Salary/ CTC. Per Annum
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold", width: "40%" }}>Reporting Manager:</td>
                      <td>{negotiation.reportingManager || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold", verticalAlign: "top" }}>Salary Review Remarks:</td>
                      <td style={{ height: "50px", verticalAlign: "top", whiteSpace: "pre-wrap" }}>{negotiation.salaryRemarks || ""}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: "bold" }}>Expected Date of joining :</td>
                      <td>{fmtDate(negotiation.expectedDateOfJoining || c.joining_date)}</td>
                    </tr>
                    <tr>
                      <td colSpan="2" style={{ height: "55px", verticalAlign: "top", fontWeight: "bold" }}>
                        Assistant Manager- HR and Admin
                      </td>
                    </tr>
                    <tr>
                      <td style={{ height: "60px", verticalAlign: "top", fontWeight: "bold", width: "50%" }}>
                        Director-Administration
                      </td>
                      <td style={{ height: "60px", verticalAlign: "top", fontWeight: "bold", width: "50%" }}>
                        Managing Director
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalHired = counts.hired;
  const totalRejected = counts.rejected;
  const totalEvals = totalHired + totalRejected;
  const successRate = totalEvals > 0 ? Math.round((totalHired / totalEvals) * 100) : 0;
  const rejectedRate = totalEvals > 0 ? Math.round((totalRejected / totalEvals) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex-col gap-4"
    >
      <div className="glass-card">
        {/* HEADER */}
        <div className="hero mb-4">
          <h1>📜 Candidates History</h1>
          <p className="text-muted">AI ATS Recruitment System</p>
        </div>

        {/* DASHBOARD WIDGETS SECTION */}
        <motion.div 
          className="stats-grid"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 }
            }
          }}
          initial="hidden"
          animate="show"
        >
          {/* Widget 1: Total Evaluations */}
          <motion.div 
            className="stat-card-premium stat-card-blue"
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
            }}
          >
            <div className="stat-icon-wrapper icon-bg-blue">📊</div>
            <div className="stat-info">
              <span className="stat-label">Total Evaluations</span>
              <span className="stat-value">{totalEvals}</span>
              <span className="stat-subtext">Hired &amp; Rejected logs</span>
            </div>
          </motion.div>

          {/* Widget 2: Hired Stats */}
          <motion.div 
            className="stat-card-premium stat-card-green"
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
            }}
          >
            <div className="stat-icon-wrapper icon-bg-green">🎉</div>
            <div className="stat-info">
              <span className="stat-label">Hired Candidates</span>
              <span className="stat-value">{totalHired}</span>
              <span className="stat-subtext">{successRate}% Success Rate</span>
            </div>
          </motion.div>

          {/* Widget 3: Rejected Stats */}
          <motion.div 
            className="stat-card-premium stat-card-red"
            variants={{
              hidden: { opacity: 0, y: 15 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 20 } }
            }}
          >
            <div className="stat-icon-wrapper icon-bg-red">❌</div>
            <div className="stat-info">
              <span className="stat-label">Rejected Candidates</span>
              <span className="stat-value">{totalRejected}</span>
              <span className="stat-subtext">{rejectedRate}% Rejection Rate</span>
            </div>
          </motion.div>
        </motion.div>

        {/* CANDIDATES TABLE CARD */}
        <div className="glass-card" style={{ marginTop: "20px", padding: "24px 20px" }}>
          <div className="flex-between mb-4" style={{ flexWrap: "wrap", gap: "16px" }}>
            <h3 className="upload-card-title" style={{ margin: 0 }}>
              📄 Candidate History Records
              <span style={{ marginLeft: "10px", fontSize: "14px", color: "#94a3b8" }}>
                ({filtered.length} candidates)
              </span>
            </h3>
            
            {/* FILTERS */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
              {/* Search */}
              <div className="search-wrapper" style={{ margin: 0, minWidth: "220px" }}>
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search name, email, role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-input"
                  style={{ padding: "10px 12px 10px 38px", borderRadius: "12px", fontSize: "13px" }}
                />
              </div>

              {/* Domain Filter */}
              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="select-dropdown"
                style={{ padding: "10px 32px 10px 12px", borderRadius: "12px", fontSize: "13px", minWidth: "140px" }}
              >
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d === "All" ? "All Domains" : d}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select-dropdown"
                style={{ padding: "10px 32px 10px 12px", borderRadius: "12px", fontSize: "13px", minWidth: "130px" }}
              >
                <option value="All">All Statuses</option>
                <option value="Hired">Hired Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
            </div>
          </div>

          {error && <p style={{ color: "#ef4444", fontSize: "13px", margin: "0 0 16px 0", fontWeight: "600" }}>⚠️ {error}</p>}

          {loading && (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "80px 40px", fontSize: "15px", fontWeight: "600" }}>
              <span style={{ display: "inline-block", animation: "spin 1.5s linear infinite", fontSize: "24px", marginBottom: "8px" }}>⏳</span>
              <div>Loading historical records...</div>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "80px 40px",
                color: "#94a3b8",
                background: "#ffffff",
                borderRadius: "24px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.02)"
              }}
            >
              <span style={{ fontSize: "48px", display: "block", marginBottom: "16px" }}>🗂️</span>
              <h3 style={{ margin: "0 0 6px 0", color: "#475569", fontWeight: "700", fontSize: "16px" }}>No Candidate History Found</h3>
              <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8" }}>Try adjusting your search terms, domain, or status filters.</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="table-container">
              <table className="modern-table">
                <thead>
                  {statusFilter === "Hired" && (
                    <tr>
                      <th style={{ width: "24%" }}>Candidate</th>
                      <th style={{ width: "18%" }}>Position</th>
                      <th style={{ width: "12%" }}>Job Type</th>
                      <th style={{ width: "12%" }}>Package</th>
                      <th style={{ width: "12%" }}>Joining Date</th>
                      <th style={{ width: "10%" }}>Report</th>
                      <th style={{ width: "8%" }}>Status</th>
                      <th style={{ width: "4%", textAlign: "center" }}>Actions</th>
                    </tr>
                  )}
                  {statusFilter === "Rejected" && (
                    <tr>
                      <th style={{ width: "24%" }}>Candidate</th>
                      <th style={{ width: "18%" }}>Position</th>
                      <th style={{ width: "14%" }}>Rejected Round</th>
                      <th style={{ width: "12%" }}>Action Date</th>
                      <th style={{ width: "16%" }}>Notification</th>
                      <th style={{ width: "10%" }}>Report</th>
                      <th style={{ width: "8%" }}>Status</th>
                      <th style={{ width: "4%", textAlign: "center" }}>Actions</th>
                    </tr>
                  )}
                  {statusFilter === "All" && (
                    <tr>
                      <th style={{ width: "22%" }}>Candidate</th>
                      <th style={{ width: "16%" }}>Position</th>
                      <th style={{ width: "14%" }}>Type / Round</th>
                      <th style={{ width: "12%" }}>Package / Date</th>
                      <th style={{ width: "14%" }}>Joining / Rejection</th>
                      <th style={{ width: "10%" }}>Report</th>
                      <th style={{ width: "8%" }}>Status</th>
                      <th style={{ width: "4%", textAlign: "center" }}>Actions</th>
                    </tr>
                  )}
                </thead>
                <motion.tbody
                  key={statusFilter + "-" + selectedDomain}
                  variants={{
                    hidden: { opacity: 0 },
                    show: {
                      opacity: 1,
                      transition: { staggerChildren: 0.05 }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                >
                  {filtered.map((c) => {
                    const uniqueKey = `${c.status}-${c.id}`;
                    const isEditing = editingId === uniqueKey;
                    return (
                      <motion.tr
                        key={uniqueKey}
                        variants={{
                          hidden: { opacity: 0, y: 10 },
                          show: { opacity: 1, y: 0 }
                        }}
                        transition={{ duration: 0.25 }}
                        style={{ position: "relative", zIndex: activeSettingsMenu === uniqueKey ? 10 : 1 }}
                      >
                        {/* Column 1: Candidate Name & Email */}
                        <td>
                          <div className="table-avatar-wrapper">
                            <div className={`table-avatar ${c.status === "hired" ? "table-avatar-hired" : "table-avatar-rejected"}`}>
                              {initials(c.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: "800", color: "#0f172a" }}>{c.name || "Unknown Candidate"}</div>
                              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "500", marginTop: "2px" }}>{c.email || "No email provided"}</div>
                            </div>
                          </div>
                        </td>

                        {/* Column 2: Position */}
                        <td>
                          {isEditing ? (
                            <input
                              className="table-edit-input"
                              value={c.job_role || ""}
                              onChange={(e) => updateField(c.id, c.status, "job_role", e.target.value)}
                            />
                          ) : (
                            <span style={{ fontWeight: "700", color: "#334155", textTransform: "capitalize" }}>{c.job_role || "—"}</span>
                          )}
                        </td>

                        {/* Column 3: Job Type / Round */}
                        {statusFilter === "Hired" && (
                          <td>
                            {isEditing ? (
                              <select
                                className="table-edit-input"
                                value={c.job_type || "Full-Time"}
                                onChange={(e) => updateField(c.id, c.status, "job_type", e.target.value)}
                              >
                                <option value="Full-Time">Full-Time</option>
                                <option value="Intern">Intern</option>
                                <option value="Contract">Contract</option>
                              </select>
                            ) : (
                              <span className="job-type-badge">{c.job_type || "Full-Time"}</span>
                            )}
                          </td>
                        )}
                        {statusFilter === "Rejected" && (
                          <td>
                            <span style={{ fontWeight: "700", color: "#ef4444" }}>{c.rejected_round || "—"}</span>
                          </td>
                        )}
                        {statusFilter === "All" && (
                          <td>
                            {c.status === "hired" ? (
                              <span className="job-type-badge">{c.job_type || "Full-Time"}</span>
                            ) : (
                              <span style={{ fontWeight: "700", color: "#ef4444" }}>{c.rejected_round || "—"}</span>
                            )}
                          </td>
                        )}

                        {/* Column 4: Package / Date */}
                        {statusFilter === "Hired" && (
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="table-edit-input"
                                value={c.salary || ""}
                                onChange={(e) => updateField(c.id, c.status, "salary", e.target.value)}
                              />
                            ) : (
                              <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                {c.salary ? `₹ ${c.salary} LPA` : "—"}
                              </span>
                            )}
                          </td>
                        )}
                        {statusFilter === "Rejected" && (
                          <td>
                            <span style={{ fontWeight: "600", color: "#475569" }}>{fmtDate(c.sent_at)}</span>
                          </td>
                        )}
                        {statusFilter === "All" && (
                          <td>
                            {c.status === "hired" ? (
                              <span style={{ fontWeight: "700", color: "#0f172a" }}>
                                {c.salary ? `₹ ${c.salary} LPA` : "—"}
                              </span>
                            ) : (
                              <span style={{ fontWeight: "600", color: "#475569" }}>{fmtDate(c.sent_at)}</span>
                            )}
                          </td>
                        )}

                        {/* Column 5: Joining Date / Rejection Status */}
                        {statusFilter === "Hired" && (
                          <td>
                            {isEditing ? (
                              <input
                                type="date"
                                className="table-edit-input"
                                value={getIsoDate(c.joining_date)}
                                onChange={(e) => updateField(c.id, c.status, "joining_date", e.target.value)}
                              />
                            ) : (
                              <span style={{ fontWeight: "600", color: "#475569" }}>{fmtDate(c.joining_date)}</span>
                            )}
                          </td>
                        )}
                        {statusFilter === "Rejected" && (
                          <td>
                            <div style={{ fontSize: "12.5px", color: "#059669", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                              <span>✔️</span> Rejection Email Dispatched
                            </div>
                          </td>
                        )}
                        {statusFilter === "All" && (
                          <td>
                            {c.status === "hired" ? (
                              <span style={{ fontWeight: "600", color: "#475569" }}>{fmtDate(c.joining_date)}</span>
                            ) : (
                              <div style={{ fontSize: "12.5px", color: "#059669", display: "flex", alignItems: "center", gap: "6px", fontWeight: "600" }}>
                                <span>✔️</span> Rejection Email Dispatched
                              </div>
                            )}
                          </td>
                        )}

                        {/* Column 6: Report */}
                        <td>
                          <button
                            onClick={() => handleOpenFormsModal(c)}
                            className={`btn-report ${c.status === "hired" ? "btn-report-hired" : "btn-report-rejected"}`}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: "4px", flexShrink: 0 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                              <line x1="16" y1="13" x2="8" y2="13"></line>
                              <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            View
                          </button>
                        </td>

                        {/* Column 7: Status Badge */}
                        <td>
                          <span className={`table-badge ${c.status === "hired" ? "table-badge-hired" : "table-badge-rejected"}`}>
                            <span className={`status-dot ${c.status === "hired" ? "status-dot-hired" : "status-dot-rejected"}`}></span>
                            {c.status === "hired" ? "Hired" : "Rejected"}
                          </span>
                        </td>

                        {/* Column 8: Row Actions Menu */}
                        <td style={{ textAlign: "center", position: "relative", zIndex: activeSettingsMenu === uniqueKey ? 50 : 1 }}>
                          <div className="table-actions-dropdown-wrapper">
                            <button
                              onClick={() => setActiveSettingsMenu(activeSettingsMenu === uniqueKey ? null : uniqueKey)}
                              className="table-actions-btn"
                            >
                              •••
                            </button>
                            
                            {activeSettingsMenu === uniqueKey && (
                              <div className="table-action-menu">
                                {c.status === "hired" && (
                                  <button
                                    onClick={() => {
                                      setEditingId(isEditing ? null : uniqueKey);
                                      setActiveSettingsMenu(null);
                                    }}
                                    className="table-action-item"
                                  >
                                    {isEditing ? "❌ Cancel Edit" : "✏️ Edit Details"}
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    deleteCandidate(c.id, c.status);
                                    setActiveSettingsMenu(null);
                                  }}
                                  className="table-action-item delete"
                                >
                                  🗑️ Delete Record
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RENDER THE printable preview modal */}
      {renderPrintableModal()}
    </motion.div>
  );
}