import React from 'react';
import { useParams } from 'react-router-dom';
import { Novel, User } from '../types';
import { Card, Badge } from '../components/ui/Components';
import { Heart } from 'lucide-react';

interface AuthorProfileProps {
  novels: Novel[];
}

const AuthorProfile: React.FC<AuthorProfileProps> = ({ novels }) => {
  const { id } = useParams();
  
  // Filter novels by author (mock logic since we don't have real backend filtering)
  const authorNovels = novels; 

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="flex items-center gap-6 p-8">
        <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-4xl font-bold text-white">
          A
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Author Name</h1>
          <p className="text-slate-400 mt-1">Creating stories since 2024. Lover of sci-fi and romance.</p>
          <div className="flex gap-4 mt-4 text-sm font-medium text-slate-300">
            <span>{authorNovels.length} Novels</span>
            <span>12.5k Total Plays</span>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Published Works</h2>
        <div className="grid gap-4">
          {authorNovels.map(novel => (
             <div key={novel.id} className="flex bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:bg-slate-800/60 transition-colors p-4 gap-4">
                <img src={novel.coverUrl} className="w-24 h-32 object-cover rounded-md" alt="" />
                <div className="flex-1">
                   <h3 className="text-xl font-bold text-white">{novel.title}</h3>
                   <div className="flex gap-2 mt-1 mb-2">
                     {novel.genre.map(g => <Badge key={g}>{g}</Badge>)}
                   </div>
                   <p className="text-slate-400 text-sm line-clamp-2">{novel.description}</p>
                   <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
                     <span className="flex items-center gap-1"><Heart className="w-3 h-3"/> {novel.likes}</span>
                     <span>{novel.plays} Plays</span>
                   </div>
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthorProfile;
