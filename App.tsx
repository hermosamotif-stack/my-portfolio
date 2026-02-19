import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Section, ChatMessage, Project } from './types';
import { getGeminiResponse } from './services/geminiService';

// ==========================================
// CONFIGURATION (ഇവിടെ നിങ്ങളുടെ വിവരങ്ങൾ നൽകുക)
// ==========================================
const GITHUB_USERNAME = 'hermosamotif-stack'; 
const GITHUB_REPO_NAME = 'my-portfolio';
const PROJECTS_FILE_PATH = 'projects.json'; 
// ==========================================

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Security State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ user: '', pass: '', token: '' });
  const [loginError, setLoginError] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I can help you know more about Falalu's design work. What would you like to know?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const categoryRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // 1. Fetch Projects from GitHub JSON on Load (ഇത് എല്ലാവർക്കും ഡാറ്റ ലഭ്യമാക്കുന്നു)
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch(`./${PROJECTS_FILE_PATH}?t=${Date.now()}`); 
        if (!response.ok) throw new Error("Failed to load projects");
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error("Error loading projects:", error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  const categories = useMemo(() => ['All', ...Array.from(new Set(projects.map(p => p.category)))], [projects]);

  const filteredProjects = useMemo(() => {
    if (activeCategory === 'All') return projects;
    return projects.filter(p => p.category === activeCategory);
  }, [activeCategory, projects]);

  useEffect(() => {
    const activeEl = categoryRefs.current[activeCategory];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1
      });
    }
  }, [activeCategory, categories]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      setIsPointer(window.getComputedStyle(target).cursor === 'pointer');
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredProjects, isAdmin, showLogin]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const responseText = await getGeminiResponse([...chatMessages, userMsg]);
    setChatMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    setIsChatLoading(false);
  };

  // Login Handler (ഇവിടെ Token ആവശ്യമാണ്)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginCreds.user === 'lazza' && loginCreds.pass === 'posterfallu447') {
      if(loginCreds.token.startsWith('gh')) {
          setGithubToken(loginCreds.token);
          setIsAdmin(true);
          setShowLogin(false);
          setLoginError('');
          setLoginCreds({ user: '', pass: '', token: '' });
      } else {
          setLoginError('Invalid GitHub Token format (starts with ghp_...)');
      }
    } else {
      setLoginError('Invalid credentials.');
    }
  };

  // 2. GitHub Sync Functionality (മാറ്റങ്ങൾ ഗിറ്റ്ഹബ്ബിലേക്ക് സേവ് ചെയ്യുന്നു)
  const saveToGitHub = async () => {
    if (!githubToken) {
        alert("GitHub Token missing. Please relogin.");
        return;
    }
    setIsSaving(true);
    setSaveStatus('Connecting to GitHub...');

    try {
        const apiUrl = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO_NAME}/contents/${PROJECTS_FILE_PATH}`;
        
        const getRes = await fetch(apiUrl, {
            headers: { 
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        let sha = '';
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        }

        const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(projects, null, 2))));
        
        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `Update portfolio works: ${new Date().toISOString()}`,
                content: contentBase64,
                sha: sha || undefined
            })
        });

        if (!putRes.ok) {
            const err = await putRes.json();
            throw new Error(err.message || "Failed to update");
        }

        setSaveStatus('Saved! Live site will update in ~2 mins.');
        setTimeout(() => setSaveStatus(''), 5000);

    } catch (error: any) {
        console.error(error);
        setSaveStatus(`Error: ${error.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const addProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      title: 'New Project',
      category: 'Poster Design',
      description: 'Project description here...',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
      year: new Date().getFullYear().toString()
    };
    setProjects([newProj, ...projects]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const handleImageUpload = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateProject(id, { imageUrl: base64String });
    };
    reader.readAsDataURL(file);
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8 md:p-16">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-16 reveal">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter uppercase italic">Control Panel</h1>
              <p className="text-xs uppercase tracking-[0.3em] opacity-40 mt-2">Manage your visual archive</p>
            </div>
            <div className="flex gap-4">
                 <button 
                  onClick={saveToGitHub}
                  disabled={isSaving}
                  className={`flex items-center gap-2 px-6 py-3 border border-green-500/20 bg-green-900/10 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 hover:text-white transition-all ${isSaving ? 'opacity-50' : ''}`}
                >
                  <SaveIcon /> {isSaving ? 'Syncing...' : 'Save to Cloud'}
                </button>
                <button 
                  onClick={() => setIsAdmin(false)}
                  className="px-6 py-3 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  Sign Out
                </button>
            </div>
          </header>

          {saveStatus && (
              <div className={`mb-8 p-4 rounded-lg text-center text-xs font-bold uppercase tracking-widest ${saveStatus.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                  {saveStatus}
              </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold uppercase tracking-widest">Active Works ({projects.length})</h2>
            <button 
              onClick={addProject}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500 transition-all"
            >
              <PlusIcon /> Add New Work
            </button>
          </div>

          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {projects.map(project => (
              <div key={project.id} className="break-inside-avoid bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden p-6 hover:border-white/20 transition-all flex flex-col mb-6">
                <div className="mb-6 rounded-lg overflow-hidden bg-black relative group">
                  <img src={project.imageUrl} className="w-full h-auto object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                      Change Image
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(project.id, e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  <input 
                    className="w-full bg-transparent border-b border-white/10 py-1 text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                    value={project.title}
                    onChange={(e) => updateProject(project.id, { title: e.target.value })}
                    placeholder="Title"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      className="bg-zinc-800 rounded-lg px-3 py-2 text-[10px] uppercase tracking-widest font-bold outline-none border border-transparent focus:border-white/20"
                      value={project.category}
                      onChange={(e) => updateProject(project.id, { category: e.target.value })}
                    >
                      <option>Logo Design</option>
                      <option>Poster Design</option>
                      <option>Business Card</option>
                      <option>Illustrations</option>
                      <option>Motion Graphics</option>
                    </select>
                    <input 
                      className="bg-zinc-800 rounded-lg px-3 py-2 text-[10px] uppercase tracking-widest font-bold outline-none border border-transparent focus:border-white/20"
                      value={project.year}
                      onChange={(e) => updateProject(project.id, { year: e.target.value })}
                      placeholder="Year"
                    />
                  </div>
                  <textarea 
                    className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-xs text-white/60 outline-none border border-transparent focus:border-white/20 resize-none"
                    rows={2}
                    value={project.description}
                    onChange={(e) => updateProject(project.id, { description: e.target.value })}
                    placeholder="Description"
                  />
                  
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Project Image</span>
                    <label className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-3 text-[10px] text-white/40 flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800 transition-colors">
                      <UploadIcon />
                      <span>{project.imageUrl.startsWith('data:') ? 'Custom Image Loaded' : 'Upload New Asset'}</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(project.id, e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-auto">
                    <button 
                      onClick={() => deleteProject(project.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // PUBLIC SITE RENDER
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* Custom Cursor */}
      <div 
        id="custom-cursor"
        className={`fixed top-0 left-0 w-4 h-4 rounded-full bg-white z-[9999] pointer-events-none mix-blend-difference transition-transform duration-200 ease-out ${isPointer ? 'scale-[4] blur-[1px]' : 'scale-100'}`}
        style={{ transform: `translate3d(${cursorPos.x - 8}px, ${cursorPos.y - 8}px, 0) ${isPointer ? 'scale(4)' : 'scale(1)'}` }}
      ></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 glass px-6 py-6 md:px-12 flex justify-between items-center">
        <div className="text-xl font-bold tracking-tighter uppercase flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
          FALALU 
          <span className="flex h-2 w-2 rounded-full bg-green-500 pulse-green"></span>
        </div>
        
        <div className="hidden md:flex space-x-12 text-[10px] font-bold uppercase tracking-[0.3em]">
          <button onClick={() => scrollTo('work')} className="hover:opacity-50 transition-opacity">Work</button>
          <button onClick={() => scrollTo('about')} className="hover:opacity-50 transition-opacity">About</button>
          <button onClick={() => scrollTo('contact')} className="hover:opacity-50 transition-opacity">Contact</button>
        </div>

        <button 
          onClick={() => setShowLogin(true)}
          className="text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all flex items-center gap-2"
        >
          <LockIcon />
          Admin
        </button>
      </nav>

      {/* Lightbox / Full Screen View */}
      {selectedProject && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300" onClick={() => setSelectedProject(null)}>
          <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-4 z-[101]">
             <CloseIcon />
          </button>
          <div className="max-w-7xl w-full max-h-screen flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <img 
              src={selectedProject.imageUrl} 
              alt={selectedProject.title} 
              className="max-h-[80vh] w-auto object-contain rounded-lg shadow-2xl mb-8" 
            />
            <div className="text-center">
               <h3 className="text-2xl font-bold tracking-tighter mb-2">{selectedProject.title}</h3>
               <p className="text-white/50 uppercase tracking-widest text-xs">{selectedProject.category} — {selectedProject.year}</p>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-12 rounded-[2rem] relative reveal active">
            <button onClick={() => setShowLogin(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
              <CloseIcon />
            </button>
            <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tighter uppercase italic mb-2">Admin Access</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">Identify yourself to enter the workspace</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-1">Username</label>
                <input 
                  type="text"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-white/30 transition-all text-sm"
                  placeholder="Username"
                  value={loginCreds.user}
                  onChange={e => setLoginCreds(prev => ({ ...prev, user: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-1">Password</label>
                <input 
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-white/30 transition-all text-sm"
                  placeholder="••••••••"
                  value={loginCreds.pass}
                  onChange={e => setLoginCreds(prev => ({ ...prev, pass: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-1 text-blue-400">GitHub Token</label>
                <input 
                  type="password"
                  className="w-full bg-white/5 border border-blue-500/30 rounded-xl px-4 py-4 outline-none focus:border-blue-500 transition-all text-sm"
                  placeholder="ghp_xxxxxxxxxxxx"
                  value={loginCreds.token}
                  onChange={e => setLoginCreds(prev => ({ ...prev, token: e.target.value }))}
                />
                <p className="text-[9px] text-white/20">Required to save your works globally.</p>
              </div>

              {loginError && <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold text-center">{loginError}</p>}
              <button 
                type="submit"
                className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 hover:text-white transition-all mt-4"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl reveal">
          <span className="block text-xs uppercase tracking-[0.4em] mb-6 text-blue-500 font-bold">Graphic Designer</span>
          <h1 className="text-[12vw] md:text-[8vw] lg:text-[7vw] font-extrabold leading-[0.85] tracking-tighter mb-12">
            DESIGNING <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/20">VISUAL</span> <br />
            STORIES.
          </h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <p className="text-lg md:text-xl max-w-xl text-white/50 leading-relaxed uppercase tracking-tight">
              Specializing in Branding, Logo Design, and Motion Graphics. Creating memorable visual identities for modern brands.
            </p>
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => scrollTo('work')}>
               <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center animate-bounce">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
               </div>
               <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Explore Work</span>
            </div>
          </div>
        </div>
      </section>

      {/* Project Masonry Grid */}
      <section id="work" className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/5">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="w-full md:w-auto">
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter italic reveal uppercase mb-12">Selected <br />Works</h2>
            
            {/* Category Tab */}
            <div className="relative inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md reveal">
              <div 
                className="absolute h-[calc(100%-8px)] rounded-full bg-white transition-all duration-300 ease-out z-0"
                style={{ 
                  left: `${indicatorStyle.left}px`, 
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity 
                }}
              />
              
              {categories.map(cat => (
                <button 
                  key={cat}
                  ref={el => categoryRefs.current[cat] = el}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 z-10 whitespace-nowrap rounded-full ${
                    activeCategory === cat ? 'text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MASONRY LAYOUT */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8 min-h-[600px]">
          {isLoadingProjects ? (
             <div className="col-span-full py-48 text-center text-white/20 uppercase tracking-[0.5em] animate-pulse">
               Loading Projects...
             </div>
          ) : filteredProjects.map((project, idx) => (
            <div 
              key={project.id} 
              className="break-inside-avoid relative group rounded-xl overflow-hidden cursor-zoom-in mb-8 reveal"
              onClick={() => setSelectedProject(project)}
            >
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-auto object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                
                {/* Hover Reveal Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                  <div className="transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                     <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2 block">{project.category}</span>
                     <h3 className="text-2xl font-bold tracking-tighter mb-2">{project.title}</h3>
                     <button className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 mt-4">
                        Expand View
                        <span className="w-8 h-px bg-white"></span>
                     </button>
                  </div>
                </div>
            </div>
          ))}
          {!isLoadingProjects && filteredProjects.length === 0 && (
            <div className="col-span-full py-48 text-center text-white/20 uppercase tracking-[0.5em]">
              No projects in this category.
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-48 px-6 md:px-12 lg:px-24 bg-white text-black rounded-[3rem] md:rounded-[6rem] mx-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div className="reveal">
            <span className="text-xs uppercase tracking-widest font-bold mb-8 block opacity-40">02 — Expertise</span>
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-12 uppercase">
              CREATIVE <br /> DESIGN <br /> <span className="text-zinc-300">SOLUTIONS.</span>
            </h2>
          </div>
          <div className="reveal space-y-12">
            <p className="text-2xl md:text-4xl leading-tight font-medium">
              I am Falalu Rahman, a Graphic Designer with a passion for creative visual storytelling. With a focus on branding, logo design, and motion graphics, I bring ideas to life.
            </p>
            <div className="grid grid-cols-2 gap-8 text-xs uppercase tracking-widest font-bold pt-12 border-t border-black/10">
               <div>
                  <h4 className="mb-4 opacity-40">Software Skills</h4>
                  <ul className="space-y-2">
                    <li>Photoshop</li>
                    <li>Illustrator</li>
                    <li>InDesign</li>
                    <li>Corel Draw</li>
                  </ul>
               </div>
               <div>
                  <h4 className="mb-4 opacity-40">Focus Areas</h4>
                  <ul className="space-y-2">
                    <li>Branding</li>
                    <li>Logo Design</li>
                    <li>Motion Graphics</li>
                    <li>Creative Ads</li>
                  </ul>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-48 px-6 md:px-12 lg:px-24 text-center mt-[-10vh] pt-[20vh]">
        <div className="max-w-4xl mx-auto reveal">
          <h2 className="text-6xl md:text-[10vw] font-extrabold tracking-tighter mb-12 uppercase">Connect.</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-24">
            <a href="mailto:falalurahman447@email.com" className="text-2xl md:text-4xl font-bold border-b-2 border-white/20 hover:border-white transition-colors py-2 tracking-tighter">falalurahman447@email.com</a>
          </div>
           <div className="text-xl opacity-60 font-medium mb-12">
            +91 7994055131
          </div>
          <div className="flex justify-center gap-12 text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">
            <a href="#" className="hover:opacity-100 transition-opacity">WhatsApp</a>
            <a href="#" className="hover:opacity-100 transition-opacity">LinkedIn</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Instagram</a>
          </div>
        </div>
      </section>

      {/* AI Chat Widget */}
      <div className={`fixed bottom-6 right-6 z-[60] flex flex-col items-end`}>
        {isChatOpen && (
          <div className="bg-[#0f0f0f] w-[320px] md:w-[400px] h-[550px] rounded-3xl shadow-2xl border border-white/5 flex flex-col mb-4 overflow-hidden">
            <div className="bg-white text-black px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <BotIcon />
                <span className="text-xs font-bold uppercase tracking-widest">Assistant</span>
              </div>
              <button onClick={() => setIsChatOpen(false)}><CloseIcon /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-white text-black'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-black rounded-2xl px-4 py-3 text-sm animate-pulse">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex space-x-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about my work..." 
                className="flex-1 bg-zinc-900 border border-white/5 rounded-full px-4 py-2 text-sm outline-none focus:border-white/20"
              />
              <button type="submit" className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center"><SendIcon /></button>
            </form>
          </div>
        )}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${isChatOpen ? 'bg-white text-black' : 'bg-zinc-900 text-white border border-white/10'}`}
        >
          {isChatOpen ? <CloseIcon /> : <BotIcon />}
        </button>
      </div>
    </div>
  );
};

export default App;
