from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("FRONTEND_URL", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

mongo_client = MongoClient(os.getenv("MONGODB_URI", "mongodb://localhost:27017"))
try:
    database = mongo_client.get_default_database()
    if database is None:
        database = mongo_client[os.getenv("MONGODB_DATABASE", "AskMyDoc")]
except Exception:
    database = mongo_client[os.getenv("MONGODB_DATABASE", "AskMyDoc")]
documents = database.documents
conversations = database.conversations
documents.create_index([("userId", 1), ("createdAt", -1)])
conversations.create_index([("userId", 1), ("documentId", 1), ("updatedAt", -1)])

@app.get("/")
def read_root():
    return {"message": "Server is running"}

from utils import process_document, get_answer, get_answer_with_context
from pydantic import BaseModel

def now():
    return datetime.now(timezone.utc)

def serialize_document(document):
    return {
        "id": str(document["_id"]), "filename": document["filename"],
        "chunksCreated": document.get("chunksCreated", 0), "createdAt": document["createdAt"],
    }

def serialize_conversation(conversation, include_messages=False):
    payload = {
        "id": str(conversation["_id"]), "documentId": conversation["documentId"],
        "title": conversation.get("title", "New chat"), "createdAt": conversation["createdAt"],
        "updatedAt": conversation["updatedAt"],
    }
    if include_messages:
        payload["messages"] = conversation.get("messages", [])
    return payload

def get_owned_document(document_id, user_id):
    if not ObjectId.is_valid(document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    document = documents.find_one({"_id": ObjectId(document_id), "userId": user_id})
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

class ChatRequest(BaseModel):
    query: str
    userId: str
    documentId: str
    conversationId: str

class ConversationRequest(BaseModel):
    userId: str
    documentId: str

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), userId: str = Form(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    safe_filename = Path(file.filename or "document.pdf").name
    file_path = UPLOAD_DIR / f"{uuid4()}_{safe_filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        document_id = ObjectId()
        num_chunks = process_document(str(file_path), namespace=str(document_id))
        timestamp = now()
        documents.insert_one({"_id": document_id, "userId": userId, "filename": safe_filename,
                              "chunksCreated": num_chunks, "createdAt": timestamp})
        conversation_id = conversations.insert_one({"userId": userId, "documentId": str(document_id),
            "title": "New chat", "messages": [], "createdAt": timestamp, "updatedAt": timestamp}).inserted_id
    except Exception:
        file_path.unlink(missing_ok=True)
        raise
    return {
        "status": "Uploaded and processed successfully",
        "document": serialize_document(documents.find_one({"_id": document_id})),
        "conversation": serialize_conversation(conversations.find_one({"_id": conversation_id}))
    }

@app.get("/documents")
def list_documents(userId: str):
    return [serialize_document(item) for item in documents.find({"userId": userId}).sort("createdAt", -1)]

@app.get("/conversations")
def list_conversations(userId: str, documentId: str):
    get_owned_document(documentId, userId)
    return [serialize_conversation(item) for item in conversations.find(
        {"userId": userId, "documentId": documentId}).sort("updatedAt", -1)]

@app.post("/conversations")
def create_conversation(request: ConversationRequest):
    get_owned_document(request.documentId, request.userId)
    timestamp = now()
    conversation = {"userId": request.userId, "documentId": request.documentId, "title": "New chat",
                    "messages": [], "createdAt": timestamp, "updatedAt": timestamp}
    inserted_id = conversations.insert_one(conversation).inserted_id
    return serialize_conversation(conversations.find_one({"_id": inserted_id}))

@app.get("/conversations/{conversation_id}")
def get_conversation(conversation_id: str, userId: str):
    if not ObjectId.is_valid(conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation = conversations.find_one({"_id": ObjectId(conversation_id), "userId": userId})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return serialize_conversation(conversation, include_messages=True)

@app.post("/chat")
def chat(request: ChatRequest):
    get_owned_document(request.documentId, request.userId)
    if not ObjectId.is_valid(request.conversationId):
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation = conversations.find_one({"_id": ObjectId(request.conversationId), "userId": request.userId,
                                           "documentId": request.documentId})
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    question = request.query.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    rag_result = get_answer_with_context(question, conversation.get("messages", [])[-12:], namespace=request.documentId)
    answer = rag_result["answer"]
    contexts = rag_result.get("contexts", [])
    timestamp = now()
    updates = {"$push": {"messages": {"$each": [
        {"role": "user", "content": question, "createdAt": timestamp},
        {"role": "assistant", "content": answer, "contexts": contexts, "createdAt": timestamp},
    ]}}, "$set": {"updatedAt": timestamp}}
    if conversation.get("title") == "New chat":
        updates["$set"]["title"] = question[:60]
    conversations.update_one({"_id": conversation["_id"]}, updates)
    return {"answer": answer, "conversationId": request.conversationId}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
