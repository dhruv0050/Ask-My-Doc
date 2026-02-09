from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Server is running"}

from utils import process_document, get_answer
from pydantic import BaseModel

class Query(BaseModel):
    query: str
    userId: str 
    history: list = []

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), userId: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    num_chunks = process_document(file_path)

    return {
        "filename": file.filename, 
        "userId": userId, 
        "status": "Uploaded & Processed Successfully", 
        "chunks_created": num_chunks
    }

@app.post("/chat")
def chat(query: Query):
    answer = get_answer(query.query, query.history)
    return {"answer": answer}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
