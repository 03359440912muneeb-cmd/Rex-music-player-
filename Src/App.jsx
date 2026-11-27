import { useState, useEffect, useRef } from 'react';
// 1. Add these imports and states
import { Settings, Sliders } from 'lucide-react'; // Add Settings icon

// Inside your App component:
const [showEQ, setShowEQ] = useState(false);
const [bassBoost, setBassBoost] = useState(0);
const [eqLow, setEqLow] = useState(0);
const [eqMid, setEqMid] = useState(0);
const [eqHigh, setEqHigh] = useState(0);

// Web Audio API Refs
const audioContextRef = useRef(null);
const bassFilterRef = useRef(null);
const eqLowRef = useRef(null);
const eqMidRef = useRef(null);
const eqHighRef = useRef(null);
const sourceNodeRef = useRef(null);

// 2. Initialize Web Audio API when a song plays
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  // Only initialize once
  if (!audioContextRef.current) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // Create nodes
    sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audio);
    bassFilterRef.current = audioContextRef.current.createBiquadFilter();
    eqLowRef.current = audioContextRef.current.createBiquadFilter();
    eqMidRef.current = audioContextRef.current.createBiquadFilter();
    eqHighRef.current = audioContextRef.current.createBiquadFilter();

    // Configure filters
    bassFilterRef.current.type = 'lowshelf';
    bassFilterRef.current.frequency.value = 200;

    eqLowRef.current.type = 'peaking';
    eqLowRef.current.frequency.value = 250;
    eqLowRef.current.Q.value = 1;

    eqMidRef.current.type = 'peaking';
    eqMidRef.current.frequency.value = 1000;
    eqMidRef.current.Q.value = 1;

    eqHighRef.current.type = 'peaking';
    eqHighRef.current.frequency.value = 4000;
    eqHighRef.current.Q.value = 1;

    // Connect the chain: Source -> Bass -> EQ -> Destination
    sourceNodeRef.current
      .connect(bassFilterRef.current)
      .connect(eqLowRef.current)
      .connect(eqMidRef.current)
      .connect(eqHighRef.current)
      .connect(audioContextRef.current.destination);
  }
}, []);

// 3. Update filter values when sliders move
useEffect(() => {
  if (bassFilterRef.current) bassFilterRef.current.gain.value = bassBoost;
  if (eqLowRef.current) eqLowRef.current.gain.value = eqLow;
  if (eqMidRef.current) eqMidRef.current.gain.value = eqMid;
  if (eqHighRef.current) eqHighRef.current.gain.value = eqHigh;
}, [bassBoost, eqLow, eqMid, eqHigh]);

// 4. Add the UI inside your `bottom-controls` div
<div className="bottom-controls">
  <button className="folder-btn" onClick={handleOpenFolder}>
    <FolderOpen size={18} /> Open Folder
  </button>
  
  {/* New EQ Button */}
  <button 
    className={`folder-btn ${showEQ ? 'active' : ''}`} 
    onClick={() => setShowEQ(!showEQ)}
  >
    <Sliders size={18} /> EQ & Bass
  </button>

  <div className="volume-control">
    <Volume2 size={18} />
    <input 
      type="range" min="0" max="1" step="0.01" 
      value={volume} 
      onChange={(e) => setVolume(parseFloat(e.target.value))}
      className="volume-slider"
    />
  </div>
</div>

{/* EQ Panel Overlay */}
{showEQ && (
  <div className="eq-panel">
    <h3>Bass & EQ</h3>
    <div className="eq-row">
      <label>Bass Boost</label>
      <input type="range" min="0" max="15" value={bassBoost} onChange={(e) => setBassBoost(Number(e.target.value))} />
      <span>{bassBoost} dB</span>
    </div>
    <div className="eq-row">
      <label>Low</label>
      <input type="range" min="-12" max="12" value={eqLow} onChange={(e) => setEqLow(Number(e.target.value))} />
      <span>{eqLow} dB</span>
    </div>
    <div className="eq-row">
      <label>Mid</label>
      <input type="range" min="-12" max="12" value={eqMid} onChange={(e) => setEqMid(Number(e.target.value))} />
      <span>{eqMid} dB</span>
    </div>
    <div className="eq-row">
      <label>High</label>
      <input type="range" min="-12" max="12" value={eqHigh} onChange={(e) => setEqHigh(Number(e.target.value))} />
      <span>{eqHigh} dB</span>
    </div>
  </div>
)}
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, 
  Volume2, Heart, FolderOpen, Search, Music, ListMusic
} from 'lucide-react';

import './themes/dragon.css';
import './themes/elf.css';

function App() {
  // --- STATE ---
  const [theme, setTheme] = useState(localStorage.getItem('dragon-elf-theme') || 'dragon');
  const [playlist, setPlaylist] = useState(() => {
    const saved = localStorage.getItem('dragon-elf-playlists');
    return saved ? JSON.parse(saved) : [];
  });
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('dragon-elf-favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [currentSongIndex, setCurrentSongIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    return Number(localStorage.getItem('dragon-elf-volume')) || 0.5;
  });
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off', 'all', 'one'
  const [searchQuery, setSearchQuery] = useState('');

  const audioRef = useRef(null);

  // --- EFFECTS ---
  
  // Save to Local Storage whenever state changes
  useEffect(() => {
    localStorage.setItem('dragon-elf-theme', theme);
    document.body.className = theme; // Apply theme class to body for CSS
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('dragon-elf-playlists', JSON.stringify(playlist));
  }, [playlist]);

  useEffect(() => {
    localStorage.setItem('dragon-elf-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('dragon-elf-volume', volume.toString());
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Load last song from local storage on startup
  useEffect(() => {
    const lastSong = localStorage.getItem('dragon-elf-last-song');
    if (lastSong && playlist.length > 0) {
      const index = playlist.findIndex(s => s.path === lastSong);
      if (index !== -1) setCurrentSongIndex(index);
    }
  }, []); // Run once on mount

  // Handle song change
  useEffect(() => {
    if (currentSongIndex >= 0 && playlist[currentSongIndex]) {
      const song = playlist[currentSongIndex];
      localStorage.setItem('dragon-elf-last-song', song.path);
      
      if (audioRef.current) {
        audioRef.current.src = convertFileSrc(song.path);
        if (isPlaying) {
          audioRef.current.play().catch(e => console.error("Playback failed:", e));
        }
      }
    }
  }, [currentSongIndex]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => handleNext();

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentSongIndex, isShuffle, repeatMode]); // Dependencies to ensure handleNext captures latest state

  // --- LOGIC FUNCTIONS ---

  const handleOpenFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        // Call Rust backend to read files
        const files = await invoke('read_music_folder', { folderPath: selected });
        
        // Add new files to playlist, avoiding duplicates
        const newPlaylist = [...playlist];
        files.forEach(file => {
          if (!newPlaylist.find(song => song.path === file.path)) {
            newPlaylist.push(file);
          }
        });
        setPlaylist(newPlaylist);
      }
    } catch (error) {
      console.error("Error opening folder:", error);
    }
  };

  const togglePlay = () => {
    if (playlist.length === 0) return;
    if (currentSongIndex === -1) {
      setCurrentSongIndex(0);
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }

    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = currentSongIndex + 1;
      if (nextIndex >= playlist.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return; // Stop at end of playlist
        }
      }
    }
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    
    // If song is past 3 seconds, restart it
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    let prevIndex;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * playlist.length);
    } else {
      prevIndex = currentSongIndex - 1;
      if (prevIndex < 0) {
        prevIndex = repeatMode === 'all' ? playlist.length - 1 : 0;
      }
    }
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
  };

  const handleSeek = (e) => {
    const rect = e.target.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const toggleFavorite = (songPath) => {
    if (favorites.includes(songPath)) {
      setFavorites(favorites.filter(path => path !== songPath));
    } else {
      setFavorites([...favorites, songPath]);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return "00:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RENDER HELPERS ---

  const filteredPlaylist = playlist.filter(song => 
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSong = playlist[currentSongIndex];

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Background Audio Element (Hidden) */}
      <audio ref={audioRef} />

      {/* Main Layout Container */}
      <div className="player-layout">
        
        {/* Top Header / Theme Toggle */}
        <header className="player-header">
          <div className="logo">
            {theme === 'dragon' ? '🔥 Dragon Music' : '🌿 Elf Music'}
          </div>
          <button 
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === 'dragon' ? 'elf' : 'dragon')}
          >
            Switch to {theme === 'dragon' ? 'Elf' : 'Dragon'} Theme
          </button>
        </header>

        <div className="main-content">
          
          {/* LEFT: Album Art & Controls */}
          <div className="left-panel">
            <div className="album-art-container">
              {currentSong && currentSong.cover ? (
                <img src={convertFileSrc(currentSong.cover)} alt="Cover" className="album-art" />
              ) : (
                <div className="album-art default-art">
                  {theme === 'dragon' ? '🐉' : '🧝‍♀️'}
                </div>
              )}
            </div>

            <div className="song-info">
              <h2 className="song-title">{currentSong ? currentSong.title : 'No Song Selected'}</h2>
              <p className="song-artist">{currentSong ? currentSong.artist : 'Open a folder to begin'}</p>
            </div>

            {/* Progress Bar */}
            <div className="progress-container">
              <span className="time">{formatTime(progress)}</span>
              <div className="progress-bar-bg" onClick={handleSeek}>
                <div 
                  className="progress-bar-fill" 
                  style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                ></div>
              </div>
              <span className="time">{formatTime(duration)}</span>
            </div>

            {/* Main Controls */}
            <div className="controls">
              <button className={`icon-btn ${isShuffle ? 'active' : ''}`} onClick={() => setIsShuffle(!isShuffle)}>
                <Shuffle size={20} />
              </button>
              <button className="icon-btn" onClick={handlePrev}>
                <SkipBack size={24} />
              </button>
              <button className="play-btn" onClick={togglePlay}>
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button className="icon-btn" onClick={handleNext}>
                <SkipForward size={24} />
              </button>
              <button 
                className={`icon-btn ${repeatMode !== 'off' ? 'active' : ''}`} 
                onClick={() => setRepeatMode(repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off')}
              >
                <Repeat size={20} />
                {repeatMode === 'one' && <span className="repeat-one-dot">1</span>}
              </button>
            </div>

            {/* Volume & Folder Open */}
            <div className="bottom-controls">
              <button className="folder-btn" onClick={handleOpenFolder}>
                <FolderOpen size={18} /> Open Folder
              </button>
              <div className="volume-control">
                <Volume2 size={18} />
                <input 
                  type="range" 
                  min="0" max="1" step="0.01" 
                  value={volume} 
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="volume-slider"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Playlist */}
          <div className="right-panel">
            <div className="playlist-header">
              <div className="search-box">
                <Search size={16} />
                <input 
                  type="text" 
                  placeholder="Search songs..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <span className="song-count">{playlist.length} songs</span>
            </div>

            <ul className="playlist-list">
              {filteredPlaylist.length === 0 ? (
                <div className="empty-playlist">
                  <ListMusic size={48} />
                  <p>No songs found. Open a folder to add music.</p>
                </div>
              ) : (
                filteredPlaylist.map((song, index) => {
                  // Find original index for playing correct song
                  const originalIndex = playlist.findIndex(s => s.path === song.path);
                  const isCurrent = originalIndex === currentSongIndex;
                  const isFav = favorites.includes(song.path);

                  return (
                    <li 
                      key={song.path} 
                      className={`playlist-item ${isCurrent ? 'playing' : ''}`}
                      onClick={() => {
                        setCurrentSongIndex(originalIndex);
                        setIsPlaying(true);
                      }}
                    >
                      <div className="song-indicator">
                        {isCurrent && isPlaying ? <Music size={16} className="animate-pulse" /> : <span>{index + 1}</span>}
                      </div>
                      <div className="song-details">
                        <span className="title">{song.title}</span>
                        <span className="artist">{song.artist}</span>
                      </div>
                      <div className="song-actions">
                        <button 
                          className={`fav-btn ${isFav ? 'is-fav' : ''}`}
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(song.path); }}
                        >
                          <Heart size={16} fill={isFav ? "currentColor" : "none"} />
                        </button>
                        <span className="duration">{song.duration || '--:--'}</span>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
