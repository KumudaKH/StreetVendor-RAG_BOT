import React from "react";

function MessageBubble({ title, message }) {
  return (
    <div
      style={{
        background: "#f4f6f9",
        padding: "18px",
        borderRadius: "12px",
        marginTop: "20px"
      }}
    >
      <h3>{title}</h3>

      <div
        style={{
          whiteSpace: "pre-wrap",
          lineHeight: "1.7"
        }}
      >
        {message}
      </div>
    </div>
  );
}

export default MessageBubble;