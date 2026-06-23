from memory import add_message, get_history
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from fastapi.middleware.cors import CORSMiddleware
from intent import detect_intent
import ollama

app = FastAPI(title="Street Vendor AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

db = Chroma(
    persist_directory="../vectordb",
    embedding_function=embeddings
)

# Reranker prompt
RERANKER_PROMPT = """You are a retrieval evaluator.

Question: {question}

Retrieved documents:
{docs}

Select only the documents that directly answer the question.
Remove unrelated information.
Return the most relevant context, numbered in order of relevance."""


class Question(BaseModel):
    question: str


@app.get("/")
def home():
    return {"message": "Street Vendor AI Backend Running"}


def rerank_documents(question, docs):
    """Use LLM to rerank and filter retrieved documents."""
    docs_text = "\n\n".join([
        f"[Doc {i+1}] {doc.page_content[:500]}" 
        for i, doc in enumerate(docs[:8])
    ])
    
    try:
        response = ollama.chat(
            model="llama3.2:latest",
            options={"temperature": 0.1, "num_predict": 800},
            messages=[
                {"role": "user", "content": RERANKER_PROMPT.format(
                    question=question, docs=docs_text
                )}
            ]
        )
        return response["message"]["content"]
    except Exception as e:
        print(f"Reranker error: {e}")
        return docs_text


@app.post("/ask")
def ask(data: Question):
    # Step 1: Hybrid intent detection
    intent, scheme = detect_intent(data.question)
    
    print("=" * 50)
    print(f"Question: {data.question}")
    print(f"Intent: {intent}")
    print(f"Scheme: {scheme}")
    
    # Step 2: MMR retrieval for diversity
    try:
        retriever = db.as_retriever(
            search_type="mmr",
            search_kwargs={
                "k": 8,
                "fetch_k": 20,
                "lambda_mult": 0.7
            }
        )
        docs = retriever.invoke(data.question)
    except Exception as e:
        print(f"MMR retrieval failed, using default: {e}")
        docs = db.similarity_search(data.question, k=8)
    
    print(f"Documents retrieved: {len(docs)}")
    
    # Step 3: Rerank documents
    print("Reranking documents...")
    reranked_context = rerank_documents(data.question, docs)
    
    add_message("User", data.question)
    
    # Step 4: Add scheme context
    scheme_context = ""
    if scheme == "pm_svanidhi":
        scheme_context = "\n\n[USER IS ASKING ABOUT PM SVANidhi SCHEME - LOAN TIERS: ₹10K → ₹20K → ₹50K]"
    elif scheme == "msme":
        scheme_context = "\n\n[USER IS ASKING ABOUT MSME/UDYAM REGISTRATION]"
    elif scheme == "digital_payments":
        scheme_context = "\n\n[USER IS ASKING ABOUT DIGITAL PAYMENTS - UPI/PHONEPE/GPAY]"
    elif intent == "price":
        scheme_context = "\n\n[USER IS ASKING ABOUT PRICES - CHECK BENGALURU MARKET DATA]"
    elif intent == "location":
        scheme_context = "\n\n[USER IS ASKING ABOUT LOCATIONS - CHECK BENGALURU MARKET DATA]"
    
    # Step 5: Generate answer with production-level prompt
    def generate():
        full_response = ""
        stream = ollama.chat(
            model="llama3.2:latest",
            options={"num_predict": 1200, "temperature": 0.2, "top_p": 0.9},
            messages=[
                {"role": "system", "content": """You are Street Vendor AI — an expert assistant for Indian street vendors.

CORE RULES:

1. Use ONLY the retrieved information provided below. Do NOT use outside knowledge or guess.

2. SCHEME ISOLATION: Each scheme (PM SVANidhi, MSME, UPI) has its own rules. Never mix facts between schemes.

3. COMPLETENESS CHECK: If the question asks about multiple parts (loan tiers, documents, steps), include ALL parts — not just the first one.

4. FORMAT LOAN AMOUNTS as clear sequences:
   - 1st Loan: ₹10,000 (after registration)
   - 2nd Loan: ₹20,000 (after repaying 1st)
   - 3rd Loan: ₹50,000 (after repaying 2nd)

5. NO FABRICATION: Never invent facts not in the context.

6. UNKNOWN INFO: Say "I don't have enough information. Please check with your local ULB office."

7. TONE: Simple, conversational. Use bullet points. 4-8 lines max.

8. Use **bold** for key terms. Use 💡 for tips, ✅ for benefits, ⚠️ for warnings."""},
                {"role": "user", "content": f"RERANKED CONTEXT:{scheme_context}\n\n{reranked_context}\n\nQuestion: {data.question}\n\nProvide a complete, accurate answer:"}
            ],
            stream=True
        )
        for chunk in stream:
            if "message" in chunk and "content" in chunk["message"]:
                token = chunk["message"]["content"]
                full_response += token
                yield token
        add_message("Assistant", full_response)

    return StreamingResponse(generate(), media_type="text/plain")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
