import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrainCircuit, LayoutDashboard, PenLine, History, Lightbulb, Settings, Users, UserCircle } from 'lucide-react';
import { QyvrinLogo } from '../ui/QyvrinLogo';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'New Entry', path: '/new-entry', icon: PenLine },
    { name: 'Decision Replay', path: '/replay', icon: History },
    { name: 'Decision Fingerprint', path: '/fingerprint', icon: BrainCircuit },
    { name: 'Decision Circles', path: '/circles', icon: Users },
    { name: 'Insights', path: '/insights', icon: Lightbulb },
    { name: 'Profile', path: '/profile', icon: UserCircle },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  // Do not show sidebar on landing page
  if (location.pathname === '/') {
    return <div className="min-h-screen bg-white text-zinc-900 font-sans">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-zinc-200 flex-shrink-0">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-3 text-zinc-900 group">
            <QyvrinLogo className="h-8 w-auto md:h-10 transition-transform group-hover:scale-105" />
          </Link>
        </div>
        
        <nav className="px-4 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-zinc-100 text-zinc-900 font-medium' 
                    : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
};
