
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <AppSidebar user={user ? { email: user.email || '', name: user.user_metadata?.name || user.email || '' } : null} onLogout={handleLogout} />
        <main className="flex-1 flex flex-col">
          <div className="border-b bg-white/50 backdrop-blur-sm p-2">
            <SidebarTrigger />
          </div>
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
