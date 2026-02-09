import { UserButton, useUser } from "@clerk/clerk-react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { useState } from "react";
import { FileText, Loader2, UploadCloud, X, CheckCircle, Home } from "lucide-react";
import { useUpload } from "../App";

const Upload = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { setHasUploadedDocument } = useUpload();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError(null);
      setUploadSuccess(false);
    } else {
      setFile(null);
      setError("Please upload a valid PDF file.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError(null);
      setUploadSuccess(false);
    } else {
      setError("Please upload a valid PDF file.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadSuccess(false);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);

    try {
      const response = await axios.post('http://localhost:8000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.status === 200) {
        setUploadSuccess(true);
        setFile(null);
        setHasUploadedDocument(true);
        setTimeout(() => navigate('/chat'), 1500);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-white">
      {/* Header */}
      <header className="px-8 py-5 flex justify-between items-center border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-cyan-500 rounded-lg flex items-center justify-center">
            <FileText className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Ask My Doc</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            <span className="text-sm text-slate-500">{user?.firstName}</span>
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-800 rounded-xl mb-4">
              <UploadCloud className="w-6 h-6 text-cyan-400" />
            </div>
            <h2 className="text-xl font-semibold mb-1">Upload Document</h2>
            <p className="text-slate-500 text-sm">Upload a PDF to start chatting</p>
          </div>

          {/* Drag & Drop Area */}
          {!file && !uploadSuccess && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed border-slate-700 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500/50 hover:bg-slate-800/50 transition-all"
              onClick={() => document.getElementById('fileInput').click()}
            >
              <input
                type="file"
                id="fileInput"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <div className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center mb-4">
                <UploadCloud className="w-7 h-7 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400 mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-slate-600">PDF files only</p>
            </div>
          )}

          {/* Selected File State */}
          {file && !uploadSuccess && (
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="truncate">
                  <p className="text-sm font-medium text-white truncate max-w-[180px]">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                disabled={uploading}
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          )}

          {/* Success State */}
          {uploadSuccess && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-medium mb-1">Upload Complete</h3>
              <p className="text-slate-500 text-sm">Redirecting to chat...</p>
            </div>
          )}

          {/* Actions */}
          {file && !uploadSuccess && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all
                ${uploading
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                }`}
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Upload Document"
              )}
            </button>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
              <X className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Upload;