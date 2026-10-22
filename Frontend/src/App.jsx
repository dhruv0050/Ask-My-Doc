import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import Landing from './pages/Landing';
import Upload from './pages/Upload';
import Chat from './pages/Chat';
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";

function App() {
  return (
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
                  <SignedIn><Chat /></SignedIn>
                  <SignedOut>
                    <RedirectToSignIn />
                  </SignedOut>
                </>
              }
            />
            <Route path="/chat/:documentId" element={<><SignedIn><Chat /></SignedIn><SignedOut><RedirectToSignIn /></SignedOut></>} />
          </Routes>
        </div>
      </Router>
  );
}
export default App;
