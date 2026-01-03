import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, PenTool, User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  user: User | null;
  logout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ user, logout }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-vn-dark">
      {/* Navbar */}
      <nav className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')} title="Return to Home">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-serif font-bold text-xl text-slate-100 tracking-tight">Affinity<span className="text-indigo-400">Web</span></span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/" title="Browse Visual Novels" className={({ isActive }) => `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <BookOpen className="w-4 h-4" /> Browse
          </NavLink>
          <NavLink to="/create" title="Create a new Visual Novel" className={({ isActive }) => `flex items-center gap-2 text-sm font-medium transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
            <PenTool className="w-4 h-4" /> Create Novel
          </NavLink>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
               <NavLink to="/profile" title="View your profile" className="flex items-center gap-2 text-slate-300 hover:text-white">
                 <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=6366f1&color=fff`} className="w-8 h-8 rounded-full border border-slate-700" alt="Avatar" />
                 <span className="text-sm font-medium hidden sm:block">{user.username}</span>
               </NavLink>
               <button onClick={logout} title="Log out" className="text-slate-500 hover:text-red-400 transition-colors">
                 <LogOut className="w-5 h-5" />
               </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <NavLink to="/login" title="Sign in to your account" className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5">Login</NavLink>
              <NavLink to="/register" title="Create a new account" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors">Get Started</NavLink>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="max-w-7xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;