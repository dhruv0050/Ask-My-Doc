import React, { useState, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

// Create context for upload state
export const UploadContext = createContext();

export const useUpload = () => useContext(UploadContext);

function App() {
  const [hasUploadedDocument, setHasUploadedDocument] = useState(false);

  return (
    <UploadContext.Provider value={{ hasUploadedDocument, setHasUploadedDocument }}>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/upload"
              element={
                <>
                  <SignedIn>
                    <Upload />
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
            <Route
              path="/chat"
              element={
                <>
                  <SignedIn>
                    {hasUploadedDocument ? <Chat /> : <Navigate to="/upload" replace />}
                  </SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
          </Routes>
        </div>
      </Router>
    </UploadContext.Provider>
  );
}
export default App;
