# Street Vendor AI

A ChatGPT-style AI assistant for Indian street vendors, focused on Bengaluru market data, government schemes, and digital payment guidance.

## Features

- **Interactive Chat UI** - Clean, modern interface with message bubbles
- **Streaming Responses** - Text appears word-by-word as AI generates
- **Login System** - Username/password authentication
- **Chat History** - Collapsible sidebar with search, expand/collapse, delete
- **Market Data** - Bengaluru-specific pricing, locations, suppliers
- **Government Schemes** - PM SVANidhi, MSME/Udyam registration
- **Digital Payments** - UPI setup, QR codes, safety tips

## Tech Stack

- **Frontend**: React (CRA) + Plain CSS
- **Backend**: Python FastAPI + LangChain + ChromaDB
- **LLM**: Ollama (llama3.2)
- **Vector DB**: ChromaDB with 152 documents, 379 chunks

## Setup

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
ollama pull llama3.2
python app.py
```

### Frontend
```bash
cd vendor-ai
npm install
npm start
```


## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/login` | POST | User authentication |
| `/api/chat` | POST | Chat with AI (streaming) |
| `/api/history` | GET | Fetch chat history |
| `/api/health` | GET | Health check |


## Key Features

### RAG Pipeline
- Hybrid intent detection (keywords + LLM fallback)
- MMR retrieval for diverse chunks (k=8, fetch_k=20)
- LLM reranker for relevance filtering
- Scheme metadata filtering for accuracy

### Chat UI
- Gemini/Claude style clean typography
- Collapsible tree view in sidebar
- Search by question or response content
- Timestamps (Just now, 5m ago, etc.)
- Copy message, share, pin, delete

## License

Private - For Street Vendor AI Project
