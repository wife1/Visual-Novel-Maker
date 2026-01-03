import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import NovelDetail from './pages/NovelDetail';
import CreateNovel from './pages/CreateNovel';
import { Login, Register } from './pages/Auth';
import AuthorProfile from './pages/AuthorProfile';
import { User, Novel } from './types';

// Mock Data
const MOCK_NOVELS: Novel[] = [
  {
    id: 'n1',
    title: 'Neon Shadows',
    description: 'In a city that never sleeps, a detective must solve the mystery of the missing androids before the neon lights go out forever.',
    authorId: 'a1',
    coverUrl: 'https://images.unsplash.com/photo-1625126596387-542125028267?q=80&w=600&auto=format&fit=crop',
    genre: ['Cyberpunk', 'Mystery'],
    likes: 1240,
    plays: 5430,
    publishedAt: new Date().toISOString(),
    characters: [
       { id: 'c1', name: 'Detective Ray', color: '#3b82f6', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ray&backgroundColor=b6e3f4' },
       { id: 'c2', name: 'Echo', color: '#ec4899', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Echo&backgroundColor=ffdfbf' }
    ],
    scenes: [
      {
        id: 's1',
        name: 'The Office',
        backgroundUrl: 'https://images.unsplash.com/photo-1605806616949-1e87b487bc2a?q=80&w=1280&auto=format&fit=crop',
        bgmUrl: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3',
        dialogues: [
          { id: 'd1', characterId: null, text: 'The rain battered against the window like an angry customer demanding a refund.', audioUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-rain-on-window-1237.wav' },
          { id: 'd2', characterId: 'c1', text: 'Another night, another missing bot. When does it end?' },
          { id: 'd3', characterId: 'c2', text: 'Ray, you have a new message on the secure channel. It is tagged strictly confidential.', audioUrl: 'https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.wav' },
          { id: 'd4', characterId: 'c1', text: 'Put it through, Echo. Let\'s see who wants to play games tonight.' }
        ]
      }
    ]
  },
  {
    id: 'n2',
    title: 'Academy of Dreams',
    description: 'A slice-of-life romance set in a prestigious magical academy where dreams literally come true.',
    authorId: 'a2',
    coverUrl: 'https://images.unsplash.com/photo-1517487881594-2787fef5ebf7?q=80&w=600&auto=format&fit=crop',
    genre: ['Romance', 'Fantasy'],
    likes: 890,
    plays: 3200,
    publishedAt: new Date().toISOString(),
    characters: [
      { id: 'c1', name: 'Elara', color: '#8b5cf6', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elara&style=circle' },
      { id: 'c2', name: 'Kael', color: '#f43f5e', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kael&style=circle' }
    ],
    scenes: [
      {
        id: 's1',
        name: 'The Courtyard',
        backgroundUrl: 'https://images.unsplash.com/photo-1597034632230-011234c91038?q=80&w=1280&auto=format&fit=crop',
        dialogues: [
          { id: 'd1', characterId: null, text: 'The cherry blossoms were falling early this year, painting the academy grounds in soft pink.' },
          { id: 'd2', characterId: 'c1', text: 'I can\'t believe I made it in. The Royal Academy...' },
          { id: 'd3', characterId: 'c2', text: 'Watch where you\'re going, rookie.' },
          { id: 'd4', characterId: 'c1', text: 'O-oh! I\'m so sorry! I was just admiring the trees.' },
          { id: 'd5', characterId: 'c2', text: 'Trees won\'t help you pass the entrance exam. Focus, or you\'ll be out before noon.' }
        ]
      }
    ]
  },
  {
    id: 'n3',
    title: 'The Silent Void',
    description: 'Alone on a spaceship drifting towards a black hole. Is there anyone else out there?',
    authorId: 'a3',
    coverUrl: 'https://images.unsplash.com/photo-1541873676-a18131494184?q=80&w=600&auto=format&fit=crop',
    genre: ['Sci-Fi', 'Horror'],
    likes: 2100,
    plays: 8900,
    publishedAt: new Date().toISOString(),
    characters: [
      { id: 'c1', name: 'Captain Vance', color: '#10b981', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Vance' },
      { id: 'c2', name: 'A.I. Mother', color: '#ef4444', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Mother' }
    ],
    scenes: [
      {
        id: 's1',
        name: 'The Bridge',
        backgroundUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1280&auto=format&fit=crop',
        dialogues: [
          { id: 'd1', characterId: null, text: 'Red emergency lights pulsed rhythmically. The silence was heavier than the artificial gravity.' },
          { id: 'd2', characterId: 'c1', text: 'Status report. Is anyone left in the dorms?' },
          { id: 'd3', characterId: 'c2', text: 'Life support systems in Sector 4 are critical. No biosigns detected.' },
          { id: 'd4', characterId: 'c1', text: '...They\'re all gone? Just like that?' },
          { id: 'd5', characterId: 'c2', text: 'Correction. One biosign detected. It is outside the ship.' }
        ]
      }
    ]
  }
];

// Helper to retrieve novel for editing
const EditNovelWrapper = ({ novels, user, onSave, onUpdate }: { novels: Novel[], user: User, onSave: any, onUpdate: any }) => {
  const { id } = useParams();
  const novelToEdit = novels.find(n => n.id === id);

  if (!novelToEdit) {
    return <div className="text-center text-white p-10">Novel not found</div>;
  }
  
  if (novelToEdit.authorId !== user.id) {
     return <div className="text-center text-red-400 p-10">You are not authorized to edit this novel.</div>;
  }

  return <CreateNovel onSave={onSave} onUpdate={onUpdate} user={user} initialData={novelToEdit} />;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [novels, setNovels] = useState<Novel[]>(MOCK_NOVELS);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleSaveNovel = (novel: Novel) => {
    setNovels([novel, ...novels]);
  };

  const handleUpdateNovel = (updatedNovel: Novel) => {
    setNovels(novels.map(n => n.id === updatedNovel.id ? updatedNovel : n));
  };

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} logout={handleLogout} />}>
          <Route index element={<Home novels={novels} />} />
          <Route path="novel/:id" element={<NovelDetail novels={novels} currentUser={user} />} />
          <Route path="author/:id" element={<AuthorProfile novels={novels} currentUser={user} />} />
          <Route path="profile" element={user ? <AuthorProfile novels={novels} currentUser={user} /> : <Navigate to="/login" />} />
          
          <Route path="create" element={
            user ? <CreateNovel onSave={handleSaveNovel} user={user} /> : <Navigate to="/login" />
          } />

          <Route path="edit/:id" element={
            user ? <EditNovelWrapper novels={novels} user={user} onSave={handleSaveNovel} onUpdate={handleUpdateNovel} /> : <Navigate to="/login" />
          } />
          
          <Route path="login" element={<Login onLogin={handleLogin} />} />
          <Route path="register" element={<Register onLogin={handleLogin} />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;