import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { StaffPortalProvider } from './context/StaffPortalContext'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Automatically unregister any active service worker from previous PWA installations.
// This prevents old cached service workers from intercepting new portal routes.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister())
  })
}
if ('caches' in window) {
  caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)))
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider>
          <AuthProvider>
            <StaffPortalProvider>
              <App />
            </StaffPortalProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontSize: '13.5px',
              borderRadius: '10px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              padding: '12px 16px',
            },
            success: {
              iconTheme: { primary: '#58833b', secondary: '#e5ebdd' },
            },
            error: {
              iconTheme: { primary: '#9f1239', secondary: '#ffe4e6' },
            },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
