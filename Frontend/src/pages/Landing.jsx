import React, { useEffect, useState } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { Link } from 'react-router-dom';
import { FileText, MessageSquare, Zap, History, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const Landing = () => {
  const { user } = useUser();
  const [documents, setDocuments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data } = await axios.get(`${API}/documents`, { params: { userId: user.id } });
        setDocuments(data);
      } catch {
        setDocuments([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    loadHistory();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/8 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex justify-between items-center max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Ask My Doc</span>
        </Link>
        <nav className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link to="/chat" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
              <History className="w-4 h-4" />
              Past chats
            </Link>
            <Link to="/upload" className="text-sm text-slate-400 hover:text-white transition-colors">
              Upload
            </Link>
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
          </SignedIn>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-32 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-semibold mb-6 tracking-tight leading-tight text-white">
          Chat with your Documents
        </h1>

        <p className="max-w-lg text-lg text-slate-400 mb-12 leading-relaxed">
          Upload your PDF and get instant AI-powered answers. Simple, fast, and intelligent.
        </p>

        <SignedOut>
          <SignInButton mode="modal">
            <button className="px-6 py-3 bg-cyan-500 text-slate-950 font-medium rounded-lg hover:bg-cyan-400 transition-colors cursor-pointer">
              Get Started
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col items-center gap-4">
            <Link to="/upload">
              <button className="px-6 py-3 bg-cyan-500 text-slate-950 font-medium rounded-lg hover:bg-cyan-400 transition-colors cursor-pointer">
                Upload Document
              </button>
            </Link>
            {loadingHistory ? (
              <span className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Checking your saved chats…</span>
            ) : documents.length ? (
              <Link to={`/chat/${documents[0].id}`} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
                <History className="w-4 h-4" /> Open past chats ({documents.length} document{documents.length === 1 ? '' : 's'})
              </Link>
            ) : (
              <p className="text-sm text-slate-500">No recent chats yet — upload a PDF to start one.</p>
            )}
          </div>
        </SignedIn>

        {/* Features */}
        <div className="mt-28 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
          <div className="text-left">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-medium mb-2">Upload PDFs</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Drag and drop your documents to get started.</p>
          </div>
          <div className="text-left">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-medium mb-2">AI Processing</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Advanced AI extracts and indexes your content.</p>
          </div>
          <div className="text-left">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-base font-medium mb-2">Ask Anything</h3>
            <p className="text-sm text-slate-500 leading-relaxed">Get accurate answers from your documents.</p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Landing
