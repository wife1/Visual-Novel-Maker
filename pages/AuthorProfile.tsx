import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Novel, User } from '../types';
import { Card, Badge, Button } from '../components/ui/Components';
import { Heart, Play, Edit, Share2, MoreHorizontal, Plus } from 'lucide-react';
import VisualNovelPlayer from '../components/VisualNovelPlayer';

interface AuthorProfileProps {
  novels: Novel[];
  currentUser?: User | null;
}

const AuthorProfile: React.FC<AuthorProfileProps> = ({ novels, currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playingNovel, setPlayingNovel] = useState<Novel | null>(null);
  
  // Determine whose profile we are viewing
  // If id is present, it's that author. If not, it's the current user.
  const profileId = id || currentUser?.id;
  
  const isOwnProfile = currentUser?.id === profileId;
  
  // Filter novels for this author
  const authorNovels = novels.filter(n => n.authorId === profileId);

  const handleShare = (e: React.MouseEvent, novelId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/#/novel/${novelId}`;
    navigator.clipboard.writeText(url).then(() => {
        alert("Story link copied to clipboard!");
    });
  };

  const getProfileUsername = () => {
      if (isOwnProfile && currentUser) return currentUser.username;
      // In a real app, we'd fetch the author details by ID. 
      // For now, if we have novels, we can guess the author might be 'a1' etc, but we don't have their names stored in novels unless we add it.
      // We'll fallback to "Author"
      return "Author";
  };

  if (!profileId) {
      return <div className="text-center p-10 text-slate-400">Profile not found.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
       {playingNovel && (
          <VisualNovelPlayer novel={playingNovel} onClose={() => setPlayingNovel(null)} />
       )}

      <Card className="flex flex-col md:flex-row items-center gap-6 p-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl shrink-0">
          {getProfileUsername()[0].toUpperCase()}
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="text-3xl font-bold text-white">
             {getProfileUsername()}
          </h1>
          <p className="text-slate-400 mt-1">Creating stories on AffinityWeb.</p>
          <div className="flex justify-center md:justify-start gap-4 mt-4 text-sm font-medium text-slate-300">
            <span>{authorNovels.length} Novels</span>
            <span>{authorNovels.reduce((acc, curr) => acc + curr.plays, 0)} Total Plays</span>
          </div>
        </div>
        {isOwnProfile && (
            <Button className="md:ml-auto shadow-lg shadow-indigo-500/20" onClick={() => navigate('/create')}>
                <Plus className="w-4 h-4" /> Create New Story
            </Button>
        )}
      </Card>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">Published Works</h2>
        {authorNovels.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/20 rounded-xl border border-dashed border-slate-700">
                <p className="text-slate-400 mb-4">No stories published yet.</p>
                {isOwnProfile && (
                    <Button variant="secondary" onClick={() => navigate('/create')}>Start Writing</Button>
                )}
            </div>
        ) : (
        <div className="grid gap-4">
          {authorNovels.map(novel => {
             const isAuthor = currentUser?.id === novel.authorId;
             
             return (
             <div key={novel.id} className="flex flex-col md:flex-row bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:bg-slate-800/60 transition-all p-4 gap-4 group">
                <div className="relative w-full md:w-32 h-48 md:h-32 shrink-0 rounded-md overflow-hidden bg-slate-900 cursor-pointer" onClick={() => navigate(`/novel/${novel.id}`)}>
                    <img src={novel.coverUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={novel.title} />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={(e) => { e.stopPropagation(); setPlayingNovel(novel); }} className="bg-white/90 text-indigo-600 p-2 rounded-full shadow-lg transform scale-90 hover:scale-100 transition-transform" title="Play Now">
                             <Play className="w-5 h-5 fill-current" />
                         </button>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col">
                   <div className="flex justify-between items-start">
                       <div>
                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => navigate(`/novel/${novel.id}`)}>{novel.title}</h3>
                            <div className="flex flex-wrap gap-2 mt-2 mb-2">
                                {novel.genre.map(g => <Badge key={g}>{g}</Badge>)}
                            </div>
                       </div>
                       <div className="flex items-center gap-2">
                           <Button variant="ghost" className="p-2 h-8 w-8 text-slate-400 hover:text-white" title="Share" onClick={(e) => handleShare(e, novel.id)}>
                               <Share2 className="w-4 h-4" />
                           </Button>
                       </div>
                   </div>
                   
                   <p className="text-slate-400 text-sm line-clamp-2 mb-4">{novel.description}</p>
                   
                   <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-700/30">
                     <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3"/> {novel.likes}</span>
                        <span>{novel.plays} Plays</span>
                     </div>
                     <div className="flex gap-2">
                         {isAuthor && (
                               <Button variant="secondary" className="px-3 py-1 h-8 text-xs bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30" title="Edit Novel" onClick={() => navigate(`/edit/${novel.id}`)}>
                                   <Edit className="w-3 h-3 mr-1" /> Edit
                               </Button>
                         )}
                         <Button variant="secondary" className="px-3 py-1 text-xs h-8" onClick={() => setPlayingNovel(novel)}>
                             <Play className="w-3 h-3 mr-1" /> Play
                         </Button>
                     </div>
                   </div>
                </div>
             </div>
          )})}
        </div>
        )}
      </div>
    </div>
  );
};

export default AuthorProfile;