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

  // Typewriter State
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingSpeed = 30; // ms per char

  // Audio Refs
  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null); // For dialogue voice (audioUrl)
  const sfxRef = useRef<HTMLAudioElement | null>(null); // For sound effects (sfxUrl)

  const currentScene: Scene | undefined = novel.scenes[currentSceneIndex];
  const currentDialogue: Dialogue | undefined = currentScene?.dialogues[currentDialogueIndex];
  
  const getCharacter = (id: string | null): Character | undefined => {
    if (!id) return undefined;
    return novel.characters.find(c => c.id === id);
  };

  const activeCharacter = getCharacter(currentDialogue?.characterId || null);
  
  // Resolve Sprite URL
  const getActiveSpriteUrl = () => {
      if (!activeCharacter) return null;
      if (currentDialogue?.spriteId) {
          const sprite = activeCharacter.sprites?.find(s => s.id === currentDialogue.spriteId);
          if (sprite) return sprite.url;
      }
      return activeCharacter.avatarUrl;
  };

  const activeSpriteUrl = getActiveSpriteUrl();

  // Typewriter Effect Logic
  useEffect(() => {
    if (!currentDialogue) return;
    
    // Reset state for new dialogue
    setDisplayedText('');
    setIsTyping(true);
    
    let index = 0;
    const fullText = currentDialogue.text;
    
    const timer = setInterval(() => {
        setDisplayedText(current => {
            if (current.length < fullText.length) {
                return fullText.slice(0, current.length + 1);
            }
            clearInterval(timer);
            setIsTyping(false);
            return current;
        });
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [currentDialogue]);

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

  // Audio Logic: Voice (audioUrl)
  useEffect(() => {
    // Stop any previously playing Voice
    if (voiceRef.current) {
      voiceRef.current.pause();
      voiceRef.current = null;
    }

    if (!isFinished && currentDialogue?.audioUrl) {
      const audio = new Audio(currentDialogue.audioUrl);
      audio.volume = 0.8; // Voices usually louder
      audio.muted = isMuted;
      audio.play().catch(e => console.warn("Voice autoplay blocked:", e));
      voiceRef.current = audio;
    }
  }, [currentDialogue?.id, currentDialogue?.audioUrl, isFinished]);

  // Audio Logic: SFX (sfxUrl)
  useEffect(() => {
    // Stop any previously playing SFX (optional, but good practice if short SFX overlap isn't desired between lines)
    if (sfxRef.current) {
      sfxRef.current.pause();
      sfxRef.current = null;
    }

    if (!isFinished && currentDialogue?.sfxUrl) {
      const audio = new Audio(currentDialogue.sfxUrl);
      audio.volume = 0.5;
      audio.muted = isMuted;
      audio.play().catch(e => console.warn("SFX autoplay blocked:", e));
      sfxRef.current = audio;
    }
  }, [currentDialogue?.id, currentDialogue?.sfxUrl, isFinished]);

  // Audio Logic: Mute Sync
  useEffect(() => {
    if (bgmRef.current) bgmRef.current.muted = isMuted;
    if (voiceRef.current && !voiceRef.current.ended) voiceRef.current.muted = isMuted;
    if (sfxRef.current && !sfxRef.current.ended) sfxRef.current.muted = isMuted;
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
      if (voiceRef.current) {
        voiceRef.current.pause();
        voiceRef.current = null;
      }
      if (sfxRef.current) {
        sfxRef.current.pause();
        sfxRef.current = null;
      }
    };
  }, []);

  const handleChoice = (targetSceneId: string) => {
    const targetSceneIndex = novel.scenes.findIndex(s => s.id === targetSceneId);
    if (targetSceneIndex !== -1) {
        performSceneTransition(targetSceneIndex);
    }
  };

  const performSceneTransition = (nextIndex: number) => {
    const nextScene = novel.scenes[nextIndex];
    const effect = nextScene.transition || 'fade';

    setIsTransitioning(true);
    
    let delay = 500;
    if (effect === 'slide' || effect === 'zoom') {
        delay = 100;
    } else if (effect === 'none') {
        delay = 50;
    }

    setTimeout(() => {
      setCurrentSceneIndex(nextIndex);
      setCurrentDialogueIndex(0);
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, effect === 'none' ? 0 : 100);
    }, delay);
  };

  const advance = () => {
    if (!currentScene || isTransitioning) return;

    if (isTyping && currentDialogue) {
        setDisplayedText(currentDialogue.text);
        setIsTyping(false);
        return;
    }
    
    if (currentDialogue?.choices && currentDialogue.choices.length > 0) {
        return;
    }

    if (currentDialogueIndex < currentScene.dialogues.length - 1) {
      setCurrentDialogueIndex(prev => prev + 1);
    } else if (currentSceneIndex < novel.scenes.length - 1) {
      performSceneTransition(currentSceneIndex + 1);
    } else {
      setIsFinished(true);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (currentDialogue?.choices && currentDialogue.choices.length > 0 && !isTyping) {
            return;
        }
        advance();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSceneIndex, currentDialogueIndex, isTransitioning, isTyping, displayedText]);

  const getThemeClasses = () => {
    const globalTheme = novel.theme;
    const sceneTheme = currentScene?.themeOverride;
    
    const fontFamily = sceneTheme?.fontFamily || globalTheme?.fontFamily;
    const fontSize = sceneTheme?.fontSize || globalTheme?.fontSize;

    let classes = "";
    
    if (fontFamily === 'serif') classes += " font-serif";
    else if (fontFamily === 'mono') classes += " font-mono";
    else if (fontFamily === 'handwritten') classes += " font-handwritten";
    else if (fontFamily === 'retro') classes += " font-retro";
    else if (fontFamily === 'futuristic') classes += " font-futuristic";
    else if (fontFamily === 'readable') classes += " font-readable";
    else classes += " font-sans";

    if (fontSize === 'sm') classes += " text-lg md:text-xl";
    else if (fontSize === 'lg') classes += " text-2xl md:text-3xl";
    else classes += " text-xl md:text-2xl"; 

    return classes;
  };

  const getEffectClass = (effect?: string) => {
    if (effect === 'shake') return 'vn-effect-shake';
    if (effect === 'flash') return 'vn-effect-flash';
    if (effect === 'rainbow') return 'vn-effect-rainbow';
    return '';
  };

  const getSceneAnimationClass = () => {
      if (!currentScene) return '';
      switch (currentScene.transition) {
          case 'slide': return 'animate-slide-in-right';
          case 'zoom': return 'animate-zoom-in';
          default: return '';
      }
  };

  const getOverlayClass = () => {
      const transitionType = currentScene?.transition;
      if (transitionType === 'flash') return 'bg-white';
      if (transitionType === 'slide' || transitionType === 'zoom') return 'bg-black/0'; 
      if (transitionType === 'none') return 'bg-transparent hidden';
      return 'bg-black'; 
  };

  const effectStyles = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-2px) rotate(-1deg); }
      75% { transform: translateX(2px) rotate(1deg); }
    }
    @keyframes flash {
      0%, 50%, 100% { opacity: 1; }
      25%, 75% { opacity: 0.5; }
    }
    @keyframes rainbow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes zoomIn {
      from { transform: scale(1.2); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .vn-effect-shake { animation: shake 0.4s infinite; display: inline-block; }
    .vn-effect-flash { animation: flash 0.2s infinite; }
    .vn-effect-rainbow {
      background: linear-gradient(270deg, #ff5e5e, #ffff5e, #5eff5e, #5effff, #5e5eff, #ff5eff);
      background-size: 400% 400%;
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      animation: rainbow 4s ease infinite;
    }
    .animate-slide-in-right { animation: slideInRight 0.5s ease-out forwards; }
    .animate-zoom-in { animation: zoomIn 0.8s ease-out forwards; }
    .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
    @keyframes slideUp {
        from { transform: translateY(20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
  `;

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
      <style>{effectStyles}</style>

      {/* Background Layer with Animation Key */}
      <div 
        key={currentScene.id} 
        className={`absolute inset-0 bg-no-repeat transition-all duration-700 ${getSceneAnimationClass()}`}
        style={{ 
            backgroundImage: `url(${currentScene.backgroundUrl})`,
            backgroundSize: currentScene.backgroundSize === 'stretch' ? '100% 100%' : (currentScene.backgroundSize || 'cover'),
            backgroundPosition: currentScene.backgroundPosition || 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Character Layer */}
      <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
        {activeCharacter && activeSpriteUrl && (
          <img 
            src={activeSpriteUrl} 
            alt={activeCharacter.name}
            className="h-[80%] object-contain drop-shadow-2xl animate-slide-up transition-all duration-300"
            key={activeSpriteUrl} 
          />
        )}
      </div>

      {/* Transition Overlay */}
      <div 
        className={`absolute inset-0 transition-opacity duration-500 ease-in-out pointer-events-none ${getOverlayClass()} ${isTransitioning ? 'opacity-100 z-[60]' : 'opacity-0 z-[-1]'}`} 
      />

      {/* Choices Overlay */}
      {!isTyping && currentDialogue?.choices && currentDialogue.choices.length > 0 && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm animate-fade-in">
              {currentDialogue.choices.map((choice) => (
                  <button
                    key={choice.id}
                    onClick={() => handleChoice(choice.targetSceneId)}
                    className="bg-white/90 hover:bg-white text-slate-900 font-bold py-3 px-8 rounded-lg min-w-[300px] shadow-lg transform hover:scale-105 transition-all"
                  >
                      {choice.text}
                  </button>
              ))}
          </div>
      )}

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
             <p 
                className={`leading-relaxed font-medium mt-2 ${getThemeClasses()} ${getEffectClass(currentDialogue?.textEffect)}`}
                style={{ color: activeCharacter ? activeCharacter.color : '#f1f5f9' }}
             >
               {displayedText}
               {!isTyping && <span className="inline-block w-2 h-5 bg-white ml-2 animate-pulse" />}
             </p>

             {/* Advance Indicator */}
             {!isTyping && (!currentDialogue?.choices || currentDialogue.choices.length === 0) && (
                 <div className="absolute bottom-4 right-4 text-slate-500 text-sm flex items-center gap-1 group-hover:text-indigo-400 transition-colors animate-bounce">
                   Click or Space to continue <SkipForward className="w-4 h-4" />
                 </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualNovelPlayer;