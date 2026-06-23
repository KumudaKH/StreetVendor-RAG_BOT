import React from "react";

function Header({ onToggleSidebar }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onToggleSidebar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <div className="header-brand">
          <span className="brand-name">Street Vendor AI</span>
        </div>
      </div>
    </header>
  );
}

export default Header;
