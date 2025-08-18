import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ExerciseKnowledge from "./pages/ExerciseKnowledge";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
import { supabase } from './integrations/client';
import Info from './pages/Info';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check for existing user on app load and handle OAuth callback
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔍 Starting auth callback check...');
        console.log('📍 Current URL:', window.location.href);
        console.log('🔗 URL search params:', window.location.search);
        console.log('📝 URL hash:', window.location.hash);
        
        // Check for OAuth callback parameters
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('🔑 URL search parameters:', Object.fromEntries(urlParams.entries()));
        console.log('🔑 Hash parameters:', Object.fromEntries(hashParams.entries()));
        
        // Check if we have OAuth callback parameters
        const hasOAuthParams = urlParams.has('code') || urlParams.has('error') || 
                              hashParams.has('access_token') || hashParams.has('error');
        
        if (hasOAuthParams) {
          console.log('🎯 OAuth callback detected, attempting manual exchange...');
          
          try {
            // Try to manually exchange the OAuth code
            const { data, error: exchangeError } = await supabase.auth.getSession();
            console.log('🔄 Manual exchange result:', { data, error: exchangeError });
          } catch (exchangeError) {
            console.error('💥 Manual exchange failed:', exchangeError);
          }
        }
        
        // Check if we're in an OAuth callback
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📋 Session check result:', { session, error });
        
        if (error) {
          console.error('❌ Auth error:', error);
          setAuthError(error.message);
        } else if (session?.user) {
          console.log('✅ User authenticated via OAuth:', session.user);
          // User is authenticated via OAuth
          const userData = {
            email: session.user.email || '',
            name: session.user.user_metadata.full_name || session.user.email || '',
          };
          console.log('👤 Setting user data:', userData);
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          console.log('ℹ️ No active session, checking localStorage...');
          // Check for saved user in localStorage
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            console.log('💾 Found saved user:', savedUser);
            setUser(JSON.parse(savedUser));
          } else {
            console.log('📭 No saved user found');
          }
        }
      } catch (error) {
        console.error('💥 Auth callback error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session);
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || session.user.email || '',
        });
        localStorage.setItem('user', JSON.stringify({
          email: session.user.email || '',
          name: session.user.user_metadata.full_name || session.user.email || '',
        }));
      } else {
        setUser(null);
        localStorage.removeItem('user');
      }
    });
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = (userData: { email: string; name: string }) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleSkip = () => {
    setUser({ email: 'guest@fittracker.com', name: 'Guest User' });
    localStorage.setItem('user', JSON.stringify({ email: 'guest@fittracker.com', name: 'Guest User' }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('user');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Auth onAuth={handleAuth} showAuthError={!!authError} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout user={user} onLogout={handleLogout}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/exercises" element={<ExerciseKnowledge />} />
              <Route path="/info" element={<Info />} />
              <Route path="/auth/callback" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
