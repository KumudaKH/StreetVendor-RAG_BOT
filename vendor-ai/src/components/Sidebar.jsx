import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";

function parseSections(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const sections = [];
  let currentSection = null;

  for (const line of lines) {
    const h3Match = line.match(/^###\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h1Match = line.match(/^#\s+(.+)/);
    const boldMatch = line.match(/^\*\*(.+?)\*\*/);

    if (h3Match || h2Match || h1Match || boldMatch) {
      if (currentSection) sections.push(currentSection);
      currentSection = {
        title: (h3Match?.[1] || h2Match?.[1] || h1Match?.[1] || boldMatch?.[1] || "").trim(),
        content: ""
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function Sidebar({ isOpen, onClose, onNewChat, chatHistory, onSelectChat, activeChatId, onDeleteChat, onPinChat, onLogout, onClearAll }) {
  const [openMenuId, setOpenMenuId] = useState(null);
  const [expandedChats, setExpandedChats] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);
  const username = localStorage.getItem("streetVendorUser") || "User";

  const closeMenu = useCallback(() => setOpenMenuId(null), []);

  useEffect(() => {
    const handleClick = (event) => {
      if (!event.target.closest('.history-menu-btn') && !event.target.closest('.history-options-menu')) {
        closeMenu();
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeMenu]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chatHistory;
    const q = searchQuery.toLowerCase();
    return chatHistory.filter((c) => {
      const titleMatch = c.title?.toLowerCase().includes(q);
      const msgMatch = c.messages?.some((m) => m.text?.toLowerCase().includes(q));
      return titleMatch || msgMatch;
    });
  }, [chatHistory, searchQuery]);

  const toggleChat = (chatId) => {
    setExpandedChats((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
  };

  const toggleAll = () => {
    const newState = !allExpanded;
    setAllExpanded(newState);
    const newExpanded = {};
    filteredChats.forEach((c) => { newExpanded[c.id] = newState; });
    setExpandedChats(newExpanded);
  };

  const handleMenuToggle = (chatId, e) => {
    e.stopPropagation();
    setOpenMenuId(prev => prev === chatId ? null : chatId);
  };

  const handleOptionClick = (action, chat, e) => {
    e.stopPropagation();
    closeMenu();
    switch (action) {
      case "delete":
        onDeleteChat(chat.id);
        break;
      case "pin":
        onPinChat(chat.id);
        break;
      case "share":
        const shareText = chat.messages.map((m) =>
          `${m.sender === "user" ? "You" : "AI"}: ${m.text}`
        ).join("\n\n");
        navigator.clipboard.writeText(shareText);
        break;
      default:
        break;
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Delete all chat history? This cannot be undone.")) {
      onClearAll();
    }
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <button className="new-chat-btn" onClick={onNewChat}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New chat
          </button>
          <button className="sidebar-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="sidebar-search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery("")}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        <div className="sidebar-toolbar">
          <button className="toolbar-btn" onClick={toggleAll}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {allExpanded ? (
                <path d="M4 4h16M4 12h16M4 20h16"/>
              ) : (
                <>
                  <path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>
                </>
              )}
            </svg>
            {allExpanded ? "Collapse" : "Expand"}
          </button>
          {chatHistory.length > 0 && (
            <button className="toolbar-btn danger" onClick={handleClearAll}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Clear
            </button>
          )}
        </div>

        <div className="sidebar-content">
          {filteredChats.length === 0 ? (
            <div className="sidebar-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{opacity: 0.4, marginBottom: 8}}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p>{searchQuery ? "No matching conversations" : "No conversations yet"}</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <ChatHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeChatId}
                isExpanded={expandedChats[chat.id] || false}
                expandedSections={expandedSections}
                onSelect={onSelectChat}
                onToggle={toggleChat}
                onMenuToggle={handleMenuToggle}
                onOptionClick={handleOptionClick}
                openMenuId={openMenuId}
              />
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-small">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="sidebar-username">{username}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

function ChatHistoryItem({ chat, isActive, isExpanded, expandedSections, onSelect, onToggle, onMenuToggle, onOptionClick, openMenuId }) {
  const aiMessage = chat.messages?.find((m) => m.sender === "ai");
  const sections = useMemo(() => parseSections(aiMessage?.text), [aiMessage?.text]);
  const menuOpen = openMenuId === chat.id;

  return (
    <div className={`history-item ${isActive ? "active" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <div
        className={`history-header ${isExpanded ? "expanded" : ""}`}
        onClick={() => onToggle(chat.id)}
      >
        <div className="history-chevron">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
        <div className="history-info">
          <span className="history-title">{chat.title}</span>
          <span className="history-meta">
            {chat.timestamp ? formatTime(chat.timestamp) : ""}
            {sections.length > 0 && ` · ${sections.length} sections`}
          </span>
        </div>
        <button
          className="history-menu-btn"
          onClick={(e) => onMenuToggle(chat.id, e)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
          </svg>
        </button>
      </div>

      {isExpanded && sections.length > 0 && (
        <div className="history-sections">
          {sections.map((section, idx) => (
            <div key={idx} className="history-section" onClick={(e) => { e.stopPropagation(); onSelect(chat.id); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <span className="section-title">{section.title}</span>
            </div>
          ))}
        </div>
      )}

      {isExpanded && sections.length === 0 && (
        <div className="history-sections">
          <div className="history-section" onClick={(e) => { e.stopPropagation(); onSelect(chat.id); }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="section-title">View response</span>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="history-options-menu">
          <button onClick={(e) => onOptionClick("pin", chat, e)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z"/>
            </svg>
            {chat.pinned ? "Unpin" : "Pin"}
          </button>
          <button onClick={(e) => onOptionClick("share", chat, e)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
          <div className="menu-divider"></div>
          <button className="delete-option" onClick={(e) => onOptionClick("delete", chat, e)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
