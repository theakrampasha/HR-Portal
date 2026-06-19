import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "../styles.css";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-container">
      {/* SIDEBAR NAVIGATION */}
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileOpen && (
        <div 
          className="mobile-overlay" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* MAIN CONTAINER PANEL */}
      <div className="main-content">
        <Header onMenuToggle={() => setMobileOpen(!mobileOpen)} />
        {children}
      </div>
    </div>
  );
}