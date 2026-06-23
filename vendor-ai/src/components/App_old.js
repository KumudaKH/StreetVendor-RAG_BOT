import React, { useState } from "react";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  const askAI = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
        }),
      });

      const data = await response.json();

      setAnswer(data.answer);
    } catch (err) {
      setAnswer("Backend is not running.");
    }
  };

  return (
   <div className="container">
   <h1 className="title">
🤖 Street Vendor AI Assistant
</h1>


      <textarea
        rows="4"
        cols="60"
        placeholder="Ask your question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <br /><br />

      <button onClick={askAI}>
        Ask AI
      </button>

      <hr />
<h2>AI Response</h2>

<div className="answer">
  {answer}
</div>

      <div>
        {answer}
      </div>
    </div>
  );
}

export default App;