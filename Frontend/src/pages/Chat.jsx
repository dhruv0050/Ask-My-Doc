import { useEffect, useRef, useState } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { Bot, FileText, Loader2, Menu, MessageSquare, PanelLeftClose, Plus, Send, UploadCloud, User } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function MessageContent({ content }) {
  const readableContent = content
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) return line;
      const cells = trimmed.split('|').map(cell => cell.trim()).filter(Boolean);
      if (!cells.length || cells.every(cell => /^:?-{3,}:?$/.test(cell))) return '';
      return `- ${cells.join(' — ')}`;
    })
    .join('\n');
  return <div className="min-w-0 flex-1 text-[15px] leading-7 text-zinc-100"><ReactMarkdown
    components={{
      h1: ({ children }) => <h1 className="mb-3 mt-6 text-2xl font-semibold text-white first:mt-0">{children}</h1>,
      h2: ({ children }) => <h2 className="mb-3 mt-6 text-xl font-semibold text-white first:mt-0">{children}</h2>,
      h3: ({ children }) => <h3 className="mb-2 mt-5 text-lg font-semibold text-white first:mt-0">{children}</h3>,
      p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
      ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 marker:text-cyan-400">{children}</ul>,
      ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 marker:text-cyan-400">{children}</ol>,
      li: ({ children }) => <li className="pl-1">{children}</li>,
      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
      code: ({ children }) => <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200">{children}</code>,
    }}
  >{readableContent}</ReactMarkdown></div>;
}

export default function Chat() {
  const { user } = useUser();
  const { documentId: routeDocumentId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const endRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [documentId, setDocumentId] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState('');

  const openConversation = async (id) => {
    const { data } = await axios.get(`${API}/conversations/${id}`, { params: { userId: user.id } });
    setConversationId(data.id); setMessages(data.messages || []);
  };
  const selectDocument = async (nextId, preferredId) => {
    setInitializing(true); setError('');
    try {
      const { data } = await axios.get(`${API}/conversations`, { params: { userId: user.id, documentId: nextId } });
      const selected = data.find(x => x.id === preferredId) || data[0];
      setDocumentId(nextId); setConversations(data);
      if (selected) await openConversation(selected.id); else { setConversationId(null); setMessages([]); }
      navigate(`/chat/${nextId}${selected ? `?conversation=${selected.id}` : ''}`, { replace: true });
    } catch { setError('Could not load this document.'); }
    finally { setInitializing(false); }
  };
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/documents`, { params: { userId: user.id } });
        setDocuments(data);
        const target = routeDocumentId || data[0]?.id;
        if (target) await selectDocument(target, params.get('conversation'));
        else setInitializing(false);
      } catch { setError('Could not load your workspace.'); setInitializing(false); }
    })();
  }, [user?.id, routeDocumentId]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const newChat = async () => {
    try {
      const { data } = await axios.post(`${API}/conversations`, { userId: user.id, documentId });
      setConversations(old => [data, ...old]); setConversationId(data.id); setMessages([]);
      navigate(`/chat/${documentId}?conversation=${data.id}`);
    } catch { setError('Could not start a new chat.'); }
  };
  const send = async (event) => {
    event.preventDefault(); const question = input.trim();
    if (!question || !documentId || !conversationId || loading) return;
    setMessages(old => [...old, { role: 'user', content: question }]); setInput(''); setLoading(true); setError('');
    try {
      const { data } = await axios.post(`${API}/chat`, { query: question, userId: user.id, documentId, conversationId });
      setMessages(old => [...old, { role: 'assistant', content: data.answer }]);
      setConversations(old => old.map(c => c.id === conversationId && c.title === 'New chat' ? { ...c, title: question.slice(0, 60) } : c));
    } catch { setMessages(old => [...old, { role: 'assistant', content: 'Sorry, I could not answer that right now. Please try again.' }]); }
    finally { setLoading(false); }
  };
  const activeDocument = documents.find(x => x.id === documentId);

  return <div className="flex h-screen overflow-hidden bg-[#212121] text-[#ececec]">
    <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} shrink-0 overflow-hidden bg-[#171717] transition-all duration-200`}>
      <div className="flex h-full w-72 flex-col p-3"><div className="mb-5 flex items-center justify-between px-2"><Link to="/" className="flex items-center gap-2 text-sm font-semibold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-cyan-400 text-slate-950"><FileText size={15}/></span>Ask My Doc</Link><button onClick={() => setSidebarOpen(false)} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800"><PanelLeftClose size={17}/></button></div>
        <Link to="/upload" className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-700 px-3 py-2.5 text-sm font-medium hover:bg-zinc-800"><UploadCloud size={17}/>Upload a PDF</Link><p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Your documents</p>
        <div className="min-h-0 flex-1 overflow-y-auto">{documents.map(doc => <button key={doc.id} onClick={() => selectDocument(doc.id)} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${doc.id === documentId ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/70'}`}><FileText size={16} className="shrink-0 text-cyan-400"/><span className="truncate">{doc.filename}</span></button>)}{documentId && conversations.length > 0 && <><p className="mb-2 mt-5 px-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Chats</p>{conversations.map(chat => <button key={chat.id} onClick={() => { openConversation(chat.id); navigate(`/chat/${documentId}?conversation=${chat.id}`); }} className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${chat.id === conversationId ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-800/70'}`}><MessageSquare size={15} className="shrink-0"/><span className="truncate">{chat.title}</span></button>)}</>}{!documents.length && !initializing && <p className="px-3 text-sm text-zinc-500">No documents yet.</p>}</div>
        <div className="border-t border-zinc-800 pt-3"><div className="flex items-center gap-3 px-2"><UserButton appearance={{ elements: { avatarBox: 'w-8 h-8' } }} /><span className="truncate text-sm text-zinc-300">{user?.fullName || user?.firstName}</span></div></div></div>
    </aside>
    <section className="flex min-w-0 flex-1 flex-col"><header className="flex h-14 items-center justify-between border-b border-white/10 px-3 sm:px-5"><div className="flex min-w-0 items-center gap-2">{!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800"><Menu size={18}/></button>}<span className="truncate text-sm font-medium">{activeDocument?.filename || 'Ask My Doc'}</span></div>{documentId && <button onClick={newChat} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800"><Plus size={16}/>New chat</button>}</header>
      {initializing ? <div className="grid flex-1 place-items-center text-zinc-500"><Loader2 className="animate-spin"/></div> : !documentId ? <div className="grid flex-1 place-items-center p-6 text-center"><div><FileText className="mx-auto mb-4 text-cyan-400" size={35}/><h1 className="text-xl font-semibold">Start with a document</h1><p className="mt-2 text-sm text-zinc-400">Upload a PDF to create your first saved chat.</p><Link to="/upload" className="mt-5 inline-flex rounded-lg bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950">Upload PDF</Link></div></div> : <><main className="flex-1 overflow-y-auto"><div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8">{!messages.length && <div className="py-20 text-center"><div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-cyan-400/10"><MessageSquare className="text-cyan-400"/></div><h1 className="text-2xl font-semibold">What would you like to know?</h1><p className="mt-2 text-sm text-zinc-400">Ask anything about <span className="text-zinc-200">{activeDocument?.filename}</span>.</p></div>}{messages.map((m, i) => <div key={i} className="mb-7 flex gap-4"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === 'user' ? 'bg-zinc-700' : 'bg-cyan-400 text-slate-950'}`}>{m.role === 'user' ? <User size={15}/> : <Bot size={16}/>}</div>{m.role === 'assistant' ? <MessageContent content={m.content}/> : <p className="min-w-0 whitespace-pre-wrap pt-1 text-[15px] leading-7 text-zinc-100">{m.content}</p>}</div>)}{loading && <div className="flex gap-4"><div className="grid h-8 w-8 place-items-center rounded-full bg-cyan-400 text-slate-950"><Bot size={16}/></div><Loader2 className="mt-2 animate-spin text-zinc-400" size={17}/></div>}<div ref={endRef}/></div></main><footer className="bg-gradient-to-t from-[#212121] via-[#212121] px-4 pb-5 pt-3 sm:px-8"><form onSubmit={send} className="mx-auto flex max-w-3xl items-end rounded-2xl border border-zinc-700 bg-[#2f2f2f] p-2 shadow-lg focus-within:border-zinc-500"><textarea rows="1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} placeholder="Message your document" disabled={loading} className="min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-zinc-500"/><button disabled={!input.trim() || loading} className="grid h-9 w-9 place-items-center rounded-lg bg-zinc-100 text-zinc-900 disabled:bg-zinc-700 disabled:text-zinc-500"><Send size={16}/></button></form>{error && <p className="mx-auto mt-2 max-w-3xl text-xs text-red-400">{error}</p>}<p className="mt-2 text-center text-xs text-zinc-500">Ask My Doc can make mistakes. Check important information.</p></footer></>}</section>
  </div>;
}
