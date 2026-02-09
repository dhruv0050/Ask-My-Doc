import React, { useState, useRef, useEffect } from 'react';
import { useUser, UserButton } from "@clerk/clerk-react";
import { Send, User, Bot, Loader2, FileText, Home, UploadCloud } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const Chat = () => {
    const { user } = useUser();
    const messagesEndRef = useRef(null);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hello! I have processed your document. Ask me anything about it.' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:8000/chat', {
                query: input,
                userId: user.id,
                history: messages
            });

            const botMessage = { role: 'assistant', content: response.data.answer };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong. Please try again." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 font-sans text-white">
            {/* Header */}
            <header className="px-8 py-4 flex justify-between items-center border-b border-slate-800">
                <Link to="/" className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-slate-950" />
                    </div>
                    <span className="text-lg font-semibold tracking-tight">Ask My Doc</span>
                </Link>
                <div className="flex items-center gap-5">
                    <nav className="flex items-center gap-4">
                        <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                            <Home className="w-4 h-4" />
                            <span>Home</span>
                        </Link>
                        <Link to="/upload" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                            <UploadCloud className="w-4 h-4" />
                            <span>Upload</span>
                        </Link>
                    </nav>
                    <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
                        <span className="text-sm text-slate-500">{user?.firstName}</span>
                        <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                    </div>
                </div>
            </header>

            {/* Chat Messages */}
            <main className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-5">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 
                                ${msg.role === 'user'
                                    ? 'bg-cyan-500'
                                    : 'bg-slate-800'}`}>
                                {msg.role === 'user'
                                    ? <User className="w-4 h-4 text-slate-950" />
                                    : <Bot className="w-4 h-4 text-slate-400" />}
                            </div>
                            <div className={`px-4 py-3 rounded-xl max-w-[80%] 
                                ${msg.role === 'user'
                                    ? 'bg-cyan-500 text-slate-950 rounded-tr-sm'
                                    : 'bg-slate-800 text-slate-200 rounded-tl-sm'}`}>
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="bg-slate-800 px-4 py-3 rounded-xl rounded-tl-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                                <span className="text-sm text-slate-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            {/* Input Footer */}
            <footer className="p-4 border-t border-slate-800">
                <form onSubmit={handleSend} className="max-w-2xl mx-auto relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your document..."
                        className="w-full py-3 pl-4 pr-12 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 transition-colors"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 text-slate-950 rounded-md hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default Chat;
