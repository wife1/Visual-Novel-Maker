import React, { useState, useEffect } from 'react';
import { Novel, Scene, Character, Dialogue, NovelTheme } from '../types';
import { Button, Input, TextArea, Card } from '../components/ui/Components';
import { Plus, Trash2, Image as ImageIcon, MessageSquare, Save, Wand2, PlayCircle, RefreshCw, CheckCircle2, Upload, X, Music, StopCircle, ArrowLeft, Type, Mic } from 'lucide-react';
import { generateSceneDialogues, generateCharacterAvatar } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

interface CreateNovelProps {
  onSave: (novel: Novel) => void;
  onUpdate?: (novel: Novel) => void;
  user: any;
  initialData?: Novel; // Optional prop for editing mode
}

const CreateNovel: React.FC<CreateNovelProps> = ({ onSave, onUpdate, user, initialData }) => {
  const navigate = useNavigate();
  const isEditing = !!initialData;

  // Editor State
  const [title, setTitle] = useState('Untitled Story');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Character[]>([
    { id: 'c1', name: 'Protagonist', color: '#6366f1', avatarUrl: 'https://picsum.photos/100/100?random=1' }
  ]);
  const [scenes, setScenes] = useState<Scene[]>([
    { id: 's1', name: 'Scene 1', backgroundUrl: 'https://picsum.photos/1280/720?grayscale', dialogues: [] }
  ]);
  const [activeSceneId, setActiveSceneId] = useState<string>('s1');
  const [theme, setTheme] = useState<NovelTheme>({ fontFamily: 'sans', fontSize: 'md' });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Avatar Editing State
  const [editingAvatarCharId, setEditingAvatarCharId] = useState<string | null>(null);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  // Audio Preview State
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

  // Initialization Logic
  useEffect(() => {
    if (initialData) {
      // Editing Mode: Load from props
      setTitle(initialData.title);
      setDescription(initialData.description);
      setCoverUrl(initialData.coverUrl);
      setCharacters(initialData.characters);
      setScenes(initialData.scenes);
      if (initialData.theme) setTheme(initialData.theme);
      if (initialData.scenes.length > 0) {
        setActiveSceneId(initialData.scenes[0].id);
      }
    } else {
      // Creation Mode: Load draft from localStorage
      const savedDraft = localStorage.getItem('affinity_novel_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.description) setDescription(parsed.description);
          if (parsed.coverUrl) setCoverUrl(parsed.coverUrl);
          if (parsed.characters) setCharacters(parsed.characters);
          if (parsed.scenes) setScenes(parsed.scenes);
          if (parsed.theme) setTheme(parsed.theme);
          if (parsed.activeSceneId) setActiveSceneId(parsed.activeSceneId);
          setLastSaved(new Date()); 
        } catch (e) {
          console.error("Failed to restore draft", e);
        }
      }
    }
  }, [initialData]);

  // Auto-save logic (Only in creation mode or specific edit draft key - strictly purely draft for now)
  useEffect(() => {
    // We only auto-save to localStorage if we are NOT editing an existing published novel to avoid overwriting "new novel" drafts
    // or implementing complex ID-based draft storage.
    if (isEditing) return; 

    const timer = setTimeout(() => {
      const draftState = {
        title,
        description,
        coverUrl,
        characters,
        scenes,
        activeSceneId,
        theme
      };
      try {
        localStorage.setItem('affinity_novel_draft', JSON.stringify(draftState));
        setLastSaved(new Date());
      } catch (e) {
        console.warn("Auto-save quota exceeded", e);
      }
    }, 2000); 

    return () => clearTimeout(timer);
  }, [title, description, coverUrl, characters, scenes, activeSceneId, theme, isEditing]);

  // Clean up audio preview
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [previewAudio]);

  // Handlers
  const addScene = () => {
    const newId = `s${scenes.length + 1}`;
    setScenes([...scenes, { id: newId, name: `Scene ${scenes.length + 1}`, backgroundUrl: 'https://picsum.photos/1280/720?blur', dialogues: [] }]);
    setActiveSceneId(newId);
  };

  const updateScene = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSceneId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateScene(activeSceneId, { backgroundUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeSceneId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateScene(activeSceneId, { bgmUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDialogueAudioUpload = (e: React.ChangeEvent<HTMLInputElement>, dialogueId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDialogue(dialogueId, { audioUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleBgmPreview = (url: string) => {
    if (previewAudio) {
      previewAudio.pause();
      if (previewAudio.src === url) {
        setPreviewAudio(null);
        return;
      }
    }
    const audio = new Audio(url);
    audio.play().catch(e => console.error("Audio playback failed", e));
    audio.onended = () => setPreviewAudio(null);
    setPreviewAudio(audio);
  };

  const addCharacter = () => {
    const newId = `c${characters.length + 1}`;
    setCharacters([...characters, { id: newId, name: 'New Character', color: '#ec4899', avatarUrl: `https://picsum.photos/100/100?random=${newId}` }]);
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingAvatarCharId) {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateCharacter(editingAvatarCharId, { avatarUrl: reader.result as string });
            setEditingAvatarCharId(null);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt || !editingAvatarCharId) return;
    setIsGeneratingImage(true);
    const url = await generateCharacterAvatar(avatarPrompt);
    if (url) {
        updateCharacter(editingAvatarCharId, { avatarUrl: url });
        setEditingAvatarCharId(null);
        setAvatarPrompt('');
    }
    setIsGeneratingImage(false);
  };

  const addDialogue = (text = "New line of text...", charId: string | null = null) => {
    const updatedScenes = scenes.map(s => {
      if (s.id === activeSceneId) {
        return {
          ...s,
          dialogues: [...s.dialogues, { id: crypto.randomUUID(), characterId: charId, text }]
        };
      }
      return s;
    });
    setScenes(updatedScenes);
  };

  const updateDialogue = (dialogueId: string, updates: Partial<Dialogue>) => {
    const updatedScenes = scenes.map(s => {
      if (s.id === activeSceneId) {
        return {
          ...s,
          dialogues: s.dialogues.map(d => d.id === dialogueId ? { ...d, ...updates } : d)
        };
      }
      return s;
    });
    setScenes(updatedScenes);
  };

  const generateWithAI = async () => {
    if (!activeScene) return;
    setIsGenerating(true);
    const generatedDialogues = await generateSceneDialogues(`A scene in a visual novel named ${activeScene.name}.`, characters);
    
    if (generatedDialogues.length > 0) {
        const updatedScenes = scenes.map(s => {
            if (s.id === activeSceneId) {
                return { ...s, dialogues: [...s.dialogues, ...generatedDialogues] };
            }
            return s;
        });
        setScenes(updatedScenes);
    }
    setIsGenerating(false);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset? All unsaved progress will be lost.")) {
      if (!isEditing) {
        localStorage.removeItem('affinity_novel_draft');
      }
      // If editing, 'reset' just effectively reloads the page/component or clears state, but here we just reset to defaults for simplicity
      setTitle('Untitled Story');
      setDescription('');
      setCoverUrl(null);
      setCharacters([{ id: 'c1', name: 'Protagonist', color: '#6366f1', avatarUrl: 'https://picsum.photos/100/100?random=1' }]);
      setScenes([{ id: 's1', name: 'Scene 1', backgroundUrl: 'https://picsum.photos/1280/720?grayscale', dialogues: [] }]);
      setTheme({ fontFamily: 'sans', fontSize: 'md' });
      setActiveSceneId('s1');
      setLastSaved(null);
    }
  };

  const handleSave = () => {
    if (isEditing && initialData && onUpdate) {
        // Update existing novel
        const updatedNovel: Novel = {
            ...initialData,
            title,
            description,
            coverUrl: coverUrl || initialData.coverUrl,
            characters,
            scenes,
            theme
            // Keep original ID, likes, plays, publishedAt
        };
        onUpdate(updatedNovel);
        navigate(`/novel/${updatedNovel.id}`);
    } else {
        // Create new novel
        const newNovel: Novel = {
            id: crypto.randomUUID(),
            title,
            description,
            authorId: user?.id || 'anon',
            coverUrl: coverUrl || 'https://picsum.photos/400/600',
            genre: ['Visual Novel'],
            scenes,
            characters,
            likes: 0,
            plays: 0,
            publishedAt: new Date().toISOString(),
            theme
        };
        onSave(newNovel);
        localStorage.removeItem('affinity_novel_draft');
        navigate(`/novel/${newNovel.id}`);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-4 relative">
      {/* Left Sidebar: Assets & Scenes */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0">
         <Card className="flex-1 overflow-hidden flex flex-col bg-slate-900/50">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-300">Scenes</h3>
             <button onClick={addScene} title="Add a new scene" className="text-indigo-400 hover:text-indigo-300"><Plus className="w-5 h-5"/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2">
             {scenes.map(scene => (
               <div 
                 key={scene.id} 
                 onClick={() => setActiveSceneId(scene.id)}
                 title="Click to edit this scene"
                 className={`p-3 rounded-lg cursor-pointer text-sm font-medium transition-colors border ${activeSceneId === scene.id ? 'bg-indigo-600/20 border-indigo-500/50 text-white' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-700'}`}
               >
                 {scene.name}
               </div>
             ))}
           </div>
         </Card>

         <Card className="h-1/3 flex flex-col bg-slate-900/50">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-300">Cast</h3>
             <button onClick={addCharacter} title="Create a new character" className="text-indigo-400 hover:text-indigo-300"><Plus className="w-5 h-5"/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2">
             {characters.map(char => (
               <div key={char.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                 <div 
                    className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden cursor-pointer relative group shrink-0" 
                    onClick={() => setEditingAvatarCharId(char.id)}
                    title="Click to change avatar"
                 >
                   <img src={char.avatarUrl} alt="" className="w-full h-full object-cover"/>
                   <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                        <Upload className="w-3 h-3 text-white"/>
                   </div>
                 </div>
                 <input 
                   className="bg-transparent text-xs text-slate-300 focus:outline-none w-full"
                   value={char.name}
                   title="Character Name"
                   onChange={(e) => updateCharacter(char.id, { name: e.target.value })}
                 />
               </div>
             ))}
           </div>
         </Card>
      </div>

      {/* Center: Stage Preview */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <header className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
           <div className="flex items-center gap-4 flex-1">
             {isEditing && (
                <button onClick={() => navigate(`/novel/${initialData?.id}`)} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white mr-2" title="Cancel Editing">
                    <ArrowLeft className="w-5 h-5" />
                </button>
             )}
             {/* Cover Upload */}
             <label className="relative w-12 h-16 bg-slate-700/50 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-all border border-slate-600 hover:border-indigo-500 group shrink-0 shadow-sm" title="Upload cover image">
                 {coverUrl ? (
                     <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-1">
                        <ImageIcon className="w-4 h-4"/>
                        <span className="text-[8px] font-bold uppercase">Cover</span>
                     </div>
                 )}
                 <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                 <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                    <Upload className="w-4 h-4 text-white"/>
                 </div>
             </label>

             <div className="flex flex-col w-full">
                <Input 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    title="Edit story title"
                    className="font-serif text-xl font-bold bg-transparent border-none px-0 focus:ring-0 w-full p-0"
                    placeholder="Story Title"
                />
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-transparent text-sm text-slate-400 focus:outline-none w-full border-none p-0 placeholder:text-slate-600"
                    placeholder="Add a short description..."
                />
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50" title="Text Settings">
                <Type className="w-4 h-4 text-slate-400" />
                <select 
                  value={theme.fontFamily}
                  onChange={(e) => setTheme({...theme, fontFamily: e.target.value as any})}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="sans" className="bg-slate-800">Sans</option>
                  <option value="serif" className="bg-slate-800">Serif</option>
                  <option value="mono" className="bg-slate-800">Mono</option>
                </select>
                <div className="w-px h-3 bg-slate-700"></div>
                <select 
                  value={theme.fontSize}
                  onChange={(e) => setTheme({...theme, fontSize: e.target.value as any})}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="sm" className="bg-slate-800">Small</option>
                  <option value="md" className="bg-slate-800">Medium</option>
                  <option value="lg" className="bg-slate-800">Large</option>
                </select>
             </div>

             {lastSaved && !isEditing && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 animate-fade-in" title="Draft is auto-saved locally">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Saved</span>
                </div>
             )}
             
             <div className="h-6 w-px bg-slate-700 mx-2 hidden sm:block"></div>

             <div className="flex gap-2">
               {!isEditing && (
                   <Button variant="ghost" title="Reset Draft" onClick={handleReset} className="text-slate-500 hover:text-red-400">
                    <RefreshCw className="w-4 h-4" />
                   </Button>
               )}
               <Button onClick={handleSave} title={isEditing ? "Save changes" : "Save and publish your story"}>
                 <Save className="w-4 h-4" /> {isEditing ? 'Save' : 'Publish'}
               </Button>
             </div>
           </div>
        </header>

        {/* Scene Settings Toolbar */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 px-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Scene:</span>
                <input 
                  value={activeScene?.name} 
                  onChange={(e) => updateScene(activeSceneId, { name: e.target.value })}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none w-full border-b border-transparent focus:border-indigo-500 transition-colors"
                  placeholder="Scene Name"
                />
            </div>
            
            <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

            <div className="flex items-center gap-3">
                {/* Background Settings */}
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors" title="Change Background Image">
                        <ImageIcon className="w-3 h-3" /> 
                        <span className="hidden sm:inline">Background</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                     </label>
                </div>

                {/* Music Settings */}
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors" title="Change Background Music">
                        <Music className="w-3 h-3" />
                        <span className="hidden sm:inline">Music</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={handleBgmUpload} />
                     </label>
                </div>

                {/* Music Status / Preview */}
                {activeScene?.bgmUrl && (
                    <div className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 pl-2 pr-1 py-1 rounded-md">
                        <span className="text-xs text-indigo-300 max-w-[80px] truncate select-none">
                            {activeScene.bgmUrl.length > 30 ? 'Track Set' : 'Music'}
                        </span>
                        <button 
                            onClick={() => toggleBgmPreview(activeScene.bgmUrl!)} 
                            className={`p-1 rounded hover:bg-indigo-500/20 text-indigo-300 ${previewAudio?.src === activeScene.bgmUrl ? 'text-white' : ''}`}
                            title={previewAudio?.src === activeScene.bgmUrl ? "Stop Preview" : "Preview Music"}
                        >
                             {previewAudio?.src === activeScene.bgmUrl ? <StopCircle className="w-3 h-3"/> : <PlayCircle className="w-3 h-3"/>}
                        </button>
                        <button 
                            onClick={() => updateScene(activeSceneId, { bgmUrl: undefined })} 
                            className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                            title="Remove Music"
                        >
                            <X className="w-3 h-3"/>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Visual Editor Canvas */}
        <div className="flex-1 bg-black rounded-xl border border-slate-700 relative overflow-hidden group">
           {/* Background Preview */}
           <div 
             className="absolute inset-0 bg-cover bg-center opacity-80"
             style={{ backgroundImage: `url(${activeScene?.backgroundUrl})` }}
           />
           <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs text-slate-300">
             Stage Preview
           </div>
           
           {/* Overlay UI Mockup */}
           <div className="absolute bottom-8 left-8 right-8 bg-slate-900/90 backdrop-blur border border-slate-600 p-6 rounded-lg min-h-[120px] flex flex-col justify-center items-center text-slate-400 border-dashed border-2">
              <p>Select a dialogue line to edit it here or generate new ones.</p>
           </div>
        </div>
      </div>

      {/* Right Sidebar: Dialogue Script */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        <Card className="flex-1 flex flex-col bg-slate-900/50 h-full">
           <div className="flex justify-between items-center mb-4 shrink-0">
             <h3 className="font-bold text-slate-300">Script</h3>
             <Button 
               variant="ghost" 
               className="text-indigo-400" 
               onClick={generateWithAI}
               loading={isGenerating}
               title="Generate dialogue suggestions using AI"
             >
               <Wand2 className="w-4 h-4 mr-1"/> AI Assist
             </Button>
           </div>

           <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
             {activeScene?.dialogues.map((dialogue, index) => {
                const char = characters.find(c => c.id === dialogue.characterId);
                return (
                 <div key={dialogue.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <select 
                         title="Select character"
                         className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none"
                         value={dialogue.characterId || ''}
                         onChange={(e) => updateDialogue(dialogue.id, { characterId: e.target.value || null })}
                       >
                         <option value="" className="bg-slate-800">Narrator</option>
                         {characters.map(c => (
                           <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                         ))}
                       </select>
                       <button 
                         onClick={() => {
                           const newDialogues = activeScene.dialogues.filter(d => d.id !== dialogue.id);
                           const updatedScenes = scenes.map(s => s.id === activeSceneId ? { ...s, dialogues: newDialogues } : s);
                           setScenes(updatedScenes);
                         }}
                         title="Delete this dialogue line"
                         className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                    </div>
                    <textarea 
                      className="w-full bg-transparent text-sm text-slate-300 focus:outline-none resize-none"
                      rows={2}
                      value={dialogue.text}
                      onChange={(e) => updateDialogue(dialogue.id, { text: e.target.value })}
                    />
                    
                    {/* Audio Controls */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                        <div className="flex items-center gap-2">
                            {dialogue.audioUrl ? (
                                <div className="flex items-center gap-1 bg-indigo-900/30 border border-indigo-500/30 px-2 py-1 rounded text-xs text-indigo-300">
                                    <button
                                        onClick={() => toggleBgmPreview(dialogue.audioUrl!)}
                                        title={previewAudio?.src === dialogue.audioUrl ? "Stop" : "Play Voice"}
                                        className="hover:text-white"
                                    >
                                        {previewAudio?.src === dialogue.audioUrl ? <StopCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                                    </button>
                                    <span className="max-w-[80px] truncate">Voice</span>
                                    <button
                                        onClick={() => updateDialogue(dialogue.id, { audioUrl: undefined })}
                                        className="hover:text-red-400 ml-1"
                                        title="Remove Voice"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors">
                                    <Mic className="w-3 h-3" /> 
                                    <span>Add Voice</span>
                                    <input 
                                        type="file" 
                                        accept="audio/*" 
                                        className="hidden" 
                                        onChange={(e) => handleDialogueAudioUpload(e, dialogue.id)} 
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                 </div>
               );
             })}

             <button 
               onClick={() => addDialogue()}
               title="Add a new dialogue line"
               className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-sm font-medium hover:border-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
             >
               <Plus className="w-4 h-4" /> Add Line
             </button>
           </div>
        </Card>
      </div>

      {/* Avatar Editing Modal */}
      {editingAvatarCharId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <Card className="w-full max-w-sm space-y-6 bg-slate-900 border-slate-700 shadow-2xl animate-fade-in">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Edit Character Avatar</h3>
                    <button onClick={() => setEditingAvatarCharId(null)} className="text-slate-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                 </div>
                 
                 <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-400">Upload Image</label>
                    <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleAvatarUpload} 
                        className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer bg-slate-800 rounded-lg"
                    />
                 </div>
                 
                 <div className="relative py-2">
                     <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-700"></span></div>
                     <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-900 px-2 text-slate-500 font-medium">Or Generate with AI</span></div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-sm font-medium text-slate-400">Description</label>
                    <div className="flex gap-2">
                        <Input 
                            value={avatarPrompt} 
                            onChange={(e) => setAvatarPrompt(e.target.value)}
                            placeholder="e.g. A cyberpunk detective"
                            className="bg-slate-800"
                        />
                        <Button onClick={handleGenerateAvatar} loading={isGeneratingImage} disabled={!avatarPrompt} title="Generate Avatar">
                            <Wand2 className="w-4 h-4" />
                        </Button>
                    </div>
                    <p className="text-xs text-slate-500">Generates a character sprite using Gemini AI.</p>
                 </div>

                 <div className="pt-2">
                    <Button variant="ghost" onClick={() => setEditingAvatarCharId(null)} className="w-full">Cancel</Button>
                 </div>
            </Card>
        </div>
      )}
    </div>
  );
};

export default CreateNovel;