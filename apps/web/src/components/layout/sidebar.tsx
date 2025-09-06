'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Database, 
  Shield, 
  FileText, 
  Settings, 
  BarChart3,
  LogOut,
  Sparkles,
  Activity,
  Search
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Datasets', href: '/datasets', icon: Database },
  { name: 'Jobs', href: '/jobs', icon: Activity },
  { name: 'Anonymize', href: '/anonymize', icon: Sparkles },
  { name: 'Policies', href: '/policies', icon: Shield },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const { resetOnboarding, setShowOnboarding } = useOnboarding();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={`flex flex-col bg-card border-r border-border w-64 relative ${className}`}>
      {/* Header */}
      <div className="flex items-center px-4 py-3 relative min-h-[60px]">
        <span className="text-xl font-bold tracking-wide font-sans uppercase ml-3" style={{
          background: 'linear-gradient(to right, rgb(59 130 246), rgb(147 51 234))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>MASKWISE</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-[13px] font-normal transition-colors ${
                    isActive
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <item.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Show onboarding button */}
      <div className="px-4 pb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={resetOnboarding}
          className="w-full text-yellow-700 border-yellow-300 hover:bg-yellow-100 h-[34px]"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Show onboarding
        </Button>
      </div>

      {/* User section with logout only */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start px-3 py-2 h-auto hover:bg-accent text-red-600 hover:text-red-600"
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span className="text-[13px] font-normal">Logout</span>
        </Button>
      </div>
    </div>
  );
}