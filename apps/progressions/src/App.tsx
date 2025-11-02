import { useState, useRef, useEffect } from 'react';
import { ChordProgression } from './types';
import { progressionsData } from './progressionsList';
import { ChordPlayer } from './audioPlayer';
import './App.css';

const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

type ArpeggioType = 'block' | 'up' | 'down' | 'updown' | 'downup';

const ARPEGGIO_OPTIONS: { value: ArpeggioType; label: string }[] = [
  { value: 'block', label: 'Block (simultaneous)' },
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'updown', label: 'Up then Down' },
  { value: 'downup', label: 'Down then Up' }
];

// Convert roman numeral + tonic to actual chord name
function getChordName(chordString: string, tonic: string): string {
  const chordInfo = parseChord(chordString);
  const keyNotes: { [key: string]: number } = {
    'C': 0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3,
    'E': 4, 'F': 5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8,
    'A♭': 8, 'A': 9, 'A♯': 10, 'B♭': 10, 'B': 11
  };
  
  const cleanKey = tonic.replace(/m$/, '');
  const tonicSemitone = keyNotes[cleanKey] || 0;
  const rootSemitone = (tonicSemitone + chordInfo.root) % 12;
  
  const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = NOTES[rootSemitone];
  
  // Build quality suffix
  let suffix = '';
  if (chordString.includes('maj7')) {
    suffix = 'maj7';
  } else if (chordString.includes('m7')) {
    suffix = 'm7';
  } else if (chordString.includes('7')) {
    suffix = '7';
  } else if (chordInfo.quality === 'minor') {
    suffix = 'm';
  }
  
  return noteName + suffix;
}

function parseChord(chord: string): { root: number; quality: string; extensions: string[] } {
  const matches = chord.match(/^(♭)?([IV]+|vi+|ii+|iii+|iv+|v+|vii+)(maj7|m7|7|sus4|sus2|dim|aug)?(\d+)?/);
  
  if (!matches) {
    return { root: 0, quality: 'major', extensions: [] };
  }
  
  const [, flatPrefix, roman, quality = '', extension = ''] = matches;
  const romanUpper = roman.toUpperCase();
  const ROMAN_TO_INTERVAL: { [key: string]: number } = {
    'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11,
    'i': 0, 'ii': 2, 'iii': 4, 'iv': 5, 'v': 7, 'vi': 9, 'vii': 11
  };
  const interval = ROMAN_TO_INTERVAL[romanUpper] || 0;
  const rootInterval = flatPrefix ? interval - 1 : interval;
  
  const isMinor = roman !== roman.toUpperCase();
  
  const qualityStr = quality || (isMinor ? 'minor' : 'major');
  
  return {
    root: rootInterval,
    quality: qualityStr,
    extensions: extension ? [extension] : []
  };
}

function App() {
  const [progressionList, setProgressionList] = useState<ChordProgression[]>(progressionsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgression, setSelectedProgression] = useState<ChordProgression | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [tempo, setTempo] = useState(60);
  const [currentKey, setCurrentKey] = useState<string>('C');
  const [arpeggioType, setArpeggioType] = useState<ArpeggioType>('block');
  
  const playerRef = useRef<ChordPlayer | null>(null);
  
  useEffect(() => {
    playerRef.current = new ChordPlayer();
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, []);

  // Auto-select the first progression on mount
  useEffect(() => {
    if (!selectedProgression && progressionsData.length > 0) {
      setSelectedProgression(progressionsData[0]);
      setCurrentKey(progressionsData[0].key);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset currentKey when selecting a new progression
  useEffect(() => {
    if (selectedProgression) {
      setCurrentKey(selectedProgression.key);
    }
  }, [selectedProgression?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restart playback when key changes and something is playing (skip initial mount)
  const prevKeyRef = useRef<string>(currentKey);
  useEffect(() => {
    if (isPlaying && selectedProgression && playerRef.current && currentKey !== prevKeyRef.current) {
      playerRef.current.stop();
      setTimeout(() => {
        if (playerRef.current && selectedProgression) {
          playerRef.current.start(
            selectedProgression.progression,
            currentKey,
            tempo,
            (index: number) => {
              setCurrentChordIndex(index);
            },
            arpeggioType
          );
          setIsPlaying(true);
        }
      }, 50);
    }
    prevKeyRef.current = currentKey;
  }, [currentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Restart playback when arpeggio changes and something is playing (skip initial mount)
  const prevArpeggioRef = useRef<ArpeggioType>(arpeggioType);
  useEffect(() => {
    if (isPlaying && selectedProgression && playerRef.current && arpeggioType !== prevArpeggioRef.current) {
      playerRef.current.stop();
      setTimeout(() => {
        if (playerRef.current && selectedProgression) {
          playerRef.current.start(
            selectedProgression.progression,
            currentKey,
            tempo,
            (index: number) => {
              setCurrentChordIndex(index);
            },
            arpeggioType
          );
          setIsPlaying(true);
        }
      }, 50);
    }
    prevArpeggioRef.current = arpeggioType;
  }, [arpeggioType]); // eslint-disable-line react-hooks/exhaustive-deps
  
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
          currentKey,
          tempo,
          (index: number) => {
            setCurrentChordIndex(index);
          },
          arpeggioType
        );
        setIsPlaying(true);
      }
    }
  };
  
  const handleSelectProgression = (progression: ChordProgression) => {
    // Always stop any current playback first
    if (playerRef.current) {
      playerRef.current.stop();
    }
    
    // Update UI state immediately
    const wasPlaying = isPlaying;
    setIsPlaying(false);
    setSelectedProgression(progression);
    setCurrentChordIndex(0);
    
    // If it was playing before, start the new progression after a brief delay
    if (wasPlaying && playerRef.current) {
      const newKey = progression.key;
      setTimeout(() => {
        if (playerRef.current) {
          playerRef.current.start(
            progression.progression,
            newKey,
            tempo,
            (index: number) => {
              setCurrentChordIndex(index);
            },
            arpeggioType
          );
          setIsPlaying(true);
        }
      }, 100); // Brief delay to ensure cleanup of scheduled audio
    }
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
                    min="20"
                    max="180"
                    value={tempo}
                    onChange={(e) => handleTempoChange(Number(e.target.value))}
                    className="tempo-slider"
                  />
                </div>

                <div className="key-control">
                  <label>Key:</label>
                  <select
                    value={currentKey}
                    onChange={(e) => setCurrentKey(e.target.value)}
                    className="key-selector"
                  >
                    {KEYS.map(key => (
                      <option key={key} value={key}>{key}</option>
                    ))}
                  </select>
                </div>

                <div className="arpeggio-control">
                  <label>Arpeggio:</label>
                  <select
                    value={arpeggioType}
                    onChange={(e) => setArpeggioType(e.target.value as ArpeggioType)}
                    className="key-selector"
                  >
                    {ARPEGGIO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
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
                      <div className="chord-roman">{chord}</div>
                      <div className="chord-name">{getChordName(chord, currentKey)}</div>
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

