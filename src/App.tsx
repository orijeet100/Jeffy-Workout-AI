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
        setIsLoading(true);
        
        // Check if this is an OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // Check for OAuth callback parameters
        if (urlParams.has('code') || hashParams.has('access_token') || hashParams.has('code')) {
          // OAuth callback detected, attempt manual exchange
          const { data, error: exchangeError } = await supabase.auth.getSession();
          
          if (exchangeError) {
            // Handle exchange error silently
          }
        }
        
        // Check current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          // Handle auth error silently
        }
        
        if (session?.user) {
          // User is authenticated via OAuth
          const userData = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email
          };
          
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          // No active session, check localStorage
          const savedUser = localStorage.getItem('user');
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              setUser(userData);
            } catch (parseError) {
              // Handle parse error silently
            }
          }
        }
      } catch (error) {
        // Handle auth callback error silently
      } finally {
        setIsLoading(false);
      }
    };
    
    handleAuthCallback();
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.full_name || session.user.email
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('user');
      }
    });

    return () => subscription.unsubscribe();
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
