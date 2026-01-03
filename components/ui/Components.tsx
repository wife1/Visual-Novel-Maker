import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger', loading?: boolean }> = ({ 
  children, className = '', variant = 'primary', loading, disabled, ...props 
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20",
    secondary: "bg-slate-700 hover:bg-slate-600 text-white",
    ghost: "text-slate-400 hover:text-white hover:bg-slate-800",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${className}`} 
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm text-slate-400 ml-1">{label}</label>}
    <input 
      className={`bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${className}`}
      {...props}
    />
  </div>
);

export const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="flex flex-col gap-1 w-full">
    {label && <label className="text-sm text-slate-400 ml-1">{label}</label>}
    <textarea 
      className={`bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] ${className}`}
      {...props}
    />
  </div>
);

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }> = ({ children, className = '', hover = false, ...props }) => (
  <div 
    className={`bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm rounded-xl p-6 ${hover ? 'hover:bg-slate-800/60 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 transition-all cursor-pointer' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode, color?: string }> = ({ children, color = 'bg-indigo-500/20 text-indigo-300' }) => (
  <span className={`text-xs px-2 py-1 rounded-full font-medium ${color}`}>
    {children}
  </span>
);