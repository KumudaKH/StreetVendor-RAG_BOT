import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import ChatInput from "./components/ChatInput";
import Loader from "./components/Loader";
import Login from "./components/Login";
import "./App.css";

const SUGGESTIONS = [
  "What is PM SVANidhi?",
  "How to get Udyam Registration?",
  "How to create a UPI QR code?",
  "MSME benefits",
  "Digital marketing tips",
];

const loadChatHistory = () => {
  try {
    const saved = localStorage.getItem("streetVendorChatHistory");
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const loadChatIdCounter = () => {
  try {
    const saved = localStorage.getItem("streetVendorChatIdCounter");
    if (saved) return parseInt(saved, 10);
    const history = JSON.parse(localStorage.getItem("streetVendorChatHistory") || "[]");
    if (history.length > 0) {
      return Math.max(...history.map((c) => c.id || 0));
    }
    return 0;
  } catch {
    return 0;
  }
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("streetVendorAuth") === "true";
  });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState(loadChatHistory);
  const [activeChatId, setActiveChatId] = useState(null);
  const chatIdCounterRef = useRef(loadChatIdCounter());
  const chatEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    localStorage.setItem("streetVendorChatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem("streetVendorChatIdCounter", String(chatIdCounterRef.current));
  }, [chatHistory]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const userMsg = { sender: "user", text, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const tempId = Date.now();
    setMessages((prev) => [...prev, { id: tempId, sender: "ai", text: "", timestamp: Date.now() }]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error("Server Error");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setMessages((prev) => prev.map((m) =>
          m.id === tempId ? { ...m, text: fullText } : m
        ));
      }

      setMessages((prev) => {
        const updated = prev.map((m) =>
          m.id === tempId ? { ...m, text: fullText || "⚠️ Empty response" } : m
        );
        updateChatHistory(updated);
        return updated;
      });
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempId ? { ...m, text: "⚠️ Generation stopped." } : m
          );
          updateChatHistory(updated);
          return updated;
        });
      } else {
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.id === tempId ? { ...m, text: "⚠️ " + err.message } : m
          );
          updateChatHistory(updated);
          return updated;
        });
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const updateChatHistory = (currentMessages) => {
    if (currentMessages.length === 0) return;
    const firstUserMsg = currentMessages.find((m) => m.sender === "user");
    const title = firstUserMsg ? firstUserMsg.text.slice(0, 50) : "New chat";

    setChatHistory((prev) => {
      const existing = prev.find((c) => c.id === activeChatId);
      if (existing) {
        return prev.map((c) =>
          c.id === activeChatId ? { ...c, title, messages: currentMessages, timestamp: Date.now() } : c
        );
      } else {
        const newChat = { id: activeChatId, title, messages: currentMessages, timestamp: Date.now() };
        return [newChat, ...prev];
      }
    });
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveChatId(null);
    setSidebarOpen(false);
  };

  const handleDeleteChat = (chatId) => {
    setChatHistory((prev) => prev.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setMessages([]);
      setActiveChatId(null);
    }
  };

  const handlePinChat = (chatId) => {
    setChatHistory((prev) =>
      prev.map((c) => c.id === chatId ? { ...c, pinned: !c.pinned } : c)
    );
  };

  const handleSelectChat = (chatId) => {
    const chat = chatHistory.find((c) => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setActiveChatId(chat.id);
    }
    setSidebarOpen(false);
  };

  const handleStartChat = (text) => {
    chatIdCounterRef.current += 1;
    setActiveChatId(chatIdCounterRef.current);
    sendMessage(text);
  };

  const handleSend = (text) => {
    if (!activeChatId) {
      chatIdCounterRef.current += 1;
      setActiveChatId(chatIdCounterRef.current);
    }
    sendMessage(text);
  };

  const handleClearAll = () => {
    setChatHistory([]);
    setMessages([]);
    setActiveChatId(null);
    localStorage.removeItem("streetVendorChatHistory");
  };

  const handleLogout = () => {
    localStorage.removeItem("streetVendorAuth");
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        chatHistory={chatHistory}
        onSelectChat={handleSelectChat}
        activeChatId={activeChatId}
        onDeleteChat={handleDeleteChat}
        onPinChat={handlePinChat}
        onLogout={handleLogout}
        onClearAll={handleClearAll}
      />

      <div className="main-area">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />

        <main className="chat-area">
          {messages.length === 0 && !loading ? (
            <div className="welcome-screen">
              <h1 className="welcome-title">Ready when you are.</h1>
              <div className="suggestions-grid">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    className="suggestion-card"
                    onClick={() => handleStartChat(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="messages-container">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.sender === "user" ? "user" : "ai"}`}>
                  <div className="message-content">
                    <div className={`bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}>
                      {msg.sender === "user" ? (
                        <span>{msg.text}</span>
                      ) : (
                        <div className="markdown-body">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                    {msg.text && (
                      <div className="message-actions">
                        <button
                          className="action-btn"
                          onClick={() => handleCopy(msg.text, msg.id || i)}
                          title={copiedId === (msg.id || i) ? "Copied!" : "Copy"}
                        >
                          {copiedId === (msg.id || i) ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20 6L9 17l-5-5"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                            </svg>
                          )}
                          <span>{copiedId === (msg.id || i) ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  {msg.sender === "user" && (
                    <div className="avatar user-avatar">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="loader-row">
                  <Loader />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </main>

        <ChatInput onSend={handleSend} loading={loading} />
      </div>
    </div>
  );
}

export default App;
