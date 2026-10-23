import os
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from dotenv import load_dotenv

load_dotenv()

# Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "models/gemini-embedding-001")
# text-embedding-001 was retired; transparently upgrade older local .env files.
if EMBEDDING_MODEL_NAME.removeprefix("models/") == "text-embedding-001":
    EMBEDDING_MODEL_NAME = "models/gemini-embedding-001"
index_name = os.getenv("PINECONE_INDEX_NAME", "ask-my-doc")

# Initialize Embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model=EMBEDDING_MODEL_NAME,
    google_api_key=GEMINI_API_KEY
)

def process_document(file_path: str, namespace: str):
    # 1. Load the PDF
    loader = PDFPlumberLoader(file_path)
    docs = loader.load()
    
    # 2. Split the text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        add_start_index=True
    )
    splits = text_splitter.split_documents(docs)
    
    # 3. Store in Pinecone (Vector Database)
    # This automatically computes embeddings using the 'embeddings' model and upserts them
    PineconeVectorStore.from_documents(
        documents=splits,
        embedding=embeddings,
        index_name=index_name,
        namespace=namespace
    )

    return len(splits)

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Initialize Groq LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
llm = ChatGroq(
    model=GROQ_MODEL,
    temperature=0,
    api_key=GROQ_API_KEY
)

RAG_TEMPLATE = """
You are a helpful, precise document assistant. Answer the user's question relying STRICTLY and EXCLUSIVELY on the provided Context and conversation History.

CRITICAL RULES:
1. Grounding: Every fact and claim in your answer must be directly supported by the Context below. Do NOT assume, extrapolate, or bring in outside knowledge that is not in the Context.
2. Missing Information: If the question asks for facts, details, or topics that are NOT explicitly mentioned in the Context (such as unmentioned terms, personal details like author age/nationality, or external subjects), do NOT guess. Simply respond:
"This information is not mentioned in the provided document."
3. Formatting: Write in a clean, single-column reading flow with short paragraphs. Use simple Markdown headings or bullet points only when helpful. Never use HTML, tables, column layouts, or pipe characters.

Context:
{context}

History:
{history}

Question:
{question}

Answer:
"""
custom_rag_prompt = PromptTemplate.from_template(RAG_TEMPLATE)

def format_history(history):
    formatted = ""
    for msg in history:
        role = msg.get("role")
        content = msg.get("content")
        if role == "user":
            formatted += f"User: {content}\n"
        elif role == "assistant":
            formatted += f"Assistant: {content}\n"
    return formatted

def get_answer_with_context(query: str, chat_history: list, namespace: str):
    """
    Retrieves chunks from Pinecone and generates an answer, returning both
    the text answer and the retrieved context chunks (essential for Ragas evaluation).
    """
    top_k = int(os.getenv("TOP_K", 4))
    vectorstore = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings,
        namespace=namespace
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
    docs = retriever.invoke(query)
    contexts = [doc.page_content for doc in docs]

    chain = custom_rag_prompt | llm | StrOutputParser()
    answer = chain.invoke({
        "context": "\n\n".join(contexts),
        "history": format_history(chat_history),
        "question": query
    })

    return {
        "answer": answer,
        "contexts": contexts
    }

def get_answer(query: str, chat_history: list, namespace: str):
    result = get_answer_with_context(query, chat_history, namespace)
    return result["answer"]
