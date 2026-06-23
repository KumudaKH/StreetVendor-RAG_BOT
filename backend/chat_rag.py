from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama

VECTOR_DB = "../vectordb"

# Load embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Load Chroma vector database
db = Chroma(
    persist_directory=VECTOR_DB,
    embedding_function=embeddings,
)

# Create retriever
retriever = db.as_retriever(
    search_kwargs={"k": 3}
)

# Load Ollama model
llm = ChatOllama(
    model="llama3.2"
)

while True:
    question = input("\nAsk: ")

    if question.lower() in ["exit", "quit"]:
        break

    docs = retriever.invoke(question)

    context = "\n\n".join([doc.page_content for doc in docs])

    prompt = f"""
You are a helpful AI assistant for street vendors.

Use ONLY the context below to answer.

Context:
{context}

Question:
{question}

Answer:
"""

    response = llm.invoke(prompt)

    print("\nAnswer:\n")
    print(response.content)