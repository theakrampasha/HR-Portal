import { useEffect, useState } from "react";
import "../styles.css";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header({ onMenuToggle }) {
  const [time, setTime] = useState(new Date());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const date = time.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const day = time.toLocaleDateString("en-IN", {
    weekday: "long",
  });

  const clock = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const getPageTitle = (pathname) => {
    switch (pathname) {
      case "/":
        return "Upload Portal";
      case "/candidates":
        return "Candidates Dashboard";
      case "/final":
        return "Hiring Pipeline";
      case "/history":
        return "Hired History";
      case "/reports":
        return "Recruitment Reports";
      case "/settings":
        return "Settings";
      default:
        return "Dashboard";
    }
  };

  const [jobs, setJobs] = useState([]);
  const [activeJobId, setActiveJobId] = useState("");

  useEffect(() => {
    const handleStorage = () => {
      const savedJobs = JSON.parse(localStorage.getItem("jobs") || "[]");
      setJobs(savedJobs);
      setActiveJobId(localStorage.getItem("selectedJob") || "");
    };
    handleStorage();
    // Poll local storage to keep the header synced with page components
    const interval = setInterval(handleStorage, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleChange = (e) => {
    const id = e.target.value;
    setActiveJobId(id);
    localStorage.setItem("selectedJob", id);
    localStorage.setItem("activeJobId", id);
    const job = jobs.find((j) => String(j.id) === id);
    if (job) localStorage.setItem("activeJob", job.name);
    // Dispatch a custom event in case components listen to it
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div className="top-header" style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#ffffff",
      borderRadius: "20px",
      padding: "12px 20px",
      marginBottom: "30px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
      border: "1px solid #f1f5f9",
      gap: "12px",
      overflowX: "auto"
    }}>
      <div className="header-left" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            onClick={onMenuToggle}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#64748b",
              display: "flex",
              alignItems: "center",
              padding: 0
            }}
          >
            ☰
          </button>
          <h2 className="page-title" style={{ 
            margin: 0, 
            fontSize: "18px", 
            fontWeight: "700", 
            color: "#0f172a",
            whiteSpace: "nowrap"
          }}>
            {getPageTitle(location.pathname)}
          </h2>
        </div>

        {/* ACTIVE ROLE SELECTOR */}
        {location.pathname !== "/history" && jobs.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            borderLeft: "2px solid #e2e8f0",
            paddingLeft: "16px"
          }}>
            <span style={{ 
              fontSize: "11px", 
              fontWeight: "700", 
              color: "#94a3b8", 
              letterSpacing: "0.5px", 
              textTransform: "uppercase",
              whiteSpace: "nowrap"
            }}>
              Active Role:
            </span>
            <select
              value={activeJobId}
              onChange={handleRoleChange}
              style={{
                padding: "6px 28px 6px 12px",
                background: "linear-gradient(to bottom, #f8fafc, #f1f5f9)",
                border: "1px solid #e2e8f0",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: "600",
                color: "#1e293b",
                cursor: "pointer",
                outline: "none",
                appearance: "none",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23475569' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
                whiteSpace: "nowrap",
                boxShadow: "inset 0 1px 2px rgba(255,255,255,0.8)"
              }}
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="header-right" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        
        {/* Individual Date Pill */}
        <div style={{
          background: "#f8fafc",
          padding: "6px 12px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap"
        }}>
          <span>📅</span> 
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>{date}</span>
        </div>

        {/* Individual Time Pill */}
        <div style={{
          background: "#f8fafc",
          padding: "6px 12px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap"
        }}>
          <span>⏰</span> 
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>{clock}</span>
        </div>

        {/* Individual Day Pill */}
        <div style={{
          background: "#f8fafc",
          padding: "6px 12px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap"
        }}>
          <span>✨</span> 
          <span style={{ fontSize: "12px", fontWeight: "600", color: "#475569" }}>{day}</span>
        </div>

        {/* Settings Button */}
        <button 
          onClick={() => navigate("/settings")}
          style={{
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "16px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.25)",
            whiteSpace: "nowrap"
          }}
        >
          <span>⚙️</span> Settings
        </button>
      </div>
    </div>
  );
}
