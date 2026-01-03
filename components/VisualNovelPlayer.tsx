import React, { useState, useEffect, useRef } from 'react';
import { Novel, Scene, Dialogue, Character } from '../types';
import { Play, SkipForward, RotateCcw, X, Volume2, VolumeX } from 'lucide-react';
import { Button } from './ui/Components';

interface PlayerProps {
  novel: Novel;
  onClose: () => void;
}

const VisualNovelPlayer: React.FC<PlayerProps> = ({ novel, onClose }) => {
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Audio Refs
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  const currentScene: Scene | undefined = novel.scenes[currentSceneIndex];
  const currentDialogue: Dialogue | undefined = currentScene?.dialogues[currentDialogueIndex];
  
  const getCharacter = (id: string | null): Character | undefined => {
    if (!id) return undefined;
    return novel.characters.find(c => c.id === id);
  };

  const activeCharacter = getCharacter(currentDialogue?.characterId || null);

  // Audio Logic: BGM
  useEffect(() => {
    if (isFinished) {
      if (bgmRef.current) bgmRef.current.pause();
      return;
    }

    if (!currentScene) return;

    const newBgmUrl = currentScene.bgmUrl;
    // Check if BGM URL has changed or if we need to start it
    if (newBgmUrl) {
      if (!bgmRef.current || bgmRef.current.src !== newBgmUrl) {
        if (bgmRef.current) {
          bgmRef.current.pause();
        }
        const audio = new Audio(newBgmUrl);
        audio.loop = true;
        audio.volume = 0.3;
        audio.muted = isMuted;
        audio.play().catch(e => console.warn("BGM autoplay blocked:", e));
        bgmRef.current = audio;
      } else if (bgmRef.current.paused) {
         // Resume if same track but paused (e.g. after finish state reset)
         bgmRef.current.play().catch(e => console.warn("BGM resume blocked:", e));
      }
    } else {
      // No BGM for this scene
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    }
  }, [currentScene?.bgmUrl, currentScene?.id, isFinished]);

  // Audio Logic: SFX/Voice
  useEffect(() => {
    // Stop any previously playing SFX
    if (sfxRef.current) {
      sfxRef.current.pause();
      sfxRef.current = null;
    }

    if (!isFinished && currentDialogue?.audioUrl) {
      const audio = new Audio(currentDialogue.audioUrl);
      audio.volume = 0.5;
      audio.muted = isMuted;
      audio.play().catch(e => console.warn("SFX autoplay blocked:", e));
      sfxRef.current = audio;
    }
  }, [currentDialogue?.id, currentDialogue?.audioUrl, isFinished]);

  // Audio Logic: Mute Sync
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
    if (sfxRef.current && !sfxRef.current.ended) sfxRef.current.muted = isMuted;
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      if (sfxRef.current) {
        sfxRef.current.pause();
        sfxRef.current = null;
      }
    };
  }, []);

  const advance = () => {
    if (!currentScene || isTransitioning) return;

    if (currentDialogueIndex < currentScene.dialogues.length - 1) {
      setCurrentDialogueIndex(prev => prev + 1);
    } else if (currentSceneIndex < novel.scenes.length - 1) {
      // Start Scene Transition
      setIsTransitioning(true);
      
      // Duration of fade out
      setTimeout(() => {
        setCurrentSceneIndex(prev => prev + 1);
        setCurrentDialogueIndex(0);
        
        // Brief delay before fading in to ensure render
        setTimeout(() => {
          setIsTransitioning(false);
        }, 100);
      }, 500);
    } else {
      setIsFinished(true);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        advance();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSceneIndex, currentDialogueIndex, isTransitioning]);

  const getThemeClasses = () => {
    const theme = novel.theme;
    let classes = "";
    
    // Font Family
    if (theme?.fontFamily === 'serif') classes += " font-serif";
    else if (theme?.fontFamily === 'mono') classes += " font-mono";
    else classes += " font-sans";

    // Font Size
    if (theme?.fontSize === 'sm') classes += " text-lg md:text-xl";
    else if (theme?.fontSize === 'lg') classes += " text-2xl md:text-3xl";
    else classes += " text-xl md:text-2xl"; // default md

    return classes;
  };

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in">
        <div className="text-center space-y-6 p-8 max-w-md">
          <h2 className="text-4xl font-serif text-white mb-2">The End</h2>
          <p className="text-slate-400">Thank you for playing {novel.title}.</p>
          <div className="flex gap-4 justify-center">
             <Button variant="secondary" title="Restart the story from the beginning" onClick={() => {
               setIsFinished(false);
               setCurrentSceneIndex(0);
               setCurrentDialogueIndex(0);
             }}>
               <RotateCcw className="w-4 h-4" /> Replay
             </Button>
             <Button title="Close player" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentScene) return <div className="text-white">Error: No scene loaded.</div>;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden select-none">
      {/* Background Layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${currentScene.backgroundUrl})` }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Character Layer */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
        {activeCharacter && (
          <img 
            src={activeCharacter.avatarUrl} 
            alt={activeCharacter.name}
            className="h-[80%] object-contain drop-shadow-2xl animate-slide-up transition-all duration-300"
            key={activeCharacter.id} // Force re-render on char change for animation
          />
        )}
      </div>

      {/* Transition Overlay */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-500 ease-in-out pointer-events-none ${isTransitioning ? 'opacity-100 z-[60]' : 'opacity-0 z-[-1]'}`} 
      />

      {/* UI Layer */}
      <div className="absolute inset-0 flex flex-col justify-between p-4 md:p-8">
        
        {/* Top Controls */}
        <div className={`flex justify-between items-start pointer-events-auto transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
          <div className="bg-black/50 backdrop-blur px-4 py-2 rounded-full text-white/80 text-sm">
            {novel.title} — {currentScene.name}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute audio" : "Mute audio"}
              className="bg-black/50 hover:bg-slate-700/80 p-2 rounded-full text-white transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button 
              onClick={onClose}
              title="Exit player"
              className="bg-black/50 hover:bg-red-500/80 p-2 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Textbox Area */}
        <div 
          className={`w-full max-w-4xl mx-auto mb-4 cursor-pointer pointer-events-auto transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          onClick={advance}
          title="Click to continue"
        >
          <div className="bg-slate-900/90 border border-slate-700 backdrop-blur-md rounded-xl p-6 md:p-8 shadow-2xl min-h-[160px] relative group">
             
             {/* Name Tag */}
             <div className="absolute -top-4 left-8">
               <div 
                className="px-6 py-1.5 rounded-lg font-bold text-lg shadow-lg"
                style={{ 
                  backgroundColor: activeCharacter ? activeCharacter.color : '#64748b',
                  color: '#fff'
                }}
               >
                 {activeCharacter ? activeCharacter.name : 'Narrator'}
               </div>
             </div>

             {/* Dialogue Text */}
             <p className={`leading-relaxed text-slate-100 font-medium mt-2 ${getThemeClasses()}`}>
               {currentDialogue?.text}
               <span className="inline-block w-2 h-5 bg-white ml-2 animate-pulse" />
             </p>

             {/* Advance Indicator */}
             <div className="absolute bottom-4 right-4 text-slate-500 text-sm flex items-center gap-1 group-hover:text-indigo-400 transition-colors">
               Click or Space to continue <SkipForward className="w-4 h-4" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualNovelPlayer;