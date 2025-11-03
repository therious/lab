import { useState, useRef, useEffect } from 'react';
import { ChordProgression, ArpeggioType } from './types';
import { progressionsData } from './progressionsList';
import { ChordPlayer } from './audioPlayer';
import { SearchBar } from './components/SearchBar';
import { ProgressionListItem } from './components/ProgressionListItem';
import { PlayerControls } from './components/PlayerControls';
import { ChordDisplay } from './components/ChordDisplay';
import { ProgressionInfo } from './components/ProgressionInfo';
import { Placeholder } from './components/Placeholder';
import { GlobalStyles } from './components/GlobalStyles';
import { SongInfo } from './utils/songUtils';
import {
  AppContainer,
  AppHeader,
  AppContent,
  Panel,
  ProgressionList,
} from './components/StyledComponents';

function App() {
  const [progressionList, setProgressionList] = useState<ChordProgression[]>(progressionsData);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgression, setSelectedProgression] = useState<ChordProgression | null>(null);
  const [selectedSong, setSelectedSong] = useState<SongInfo | null>(null);
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
      const firstKey = progressionsData[0].key.split(',')[0].trim();
      setCurrentKey(firstKey || 'C');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset currentKey when selecting a new progression
  useEffect(() => {
    if (selectedProgression) {
      // Extract first key if there are multiple keys
      const firstKey = selectedProgression.key.split(',')[0].trim();
      setCurrentKey(firstKey || 'C');
      setSelectedSong(null); // Reset selected song when progression changes
    }
  }, [selectedProgression?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle song selection - update key and tempo
  const handleSongSelect = (song: SongInfo) => {
    setSelectedSong(song);
    if (song.key) {
      setCurrentKey(song.key);
    }
    if (song.bpm) {
      setTempo(song.bpm);
    }
  };

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
    <>
      <GlobalStyles />
      <AppContainer>
        <AppHeader>
        <h1>Chord Progressions</h1>
        <p>Explore and play popular chord progressions</p>
      </AppHeader>
      
      <AppContent>
        <Panel>
          <SearchBar 
            value={searchQuery} 
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
          />
          
          <ProgressionList>
            {progressionList.map((progression, index) => (
              <ProgressionListItem
                key={index}
                progression={progression}
                isSelected={selectedProgression?.name === progression.name}
                onClick={() => handleSelectProgression(progression)}
                searchQuery={searchQuery}
              />
            ))}
          </ProgressionList>
        </Panel>
        
        <Panel>
          {selectedProgression ? (
            <>
              <PlayerControls
                isPlaying={isPlaying}
                tempo={tempo}
                currentKey={currentKey}
                arpeggioType={arpeggioType}
                onPlay={handlePlay}
                onTempoChange={handleTempoChange}
                onKeyChange={setCurrentKey}
                onArpeggioChange={setArpeggioType}
              />
              
              <ChordDisplay
                progressionName={selectedProgression.name}
                progression={selectedProgression.progression}
                currentKey={currentKey}
                currentChordIndex={currentChordIndex}
                isPlaying={isPlaying}
              />
              
              <ProgressionInfo
                songs={selectedProgression.songs}
                progressionName={selectedProgression.name}
                selectedSong={selectedSong}
                onSongSelect={handleSongSelect}
              />
            </>
          ) : (
            <Placeholder />
          )}
        </Panel>
      </AppContent>
    </AppContainer>
    </>
  );
}

export default App;
