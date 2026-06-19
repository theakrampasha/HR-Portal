import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "../styles.css";

export default function Sidebar({ mobileOpen, onClose }) {
  const location = useLocation();

  const menuItems = [
    { path: "/", label: "Upload", icon: "📂" },
    { path: "/candidates", label: "Candidates", icon: "👥" },
    { path: "/final", label: "Final", icon: "🎯" },
    { path: "/history", label: "History", icon: "📜" },
    { path: "/reports", label: "Reports", icon: "📊" },
  ];

  return (
    <div className={`sidebar ${mobileOpen ? "open" : ""}`}>
      {/* MOBILE CLOSE ICON */}
      <button 
        className="sidebar-close-btn"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--border-color)",
          borderRadius: "50%",
          width: "32px",
          height: "32px",
          display: "none", // Controlled via media queries
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        ✕
      </button>
      
      <motion.div 
        className="logo-box"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="logo-circle">
          <img src="/logo.png?v=2" alt="logo" />
        </div>
        <h2>
          Nikitha Build Tech Pvt.Ltd.
        </h2>
      </motion.div>

      {/* NAVIGATION */}
      <nav className="nav-links" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {menuItems.map((item, index) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.4, ease: "easeOut" }}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link 
                className={isActive ? "active" : ""} 
                to={item.path}
                onClick={onClose}
                style={{ position: "relative", width: "100%" }}
              >
                <span style={{ marginRight: "12px", display: "inline-block" }}>{item.icon}</span> 
                {item.label}
                {isActive && (
                  <motion.div 
                    layoutId="activeSidebarIndicator"
                    style={{
                      position: "absolute",
                      left: "-24px",
                      top: "50%",
                      y: "-50%",
                      width: "6px",
                      height: "28px",
                      borderRadius: "0 4px 4px 0",
                      background: "#0f172a",
                    }}
                  />
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* USER PROFILE & LOGOUT */}
      <div style={styles.userProfileSection}>
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>
            {(localStorage.getItem("username") || "A").charAt(0).toUpperCase()}
          </div>
          <div style={styles.userDetails}>
            <span style={styles.userName}>{localStorage.getItem("username") || "Admin"}</span>
            <span style={styles.userEmail}>{localStorage.getItem("gmail") || "admin@gmail.com"}</span>
          </div>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("username");
            localStorage.removeItem("gmail");
            window.location.href = "/";
          }}
          style={styles.logoutButton}
          className="sidebar-logout-btn"
        >
          <span>🚪</span> Logout
        </button>
      </div>

    </div>
  );
}

const styles = {
  userProfileSection: {
    marginTop: "auto",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "0 8px",
  },
  userAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: "15px",
    boxShadow: "inset 0 1px 2px rgba(255, 255, 255, 0.2)",
  },
  userDetails: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  userName: {
    color: "#f8fafc",
    fontSize: "13px",
    fontWeight: "700",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  userEmail: {
    color: "#94a3b8",
    fontSize: "11px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  logoutButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "10px 16px",
    borderRadius: "12px",
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.2)",
    color: "#fca5a5",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.3s",
    width: "100%",
  }
};

if (typeof document !== "undefined" && !document.getElementById("sidebar-extra-styles")) {
  const style = document.createElement("style");
  style.id = "sidebar-extra-styles";
  style.innerHTML = `
    .sidebar-logout-btn:hover {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ffffff !important;
      border-color: rgba(239, 68, 68, 0.4) !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
    }
  `;
  document.head.appendChild(style);
}