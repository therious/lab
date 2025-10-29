import { useState, useRef, useEffect } from 'react';
import { ChordProgression } from './types';
import { progressionsData } from './progressionsData';
import { ChordPlayer } from './audioPlayer';
import './App.css';

function App() {
  const [progressionList, setProgressionList] = useState<ChordProgression[]>(progressionsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgression, setSelectedProgression] = useState<ChordProgression | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [tempo, setTempo] = useState(120);
  
  const playerRef = useRef<ChordPlayer | null>(null);
  
  useEffect(() => {
    playerRef.current = new ChordPlayer();
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, []);
  
  // Filter progressions based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setProgressionList(progressionsData);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = progressionsData.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.songs.some(song => song.toLowerCase().includes(query))
    );
    setProgressionList(filtered);
  }, [searchQuery]);
  
  const handlePlay = () => {
    if (!selectedProgression) return;
    
    if (isPlaying) {
      // Stop current playback
      if (playerRef.current) {
        playerRef.current.stop();
      }
      setIsPlaying(false);
      setCurrentChordIndex(0);
    } else {
      // Start playback
      if (playerRef.current && selectedProgression) {
        playerRef.current.start(
          selectedProgression.progression,
          selectedProgression.key,
          tempo,
          (index: number) => {
            setCurrentChordIndex(index);
          }
        );
        setIsPlaying(true);
      }
    }
  };
  
  const handleSelectProgression = (progression: ChordProgression) => {
    // If currently playing, switch immediately
    if (isPlaying && playerRef.current) {
      playerRef.current.stop();
      playerRef.current.start(
        progression.progression,
        progression.key,
        tempo,
        (index: number) => {
          setCurrentChordIndex(index);
        }
      );
    }
    setSelectedProgression(progression);
    setCurrentChordIndex(0);
  };
  
  const handleTempoChange = (newTempo: number) => {
    setTempo(newTempo);
    if (playerRef.current) {
      playerRef.current.setTempo(newTempo);
    }
  };
  
  return (
    <div className="app">
      <header className="app-header">
        <h1>Chord Progressions</h1>
        <p>Explore and play popular chord progressions</p>
      </header>
      
      <div className="app-content">
        <div className="left-panel">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search progressions or songs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="progression-list">
            {progressionList.map((progression, index) => (
              <div
                key={index}
                className={`progression-item ${selectedProgression?.name === progression.name ? 'selected' : ''}`}
                onClick={() => handleSelectProgression(progression)}
              >
                <div className="progression-name">{progression.name}</div>
                <div className="progression-chords">
                  {progression.progression.map((chord, i) => (
                    <span key={i} className="chord-badge">{chord}</span>
                  ))}
                </div>
                <div className="progression-key">Key: {progression.key}</div>
                <div className="progression-songs">
                  {progression.songs[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="right-panel">
          {selectedProgression ? (
            <>
              <div className="player-controls">
                <button 
                  className="play-button"
                  onClick={handlePlay}
                >
                  {isPlaying ? '⏸ Pause' : '▶ Play'}
                </button>
                
                <div className="tempo-control">
                  <label>Tempo: {tempo} BPM</label>
                  <input
                    type="range"
                    min="60"
                    max="180"
                    value={tempo}
                    onChange={(e) => handleTempoChange(Number(e.target.value))}
                    className="tempo-slider"
                  />
                </div>
              </div>
              
              <div className="chord-display">
                <h3>Progression: {selectedProgression.name}</h3>
                <div className="chord-progression">
                  {selectedProgression.progression.map((chord, index) => (
                    <div
                      key={index}
                      className={`chord-box ${index === currentChordIndex && isPlaying ? 'active' : ''}`}
                    >
                      {chord}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="progression-info">
                <h4>Songs using this progression:</h4>
                <ul>
                  {selectedProgression.songs.map((song, index) => (
                    <li key={index}>{song}</li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="placeholder">
              <p>Select a progression from the list to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

