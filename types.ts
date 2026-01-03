export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  createdNovels: string[];
}

export interface CharacterSprite {
  id: string;
  name: string;
  url: string;
}

export interface Character {
  id: string;
  name: string;
  color: string; // Text color
  avatarUrl: string; // Default sprite
  sprites: CharacterSprite[];
}

export interface Choice {
  id: string;
  text: string;
  targetSceneId: string; // The ID of the scene to jump to
}

export interface Dialogue {
  id: string;
  characterId: string | null; // null for narrator
  text: string;
  expression?: string; // e.g., 'happy', 'sad'
  spriteId?: string; // Specific sprite to show
  audioUrl?: string; // Voice acting
  sfxUrl?: string; // Short sound effect
  textEffect?: 'typewriter' | 'shake' | 'flash' | 'rainbow';
  choices?: Choice[]; // Optional branching paths
}

export interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  bgmUrl?: string; // Background music URL
  backgroundSize?: 'cover' | 'contain' | 'stretch';
  backgroundPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top left' | 'top right' | 'bottom left' | 'bottom right';
  transition?: 'fade' | 'flash' | 'slide' | 'zoom' | 'none'; // Effect when entering this scene
  themeOverride?: Partial<NovelTheme>; // Overrides global novel theme for this scene
  directorNotes?: string; // Internal notes for the author
  dialogues: Dialogue[];
}

export interface NovelTheme {
  fontFamily: 'sans' | 'serif' | 'mono' | 'handwritten' | 'retro' | 'futuristic' | 'readable';
  fontSize: 'sm' | 'md' | 'lg';
}

export interface Novel {
  id: string;
  title: string;
  description: string;
  authorId: string;
  coverUrl: string;
  genre: string[];
  scenes: Scene[];
  characters: Character[];
  likes: number;
  plays: number;
  publishedAt: string;
  theme?: NovelTheme;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}