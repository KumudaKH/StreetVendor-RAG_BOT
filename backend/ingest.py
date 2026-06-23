from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
import os
import glob

import os
import glob
import sys

DATA_DIR = "../data"
VECTOR_DB = "../vectordb"

if os.path.exists(VECTOR_DB):
    import shutil
    print("Removing old vector database...")
    try:
        shutil.rmtree(VECTOR_DB)
    except PermissionError:
        print("\nERROR: Cannot delete vectordb - it's being used by the backend server.")
        print("Please stop the backend first, then run this script again.")
        print("\nTo stop backend: Close the Python terminal running app.py")
        sys.exit(1)

print("Loading documents...")

all_docs = []

md_loader = DirectoryLoader(
    DATA_DIR,
    glob="**/*.md",
    loader_cls=TextLoader,
    loader_kwargs={"encoding": "utf-8"},
)
all_docs.extend(md_loader.load())

pdf_files = glob.glob(os.path.join(DATA_DIR, "**", "*.pdf"), recursive=True)
for pdf_path in pdf_files:
    try:
        loader = PyPDFLoader(pdf_path)
        all_docs.extend(loader.load())
    except Exception as e:
        print(f"Error loading {pdf_path}: {e}")

for doc in all_docs:
    source = doc.metadata.get("source", "")
    category = os.path.basename(os.path.dirname(source))
    doc.metadata["category"] = category

print(f"Documents loaded: {len(all_docs)}")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " "],
    length_function=len,
)

chunks = splitter.split_documents(all_docs)
print(f"Chunks created: {len(chunks)}")

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

db = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory=VECTOR_DB,
)

print("=================================")
print("Knowledge Base Created Successfully!")
print("Vector DB saved at:", VECTOR_DB)
print("=================================")
