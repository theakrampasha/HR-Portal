import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import toast, { Toaster } from "react-hot-toast";
import { AnimatePresence } from "framer-motion";

import UploadPage from "./components/pages/UploadPage";
import CandidatesPage from "./components/pages/CandidatesPage";
import FinalPage from "./components/pages/FinalPage";
import HistoryPage from "./components/pages/HistoryPage";
import SettingsPage from "./components/pages/SettingsPage";
import ReportsPage from "./components/pages/ReportsPage";
import Layout from "./components/Layout";
import LoginPage from "./components/LoginPage";
import SignUpPage from "./components/SignUpPage";

function App() {
  // Check for reset query parameter to clear localStorage
  const params = new URLSearchParams(window.location.search);
  if (params.get("reset") === "true") {
    localStorage.clear();
    window.location.href = window.location.origin;
    return null;
  }

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem("token"));
  const [authView, setAuthView] = useState("login");
  const [showStartupModal, setShowStartupModal] = useState(() => {
    const jobs = localStorage.getItem("jobs");
    return !jobs || JSON.parse(jobs).length === 0;
  });
  const [newRole, setNewRole] = useState("");

  const handleStartupSubmit = (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;

    const newJob = {
      id: Date.now(),
      name: newRole.trim(),
      jd: "",
      jdFile: null
    };

    localStorage.setItem("jobs", JSON.stringify([newJob]));
    localStorage.setItem("selectedJob", String(newJob.id));
    localStorage.setItem("activeJobId", String(newJob.id));
    localStorage.setItem("activeJob", newJob.name); // legacy compatibility

    setShowStartupModal(false);
  };

  if (!isAuthenticated) {
    return (
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(17, 24, 39, 0.9)",
              color: "#fff",
              borderRadius: "12px",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "12px 16px",
              fontSize: "14px",
            },
            success: {
              iconTheme: {
                primary: "#10b981",
                secondary: "#064e3b",
              },
            },
            error: {
              iconTheme: {
                primary: "#ef4444",
                secondary: "#7f1d1d",
              },
            },
          }}
        />
        {authView === "login" ? (
          <LoginPage
            onLoginSuccess={() => setIsAuthenticated(true)}
            onSwitchToSignUp={() => setAuthView("signup")}
          />
        ) : (
          <SignUpPage
            onSwitchToLogin={() => setAuthView("login")}
          />
        )}
      </Router>
    );
  }

  return (
    <Router>
      {showStartupModal && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: "450px", textAlign: "center", border: "1px solid rgba(255,255,255,0.15)" }}>
            <h1 style={{ fontSize: "24px", marginBottom: "10px", fontWeight: "800" }}>🚀 Get Started</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "20px", fontSize: "14px" }}>
              Which job role are you hiring for today? Enter the role to begin.
            </p>
            <form onSubmit={handleStartupSubmit}>
              <input
                type="text"
                className="modern-input"
                placeholder="e.g. Civil Engineer"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                autoFocus
                required
                style={{ textAlign: "center", fontSize: "16px", fontWeight: "600", background: "#fcfaf7" }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ width: "100%", marginTop: "20px", padding: "12px", fontSize: "15px" }}
              >
                Create Hiring Session
              </button>
            </form>
          </div>
        </div>
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#0f172a",
            color: "#ffffff",
            borderRadius: "12px",
            border: "1.5px solid rgba(255, 255, 255, 0.15)",
            padding: "16px 20px",
            fontSize: "15px",
            fontWeight: "600",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#ffffff",
            },
          },
        }}
      />

      <Layout>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/candidates" element={<CandidatesPage />} />
            <Route path="/final" element={<FinalPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Routes>
        </AnimatePresence>
      </Layout>

    </Router>
  );
}

export default App;