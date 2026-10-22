<p align="center">
  <img src="./Frontend/public/logo.png" alt="Ask My Doc Logo" width="150" height="150">
</p>

<h1 align="center">Ask My Doc</h1>

<p align="center">
  <strong>Chat with your PDF Documents using AI</strong>
</p>

<p align="center">
  Upload your PDF and get instant AI-powered answers. Simple, fast, and intelligent.
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#project-structure">Project Structure</a>
</p>

---

## Overview

**Ask My Doc** is a full-stack RAG (Retrieval-Augmented Generation) application that enables users to upload PDF documents and engage in intelligent conversations about their content. The application leverages cutting-edge AI technology to extract, process, and understand document content, delivering accurate, context-aware answers through natural language interactions.

## Features

**Document Management**
- PDF Upload with drag-and-drop or click-to-upload interface
- Fast document processing and real-time feedback
- Secure user-specific document storage

**AI-Powered Interactions**
- Natural language conversations about document content
- Semantic search with vector embeddings
- Context-aware responses with chat history retention
- Powered by LLaMA 3.3 70B for accurate generation

**User Experience**
- Secure authentication powered by Clerk
- Modern, responsive dark-themed interface with cyan accents
- Intuitive navigation and clean design
- Real-time processing with instant responses

## Screenshots

### Landing Page
The landing page welcomes users with a clean, modern interface featuring the main call-to-action and key features.

![Landing Page](./Frontend/public/landing.png)

### Authentication
Secure authentication powered by Clerk with multiple sign-in options including Google OAuth and email.

![Authentication](./Frontend/public/auth_clerk.png)

### Upload Page
Intuitive drag-and-drop interface for uploading PDF documents.

![Upload Page](./Frontend/public/upload.png)

### Chat Interface
Clean, modern chat interface for asking questions about your documents.

![Chat Interface](./Frontend/public/chat.png)

## Tech Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19 | UI Framework |
| **Vite** | 7 | Build Tool & Dev Server |
| **Tailwind CSS** | 4 | Styling |
| **React Router** | 7 | Client-side Routing |
| **Clerk** | Latest | Authentication |
| **Axios** | Latest | HTTP Client |
| **Lucide React** | Latest | Icons |

### Backend Technologies

| Technology | Purpose |
|------------|---------|
| **FastAPI** | Python Web Framework |
| **LangChain** | LLM Orchestration Framework |
| **Pinecone** | Vector Database |
| **Google Gemini** | Text Embeddings |
| **Groq (LLaMA 3.3 70B)** | Large Language Model |
| **PDFPlumber** | PDF Text Extraction |
| **Uvicorn** | ASGI Server |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  FRONTEND                                    │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Landing   │───▶│    Auth     │───▶│   Upload    │───▶│    Chat     │  │
│  │    Page     │    │   (Clerk)   │    │    Page     │    │    Page     │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│         React + Vite + Tailwind CSS + React Router                          │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │ HTTP/REST API
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                  BACKEND                                     │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           FastAPI Server                                │ │
│  │  ┌──────────────────┐              ┌──────────────────┐                │ │
│  │  │  /upload         │              │  /chat           │                │ │
│  │  │  POST endpoint   │              │  POST endpoint   │                │ │
│  │  └────────┬─────────┘              └────────┬─────────┘                │ │
│  └───────────┼─────────────────────────────────┼──────────────────────────┘ │
│              ▼                                 ▼                             │
│  ┌──────────────────┐              ┌──────────────────────────────────────┐ │
│  │  PDF Processing  │              │         RAG Pipeline                  │ │
│  │  ┌─────────────┐ │              │  ┌────────┐  ┌─────────┐  ┌────────┐ │ │
│  │  │ PDFPlumber  │ │              │  │Retriever│─▶│ Prompt  │─▶│  LLM   │ │ │
│  │  └──────┬──────┘ │              │  └────────┘  └─────────┘  └────────┘ │ │
│  │         ▼        │              │       ▲                        │      │ │
│  │  ┌─────────────┐ │              │       │                        ▼      │ │
│  │  │Text Splitter│ │              │  ┌────────────────────────────────┐  │ │
│  │  └──────┬──────┘ │              │  │   Groq (LLaMA 3.3 70B Model)   │  │ │
│  │         ▼        │              │  └────────────────────────────────┘  │ │
│  │  ┌─────────────┐ │              └──────────────────────────────────────┘ │
│  │  │  Embeddings │ │                                                       │
│  │  │   (Gemini)  │ │                                                       │
│  │  └──────┬──────┘ │                                                       │
│  └─────────┼────────┘                                                       │
│            ▼                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    Pinecone Vector Database                            │  │
│  │                  (Stores document embeddings)                          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### System Workflow

1. **Document Upload** - User uploads a PDF document through the frontend interface
2. **Text Extraction** - PDFPlumber extracts text content from the PDF file
3. **Chunking** - Text is split into manageable chunks using `RecursiveCharacterTextSplitter`
4. **Embedding Generation** - Each chunk is converted to vector embeddings using Google Gemini
5. **Vector Storage** - Embeddings are stored in Pinecone vector database with metadata
6. **Query Processing** - When user asks a question, relevant chunks are retrieved from Pinecone
7. **Answer Generation** - LLaMA 3.3 70B generates a response using retrieved context and chat history

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** - Version 18 or higher
- **Python** - Version 3.9 or higher
- **npm** or **yarn** - Package manager for Node.js
- **pip** - Package installer for Python

### Required API Keys

You will need API keys from the following services:

| Service | Purpose | Sign Up |
|---------|---------|---------|
| **Clerk** | Authentication | [clerk.com](https://clerk.com) |
| **Pinecone** | Vector Database | [pinecone.io](https://www.pinecone.io) |
| **Google AI** | Embeddings | [ai.google.dev](https://ai.google.dev) |
| **Groq** | LLM Inference | [console.groq.com](https://console.groq.com) |

### Installation

#### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/ask-my-doc.git
cd ask-my-doc
```

#### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd Backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in the `Backend` directory with the following variables:

```env
PINECONE_API_KEY=your_pinecone_api_key
GEMINI_API_KEY=your_google_ai_api_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b
EMBEDDING_MODEL_NAME=models/gemini-embedding-001
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=ask_my_doc
```

#### Step 3: Frontend Setup

```bash
# Navigate to frontend directory
cd ../Frontend

# Install dependencies
npm install
```

Create a `.env` file in the `Frontend` directory with the following variable:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

#### Step 4: Pinecone Configuration

1. Create a free account at [Pinecone](https://www.pinecone.io)
2. Create a new index with the following settings:
   - **Index Name**: `ask-my-doc`
   - **Dimensions**: `768` (required for Gemini embeddings)
   - **Metric**: `cosine`
   - **Cloud Provider**: Choose your preferred region

### Running the Application

#### Start the Backend Server

```bash
cd Backend
python main.py
```

The backend server will start at `http://localhost:8000`

You should see output indicating the server is running successfully.

#### Start the Frontend Development Server

```bash
cd Frontend
npm run dev
```

The frontend application will be available at `http://localhost:5173`

Open your browser and navigate to the provided URL to start using the application.

## API Reference

### Base URL

```
http://localhost:8000
```

### Endpoints

#### Health Check

```http
GET /
```

**Description**: Verify that the backend server is running

**Response**:
```json
{
  "message": "Server is running"
}
```

**Status Codes**:
- `200 OK` - Server is operational

---

#### Upload Document

```http
POST /upload
```

**Description**: Upload and process a PDF document

**Request**:
- **Content-Type**: `multipart/form-data`
- **Parameters**:
  - `file` (required) - PDF file to upload
  - `userId` (required) - Unique identifier for the user

**Response**:
```json
{
  "filename": "document.pdf",
  "userId": "user_123",
  "status": "Uploaded & Processed Successfully",
  "chunks_created": 42
}
```

**Status Codes**:
- `200 OK` - Document uploaded and processed successfully
- `400 Bad Request` - Invalid file format or missing parameters
- `500 Internal Server Error` - Processing error

---

#### Chat

```http
POST /chat
```

**Description**: Send a query and receive an AI-generated response based on the uploaded document

**Request**:
```json
{
  "query": "What is this document about?",
  "userId": "user_123",
  "history": [
    {
      "role": "user",
      "content": "Previous question"
    },
    {
      "role": "assistant",
      "content": "Previous answer"
    }
  ]
}
```

**Parameters**:
- `query` (required) - The user's question
- `userId` (required) - Unique identifier for the user
- `history` (optional) - Array of previous conversation messages

**Response**:
```json
{
  "answer": "This document is about..."
}
```

**Status Codes**:
- `200 OK` - Query processed successfully
- `400 Bad Request` - Invalid request parameters
- `404 Not Found` - No document found for user
- `500 Internal Server Error` - Processing error

## Project Structure

```
Ask My Doc/
├── Backend/
│   ├── main.py              # FastAPI server & endpoints
│   ├── utils.py             # Document processing & RAG pipeline
│   ├── requirements.txt     # Python dependencies
│   ├── .env                 # Environment variables (not tracked)
│   └── uploads/             # Uploaded PDF storage directory
│
├── Frontend/
│   ├── public/
│   │   ├── logo.png         # Application logo
│   │   ├── landing.png      # Landing page screenshot
│   │   ├── auth_clerk.png   # Authentication screenshot
│   │   ├── upload.png       # Upload page screenshot
│   │   └── chat.png         # Chat interface screenshot
│   │
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx  # Landing page component
│   │   │   ├── Upload.jsx   # Upload page component
│   │   │   └── Chat.jsx     # Chat interface component
│   │   │
│   │   ├── App.jsx          # Main app with routing configuration
│   │   ├── main.jsx         # React entry point
│   │   └── *.css            # Stylesheets
│   │
│   ├── package.json         # Node.js dependencies
│   ├── vite.config.js       # Vite build configuration
│   └── .env                 # Environment variables (not tracked)
│
└── README.md                # Project documentation
```

## Security Features

**Authentication & Authorization**
- All upload and chat routes are protected by Clerk authentication
- Secure token-based authentication flow
- Support for multiple authentication methods (OAuth, email)

**Data Protection**
- User isolation - each user's documents are associated with their unique user ID
- Route guards prevent unauthorized access to chat functionality
- Documents only accessible after successful upload

**API Security**
- CORS middleware configured for secure cross-origin requests
- Environment variables for sensitive API keys
- Secure file upload handling with validation

## Design System

The application uses a modern, dark-themed design with carefully selected colors for optimal readability and user experience.

### Color Palette

| Element | Color | Hex Code |
|---------|-------|----------|
| **Background** | Slate 950 | `#0f172a` |
| **Surface** | Slate 800 | `#1e293b` |
| **Primary** | Cyan 500 | `#06b6d4` |
| **Text Primary** | White | `#ffffff` |
| **Text Secondary** | Slate 400 | `#94a3b8` |
| **Success** | Emerald 400 | `#10b981` |
| **Error** | Red 500 | `#ef4444` |

### Design Principles

- **Consistency** - Uniform spacing and component styling throughout
- **Accessibility** - High contrast ratios for text readability
- **Responsiveness** - Optimized for desktop, tablet, and mobile devices
- **User Feedback** - Clear visual indicators for loading states and user actions

## Contributing

Contributions are welcome and appreciated. To contribute to this project:

1. **Fork the repository** to your GitHub account
2. **Create a feature branch** from main
   ```bash
   git checkout -b feature/AmazingFeature
   ```
3. **Make your changes** and commit them with clear, descriptive messages
   ```bash
   git commit -m 'Add some AmazingFeature'
   ```
4. **Push to your branch**
   ```bash
   git push origin feature/AmazingFeature
   ```
5. **Open a Pull Request** with a detailed description of your changes

Please ensure your code follows the existing style and includes appropriate tests where applicable.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

This project was made possible by the following technologies and services:

- [LangChain](https://langchain.com/) - Excellent LLM orchestration framework
- [Clerk](https://clerk.com/) - Seamless authentication solution
- [Pinecone](https://www.pinecone.io/) - High-performance vector database
- [Groq](https://groq.com/) - Blazing fast LLM inference
- [Google AI](https://ai.google.dev/) - Powerful embedding models
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [React](https://react.dev/) - Robust UI library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

<p align="center">
  Made with care by @dhruv0050
</p>

<p align="center">
  <a href="https://github.com/dhruv0050/ask-my-doc">GitHub Repository</a>
</p>
