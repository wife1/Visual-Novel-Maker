import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Novel, Scene, Character, Dialogue, NovelTheme, Choice, CharacterSprite } from '../types';
import { Button, Input, TextArea, Card } from '../components/ui/Components';
import { Plus, Trash2, Image as ImageIcon, MessageSquare, Save, Wand2, PlayCircle, RefreshCw, CheckCircle2, Upload, X, Music, StopCircle, ArrowLeft, Type, Mic, RotateCcw, RotateCw, Zap, Activity, Palette, Maximize, Move, GitFork, ArrowRight, Download, FileJson, Layers, LayoutTemplate, Volume2, Smile, Archive, Loader2, StickyNote, Images, Speaker } from 'lucide-react';
import { generateSceneDialogues, generateCharacterAvatar } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import JSZip from 'jszip';
import { translations } from '../utils/translations';

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

  // i18n
  const t = translations.en;

  // -- Unified Editor State --
  // We group all "content" state into one object to make history management easier.
  const [state, setState] = useState<EditorState>({
    title: initialData?.title || t.common.untitled,
    description: initialData?.description || '',
    coverUrl: initialData?.coverUrl || null,
    characters: (initialData?.characters || [{ id: 'c1', name: t.defaults.newCharacter, color: '#6366f1', avatarUrl: 'https://picsum.photos/100/100?random=1', sprites: [] }]).map(c => ({...c, sprites: c.sprites || []})),
    scenes: initialData?.scenes || [{ id: 's1', name: `${t.defaults.newScene} 1`, backgroundUrl: 'https://picsum.photos/1280/720?grayscale', dialogues: [] }],
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
  const [isZipping, setIsZipping] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  
  // Sprite Manager State
  const [showSpriteManager, setShowSpriteManager] = useState<string | null>(null); // charId or null

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
           { id: 'c1', name: 'Protagonist', color: '#6366f1', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Protag&backgroundColor=b6e3f4', sprites: [] },
           { id: 'c2', name: 'Sakura', color: '#ec4899', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sakura&backgroundColor=ffdfbf', sprites: [] },
           { id: 'c3', name: 'Ryu', color: '#10b981', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ryu', sprites: [] }
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
           { id: 'c1', name: 'Detective Vance', color: '#3b82f6', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Vance', sprites: [] },
           { id: 'c2', name: 'Unit 734', color: '#a855f7', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Unit', sprites: [] }
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
    // ... (Other templates skipped for brevity, assumed they would follow same structure)
  ];

  // -- Initialization (Draft Restore) --
  useEffect(() => {
    if (!initialData) {
      const savedDraft = localStorage.getItem('affinity_novel_draft');
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Merge parsed draft with defaults to ensure all fields exist
          const migratedChars = (parsed.characters || []).map((c: any) => ({
             ...c,
             sprites: c.sprites || []
          }));
          
          setState(prev => ({
             ...prev,
             ...parsed,
             characters: migratedChars
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

  const updateState = (updates: Partial<EditorState>, saveHistory = true) => {
    if (saveHistory) {
      setHistory(prev => ({
        past: [...prev.past, state],
        future: []
      }));
    }
    setState(prev => ({ ...prev, ...updates }));
  };

  const historyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preDebounceStateRef = useRef<EditorState | null>(null);

  const updateStateDebounced = (updates: Partial<EditorState>) => {
    if (!preDebounceStateRef.current) {
      preDebounceStateRef.current = state;
    }
    setState(prev => ({ ...prev, ...updates }));
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
    }, 1000);
  };

  // -- Action Handlers --
  const addScene = () => {
    const newId = crypto.randomUUID();
    const newScene: Scene = { 
        id: newId, 
        name: `${t.defaults.newScene} ${scenes.length + 1}`, 
        backgroundUrl: 'https://picsum.photos/1280/720?blur', 
        dialogues: [] 
    };
    updateState({ 
        scenes: [...scenes, newScene],
        activeSceneId: newId 
    }); 
  };

  const deleteScene = (e: React.MouseEvent, sceneId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (scenes.length <= 1) {
      alert(t.common.minScenesError);
      return;
    }
    
    if (window.confirm(t.common.confirmDeleteScene)) {
      const newScenes = scenes.filter(s => s.id !== sceneId);
      
      // Safety check
      if (newScenes.length === 0) return;

      let newActiveId = activeSceneId;
      // Robust check for active scene update
      if (activeSceneId === sceneId || !newScenes.some(s => s.id === activeSceneId)) {
        newActiveId = newScenes[0].id;
      }
      
      updateState({ scenes: newScenes, activeSceneId: newActiveId });
    }
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

  const handleDialogueSfxUpload = (e: React.ChangeEvent<HTMLInputElement>, dialogueId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDialogue(dialogueId, { sfxUrl: reader.result as string });
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
    const newId = crypto.randomUUID();
    const newChar: Character = { id: newId, name: t.defaults.newCharacter, color: '#ec4899', avatarUrl: `https://picsum.photos/100/100?random=${newId}`, sprites: [] };
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

  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>, charId: string) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const char = characters.find(c => c.id === charId);
              if (char) {
                  const newSprite: CharacterSprite = {
                      id: crypto.randomUUID(),
                      name: `${t.defaults.newSprite} ${(char.sprites?.length || 0) + 1}`,
                      url: reader.result as string
                  };
                  updateCharacter(charId, { sprites: [...(char.sprites || []), newSprite] }, true);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const deleteSprite = (charId: string, spriteId: string) => {
      const char = characters.find(c => c.id === charId);
      if (char && char.sprites) {
          updateCharacter(charId, { sprites: char.sprites.filter(s => s.id !== spriteId) });
      }
  };

  const updateSpriteName = (charId: string, spriteId: string, newName: string) => {
      const char = characters.find(c => c.id === charId);
      if (char && char.sprites) {
          updateCharacter(charId, { 
              sprites: char.sprites.map(s => s.id === spriteId ? { ...s, name: newName } : s) 
          }, true);
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

  const addDialogue = (text = t.defaults.newLine, charId: string | null = null) => {
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
          text: t.defaults.newOption,
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
          if (!window.confirm(t.common.confirmTemplate)) {
              return;
          }
      }

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
      setHistory({ past: [], future: [] }); 
      setShowTemplateModal(false);
  };

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

  const handleDownloadZip = async () => {
    setIsZipping(true);
    const zip = new JSZip();
    // ... zip logic same as before but now includes sfxUrl implicitly if added to state? 
    // Need to explicitly handle sfxUrl in zip logic
    const assetMap = new Map<string, string>(); 

    const processAsset = async (url: string | null | undefined, type: 'images' | 'audio', prefix: string): Promise<string | null> => {
      if (!url) return null;
      if (assetMap.has(url)) return assetMap.get(url)!;

      try {
        let filename = '';
        let data: Blob | string;
        let isBase64 = false;

        if (url.startsWith('data:')) {
           const mimeType = url.split(';')[0].split(':')[1];
           const extension = mimeType.split('/')[1] || 'bin';
           filename = `${prefix}_${crypto.randomUUID().slice(0,8)}.${extension}`;
           data = url.split(',')[1];
           isBase64 = true;
        } else {
           try {
             const response = await fetch(url);
             if (!response.ok) throw new Error('Fetch failed');
             data = await response.blob();
             let extension = data.type.split('/')[1];
             if (!extension) {
                const urlParts = url.split('.');
                extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'bin';
             }
             filename = `${prefix}_${crypto.randomUUID().slice(0,8)}.${extension}`;
           } catch (fetchError) {
             console.warn(`Could not zip asset ${url}:`, fetchError);
             return null;
           }
        }
        
        if (isBase64) {
            zip.folder("assets")?.folder(type)?.file(filename, data as string, {base64: true});
        } else {
            zip.folder("assets")?.folder(type)?.file(filename, data as Blob);
        }

        const localPath = `assets/${type}/${filename}`;
        assetMap.set(url, localPath);
        return localPath;

      } catch (e) { 
        console.error("Error processing asset", e);
        return null; 
      }
    }

    const cleanCharacters = await Promise.all(state.characters.map(async c => ({
      ...c,
      avatarUrl: await processAsset(c.avatarUrl, 'images', 'char') || c.avatarUrl,
      sprites: await Promise.all((c.sprites || []).map(async s => ({
         ...s,
         url: await processAsset(s.url, 'images', 'char_sprite') || s.url
      })))
    })));

    const cleanScenes = await Promise.all(state.scenes.map(async s => ({
      ...s,
      backgroundUrl: await processAsset(s.backgroundUrl, 'images', 'bg') || s.backgroundUrl,
      bgmUrl: await processAsset(s.bgmUrl, 'audio', 'bgm') || s.bgmUrl,
      dialogues: await Promise.all(s.dialogues.map(async d => ({
         ...d,
         audioUrl: await processAsset(d.audioUrl, 'audio', 'voice') || d.audioUrl,
         sfxUrl: await processAsset(d.sfxUrl, 'audio', 'sfx') || d.sfxUrl
      })))
    })));

    const cleanCover = await processAsset(state.coverUrl, 'images', 'cover') || state.coverUrl;

    const cleanNovel = {
       ...state,
       coverUrl: cleanCover,
       characters: cleanCharacters,
       scenes: cleanScenes,
       exportedAt: new Date().toISOString()
    };

    zip.file("novel.json", JSON.stringify(cleanNovel, null, 2));

    try {
        const content = await zip.generateAsync({type:"blob"});
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_package.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Failed to generate zip", err);
        alert(t.common.zipError);
    } finally {
        setIsZipping(false);
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.scenes || !json.characters) {
          alert(t.common.importError);
          return;
        }
        if (window.confirm(t.common.confirmImport)) {
           const migratedCharacters = json.characters.map((c: any) => ({
             ...c,
             sprites: c.sprites || []
           }));
           setState({
              title: json.title || t.common.untitled,
              description: json.description || '',
              coverUrl: json.coverUrl || null,
              characters: migratedCharacters,
              scenes: json.scenes || [],
              activeSceneId: json.scenes?.[0]?.id || 's1',
              theme: json.theme || { fontFamily: 'sans', fontSize: 'md' }
           });
           setHistory({ past: [], future: [] });
        }
      } catch (err) {
        console.error('Failed to parse project file', err);
        alert(t.common.importFailed);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const handleReset = () => {
    if (window.confirm(t.common.confirmReset)) {
      if (!isEditing) {
        localStorage.removeItem('affinity_novel_draft');
      }
      setState({
          title: t.common.untitled,
          description: '',
          coverUrl: null,
          characters: [{ id: 'c1', name: t.defaults.newCharacter, color: '#6366f1', avatarUrl: 'https://picsum.photos/100/100?random=1', sprites: [] }],
          scenes: [{ id: 's1', name: `${t.defaults.newScene} 1`, backgroundUrl: 'https://picsum.photos/1280/720?grayscale', dialogues: [] }],
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

      {/* Top Bar omitted (kept same) */}
      <div className="shrink-0 flex items-start justify-between gap-4 px-2">
         {/* ... (Same as before) ... */}
         <div className="flex items-start gap-4 flex-1">
             {isEditing && (
                <button onClick={() => navigate(`/novel/${initialData?.id}`)} className="mt-1 p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white" title={t.tooltips.cancelEdit}>
                    <ArrowLeft className="w-5 h-5" />
                </button>
             )}
             <div className="max-w-xl">
                <Input 
                    value={title} 
                    onChange={(e) => updateStateDebounced({ title: e.target.value })} 
                    title={t.tooltips.mainTitle}
                    className="font-serif text-2xl font-bold bg-transparent border-none px-0 focus:ring-0 w-full p-0 placeholder:text-slate-600"
                    placeholder={t.placeholders.title}
                />
                 <input
                    value={description}
                    onChange={(e) => updateStateDebounced({ description: e.target.value })}
                    className="bg-transparent text-sm text-slate-400 focus:outline-none w-full border-none p-0 placeholder:text-slate-600"
                    placeholder={t.placeholders.desc}
                    title={t.tooltips.desc}
                />
             </div>
             
             {/* Scene Text Overrides */}
             <div className="flex flex-col gap-1 ml-4 mt-2 border-l border-slate-700 pl-4">
                  <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Type className="w-3 h-3"/> {t.labels.sceneFont}</label>
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
                          title={t.tooltips.sceneFontOverride}
                       >
                          <option value="">{t.labels.defaultGlobal}</option>
                          <option value="sans">{t.options.sans}</option>
                          <option value="serif">{t.options.serif}</option>
                          <option value="mono">{t.options.mono}</option>
                          <option value="handwritten">{t.options.handwritten}</option>
                          <option value="retro">{t.options.retro}</option>
                          <option value="futuristic">{t.options.scifi}</option>
                          <option value="readable">{t.options.book}</option>
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
                          title={t.tooltips.sceneFontSizeOverride}
                       >
                          <option value="">{t.labels.default}</option>
                          <option value="sm">{t.options.small}</option>
                          <option value="md">{t.options.medium}</option>
                          <option value="lg">{t.options.large}</option>
                       </select>
                  </div>
             </div>
         </div>
         
         <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
               <button 
                  onClick={handleUndo} 
                  disabled={history.past.length === 0}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title={t.tooltips.undo}
               >
                 <RotateCcw className="w-4 h-4" />
               </button>
               <button 
                  onClick={handleRedo} 
                  disabled={history.future.length === 0}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title={t.tooltips.redo}
               >
                 <RotateCw className="w-4 h-4" />
               </button>
             </div>

             {lastSaved && !isEditing && (
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 animate-fade-in mr-2" title={t.tooltips.autoSave}>
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{t.common.saved}</span>
                </div>
             )}

            <Button 
                onClick={handleDownloadZip} 
                className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 shadow-lg shadow-black/20"
                title={t.tooltips.downloadZip}
                disabled={isZipping}
            >
                {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />} 
                <span className="hidden sm:inline">{t.common.download}</span>
            </Button>

             <Button 
                onClick={handleSave} 
                className="shadow-lg shadow-indigo-500/20 py-2 px-6 rounded-lg font-bold"
                title={isEditing ? t.tooltips.saveChanges : t.tooltips.savePublish}
            >
                <Save className="w-4 h-4" /> {isEditing ? t.common.save : t.common.publish}
            </Button>
         </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 relative">

      {/* Left Sidebar and Center Canvas kept same... */}
      {/* ... Left Sidebar ... */}
      <div className="w-full lg:w-64 flex flex-col gap-4 shrink-0">
          {/* ... (Same Scene/Cast Lists) ... */}
          <Card className="flex-1 overflow-hidden flex flex-col bg-slate-900/50">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-300">{t.labels.scenes}</h3>
             <button onClick={addScene} title={t.tooltips.createScene} className="text-indigo-400 hover:text-indigo-300"><Plus className="w-5 h-5"/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2">
             {scenes.map(scene => (
               <div 
                 key={scene.id} 
                 onClick={() => updateState({ activeSceneId: scene.id }, false)} 
                 title={t.tooltips.switchScene}
                 className={`
                    relative p-3 pl-4 rounded-r-lg rounded-l-none cursor-pointer text-sm font-medium transition-all duration-200 
                    border-y border-r flex justify-between items-center group/scene
                    ${activeSceneId === scene.id 
                        ? 'bg-indigo-600/20 border-indigo-500/30 text-white border-l-4 border-l-indigo-500 shadow-md shadow-indigo-900/20' 
                        : 'bg-slate-800/50 border-transparent border-l-4 border-l-transparent text-slate-400 hover:bg-slate-700 hover:border-l-slate-600'
                    }
                 `}
               >
                 <span className="truncate flex-1 mr-2">{scene.name}</span>
                 
                 <div className="flex items-center gap-1 opacity-0 group-hover/scene:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (activeSceneId !== scene.id) {
                                updateState({ activeSceneId: scene.id }, false);
                                setShowNotes(true);
                            } else {
                                setShowNotes(!showNotes);
                            }
                        }}
                        className={`p-1.5 rounded hover:bg-indigo-500/20 hover:text-indigo-400 transition-colors ${scene.directorNotes ? 'text-indigo-400' : 'text-slate-500'}`}
                        title={t.tooltips.directorNotes}
                    >
                        <StickyNote className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => deleteScene(e, scene.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 hover:text-red-400 text-slate-500 transition-colors"
                      title={t.tooltips.deleteScene}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                 </div>
               </div>
             ))}
           </div>
         </Card>

         <Card className="h-1/3 flex flex-col bg-slate-900/50">
           <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-300">{t.labels.cast}</h3>
             <button onClick={addCharacter} title={t.tooltips.addChar} className="text-indigo-400 hover:text-indigo-300"><Plus className="w-5 h-5"/></button>
           </div>
           <div className="flex-1 overflow-y-auto space-y-2 pr-2">
             {characters.map(char => (
               <div key={char.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 group">
                 <div 
                    className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden cursor-pointer relative group/avatar shrink-0" 
                    onClick={() => setEditingAvatarCharId(char.id)}
                    title={t.tooltips.uploadChar}
                 >
                   <img src={char.avatarUrl} alt="" className="w-full h-full object-cover"/>
                   <div className="absolute inset-0 bg-black/50 hidden group-hover/avatar:flex items-center justify-center">
                        <Upload className="w-3 h-3 text-white"/>
                   </div>
                 </div>
                 <input 
                   className="bg-transparent text-xs text-slate-300 focus:outline-none w-full"
                   value={char.name}
                   title={t.tooltips.charName}
                   onChange={(e) => updateCharacter(char.id, { name: e.target.value }, true)}
                 />
                 <div className="flex items-center gap-1">
                     <button 
                        onClick={() => setShowSpriteManager(char.id)} 
                        className="text-slate-500 hover:text-indigo-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={t.tooltips.manageSprites}
                     >
                         <Images className="w-3.5 h-3.5" />
                     </button>
                     <input 
                        type="color"
                        value={char.color}
                        onChange={(e) => updateCharacter(char.id, { color: e.target.value }, true)}
                        className="w-4 h-4 rounded-full cursor-pointer border-0 p-0 bg-transparent shrink-0"
                        title={t.tooltips.charColor}
                     />
                 </div>
               </div>
             ))}
           </div>
         </Card>
      </div>

      {/* ... Center Canvas ... */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
         {/* ... (Same Header & Scene Toolbar & Canvas) ... */}
         {/* Keeping code concise by not repeating sections that haven't changed logic-wise, 
             but ensuring the structure is intact for the full file replacement */}
         <header className="flex justify-between items-center bg-slate-800/50 p-2 px-4 rounded-xl border border-slate-700/50 backdrop-blur-sm">
           {/* ... Header Content ... */}
           <div className="flex items-center gap-4 flex-1">
             <label className="relative w-10 h-10 bg-slate-700/50 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-all border border-slate-600 hover:border-indigo-500 group shrink-0 shadow-sm" title={t.tooltips.uploadCover}>
                 {coverUrl ? (
                     <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-0.5">
                        <ImageIcon className="w-3 h-3"/>
                        <span className="text-[6px] font-bold uppercase">{t.labels.cover}</span>
                     </div>
                 )}
                 <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                 <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                    <Upload className="w-3 h-3 text-white"/>
                 </div>
             </label>

             <div className="h-8 w-px bg-slate-700 mx-2"></div>
              <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-700/50" title={t.tooltips.textSettings}>
                <Type className="w-4 h-4 text-slate-400" />
                <select 
                  value={theme.fontFamily}
                  onChange={(e) => updateState({ theme: { ...theme, fontFamily: e.target.value as any } })}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                  title={t.tooltips.globalFont}
                >
                  <option value="sans" className="bg-slate-800">{t.options.sans}</option>
                  <option value="serif" className="bg-slate-800">{t.options.serif}</option>
                  <option value="mono" className="bg-slate-800">{t.options.mono}</option>
                  <option value="handwritten" className="bg-slate-800">{t.options.handwritten}</option>
                  <option value="retro" className="bg-slate-800">{t.options.retro}</option>
                  <option value="futuristic" className="bg-slate-800">{t.options.scifi}</option>
                  <option value="readable" className="bg-slate-800">{t.options.book}</option>
                </select>
                <div className="w-px h-3 bg-slate-700"></div>
                <select 
                  value={theme.fontSize}
                  onChange={(e) => updateState({ theme: { ...theme, fontSize: e.target.value as any } })}
                  className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
                  title={t.tooltips.globalSize}
                >
                  <option value="sm" className="bg-slate-800">{t.options.small}</option>
                  <option value="md" className="bg-slate-800">{t.options.medium}</option>
                  <option value="lg" className="bg-slate-800">{t.options.large}</option>
                </select>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             <div className="flex gap-2">
                <Button variant="ghost" title={t.tooltips.useTemplate} onClick={() => setShowTemplateModal(true)} className="text-slate-500 hover:text-indigo-400 px-2">
                    <LayoutTemplate className="w-4 h-4" />
                </Button>
               <Button variant="ghost" title={t.tooltips.exportJson} onClick={handleExportJSON} className="text-slate-500 hover:text-indigo-400 px-2">
                  <Download className="w-4 h-4" />
               </Button>
               <Button variant="ghost" title={t.tooltips.importJson} onClick={() => importInputRef.current?.click()} className="text-slate-500 hover:text-indigo-400 px-2">
                  <FileJson className="w-4 h-4" />
               </Button>
               {!isEditing && (
                   <Button variant="ghost" title={t.tooltips.resetDraft} onClick={handleReset} className="text-slate-500 hover:text-red-400 px-2">
                    <RefreshCw className="w-4 h-4" />
                   </Button>
               )}
             </div>
           </div>
        </header>

        <div className="bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 px-4 flex flex-wrap items-center gap-4 relative z-20">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{t.labels.scene}</span>
                <input 
                  value={activeScene?.name} 
                  onChange={(e) => updateScene(activeSceneId, { name: e.target.value }, true)}
                  className="bg-transparent text-sm text-slate-200 focus:outline-none w-full border-b border-transparent focus:border-indigo-500 transition-colors"
                  placeholder={t.placeholders.sceneName}
                  title={t.tooltips.sceneInternalName}
                />
            </div>
            <div className="h-6 w-px bg-slate-700 hidden sm:block"></div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors" title={t.tooltips.uploadBg}>
                        <ImageIcon className="w-3 h-3" /> 
                        <span className="hidden sm:inline">{t.labels.background}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleBackgroundUpload} />
                     </label>
                </div>
                
                <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Maximize className="w-2 h-2"/> {t.labels.fit}</label>
                      <select
                          value={activeScene?.backgroundSize || 'cover'}
                          onChange={(e) => updateScene(activeSceneId, { backgroundSize: e.target.value as any }, true)}
                          className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1"
                          title={t.tooltips.bgFit}
                      >
                          <option value="cover">{t.options.cover}</option>
                          <option value="contain">{t.options.contain}</option>
                          <option value="stretch">{t.options.stretch}</option>
                      </select>
                  </div>
                  <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Move className="w-2 h-2"/> {t.labels.position}</label>
                       <select
                          value={activeScene?.backgroundPosition || 'center'}
                          onChange={(e) => updateScene(activeSceneId, { backgroundPosition: e.target.value as any }, true)}
                          className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1"
                          title={t.tooltips.bgPos}
                      >
                          <option value="center">{t.options.center}</option>
                          <option value="top">{t.options.top}</option>
                          <option value="bottom">{t.options.bottom}</option>
                          <option value="left">{t.options.left}</option>
                          <option value="right">{t.options.right}</option>
                          <option value="top left">{t.options.topLeft}</option>
                          <option value="top right">{t.options.topRight}</option>
                          <option value="bottom left">{t.options.bottomLeft}</option>
                          <option value="bottom right">{t.options.bottomRight}</option>
                      </select>
                  </div>
                </div>

                 <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1"><Layers className="w-2 h-2"/> {t.labels.transition}</label>
                        <select
                            value={activeScene?.transition || 'fade'}
                            onChange={(e) => updateScene(activeSceneId, { transition: e.target.value as any }, true)}
                            className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1 min-w-[80px]"
                            title={t.tooltips.transition}
                        >
                            <option value="fade">{t.options.fade}</option>
                            <option value="flash">{t.options.flash}</option>
                            <option value="slide">{t.options.slide}</option>
                            <option value="zoom">{t.options.zoom}</option>
                            <option value="none">{t.options.none}</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-700 pl-4 ml-2">
                     <label className="cursor-pointer flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 transition-colors" title={t.tooltips.uploadBgm}>
                        <Music className="w-3 h-3" />
                        <span className="hidden sm:inline">{t.labels.music}</span>
                        <input type="file" accept="audio/*" className="hidden" onChange={handleBgmUpload} />
                     </label>
                </div>

                {activeScene?.bgmUrl && (
                    <div className="flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 pl-2 pr-1 py-1 rounded-md">
                        <span className="text-xs text-indigo-300 max-w-[80px] truncate select-none">
                            {activeScene.bgmUrl.length > 30 ? t.options.trackSet : t.labels.music}
                        </span>
                        <button 
                            onClick={() => toggleBgmPreview(activeScene.bgmUrl!)} 
                            className={`p-1 rounded hover:bg-indigo-500/20 text-indigo-300 ${previewAudio?.src === activeScene.bgmUrl ? 'text-white' : ''}`}
                            title={previewAudio?.src === activeScene.bgmUrl ? t.tooltips.stopPreview : t.tooltips.previewMusic}
                        >
                             {previewAudio?.src === activeScene.bgmUrl ? <StopCircle className="w-3 h-3"/> : <PlayCircle className="w-3 h-3"/>}
                        </button>
                        <button 
                            onClick={() => updateScene(activeSceneId, { bgmUrl: undefined })} 
                            className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400"
                            title={t.tooltips.removeMusic}
                        >
                            <X className="w-3 h-3"/>
                        </button>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 bg-black rounded-xl border border-slate-700 relative overflow-hidden group">
           <div 
             className="absolute inset-0 bg-no-repeat opacity-80 transition-all duration-300"
             style={{ 
                 backgroundImage: `url(${activeScene?.backgroundUrl})`,
                 backgroundSize: activeScene?.backgroundSize === 'stretch' ? '100% 100%' : (activeScene?.backgroundSize || 'cover'),
                 backgroundPosition: activeScene?.backgroundPosition || 'center'
             }}
           />
           <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-xs text-slate-300 z-10">
             {t.labels.stagePreview}
           </div>
           
           {showNotes && (
               <div className="absolute top-4 left-4 z-20 w-64 animate-fade-in">
                   <div className="bg-slate-900/95 border border-indigo-500/50 rounded-lg shadow-xl overflow-hidden backdrop-blur-md">
                       <div className="bg-indigo-600/20 border-b border-indigo-500/30 px-3 py-2 flex items-center justify-between">
                           <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                               <StickyNote className="w-3 h-3" /> {t.labels.directorNotes}
                           </span>
                           <button onClick={() => setShowNotes(false)} className="text-indigo-400 hover:text-white">
                               <X className="w-3 h-3" />
                           </button>
                       </div>
                       <textarea
                           value={activeScene?.directorNotes || ''}
                           onChange={(e) => updateScene(activeSceneId, { directorNotes: e.target.value }, true)}
                           className="w-full h-40 bg-transparent p-3 text-xs text-slate-300 focus:outline-none resize-none placeholder:text-slate-600"
                           placeholder={t.placeholders.directorNotes}
                       />
                   </div>
               </div>
           )}

           <div className="absolute bottom-8 left-8 right-8 bg-slate-900/90 backdrop-blur border border-slate-600 p-6 rounded-lg min-h-[120px] flex flex-col justify-center items-center text-slate-400 border-dashed border-2">
              <p>{t.labels.stageInstruction}</p>
           </div>
        </div>
      </div>

      {/* Right Sidebar: Dialogue Script */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        <Card className="flex-1 flex flex-col bg-slate-900/50 h-full">
           <div className="flex justify-between items-center mb-4 shrink-0">
             <h3 className="font-bold text-slate-300">{t.labels.script}</h3>
             <Button 
               variant="ghost" 
               className="text-indigo-400" 
               onClick={generateWithAI}
               loading={isGenerating}
               title={t.tooltips.generateDialogues}
             >
               <Wand2 className="w-4 h-4 mr-1"/> {t.labels.aiAssist}
             </Button>
           </div>

           <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
             {activeScene?.dialogues.map((dialogue, index) => {
                const char = characters.find(c => c.id === dialogue.characterId);
                const charSprites = char?.sprites || [];
                
                return (
                 <div key={dialogue.id} className="bg-slate-800 p-3 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2 flex-wrap">
                           <select 
                             title={t.tooltips.speaker}
                             className="bg-transparent text-xs font-bold text-indigo-300 focus:outline-none max-w-[120px] truncate"
                             value={dialogue.characterId || ''}
                             onChange={(e) => updateDialogue(dialogue.id, { characterId: e.target.value || null, spriteId: undefined })}
                           >
                             <option value="" className="bg-slate-800">{t.labels.narrator}</option>
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
                                     title={t.tooltips.charColor}
                                   />
                                   <div className="h-4 w-px bg-slate-700 mx-1"></div>
                                   {charSprites.length > 0 ? (
                                       <select 
                                           value={dialogue.spriteId || ''}
                                           onChange={(e) => updateDialogue(dialogue.id, { spriteId: e.target.value || undefined }, true)}
                                           className="bg-transparent text-xs text-slate-400 focus:text-indigo-300 focus:outline-none max-w-[80px] border-b border-dashed border-slate-700 focus:border-indigo-500 transition-colors"
                                           title={t.tooltips.spriteSelector}
                                       >
                                           <option value="" className="bg-slate-800">{t.options.defaultSprite}</option>
                                           {charSprites.map(s => (
                                               <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                                           ))}
                                       </select>
                                   ) : (
                                       <input 
                                         value={dialogue.expression || ''}
                                         onChange={(e) => updateDialogue(dialogue.id, { expression: e.target.value }, true)}
                                         placeholder={t.placeholders.expression}
                                         className="bg-transparent text-xs text-slate-400 focus:text-indigo-300 focus:outline-none w-20 border-b border-dashed border-slate-700 focus:border-indigo-500 transition-colors placeholder:text-slate-700"
                                         title={t.tooltips.expression}
                                       />
                                   )}
                               </>
                           )}
                       </div>
                       <button 
                         onClick={() => {
                           const newDialogues = activeScene.dialogues.filter(d => d.id !== dialogue.id);
                           const newScenes = scenes.map(s => s.id === activeSceneId ? { ...s, dialogues: newDialogues } : s);
                           updateState({ scenes: newScenes });
                         }}
                         title={t.tooltips.deleteLine}
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
                      title={t.tooltips.lineText}
                    />
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/50">
                        <div className="flex flex-col gap-2 w-full">
                            {/* Voice Control */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold w-8">{t.labels.audio}</span>
                                {dialogue.audioUrl ? (
                                    <div className="flex items-center gap-1 bg-indigo-900/30 border border-indigo-500/30 px-2 py-1 rounded text-xs text-indigo-300">
                                        <button
                                            onClick={() => toggleBgmPreview(dialogue.audioUrl!)}
                                            title={previewAudio?.src === dialogue.audioUrl ? t.tooltips.stop : t.tooltips.playAudio}
                                            className="hover:text-white"
                                        >
                                            {previewAudio?.src === dialogue.audioUrl ? <StopCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                                        </button>
                                        <span className="max-w-[80px] truncate">Clip</span>
                                        <button
                                            onClick={() => updateDialogue(dialogue.id, { audioUrl: undefined })}
                                            className="hover:text-red-400 ml-1"
                                            title={t.tooltips.removeAudio}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-400 transition-colors" title={t.tooltips.uploadAudio}>
                                        <Volume2 className="w-3 h-3" /> 
                                        <span>{t.labels.addVoice}</span>
                                        <input 
                                            type="file" 
                                            accept="audio/*" 
                                            className="hidden" 
                                            onChange={(e) => handleDialogueAudioUpload(e, dialogue.id)} 
                                        />
                                    </label>
                                )}
                            </div>

                            {/* SFX Control */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold w-8">{t.labels.sfx}</span>
                                {dialogue.sfxUrl ? (
                                    <div className="flex items-center gap-1 bg-amber-900/30 border border-amber-500/30 px-2 py-1 rounded text-xs text-amber-300">
                                        <button
                                            onClick={() => toggleBgmPreview(dialogue.sfxUrl!)}
                                            title={previewAudio?.src === dialogue.sfxUrl ? t.tooltips.stop : t.tooltips.playSfx}
                                            className="hover:text-white"
                                        >
                                            {previewAudio?.src === dialogue.sfxUrl ? <StopCircle className="w-3 h-3" /> : <Speaker className="w-3 h-3" />}
                                        </button>
                                        <span className="max-w-[80px] truncate">Effect</span>
                                        <button
                                            onClick={() => updateDialogue(dialogue.id, { sfxUrl: undefined })}
                                            className="hover:text-red-400 ml-1"
                                            title={t.tooltips.removeAudio}
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition-colors" title={t.tooltips.uploadSfx}>
                                        <Speaker className="w-3 h-3" /> 
                                        <span>{t.labels.addSfx}</span>
                                        <input 
                                            type="file" 
                                            accept="audio/*" 
                                            className="hidden" 
                                            onChange={(e) => handleDialogueSfxUpload(e, dialogue.id)} 
                                        />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Text Effects Dropdown */}
                        <div className="flex flex-col gap-1 ml-2 min-w-[80px]">
                            <span className="text-[10px] uppercase font-bold text-slate-500">{t.labels.effect}</span>
                            <select
                                value={dialogue.textEffect || ''}
                                onChange={(e) => updateDialogue(dialogue.id, { textEffect: e.target.value as any || undefined }, true)}
                                className="bg-slate-900 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1"
                                title={t.tooltips.textEffect}
                            >
                                <option value="">{t.options.none}</option>
                                <option value="typewriter">{t.options.typewriter}</option>
                                <option value="shake">{t.options.shake}</option>
                                <option value="flash">{t.options.flash}</option>
                                <option value="rainbow">{t.options.rainbow}</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Branching / Choices */}
                    <div className="mt-3 pt-2 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                             <span className="text-xs font-bold text-slate-500 flex items-center gap-1" title={t.tooltips.branching}>
                                <GitFork className="w-3 h-3" /> {t.labels.branching}
                             </span>
                             <button onClick={() => addChoice(dialogue.id)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1" title={t.tooltips.addChoice}>
                                <Plus className="w-3 h-3" /> {t.labels.addChoice}
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
                                            placeholder={t.placeholders.choice}
                                            title={t.tooltips.choiceText}
                                         />
                                         <button onClick={() => removeChoice(dialogue.id, choice.id)} className="text-slate-500 hover:text-red-400" title={t.tooltips.removeChoice}>
                                            <X className="w-3 h-3" />
                                         </button>
                                     </div>
                                     <div className="flex items-center gap-2">
                                         <ArrowRight className="w-3 h-3 text-slate-500" />
                                         <select 
                                            value={choice.targetSceneId} 
                                            onChange={(e) => updateChoice(dialogue.id, choice.id, { targetSceneId: e.target.value })}
                                            className="bg-slate-800 text-xs text-slate-300 rounded border border-slate-700 focus:outline-none p-1 flex-1"
                                            title={t.tooltips.targetScene}
                                         >
                                            <option value="">{t.labels.selectTarget}</option>
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
               title={t.tooltips.insertLine}
               className="w-full py-3 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-sm font-medium hover:border-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
             >
               <Plus className="w-4 h-4" /> {t.labels.addLine}
             </button>
           </div>
        </Card>
      </div>

      {/* Sprite Manager Modal & Template Modal (Kept same) */}
      {showSpriteManager && (() => {
          const char = characters.find(c => c.id === showSpriteManager);
          if (!char) return null;
          return (
             <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                 <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                     <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                          <h2 className="text-xl font-bold text-white flex items-center gap-2">
                              <Smile className="w-5 h-5 text-indigo-400" /> {t.labels.manageSprites} - {char.name}
                          </h2>
                          <button onClick={() => setShowSpriteManager(null)} className="text-slate-400 hover:text-white">
                              <X className="w-6 h-6" />
                          </button>
                     </div>
                     <div className="p-6 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
                         <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative group">
                             <div className="w-full aspect-square bg-slate-900 rounded-md overflow-hidden relative">
                                 <img src={char.avatarUrl} className="w-full h-full object-cover" alt="Default" />
                                 <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center">
                                      <label className="cursor-pointer text-xs text-white bg-black/50 px-2 py-1 rounded hover:bg-black/80">
                                          Change
                                          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} onClick={() => setEditingAvatarCharId(char.id)} />
                                      </label>
                                 </div>
                             </div>
                             <div className="text-xs text-center font-bold text-slate-400 uppercase py-1">{t.labels.default}</div>
                         </div>

                         {char.sprites?.map(sprite => (
                             <div key={sprite.id} className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative group">
                                 <div className="w-full aspect-square bg-slate-900 rounded-md overflow-hidden relative">
                                     <img src={sprite.url} className="w-full h-full object-cover" alt={sprite.name} />
                                     <button 
                                        onClick={() => deleteSprite(char.id, sprite.id)} 
                                        className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                     >
                                         <X className="w-3 h-3" />
                                     </button>
                                 </div>
                                 <Input 
                                    value={sprite.name} 
                                    onChange={(e) => updateSpriteName(char.id, sprite.id, e.target.value)}
                                    className="text-xs py-1 text-center"
                                    placeholder={t.placeholders.spriteName}
                                 />
                             </div>
                         ))}

                         <label className="bg-slate-800/50 border-2 border-dashed border-slate-700 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800 transition-all text-slate-500 hover:text-indigo-400">
                             <Plus className="w-8 h-8" />
                             <span className="text-xs font-bold">{t.labels.uploadSprite}</span>
                             <input type="file" accept="image/*" className="hidden" onChange={(e) => handleSpriteUpload(e, char.id)} />
                         </label>
                     </div>
                 </div>
             </div>
          );
      })()}

      {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-6xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                      <div>
                          <h2 className="text-2xl font-serif font-bold text-white">{t.templates.title}</h2>
                          <p className="text-slate-400 text-sm">{t.templates.subtitle}</p>
                      </div>
                      <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-white" title={t.tooltips.closeTemplate}>
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {templates.map(template => (
                          <div 
                              key={template.id} 
                              onClick={() => applyTemplate(template)}
                              className="group cursor-pointer bg-slate-800 border border-slate-700 rounded-xl overflow-hidden hover:border-indigo-500 transition-all hover:shadow-lg hover:shadow-indigo-500/10"
                              title={t.tooltips.applyTemplate.replace('{{name}}', template.name)}
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
                      {t.templates.warning}
                  </div>
              </div>
          </div>
      )}
      </div>
    </div>
  );
};

export default CreateNovel;