import os
import sys
import json
import argparse
import warnings
from datetime import datetime
from dotenv import load_dotenv

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

warnings.filterwarnings("ignore", category=DeprecationWarning)
load_dotenv()

from pymongo import MongoClient
from bson import ObjectId

def get_mongo_database():
    """Connects to the MongoDB database."""
    mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = MongoClient(mongo_uri)
    try:
        db = client.get_default_database()
        if db is not None:
            return db
    except Exception:
        pass
    db_name = os.getenv("MONGODB_DATABASE", "AskMyDoc")
    return client[db_name]

def list_documents():
    """Lists available documents stored in MongoDB."""
    try:
        db = get_mongo_database()
        docs = list(db.documents.find().sort("createdAt", -1))
        return [
            {
                "id": str(d["_id"]),
                "filename": d.get("filename", "Untitled"),
                "chunksCreated": d.get("chunksCreated", 0),
                "createdAt": d.get("createdAt")
            }
            for d in docs
        ]
    except Exception as e:
        print(f"[Warning] Could not fetch documents from MongoDB: {e}")
        return []

def list_conversations():
    """Lists conversations stored in MongoDB."""
    try:
        db = get_mongo_database()
        convs = list(db.conversations.find().sort("updatedAt", -1))
        return [
            {
                "id": str(c["_id"]),
                "title": c.get("title", "Untitled chat"),
                "documentId": c.get("documentId"),
                "messagesCount": len(c.get("messages", [])),
                "updatedAt": c.get("updatedAt")
            }
            for c in convs
        ]
    except Exception as e:
        print(f"[Warning] Could not fetch conversations from MongoDB: {e}")
        return []

def clear_conversations():
    """Clears all conversation history from MongoDB while keeping uploaded documents intact."""
    db = get_mongo_database()
    result = db.conversations.delete_many({})
    print(f"\n[Cleaned] Cleared {result.deleted_count} conversation(s) from database.")
    print("Uploaded documents remain in MongoDB and Pinecone. Ready for fresh chats!\n")

def init_evaluator():
    """Initializes evaluator LLM and Embeddings using Groq with proper token limits."""
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from langchain_groq import ChatGroq
    from utils import EMBEDDING_MODEL_NAME, GEMINI_API_KEY, GROQ_API_KEY, GROQ_MODEL

    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment.")

    # 1. Groq LLM with max_tokens=4096 to prevent LLMDidNotFinishException
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    # If the configured model is gpt-oss-20b or similar, llama-3.3-70b-versatile or llama-3.1-8b-instant is much better for evaluation
    groq_llm = ChatGroq(
        model=groq_model,
        temperature=0,
        max_tokens=4096,
        api_key=GROQ_API_KEY
    )
    evaluator_llm = LangchainLLMWrapper(groq_llm)

    # 2. Embeddings (Required for Answer Relevancy)
    evaluator_embeddings = None
    if GEMINI_API_KEY:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            evaluator_embeddings = LangchainEmbeddingsWrapper(
                GoogleGenerativeAIEmbeddings(
                    model=EMBEDDING_MODEL_NAME,
                    google_api_key=GEMINI_API_KEY
                )
            )
        except Exception:
            evaluator_embeddings = None

    if evaluator_embeddings is None:
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            evaluator_embeddings = LangchainEmbeddingsWrapper(
                HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
            )
        except Exception as e:
            print(f"[Notice] Using local embedding fallback failed: {e}")

    return evaluator_llm, evaluator_embeddings


def extract_turns_from_conversations(conversation_id: str = None, fallback_pinecone: bool = True):
    """
    Extracts real user questions, assistant answers, and retrieved contexts from MongoDB.
    If older messages lack saved contexts, it can optionally retrieve them from Pinecone.
    """
    db = get_mongo_database()
    query = {}
    if conversation_id:
        if not ObjectId.is_valid(conversation_id):
            raise ValueError(f"Invalid conversation ID format: {conversation_id}")
        query["_id"] = ObjectId(conversation_id)

    conversations = list(db.conversations.find(query).sort("updatedAt", -1))
    if not conversations:
        return []

    turns = []
    retriever_cache = {}

    for conv in conversations:
        conv_id_str = str(conv["_id"])
        conv_title = conv.get("title", "Chat")
        doc_id = conv.get("documentId")
        messages = conv.get("messages", [])

        # Process user -> assistant message pairs
        for i in range(len(messages) - 1):
            curr_msg = messages[i]
            next_msg = messages[i + 1]

            if curr_msg.get("role") == "user" and next_msg.get("role") == "assistant":
                user_question = curr_msg.get("content", "").strip()
                assistant_answer = next_msg.get("content", "").strip()
                contexts = next_msg.get("contexts", [])

                # Fallback retrieval for older messages that didn't have contexts saved
                if not contexts and fallback_pinecone and doc_id:
                    from langchain_pinecone import PineconeVectorStore
                    from utils import index_name, embeddings

                    if doc_id not in retriever_cache:
                        vectorstore = PineconeVectorStore(
                            index_name=index_name,
                            embedding=embeddings,
                            namespace=doc_id
                        )
                        retriever_cache[doc_id] = vectorstore.as_retriever(search_kwargs={"k": 4})
                    try:
                        retrieved_docs = retriever_cache[doc_id].invoke(user_question)
                        contexts = [d.page_content for d in retrieved_docs]
                    except Exception as err:
                        print(f"[Warning] Could not retrieve context from Pinecone for '{user_question}': {err}")
                        contexts = []

                if user_question and assistant_answer and contexts:
                    turns.append({
                        "conversation_id": conv_id_str,
                        "conversation_title": conv_title,
                        "question": user_question,
                        "answer": assistant_answer,
                        "contexts": contexts
                    })

    return turns

def evaluate_turns(turns: list[dict], output_csv: str = "ragas_live_chat_report.csv"):
    """
    Runs Ragas evaluation on real conversation turns.
    """
    if not turns:
        print("[Notice] No conversation turns with valid contexts found to evaluate.")
        print("Please ask questions in the Ask My Doc chat interface first!\n")
        return None

    print(f"\n=======================================================")
    print(f"  Evaluating {len(turns)} Real Conversation Turns via Ragas")
    print(f"=======================================================\n")

    evaluator_llm, evaluator_embeddings = init_evaluator()

    from datasets import Dataset
    from ragas import evaluate
    from ragas.metrics import faithfulness, answer_relevancy

    questions = [t["question"] for t in turns]
    answers = [t["answer"] for t in turns]
    contexts_list = [t["contexts"] for t in turns]

    eval_dict = {
        "user_input": questions,
        "response": answers,
        "retrieved_contexts": contexts_list
    }
    ragas_dataset = Dataset.from_dict(eval_dict)

    # Faithfulness & Answer Relevancy are the gold standard for live unlabelled interactions
    # Set strictness=1 so Groq does not reject requests with n > 1
    answer_relevancy.strictness = 1
    metrics = [faithfulness, answer_relevancy]

    print("[1/2] Computing Faithfulness (hallucination check) & Answer Relevancy...")
    from ragas.run_config import RunConfig
    run_config = RunConfig(timeout=180, max_retries=5, max_workers=2)

    results = evaluate(
        dataset=ragas_dataset,
        metrics=metrics,
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
        run_config=run_config,
        raise_exceptions=False
    )

    print("\n[2/2] Compiling results...")
    import pandas as pd
    df = results.to_pandas()
    
    # Enrich DataFrame with conversation metadata
    df.insert(0, "conversation_title", [t["conversation_title"] for t in turns])
    df.to_csv(output_csv, index=False, encoding="utf-8")
    print(f"\n>>> Full detailed report saved to: {os.path.abspath(output_csv)}")

    # Print clean summary table
    print("\n----------------- PER-TURN SCORES -----------------")
    for idx, row in df.iterrows():
        q_preview = (row["user_input"][:45] + "...") if len(row["user_input"]) > 45 else row["user_input"]
        f_score = row.get("faithfulness", float("nan"))
        a_score = row.get("answer_relevancy", float("nan"))
        f_str = f"{f_score:.2f}" if not pd.isna(f_score) else "N/A"
        a_str = f"{a_score:.2f}" if not pd.isna(a_score) else "N/A"
        print(f" Turn #{idx + 1:<2} | Q: \"{q_preview:<48}\" | Faithfulness: {f_str} | Relevancy: {a_str}")

    print("\n---------------- OVERALL PIPELINE SUMMARY ----------------")
    for col in ["faithfulness", "answer_relevancy"]:
        if col in df.columns:
            mean_score = df[col].dropna().mean()
            if not pd.isna(mean_score):
                print(f"  {col.replace('_', ' ').capitalize():<24}: {mean_score:.4f}")
    print("----------------------------------------------------------\n")

    return df

def main():
    parser = argparse.ArgumentParser(description="Evaluate Ask My Doc RAG pipeline on real user conversations using Ragas.")
    parser.add_argument("--conv-id", type=str, help="Specific conversation ID to evaluate.")
    parser.add_argument("--list-chats", action="store_true", help="List all saved chats/conversations in MongoDB.")
    parser.add_argument("--list-docs", action="store_true", help="List all documents in MongoDB.")
    parser.add_argument("--clear-chats", action="store_true", help="Clear past conversation history to start fresh.")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of conversation turns to evaluate.")
    parser.add_argument("--output", type=str, default="ragas_live_chat_report.csv", help="Output CSV path for report.")
    args = parser.parse_args()

    if args.clear_chats:
        clear_conversations()
        return

    if args.list_docs:
        docs = list_documents()
        print("\n--- Available Documents in MongoDB ---")
        if not docs:
            print("No documents found.")
        else:
            for d in docs:
                print(f"ID: {d['id']} | Filename: {d['filename']} | Chunks: {d['chunksCreated']}")
        print("--------------------------------------\n")
        return

    if args.list_chats:
        convs = list_conversations()
        print("\n--- Available Conversations in MongoDB ---")
        if not convs:
            print("No conversations found.")
        else:
            for c in convs:
                print(f"ID: {c['id']} | Title: \"{c['title']}\" | Messages: {c['messagesCount']}")
        print("------------------------------------------\n")
        return

    # Extract real turns from MongoDB
    turns = extract_turns_from_conversations(conversation_id=args.conv_id)
    if args.limit and args.limit > 0:
        turns = turns[:args.limit]
    evaluate_turns(turns, output_csv=args.output)

if __name__ == "__main__":
    main()
