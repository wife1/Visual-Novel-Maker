import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Novel, Scene, Character, Dialogue, NovelTheme, Choice } from '../types';
import { Button, Input, TextArea, Card } from '../components/ui/Components';
import { Plus, Trash2, Image as ImageIcon, MessageSquare, Save, Wand2, PlayCircle, RefreshCw, CheckCircle2, Upload, X, Music, StopCircle, ArrowLeft, Type, Mic, RotateCcw, RotateCw, Zap, Activity, Palette, Maximize, Move, GitFork, ArrowRight, Download, FileJson, Layers, LayoutTemplate, Volume2, Smile } from 'lucide-react';
import { generateSceneDialogues, generateCharacterAvatar } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';

interface CreateNovelProps {
  onSave: (novel: Novel) => void;
  onUpdate?: (novel: Novel) => void;
  user: any;
  initialData?: Novel; // Optional prop for editing mode
}

// Define the shape of the editor's content state
interface EditorState {
  title: string;
  description: string;
  coverUrl: string | null;
  characters: Character[];
  scenes: Scene[];
  activeSceneId: string;
  theme: NovelTheme;
}

const CreateNovel: React.FC<CreateNovelProps> = ({ onSave, onUpdate, user, initialData }) => {
  const navigate = useNavigate();
  const isEditing = !!initialData;
  const importInputRef = useRef<HTMLInputElement>(null);

  // -- Unified Editor State --
  // We group all "content" state into one object to make history management easier.
  const [state, setState] = useState<EditorState>({
    title: initialData?.title || 'Untitled Story',
    description: initialData?.description || '',
    coverUrl: initialData?.coverUrl || null,
    characters: initialData?.characters || [{ id: 'c1', name: 'Protagonist', color: '#6366f1', avatarUrl: 'https://picsum.photos/100/100?random=1' }],
    scenes: initialData?.scenes || [{ id: 's1', name: 'Scene 1', backgroundUrl: 'https://picsum.photos/1280/720?grayscale', dialogues: [] }],
    activeSceneId: initialData?.scenes?.[0]?.id || 's1',
    theme: initialData?.theme || { fontFamily: 'sans', fontSize: 'md' }
  });

  // -- History State --
  const [history, setHistory] = useState<{ past: EditorState[]; future: EditorState[] }>({
    past: [],
    future: []
  });

  // -- Transient UI State (Not part of undo history) --
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingAvatarCharId, setEditingAvatarCharId] = useState<string | null>(null);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Destructure state for easier usage in render
  const { title, description, coverUrl, characters, scenes, activeSceneId, theme } = state;
  const activeScene = scenes.find(s => s.id === activeSceneId) || scenes[0];

  const templates = [
    {
      id: 'romance',
      name: 'High School Romance',
      description: 'A classic slice-of-life romance setting with a protagonist and a love interest.',
      genre: ['Romance', 'School Life'],
      state: {
        title: 'My Heartbeat Academy',
        description: 'A new student arrives at a prestigious academy...',
        coverUrl: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?q=80&w=600&auto=format&fit=crop',
        characters: [
           { id: 'c1', name: 'Protagonist', color: '#6366f1', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Protag&backgroundColor=b6e3f4' },
           { id: 'c2', name: 'Sakura', color: '#ec4899', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sakura&backgroundColor=ffdfbf' },
           { id: 'c3', name: 'Ryu', color: '#10b981', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryu' }
        ],
        scenes: [
          {
             id: 's1',
             name: 'School Gates',
             backgroundUrl: 'https://images.unsplash.com/photo-1585822765366-4c9197c36929?auto=format&fit=crop&q=80&w=1280',
             dialogues: [
               { id: 'd1', characterId: null, text: 'The cherry blossoms are falling...' },
               { id: 'd2', characterId: 'c1', text: 'I hope I can make friends on my first day.' },
               { id: 'd3', characterId: 'c2', text: 'Hey! You dropped this!', expression: 'happy' }
             ]
          }
        ]
      }
    },
    {
      id: 'scifi',
      name: 'Cyberpunk Mystery',
      description: 'A futuristic noir story set in a neon-lit city.',
      genre: ['Sci-Fi', 'Mystery'],
      state: {
        title: 'Neon Rain',
        description: 'In 2077, a detective takes on a case that could change the city forever.',
        coverUrl: 'https://images.unsplash.com/photo-1625126596387-542125028267?q=80&w=600&auto=format&fit=crop',
        characters: [
           { id: 'c1', name: 'Detective Vance', color: '#3b82f6', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Vance' },
           { id: 'c2', name: 'Unit 734', color: '#a855f7', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Unit' }
        ],
        scenes: [
          {
             id: 's1',
             name: 'Rainy Alley',
             backgroundUrl: 'https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&q=80&w=1280',
             dialogues: [
               { id: 'd1', characterId: null, text: 'The rain sizzled against the neon signs.' },
               { id: 'd2', characterId: 'c1', text: 'This city never sleeps, and neither do the crimes.' },
               { id: 'd3', characterId: 'c2', text: 'Detective, I have found the data trace.' }
             ]
          }
        ]
      }
    },
    {
      id: 'horror',
      name: 'Haunted Manor',
      description: 'A spooky exploration of an abandoned house.',
      genre: ['Horror', 'Thriller'],
      state: {
        title: 'The Manor',
        description: 'They said it was abandoned years ago, but the lights still flicker at night.',
        coverUrl: 'https://images.unsplash.com/photo-1481018085669-2bc6e4f00eed?q=80&w=600&auto=format&fit=crop',
        characters: [
           { id: 'c1', name: 'Explorer', color: '#f59e0b', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Explorer' },
           { id: 'c2', name: 'The Ghost', color: '#94a3b8', avatarUrl: 'https://api.dicebear.com/7.x/micah/svg?seed=Ghost' }
        ],
        scenes: [
          {
             id: 's1',
             name: 'Entrance Hall',
             backgroundUrl: 'https://images.unsplash.com/photo-1505567745926-ba89000d255a?q=80&w=1280&auto=format&fit=crop',
             dialogues: [
               { id: 'd1', characterId: null, text: 'The door creaked open, revealing a dusty hall.' },
               { id: 'd2', characterId: 'c1', text: 'Hello? Is anyone here?' },
               { id: 'd3', characterId: null, text: '*Thump... Thump...*' },
               { id: 'd4', characterId: 'c1', text: 'What was that sound?', textEffect: 'shake' }
             ]
          }
        ]
      }
    }
  ];

  // -- Initialization (Draft Restore) --
  useEffect(() => {
    if (!initialData) {
      const savedDraft = localStorage.getItem('affinity_novel_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Merge parsed draft with defaults to ensure all fields exist
          setState(prev => ({
             ...prev,
             ...parsed
          }));
          setLastSaved(new Date()); 
        } catch (e) {
          console.error("Failed to restore draft", e);
        }
      }
    }
  }, [initialData]);

  // -- Auto-save Draft --
  useEffect(() => {
    if (isEditing) return; 
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('affinity_novel_draft', JSON.stringify(state));
        setLastSaved(new Date());
      } catch (e) {
        console.warn("Auto-save quota exceeded", e);
      }
    }, 2000); 
    return () => clearTimeout(timer);
  }, [state, isEditing]);

  // -- Audio Cleanup --
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [previewAudio]);

  // -- Undo / Redo Logic --
  
  const handleUndo = useCallback(() => {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    
    setHistory({
      past: newPast,
      future: [state, ...history.future]
    });
    setState(previous);
  }, [history, state]);

  const handleRedo = useCallback(() => {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const newFuture = history.future.slice(1);
    
    setHistory({
      past: [...history.past, state],
      future: newFuture
    });
    setState(next);
  }, [history, state]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // -- Centralized State Update --
  // saveHistory: true = push current state to history before updating.
  // saveHistory: false = update in place (good for typing / transient updates).
  const updateState = (updates: Partial<EditorState>, saveHistory = true) => {
    if (saveHistory) {
      setHistory(prev => ({
        past: [...prev.past, state],
        future: []
      }));
    }
    setState(prev => ({ ...prev, ...updates }));
  };

  // Debounce Ref for text inputs to avoid flooding history
  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preDebounceStateRef = useRef<EditorState | null>(null);

  const updateStateDebounced = (updates: Partial<EditorState>) => {
    // If this is the start of a sequence of edits, save the baseline state
    if (!preDebounceStateRef.current) {
      preDebounceStateRef.current = state;
    }

    // Update the UI immediately
    setState(prev => ({ ...prev, ...updates }));

    // Reset the commit timer
    if (historyDebounceRef.current) {
      clearTimeout(historyDebounceRef.current);
    }

    historyDebounceRef.current = setTimeout(() => {
      if (preDebounceStateRef.current) {
        setHistory(prev => ({
          past: [...prev.past, preDebounceStateRef.current!],
          future: []
        }));
        preDebounceStateRef.current = null;
      }
      historyDebounceRef.current = null;
    }, 1000); // Commit after 1s of inactivity
  };


  // -- Action Handlers --

  const addScene = () => {
    const newId = `s${scenes.length + 1}`;
    const newScene: Scene = { 
        id: newId, 
        name: `Scene ${scenes.length + 1}`, 
        backgroundUrl: 'https://picsum.photos/1280/720?blur', 
        dialogues: [] 
    };
    updateState({ 
        scenes: [...scenes, newScene],
        activeSceneId: newId 
    }); // Implicitly saves history
  };

  const updateScene = (id: string, updates: Partial<Scene>, debounce = false) => {
    const newScenes = scenes.map(s => s.id === id ? { ...s, ...updates } : s);
    if (debounce) {
        updateStateDebounced({ scenes: newScenes });
    } else {
        updateState({ scenes: newScenes });
    }
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
        updateState({ coverUrl: reader.result as string });
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
    const newChar: Character = { id: newId, name: 'New Character', color: '#ec4899', avatarUrl: `https://picsum.photos/100/100?random=${newId}` };
    updateState({ characters: [...characters, newChar] });
  };

  const updateCharacter = (id: string, updates: Partial<Character>, debounce = false) => {
    const newChars = characters.map(c => c.id === id ? { ...c, ...updates } : c);
    if (debounce) {
        updateStateDebounced({ characters: newChars });
    } else {
        updateState({ characters: newChars });
    }
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
    const newScenes = scenes.map(s => {
      if (s.id === activeSceneId) {
        return {
          ...s,
          dialogues: [...s.dialogues, { id: crypto.randomUUID(), characterId: charId, text }]
        };
      }
      return s;
    });
    updateState({ scenes: newScenes });
  };

  const updateDialogue = (dialogueId: string, updates: Partial<Dialogue>, debounce = false) => {
    const newScenes = scenes.map(s => {
      if (s.id === activeSceneId) {
        return {
          ...s,
          dialogues: s.dialogues.map(d => d.id === dialogueId ? { ...d, ...updates } : d)
        };
      }
      return s;
    });
    
    if (debounce) {
        updateStateDebounced({ scenes: newScenes });
    } else {
        updateState({ scenes: newScenes });
    }
  };

  const addChoice = (dialogueId: string) => {
      const dialogue = activeScene?.dialogues.find(d => d.id === dialogueId);
      if (!dialogue) return;

      const newChoice: Choice = {
          id: crypto.randomUUID(),
          text: 'New Option',
          targetSceneId: scenes[0]?.id || ''
      };
      
      const updatedChoices = [...(dialogue.choices || []), newChoice];
      updateDialogue(dialogueId, { choices: updatedChoices }, true);
  };

  const removeChoice = (dialogueId: string, choiceId: string) => {
      const dialogue = activeScene?.dialogues.find(d => d.id === dialogueId);
      if (!dialogue || !dialogue.choices) return;
      
      const updatedChoices = dialogue.choices.filter(c => c.id !== choiceId);
      updateDialogue(dialogueId, { choices: updatedChoices }, true);
  };

  const updateChoice = (dialogueId: string, choiceId: string, updates: Partial<Choice>) => {
      const dialogue = activeScene?.dialogues.find(d => d.id === dialogueId);
      if (!dialogue || !dialogue.choices) return;

      const updatedChoices = dialogue.choices.map(c => c.id === choiceId ? { ...c, ...updates } : c);
      updateDialogue(dialogueId, { choices: updatedChoices }, true);
  };

  const generateWithAI = async () => {
    if (!activeScene) return;
    setIsGenerating(true);
    const generatedDialogues = await generateSceneDialogues(`A scene in a visual novel named ${activeScene.name}.`, characters);
    
    if (generatedDialogues.length > 0) {
        const newScenes = scenes.map(s => {
            if (s.id === activeSceneId) {
                return { ...s, dialogues: [...s.dialogues, ...generatedDialogues] };
            }
            return s;
        });
        updateState({ scenes: newScenes });
    }
    setIsGenerating(false);
  };

  const applyTemplate = (template: typeof templates[0]) => {
      if (scenes.length > 1 || scenes[0].dialogues.length > 0 || characters.length > 1) {
          if (!window.confirm("Applying a template will overwrite your current progress. Are you sure?")) {
              return;
          }
      }

      // Deep copy to avoid reference issues
      const newState: EditorState = {
          title: template.state.title,
          description: template.state.description,
          coverUrl: template.state.coverUrl || null,
          characters: JSON.parse(JSON.stringify(template.state.characters)),
          scenes: JSON.parse(JSON.stringify(template.state.scenes)),
          activeSceneId: template.state.scenes[0].id,
          theme: state.theme
      };

      setState(newState);
      setHistory({ past: [], future: [] }); // Reset history for the fresh start
      setShowTemplateModal(false);
  };

  // Export / Import Handlers
  const handleExportJSON = () => {
    const dataToExport = {
      title: state.title,
      description: state.description,
      coverUrl: state.coverUrl,
      characters: state.characters,
      scenes: state.scenes,
      activeSceneId: state.activeSceneId,
      theme: state.theme,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_project.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!json.scenes || !json.characters) {
          alert('Invalid project file. Missing required scene or character data.');
          return;
        }

        if (window.confirm('Importing this project will overwrite your current unsaved progress. Are you sure?')) {
           setState({
              title: json.title || 'Untitled',
              description: json.description || '',
              coverUrl: json.coverUrl || null,
              characters: json.characters || [],
              scenes: json.scenes || [],
              activeSceneId: json.scenes?.[0]?.id || 's1',
              theme: json.theme || { fontFamily: 'sans', fontSize: 'md' }
           });
           setHistory({ past: [], future: [] }); // Clear undo history
        }
      } catch (err) {
        console.error('Failed to parse project file', err);
        alert('Failed to load project file. Please ensure it is a valid JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset? All unsaved progress will be lost.")) {
      if (!isEditing) {
        localStorage.removeItem('affinity_novel_draft');
      }
      setState({
          title: 'Untitled Story',
          description: '',
          coverUrl: null,
          characters: [{ id: 'c1', name: 'Protagonist', color: '#6366f1', avatarUrl: 'https://picsum.photos/100/100?random=1' }],
          scenes: [{ id: 's1', name: 'Scene 1', backgroundUrl: 'https://picsum.photos/1280/720?grayscale', dialogues: [] }],
          activeSceneId: 's1',
          theme: { fontFamily: 'sans', fontSize: 'md' }
      });
      setHistory({ past: [], future: [] });
      setLastSaved(null);
    }
  };

  const handleSave = () => {
    const novelData: Novel = {
        id: isEditing && initialData ? initialData.id : crypto.randomUUID(),
        title,
        description,
        coverUrl: coverUrl || 'https://picsum.photos/400/600',
        authorId: user?.id || 'anon',
        genre: isEditing && initialData ? initialData.genre : ['Visual Novel'],
        scenes,
        characters,
        likes: isEditing && initialData ? initialData.likes : 0,
        plays: isEditing && initialData ? initialData.plays : 0,
        publishedAt: isEditing && initialData ? initialData.publishedAt : new Date().toISOString(),
        theme
    };

    if (isEditing && onUpdate) {
        onUpdate(novelData);
    } else {
        onSave(novelData);
        localStorage.removeItem('affinity_novel_draft');
    }
    navigate(`/novel/${novelData.id}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-4 relative">
      <input 
        type="file" 
        accept=".json" 
        className="hidden" 
        ref={importInputRef} 
        onChange={handleImportJSON} 
      />

      {/* Top Bar: Title on Left, Publish on Right */}
      <div className="shrink-0 flex items-start justify-between gap-4 px-2">
         <div className="flex items-start gap-4 flex-1">
             {isEditing && (
                <button onClick={() => navigate(`/novel/${initialData?.id}`)} className="mt-1 p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white" title="Cancel Editing">
                    <ArrowLeft className="w-5 h-5" />
                </button>
             )}
             <div className="max-w-xl">
                <Input 
                    value={title} 
                    onChange={(e) => updateStateDebounced({ title: e.target.value })} 
                    title="The main title of your visual novel"
                    className="font-serif text-2xl font-bold bg-transparent border-none px-0 focus:ring-0 w-full p-0 placeholder:text-slate-600"
                    placeholder="Story Title"
                />
                 <input
                    value={description}
                    onChange={(e) => updateStateDebounced({ description: e.target.value })}
                    className="bg-transparent text-sm text-slate-400 focus:outline-none w-full border-none p-0 placeholder:text-slate-600"
                    placeholder="Add a short description..."
                    title="A short summary that appears on the novel list card"
                />
             </div>
             
             {/* Scene Text Overrides - Moved here */}
             <div className="flex flex-col gap-1 ml-4 mt-2 border-l border-slate-700 pl-4">
                  <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Type className="w-3 h-3"/> Scene Font</label>
                  <div className="flex gap-2">
                       <select
                          value={activeScene?.themeOverride?.fontFamily || ''}
                          onChange={(e) => {
                              const val = e.target.value;
                              const current = activeScene?.themeOverride || {};
                              const newTheme = { ...current, fontFamily: val || undefined };
                              if (!val) delete newTheme.fontFamily;
                              updateScene(activeSceneId, { themeOverride: Object.keys(newTheme).length ? newTheme : undefined }, true);
                          }}
                          className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1.5 min-w-[120px]"
                          title="Override global font for this scene"
                       >
                          <option value="">Default (Global)</option>
                          <option value="sans">Sans</option>
                          <option value="serif">Serif</option>
                          <option value="mono">Mono</option>
                          <option value="handwritten">Handwritten</option>
                          <option value="retro">Retro</option>
                          <option value="futuristic">Sci-Fi</option>
                          <option value="readable">Book</option>
                       </select>
                       <select
                          value={activeScene?.themeOverride?.fontSize || ''}
                          onChange={(e) => {
                              const val = e.target.value;
                              const current = activeScene?.themeOverride || {};
                              const newTheme = { ...current, fontSize: val || undefined };
                              if (!val) delete newTheme.fontSize;
                              updateScene(activeSceneId, { themeOverride: Object.keys(newTheme).length ? newTheme : undefined }, true);
                          }}
                          className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1.5"
                          title="Override global font size for this scene"
                       >
                          <option value="">Default</option>
                          <option value="sm">Small</option>
                          <option value="md">Medium</option>
                          <option value="lg">Large</option>
                       </select>
                  </div>
             </div>
         </div>
         
         <div className="flex items-center gap-3">
             {/* Undo / Redo Controls */}
             <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
               <button 
                  onClick={handleUndo} 
                  disabled={history.past.length === 0}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Undo last action (Ctrl+Z)"
               >
                 <RotateCcw className="w-4 h-4" />
               </button>
               <button 
                  onClick={handleRedo} 
                  disabled={history.future.length === 0}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Redo last action (Ctrl+Y)"
               >
                 <RotateCw className="w-4 h-4" />
               </button>
             </div>

             {lastSaved && !isEditing && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 animate-fade-in mr-2" title="Draft is auto-saved locally">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>Saved</span>
                </div>
             )}

             <Button 
                onClick={handleSave} 
                className="shadow-lg shadow-indigo-500/20 py-2 px-6 rounded-lg font-bold"
                title={isEditing ? "Save changes to your story" : "Save and publish your story so others can play it"}
            >
                <Save className="w-4 h-4" /> {isEditing ? 'Save' : 'Publish'}
            </Button>
         </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative">

      {/* Left Sidebar: Assets & Scenes */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0">
         <Card className="flex-1 overflow-hidden flex flex-col bg-slate-900/50">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-300">Scenes</h3>
             <button onClick={addScene} title="Create a new scene to add to your story" className="text-indigo-400 hover:text-indigo-300"><Plus className="w-5 h-5"/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2">
             {scenes.map(scene => (
               <div 
                 key={scene.id} 
                 onClick={() => updateState({ activeSceneId: scene.id }, false)} 
                 title="Click to switch to this scene"
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
             <button onClick={addCharacter} title="Add a new character to the cast" className="text-indigo-400 hover:text-indigo-300"><Plus className="w-5 h-5"/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2">
             {characters.map(char => (
               <div key={char.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
                 <div 
                    className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden cursor-pointer relative group shrink-0" 
                    onClick={() => setEditingAvatarCharId(char.id)}
                    title="Click to upload or generate a character sprite"
                 >
                   <img src={char.avatarUrl} alt="" className="w-full h-full object-cover"/>
                   <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                        <Upload className="w-3 h-3 text-white"/>
                   </div>
                 </div>
                 <input 
                   className="bg-transparent text-xs text-slate-300 focus:outline-none w-full"
                   value={char.name}
                   title="The name displayed above the dialogue box"
                   onChange={(e) => updateCharacter(char.id, { name: e.target.value }, true)}
                 />
                 <input 
                   type="color"
                   value={char.color}
                   onChange={(e) => updateCharacter(char.id, { color: e.target.value }, true)}
                   className="w-4 h-4 rounded-full cursor-pointer border-0 p-0 bg-transparent shrink-0"
                   title="The text color for this character's name and dialogue"
                 />
               </div>
             ))}
           </div>
         </Card>
      </div>

      {/* Center: Stage Preview */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <header className="flex justify-between items-center bg-slate-800/50 p-2 px-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
           <div className="flex items-center gap-4 flex-1">
             {/* Cover Upload */}
             <label className="relative w-10 h-10 bg-slate-700/50 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-all border border-slate-600 hover:border-indigo-500 group shrink-0 shadow-sm" title="Upload a cover image for your novel">
                 {coverUrl ? (
                     <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-0.5">
                        <ImageIcon className="w-3 h-3"/>
                        <span className="text-[6px] font-bold uppercase">Cover</span>
                     </div>
                 )}
                 <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                 <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                    <Upload className="w-3 h-3 text-white"/>
                 </div>
             </label>

             <div className="h-8 w-px bg-slate-700 mx-2"></div>

             <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50" title="Text Settings">
                <Type className="w-4 h-4 text-slate-400" />
                <select 
                  value={theme.fontFamily}
                  onChange={(e) => updateState({ theme: { ...theme, fontFamily: e.target.value as any } })}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                  title="Choose the global font style for the novel"
                >
                  <option value="sans" className="bg-slate-800">Sans</option>
                  <option value="serif" className="bg-slate-800">Serif</option>
                  <option value="mono" className="bg-slate-800">Mono</option>
                  <option value="handwritten" className="bg-slate-800">Handwritten</option>
                  <option value="retro" className="bg-slate-800">Retro</option>
                  <option value="futuristic" className="bg-slate-800">Sci-Fi</option>
                  <option value="readable" className="bg-slate-800">Book</option>
                </select>
                <div className="w-px h-3 bg-slate-700"></div>
                <select 
                  value={theme.fontSize}
                  onChange={(e) => updateState({ theme: { ...theme, fontSize: e.target.value as any } })}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                  title="Adjust the text size for the novel"
                >
                  <option value="sm" className="bg-slate-800">Small</option>
                  <option value="md" className="bg-slate-800">Medium</option>
                  <option value="lg" className="bg-slate-800">Large</option>
                </select>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="flex gap-2">
                <Button variant="ghost" title="Use a pre-made story template" onClick={() => setShowTemplateModal(true)} className="text-slate-500 hover:text-indigo-400 px-2">
                    <LayoutTemplate className="w-4 h-4" />
                </Button>
               <Button variant="ghost" title="Export Project as JSON" onClick={handleExportJSON} className="text-slate-500 hover:text-indigo-400 px-2">
                  <Download className="w-4 h-4" />
               </Button>
               <Button variant="ghost" title="Import Project from JSON" onClick={() => importInputRef.current?.click()} className="text-slate-500 hover:text-indigo-400 px-2">
                  <FileJson className="w-4 h-4" />
               </Button>
               {!isEditing && (
                   <Button variant="ghost" title="Reset Draft to blank state" onClick={handleReset} className="text-slate-500 hover:text-red-400 px-2">
                    <RefreshCw className="w-4 h-4" />
                   </Button>
               )}
             </div>
           </div>
        </header>

        {/* Scene Settings Toolbar */}
        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 px-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Scene:</span>
                <input 
                  value={activeScene?.name} 
                  onChange={(e) => updateScene(activeSceneId, { name: e.target.value }, true)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none w-full border-b border-transparent focus:border-indigo-500 transition-colors"
                  placeholder="Scene Name"
                  title="The internal name for this scene (not shown to players)"
                />
            </div>
            
            <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

            <div className="flex items-center gap-3">
                {/* Background Settings */}
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors" title="Upload a background image for this scene">
                        <ImageIcon className="w-3 h-3" /> 
                        <span className="hidden sm:inline">Background</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                     </label>
                </div>
                
                {/* Background Properties */}
                <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Maximize className="w-2 h-2"/> Fit</label>
                      <select
                          value={activeScene?.backgroundSize || 'cover'}
                          onChange={(e) => updateScene(activeSceneId, { backgroundSize: e.target.value as any }, true)}
                          className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1"
                          title="How the image should be scaled to fit the screen"
                      >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="stretch">Stretch</option>
                      </select>
                  </div>
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Move className="w-2 h-2"/> Position</label>
                       <select
                          value={activeScene?.backgroundPosition || 'center'}
                          onChange={(e) => updateScene(activeSceneId, { backgroundPosition: e.target.value as any }, true)}
                          className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1"
                          title="Which part of the image to focus on"
                      >
                          <option value="center">Center</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                      </select>
                  </div>
                </div>

                 {/* Transition Settings */}
                 <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Layers className="w-2 h-2"/> Transition</label>
                        <select
                            value={activeScene?.transition || 'fade'}
                            onChange={(e) => updateScene(activeSceneId, { transition: e.target.value as any }, true)}
                            className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1 min-w-[80px]"
                            title="Visual effect when entering this scene"
                        >
                            <option value="fade">Fade (Black)</option>
                            <option value="flash">Flash (White)</option>
                            <option value="slide">Slide In</option>
                            <option value="zoom">Zoom In</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                </div>

                {/* Music Settings */}
                <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                     <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors" title="Upload background music (BGM) for this scene">
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
                            title="Remove Music from this scene"
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
             className="absolute inset-0 bg-no-repeat opacity-80 transition-all duration-300"
             style={{ 
                 backgroundImage: `url(${activeScene?.backgroundUrl})`,
                 backgroundSize: activeScene?.backgroundSize === 'stretch' ? '100% 100%' : (activeScene?.backgroundSize || 'cover'),
                 backgroundPosition: activeScene?.backgroundPosition || 'center'
             }}
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
               title="Generate dialogue suggestions using AI based on your characters"
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
                       <div className="flex items-center gap-2 flex-wrap">
                           <select 
                             title="Choose who is speaking this line (or Narrator)"
                             className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none max-w-[120px] truncate"
                             value={dialogue.characterId || ''}
                             onChange={(e) => updateDialogue(dialogue.id, { characterId: e.target.value || null })}
                           >
                             <option value="" className="bg-slate-800">Narrator</option>
                             {characters.map(c => (
                               <option key={c.id} value={c.id} className="bg-slate-800">{c.name}</option>
                             ))}
                           </select>
                           {char && (
                               <>
                                   <input 
                                     type="color"
                                     value={char.color}
                                     onChange={(e) => updateCharacter(char.id, { color: e.target.value }, true)}
                                     className="w-4 h-4 rounded-full cursor-pointer border-0 p-0 bg-transparent shrink-0"
                                     title="Change the text color for this character"
                                   />
                                   <div className="h-4 w-px bg-slate-700 mx-1"></div>
                                   <input 
                                     value={dialogue.expression || ''}
                                     onChange={(e) => updateDialogue(dialogue.id, { expression: e.target.value }, true)}
                                     placeholder="Expression"
                                     className="bg-transparent text-xs text-slate-400 focus:text-indigo-300 focus:outline-none w-20 border-b border-dashed border-slate-700 focus:border-indigo-500 transition-colors placeholder:text-slate-700"
                                     title="Character expression (e.g. happy, sad)"
                                   />
                               </>
                           )}
                       </div>
                       <button 
                         onClick={() => {
                           const newDialogues = activeScene.dialogues.filter(d => d.id !== dialogue.id);
                           const newScenes = scenes.map(s => s.id === activeSceneId ? { ...s, dialogues: newDialogues } : s);
                           updateState({ scenes: newScenes });
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
                      onChange={(e) => updateDialogue(dialogue.id, { text: e.target.value }, true)}
                      title="The text to be displayed to the player"
                    />
                    
                    {/* Audio & Effect Controls */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                        <div className="flex items-center gap-2">
                            {dialogue.audioUrl ? (
                                <div className="flex items-center gap-1 bg-indigo-900/30 border border-indigo-500/30 px-2 py-1 rounded text-xs text-indigo-300">
                                    <button
                                        onClick={() => toggleBgmPreview(dialogue.audioUrl!)}
                                        title={previewAudio?.src === dialogue.audioUrl ? "Stop" : "Play Voice/SFX"}
                                        className="hover:text-white"
                                    >
                                        {previewAudio?.src === dialogue.audioUrl ? <StopCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                                    </button>
                                    <span className="max-w-[80px] truncate">Audio</span>
                                    <button
                                        onClick={() => updateDialogue(dialogue.id, { audioUrl: undefined })}
                                        className="hover:text-red-400 ml-1"
                                        title="Remove Audio"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <label className="cursor-pointer flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors" title="Upload a voice clip or SFX for this line">
                                    <Volume2 className="w-3 h-3" /> 
                                    <span>Add SFX/Voice</span>
                                    <input 
                                        type="file" 
                                        accept="audio/*" 
                                        className="hidden" 
                                        onChange={(e) => handleDialogueAudioUpload(e, dialogue.id)} 
                                    />
                                </label>
                            )}
                        </div>

                        {/* Effects */}
                        <div className="flex items-center gap-1 bg-slate-900/50 rounded p-1">
                            <button 
                                className={`p-1 rounded ${dialogue.textEffect === 'shake' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => updateDialogue(dialogue.id, { textEffect: dialogue.textEffect === 'shake' ? undefined : 'shake' }, true)}
                                title="Toggle Shake Text Effect"
                            >
                                <Activity className="w-3 h-3" />
                            </button>
                            <button 
                                className={`p-1 rounded ${dialogue.textEffect === 'flash' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => updateDialogue(dialogue.id, { textEffect: dialogue.textEffect === 'flash' ? undefined : 'flash' }, true)}
                                title="Toggle Flash Text Effect"
                            >
                                <Zap className="w-3 h-3" />
                            </button>
                            <button 
                                className={`p-1 rounded ${dialogue.textEffect === 'rainbow' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                                onClick={() => updateDialogue(dialogue.id, { textEffect: dialogue.textEffect === 'rainbow' ? undefined : 'rainbow' }, true)}
                                title="Toggle Rainbow Text Effect"
                            >
                                <Palette className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                    
                    {/* Branching / Choices */}
                    <div className="mt-3 pt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                             <span className="text-xs font-bold text-slate-500 flex items-center gap-1" title="Create choices for players to select">
                                <GitFork className="w-3 h-3" /> Branching
                             </span>
                             <button onClick={() => addChoice(dialogue.id)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1" title="Add a new choice option">
                                <Plus className="w-3 h-3" /> Add Choice
                             </button>
                        </div>
                        
                        <div className="space-y-2">
                            {dialogue.choices?.map((choice) => (
                                <div key={choice.id} className="bg-slate-900/50 p-2 rounded border border-slate-700 flex flex-col gap-2">
                                     <div className="flex items-center gap-2">
                                         <Input 
                                            value={choice.text} 
                                            onChange={(e) => updateChoice(dialogue.id, choice.id, { text: e.target.value })}
                                            className="text-xs py-1"
                                            placeholder="Choice Text (e.g. Go Left)"
                                            title="The text displayed on the choice button"
                                         />
                                         <button onClick={() => removeChoice(dialogue.id, choice.id)} className="text-slate-500 hover:text-red-400" title="Remove this choice">
                                            <X className="w-3 h-3" />
                                         </button>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <ArrowRight className="w-3 h-3 text-slate-500" />
                                         <select 
                                            value={choice.targetSceneId} 
                                            onChange={(e) => updateChoice(dialogue.id, choice.id, { targetSceneId: e.target.value })}
                                            className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1 flex-1"
                                            title="The scene to navigate to when this choice is selected"
                                         >
                                            <option value="">Select Target Scene...</option>
                                            {scenes.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                         </select>
                                     </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
               );
             })}

             <button 
               onClick={() => addDialogue()}
               title="Insert a new line of dialogue"
               className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-sm font-medium hover:border-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
             >
               <Plus className="w-4 h-4" /> Add Line
             </button>
           </div>
        </Card>
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                      <div>
                          <h2 className="text-2xl font-serif font-bold text-white">Choose a Template</h2>
                          <p className="text-slate-400 text-sm">Start with a pre-configured story structure.</p>
                      </div>
                      <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-white" title="Close template selector">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates.map(template => (
                          <div 
                              key={template.id} 
                              onClick={() => applyTemplate(template)}
                              className="group cursor-pointer bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                              title={`Apply ${template.name} template`}
                          >
                              <div className="h-32 bg-slate-700 relative overflow-hidden">
                                  <img src={template.state.coverUrl || ''} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                                  <div className="absolute bottom-2 left-3 flex gap-1">
                                      {template.genre.map(g => (
                                          <span key={g} className="text-[10px] bg-black/50 backdrop-blur text-white px-2 py-0.5 rounded-full border border-white/10">{g}</span>
                                      ))}
                                  </div>
                              </div>
                              <div className="p-4">
                                  <h3 className="font-bold text-white text-lg mb-1 group-hover:text-indigo-400 transition-colors">{template.name}</h3>
                                  <p className="text-sm text-slate-400 line-clamp-3">{template.description}</p>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-4 bg-slate-800/50 border-t border-slate-800 text-center text-xs text-slate-500">
                      Applying a template will replace your current scene and character data.
                  </div>
              </div>
          </div>
      )}
      </div>
    </div>
  );
};

export default CreateNovel;