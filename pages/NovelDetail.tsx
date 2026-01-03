import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Novel } from '../types';
import { Button, Badge } from '../components/ui/Components';
import { Play, Heart, Share2, Info, Users, Edit } from 'lucide-react';
import VisualNovelPlayer from '../components/VisualNovelPlayer';

interface NovelDetailProps {
  novels: Novel[];
  currentUser: any; 
}

const NovelDetail: React.FC<NovelDetailProps> = ({ novels, currentUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  
  const novel = novels.find(n => n.id === id);

  if (!novel) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl text-slate-400">Novel not found</h2>
        <Button className="mt-4" onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  const isAuthor = currentUser?.id === novel.authorId;

  return (
    <>
      {isPlaying && <VisualNovelPlayer novel={novel} onClose={() => setIsPlaying(false)} />}
      
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-2xl">
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20 blur-sm"
            style={{ backgroundImage: `url(${novel.coverUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent" />

          <div className="relative p-8 md:p-12 flex flex-col md:flex-row gap-8 items-start">
            {/* Cover Image */}
            <div className="w-48 md:w-64 shrink-0 rounded-lg overflow-hidden shadow-2xl border-2 border-slate-600/50">
              <img src={novel.coverUrl} alt={novel.title} className="w-full h-auto" />
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
               <div className="flex flex-wrap gap-2 mb-2">
                 {novel.genre.map(g => <Badge key={g}>{g}</Badge>)}
               </div>
               
               <h1 className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">{novel.title}</h1>
               
               <div className="flex items-center gap-4 text-slate-400 text-sm">
                  <span title="View author profile" className="flex items-center gap-1 hover:text-indigo-400 cursor-pointer" onClick={() => navigate(`/author/${novel.authorId}`)}>
                    <Users className="w-4 h-4" /> By Author Name
                  </span>
                  <span>•</span>
                  <span>{novel.scenes.length} Scenes</span>
                  <span>•</span>
                  <span>{novel.plays} Plays</span>
               </div>

               <p className="text-lg text-slate-300 leading-relaxed max-w-2xl py-4">
                 {novel.description}
               </p>

               <div className="flex flex-wrap gap-4 pt-4">
                 <Button onClick={() => setIsPlaying(true)} title="Start playing this visual novel" className="px-8 py-3 text-lg shadow-indigo-500/25">
                   <Play className="w-5 h-5 fill-current" /> Play Now
                 </Button>
                 
                 {isAuthor && (
                     <Button variant="secondary" onClick={() => navigate(`/edit/${novel.id}`)} title="Edit your story" className="gap-2">
                       <Edit className="w-4 h-4" /> Edit Novel
                     </Button>
                 )}

                 <Button variant="secondary" title="Like this story" className="gap-2">
                   <Heart className="w-5 h-5" /> Like ({novel.likes})
                 </Button>
                 <Button variant="ghost" title="Share this story">
                   <Share2 className="w-5 h-5" /> Share
                 </Button>
               </div>
            </div>
          </div>
        </div>

        {/* Content Tabs / Info */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-indigo-400" /> Story Synopsis
                </h3>
                <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 text-slate-300 leading-relaxed">
                  <p>In a world where digital reality overlaps with the physical, {novel.title} explores the boundaries of consciousness. Follow the protagonist through a web of intrigue and emotion in this compelling visual novel experience.</p>
                  <p className="mt-4 text-slate-500 italic">Created using the AffinityWeb Engine.</p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-bold text-white mb-4">Characters</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {novel.characters.map(char => (
                    <div key={char.id} className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3 border border-slate-700/50 hover:border-indigo-500/30 transition-colors">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-700">
                        <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200">{char.name}</div>
                        <div className="text-xs text-slate-500">Main Cast</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
           </div>
           
           <div className="md:col-span-1">
             <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50 sticky top-24">
               <h3 className="font-bold text-white mb-4">More from Author</h3>
               <div className="space-y-4">
                 <div className="flex gap-3 items-center group cursor-pointer">
                   <div className="w-12 h-12 bg-slate-700 rounded-md shrink-0"></div>
                   <div>
                     <div className="text-sm font-bold text-slate-300 group-hover:text-indigo-400">Another Story</div>
                     <div className="text-xs text-slate-500">Fantasy • 2k plays</div>
                   </div>
                 </div>
                 <div className="flex gap-3 items-center group cursor-pointer">
                   <div className="w-12 h-12 bg-slate-700 rounded-md shrink-0"></div>
                   <div>
                     <div className="text-sm font-bold text-slate-300 group-hover:text-indigo-400">School Life</div>
                     <div className="text-xs text-slate-500">Romance • 500 plays</div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
        </div>
      </div>
    </>
  );
};

export default NovelDetail;