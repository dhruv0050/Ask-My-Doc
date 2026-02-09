import os
from langchain_community.document_loaders import PDFPlumberLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone
from dotenv import load_dotenv

load_dotenv()

# Configuration
PINE_API_KEY = os.getenv("PINECONE_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "models/embedding-001") 

pc = Pinecone(api_key=PINE_API_KEY)
index_name = "ask-my-doc" 

# Initialize Embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/gemini-embedding-001", 
    google_api_key=GEMINI_API_KEY
)

def process_document(file_path: str):
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
        index_name=index_name
    )

    return len(splits)

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Initialize Groq LLM
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
llm = ChatGroq(
    model="llama-3.3-70b-versatile", 
    temperature=0,
    api_key=GROQ_API_KEY
)

from langchain_core.messages import AIMessage, HumanMessage

def get_answer(query: str, chat_history: list):
    # 1. Retrieve relevant chunks from Pinecone
    vectorstore = PineconeVectorStore(
        index_name=index_name,
        embedding=embeddings
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

    # 2. Define the RAG prompt with history
    template = """
    You are a helpful assistant. Use the following context and conversation history to answer the question.
    If you don't know the answer, just say you don't know.
    
    Context: {context}
    
    History: {history}
    
    Question: {question}
    
    Answer:
    """
    custom_rag_prompt = PromptTemplate.from_template(template)

    # 3. Create the Chain
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
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

    rag_chain = (
        {
            "context": (lambda x: x["question"]) | retriever | format_docs, 
            "history": lambda x: format_history(x["history"]), 
            "question": lambda x: x["question"]
        }
        | custom_rag_prompt
        | llm
        | StrOutputParser()
    )

    # 4. Generate Answer
    return rag_chain.invoke({"question": query, "history": chat_history})
