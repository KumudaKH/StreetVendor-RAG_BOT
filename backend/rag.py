from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings

try:
    from backend.ollama_llm import generate_answer
except ImportError:
    from ollama_llm import generate_answer


# Load embedding model
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

# Load ChromaDB
db = Chroma(
    persist_directory="../vectordb",
    embedding_function=embeddings
)


def main() -> None:
    print("=" * 60)
    print("        Street Vendor AI Assistant")
    print("=" * 60)

    while True:
        query = input("\nAsk your question (type 'exit' to quit): ")

        if query.lower() == "exit":
            break

        # Retrieve top 3 relevant chunks
        docs = db.similarity_search(query, k=3)

        # Combine retrieved text
        context = "\n\n".join([doc.page_content for doc in docs])

        # Generate answer using Ollama
        answer = generate_answer(query, context)

        print("\n" + "=" * 60)
        print("AI Answer")
        print("=" * 60)
        print(answer)
        print("=" * 60)


if __name__ == "__main__":
    main()
