import React, { useState, useMemo } from 'react';
import { Novel } from '../types';
import { Card, Badge, Button } from '../components/ui/Components';
import { Play, Heart, User, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  novels: Novel[];
}

const Home: React.FC<HomeProps> = ({ novels }) => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<'all' | 'popular' | 'newest' | 'romance'>('all');

  const filteredNovels = useMemo(() => {
    let result = [...novels];
    
    if (activeFilter === 'popular') {
      result.sort((a, b) => b.likes - a.likes);
    } else if (activeFilter === 'newest') {
      result.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    } else if (activeFilter === 'romance') {
      result = result.filter(n => n.genre.some(g => g.toLowerCase() === 'romance'));
    }
    // 'all' simply returns the result (copy of novels) without specific sort or filter
    
    return result;
  }, [novels, activeFilter]);

  const getFilterBtnClass = (filterType: string) => {
    const isActive = activeFilter === filterType;
    return `text-sm px-3 py-1 rounded-full border transition-all ${
      isActive 
        ? 'bg-slate-800 text-white border-indigo-500 shadow-sm shadow-indigo-500/20' 
        : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800'
    }`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-end gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">Featured Stories</h1>
          <p className="text-slate-400">Explore visual novels created by the community.</p>
        </div>
        <div className="flex gap-2">
           <span className="text-xs text-slate-500 uppercase tracking-wider font-bold self-center mr-2">Filter By:</span>
           <button 
             onClick={() => setActiveFilter('all')}
             title="Show all stories" 
             className={getFilterBtnClass('all')}
           >
             All
           </button>
           <button 
             onClick={() => setActiveFilter('popular')}
             title="Sort by popularity" 
             className={getFilterBtnClass('popular')}
           >
             Popular
           </button>
           <button 
             onClick={() => setActiveFilter('newest')}
             title="Sort by newest releases" 
             className={getFilterBtnClass('newest')}
           >
             Newest
           </button>
           <button 
             onClick={() => setActiveFilter('romance')}
             title="Filter by Romance genre" 
             className={getFilterBtnClass('romance')}
           >
             Romance
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredNovels.length > 0 ? (
          filteredNovels.map(novel => (
            <Card key={novel.id} hover className="flex flex-col h-full group" onClick={() => navigate(`/novel/${novel.id}`)}>
               <div className="relative aspect-[3/4] overflow-hidden rounded-lg mb-4 bg-slate-900">
                 <img 
                  src={novel.coverUrl} 
                  alt={novel.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent opacity-60" />
                 <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                   <Badge color="bg-black/50 backdrop-blur text-white border border-white/10">{novel.genre[0]}</Badge>
                   <span title={`${novel.likes} likes`} className="text-xs font-bold flex items-center gap-1 text-white drop-shadow-md">
                     <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> {novel.likes}
                   </span>
                 </div>
                 
                 {/* Play Overlay on Hover */}
                 <div title="Play this story" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-indigo-900/40 backdrop-blur-[2px]">
                    <div className="bg-white rounded-full p-3 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      <Play className="w-6 h-6 text-indigo-600 fill-indigo-600 ml-1" />
                    </div>
                 </div>
               </div>

               <div className="flex flex-col flex-1">
                 <h3 className="text-lg font-bold text-slate-100 mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">{novel.title}</h3>
                 <p className="text-sm text-slate-400 line-clamp-2 mb-4 flex-1">{novel.description}</p>
                 
                 <div className="flex items-center justify-between text-xs text-slate-500 mt-auto pt-4 border-t border-slate-700/50">
                   <div title="View author profile" className="flex items-center gap-1.5 hover:text-slate-300 transition-colors" onClick={(e) => { e.stopPropagation(); navigate(`/author/${novel.authorId}`)}}>
                     <User className="w-3 h-3" />
                     <span>Author Name</span>
                   </div>
                   <div title={`Published on ${new Date(novel.publishedAt).toLocaleDateString()}`} className="flex items-center gap-1.5">
                     <Clock className="w-3 h-3" />
                     <span>{new Date(novel.publishedAt).toLocaleDateString()}</span>
                   </div>
                 </div>
               </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-slate-500">
            <p>No stories found matching this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;