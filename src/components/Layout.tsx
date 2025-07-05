
import React from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface LayoutProps {
  children: React.ReactNode;
  user: { email: string; name: string } | null;
  onLogout: () => void;
}

const Layout = ({ children, user, onLogout }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar user={user} onLogout={onLogout} />
        <main className="flex-1 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
          <header className="h-12 flex items-center border-b bg-white/80 backdrop-blur-sm">
            <SidebarTrigger className="ml-2" />
            <div className="flex-1 text-center">
              <span className="font-semibold text-gray-800">FitTracker Pro</span>
            </div>
          </header>
          <div className="p-4">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
