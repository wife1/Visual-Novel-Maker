export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  createdNovels: string[];
}

export interface Character {
  id: string;
  name: string;
  color: string; // Text color
  avatarUrl: string; // Default sprite
}

export interface Dialogue {
  id: string;
  characterId: string | null; // null for narrator
  text: string;
  expression?: string; // e.g., 'happy', 'sad'
  audioUrl?: string; // Voice acting or SFX for this line
}

export interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  bgmUrl?: string; // Background music URL
  dialogues: Dialogue[];
}

export interface NovelTheme {
  fontFamily: 'sans' | 'serif' | 'mono';
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