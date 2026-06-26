import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import SuperAdmin from './components/SuperAdmin';
import SchoolAdmin from './components/SchoolAdmin';
import ResultPortal from './components/ResultPortal';
import { 
  KeyRound, Users, Sparkles, Database, GraduationCap, ArrowRight, ShieldAlert,
  HelpCircle, BookOpen, AlertCircle, Building2, Terminal
} from 'lucide-react';

function AppContent() {
  const { currentUser, login, logout, isFirebaseMode, setFirebaseMode, error, loading, organizations } = useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('all');

  // Detect if current path or query is superadmin login
  const [isSuperAdminRoute, setIsSuperAdminRoute] = useState(() => {
    return window.location.pathname.includes('/superadmins') || 
           window.location.search.includes('?@') || 
           window.location.search.includes('@');
  });

  // Tab views on login page: 'login' | 'results'
  const [view, setView] = useState<'login' | 'results'>('login');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    try {
      const loggedUser = await login(email, password);
      
      // Enforce custom Super Admin Portal security rule
      if (isSuperAdminRoute) {
        if (loggedUser.role !== 'superadmin') {
          logout(); // Force clean logout state immediately
          setLoginError("Xayiraad Ammaan: Portal-kan gaarka ah waxaa loogu talagalay oo keliya Super Admin.");
        }
      } else {
        // Enforce restriction: Super Admin must NOT log in through standard portal
        if (loggedUser.role === 'superadmin') {
          logout(); // Force clean logout state immediately
          setLoginError("Super Admins must log in through the secure admin portal at: /superadmins?@");
        } else if (selectedOrgId !== 'all') {
          if (loggedUser.organizationId !== selectedOrgId) {
            logout(); // Force clean logout state
            setLoginError("Xayiraad Ammaan (Security Check): Akoon-kani uma diiwaan-gashna dugsiga aad dooratay. Fadlan ku soo gal dugsiga ku habboon.");
          }
        }
      }
    } catch (err: any) {
      setLoginError(err.message || String(err));
    }
  };

  const handleBackToMain = () => {
    window.history.pushState({}, '', '/');
    setIsSuperAdminRoute(false);
    setLoginError(null);
    setEmail('');
    setPassword('');
  };

  const activeOrg = organizations.find(o => o.id === selectedOrgId);

  // Check login state and route
  if (currentUser) {
    if (currentUser.role === 'superadmin') {
      return <SuperAdmin />;
    }
    return <SchoolAdmin />;
  }

  // Render Result Portal Public view
  if (view === 'results') {
    return (
      <div className="relative">
        <div className="bg-slate-900 p-3 flex justify-between items-center text-white text-xs border-b border-slate-800">
          <div className="flex items-center gap-1">
            <GraduationCap size={15} className="text-white" />
            <span className="font-bold">Student Transcript Access</span>
          </div>
          <button 
            onClick={() => setView('login')}
            className="bg-black hover:bg-slate-800 text-white font-semibold px-3 py-1 rounded-lg text-xs cursor-pointer border border-slate-700"
          >
            ← Back to System Login
          </button>
        </div>
        <ResultPortal />
      </div>
    );
  }

  // Super Admin secure login screen
  if (isSuperAdminRoute) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col justify-between text-slate-100 selection:bg-slate-800">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8 bg-[#111827] p-6 md:p-8 rounded-2xl border border-slate-800 shadow-2xl transition-all">
            
            {/* Super Admin Brand Logo and Header */}
            <div className="text-center space-y-3 flex flex-col items-center">
              <div className="inline-flex p-3 bg-red-600/10 text-red-500 rounded-2xl border border-red-500/20 shadow-lg mb-1 animate-pulse">
                <Terminal size={32} />
              </div>
              
              <h1 className="text-xl md:text-2xl font-mono font-bold tracking-tight text-white">
                Super Admin Gate
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Secure isolated node for global configuration, tenant settings, and network operations.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 bg-red-950/50 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span className="font-semibold">{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-400 mb-1 uppercase tracking-wider">Secure Email</label>
                <input
                  type="email"
                  required
                  placeholder="superadmin@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 bg-[#1f2937] border border-slate-700 rounded-xl focus:outline-none focus:border-red-500 text-sm font-medium text-white placeholder-slate-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-slate-400 mb-1 uppercase tracking-wider">Access token / Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 bg-[#1f2937] border border-slate-700 rounded-xl focus:outline-none focus:border-red-500 text-sm font-medium text-white placeholder-slate-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95 animate-pulse"
              >
                {loading ? 'Decrypting Secure Connection...' : 'Authorize Secure Session'}
              </button>
            </form>

            <div className="text-center pt-2">
              <button 
                onClick={handleBackToMain}
                className="text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                ← Return to Main Portal
              </button>
            </div>

          </div>
        </div>

        {/* Footer Branding */}
        <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-500 bg-[#060a12]">
          <p className="font-mono">SECURED MULTI-TENANT BACKBONE v2.6.0 // ILEYSHUB SECURITY GATEWAY</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col justify-between text-slate-900 selection:bg-slate-200">
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 bg-white p-6 md:p-8 rounded-2xl border border-gray-100 card-shadow transition-all">
          
          {/* Brand Logo and Header */}
          <div className="text-center space-y-3 flex flex-col items-center">
            <div className="inline-flex p-3 bg-black text-white rounded-2xl shadow-sm mb-1">
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white rounded-md"></div>
              </div>
            </div>
            
            <h1 className="text-xl md:text-2xl font-sans font-bold tracking-tight text-slate-900 transition-all duration-300">
              Dugsi & School SaaS Management
            </h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto transition-all duration-300">
              Authorized staff portal for academic management, student tracking, and reporting.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {loginError && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="font-semibold">{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-black text-sm font-medium transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-black text-sm font-medium transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? 'Authenticating secure connection...' : 'Secure Account Sign In'}
            </button>
          </form>

        </div>
      </div>

      {/* Footer Branding */}
      <footer className="py-6 border-t border-slate-200/50 text-center text-xs text-slate-400 bg-white">
        <p className="font-medium">© 2026 IleysHub. Built for school administration and memorization networks.</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
