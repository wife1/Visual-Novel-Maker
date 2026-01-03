import React, { useState } from 'react';
import { Button, Input, Card } from '../components/ui/Components';
import { User, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Login: React.FC<AuthProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login with ID 'a1' to match the first mock novel's author
    onLogin({
      id: 'a1', 
      username: email.split('@')[0] || 'User',
      email: email,
      createdNovels: ['n1']
    });
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
           <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
             <Sparkles className="w-6 h-6 text-white" />
           </div>
           <h2 className="text-3xl font-serif font-bold text-white">Welcome Back</h2>
           <p className="text-slate-400 mt-2">Continue your storytelling journey.</p>
        </div>
        
        <Card>
          <form onSubmit={handleLogin} className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300">Email Address</label>
               <div className="relative">
                 <User className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                 <Input 
                   type="email" 
                   required
                   className="pl-10" 
                   placeholder="you@example.com"
                   value={email}
                   onChange={e => setEmail(e.target.value)}
                 />
               </div>
             </div>
             
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300">Password</label>
               <div className="relative">
                 <Lock className="absolute left-3 top-2.5 w-5 h-5 text-slate-500" />
                 <Input 
                   type="password" 
                   required
                   className="pl-10" 
                   placeholder="••••••••" 
                 />
               </div>
             </div>

             <div className="flex justify-end">
               <a href="#" className="text-sm text-indigo-400 hover:text-indigo-300">Forgot password?</a>
             </div>

             <Button className="w-full py-3 mt-2" type="submit">
               Sign In <ArrowRight className="w-4 h-4" />
             </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-400">
            Don't have an account? <span onClick={() => navigate('/register')} className="text-indigo-400 cursor-pointer hover:underline">Create one</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const Register: React.FC<AuthProps> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      id: `u${Date.now()}`,
      username: email.split('@')[0],
      email: email,
      createdNovels: []
    });
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
           <h2 className="text-3xl font-serif font-bold text-white">Create Account</h2>
           <p className="text-slate-400 mt-2">Start creating your visual novels today.</p>
        </div>
        
        <Card>
          <form onSubmit={handleRegister} className="space-y-4">
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300">Username</label>
               <Input placeholder="StoryTeller123" required />
             </div>
             
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300">Email Address</label>
               <Input 
                 type="email" 
                 placeholder="you@example.com" 
                 required 
                 value={email}
                 onChange={e => setEmail(e.target.value)}
               />
             </div>
             
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-300">Password</label>
               <Input type="password" placeholder="••••••••" required />
             </div>

             <Button className="w-full py-3 mt-4" type="submit">
               Create Account
             </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account? <span onClick={() => navigate('/login')} className="text-indigo-400 cursor-pointer hover:underline">Sign In</span>
          </div>
        </Card>
      </div>
    </div>
  );
};