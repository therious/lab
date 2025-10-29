// Note frequencies (A4 = 440Hz reference)
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function getNoteFrequency(note: string, octave: number = 4): number {
  const semitones: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  
  const cleanNote = note.replace('b', 'b').toUpperCase();
  const baseNote = cleanNote.match(/^[A-G][b#]?/)?.[0];
  
  if (!baseNote || !(baseNote in semitones)) return 440;
  
  const semitone = semitones[baseNote];
  const octaveOffset = (octave - 4) * 12;
  const totalSemitones = semitone + octaveOffset;
  
  return 440 * Math.pow(2, totalSemitones / 12);
}

// Roman numeral to interval mapping (relative to major scale)
const ROMAN_TO_INTERVAL: { [key: string]: number } = {
  'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11,
  'i': 0, 'ii': 2, 'iii': 4, 'iv': 5, 'v': 7, 'vi': 9, 'vii': 11
};

export function parseChord(chord: string): { root: number; quality: string; extensions: string[] } {
  const matches = chord.match(/^(b)?([IV]+|vi+|ii+|iii+|iv+|v+|vii+)(maj7|m7|7|sus4|sus2|dim|aug)?(\d+)?/);
  
  if (!matches) {
    // Fallback: treat as major I
    return { root: 0, quality: 'major', extensions: [] };
  }
  
  const [, flatPrefix, roman, quality = '', extension = ''] = matches;
  const romanUpper = roman.toUpperCase();
  const interval = ROMAN_TO_INTERVAL[romanUpper] || 0;
  const rootInterval = flatPrefix ? interval - 1 : interval;
  
  // Check if the original roman numeral is lowercase (minor)
  const isMinor = roman !== roman.toUpperCase();
  
  const qualityStr = quality || (isMinor ? 'minor' : 'major');
  
  return {
    root: rootInterval,
    quality: qualityStr,
    extensions: extension ? [extension] : []
  };
}

export function getChordNotes(chord: string, key: string, octave: number = 4): number[] {
  const chordInfo = parseChord(chord);
  
  // Get key note semitone (C=0, C#=1, etc.)
  const keyNotes: { [key: string]: number } = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  
  const cleanKey = key.replace(/m$/, ''); // Remove 'm' from minor keys
  const keySemitone = keyNotes[cleanKey] || 0;
  const rootSemitone = (keySemitone + chordInfo.root) % 12;
  
  // Build chord tones based on quality
  let intervals: number[];
  switch (chordInfo.quality) {
    case 'minor':
    case 'm7':
      intervals = [0, 3, 7]; // root, minor 3rd, 5th
      if (chordInfo.extensions.includes('7')) {
        intervals = [0, 3, 7, 10]; // add minor 7th
      }
      break;
    case 'major':
    case 'maj7':
      intervals = [0, 4, 7]; // root, major 3rd, 5th
      if (chordInfo.extensions.includes('7')) {
        intervals = [0, 4, 7, 11]; // add major 7th
      }
      break;
    case 'dim':
      intervals = [0, 3, 6];
      break;
    case 'aug':
      intervals = [0, 4, 8];
      break;
    default:
      intervals = [0, 4, 7]; // default to major
  }
  
  // Arrange chord tones in a good voicing around middle C
  // This creates a more natural chord sound with proper spacing
  const chordTones: number[] = [];
  
  // Calculate proper octaves for each interval to center around middle C
  // Middle C is in octave 4. For a chord centered around middle C:
  // - Root in octave 3 or 4 (depending on the note)
  // - 3rd and 5th in octave 4
  intervals.forEach((interval, i) => {
    const semitone = (rootSemitone + interval) % 12;
    const noteName = NOTES[semitone];
    
    // Arrange notes to be centered around middle C (octave 4)
    let noteOctave = octave;
    
    if (interval === 0) {
      // Root: use octave 3 for better bass
      noteOctave = octave - 1;
    } else if (interval <= 7) {
      // 3rd and 5th: keep in same octave as middle C
      noteOctave = octave;
    } else {
      // Extensions (7th, etc): one octave above middle C
      noteOctave = octave + 1;
    }
    
    chordTones.push(getNoteFrequency(noteName, noteOctave));
  });
  
  return chordTones;
}

export class ChordPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private isPlaying = false;
  private currentProgression: string[] = [];
  private currentKey = 'C';
  private currentTempo = 60;
  private currentIndex = 0;
  private playCallback: ((index: number) => void) | null = null;
  private playTimeoutId: NodeJS.Timeout | null = null;
  private arpeggioType = 'block';
  
  constructor() {
    try {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.2; // Lower volume
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }
  
  playChord(frequencies: number[], duration: number, gain: number = 0.2, arpeggio: string = 'block') {
    if (!this.audioContext || !this.gainNode) return;
    
    const currentTime = this.audioContext.currentTime;
    
    // Handle arpeggiation
    let noteOrder = [...frequencies];
    if (arpeggio === 'up') {
      noteOrder = [...frequencies];
    } else if (arpeggio === 'down') {
      noteOrder = [...frequencies].reverse();
    } else if (arpeggio === 'updown') {
      noteOrder = [...frequencies, ...frequencies.slice().reverse().slice(1)];
    } else if (arpeggio === 'downup') {
      noteOrder = [...frequencies].reverse();
      noteOrder = [...noteOrder, ...frequencies.slice().slice(1)];
    }
    
    const noteDelay = arpeggio === 'block' ? 0 : duration / noteOrder.length;
    
    noteOrder.forEach((freq, index) => {
      const oscillator = this.audioContext!.createOscillator();
      const chordGain = this.audioContext!.createGain();
      
      // Use triangle wave for more piano-like sound
      oscillator.type = 'triangle';
      oscillator.frequency.value = freq;
      
      const noteStart = currentTime + (index * noteDelay);
      const noteDuration = arpeggio === 'block' ? duration : noteDelay * 0.95;
      
      // Piano-like envelope: quick attack, slow decay
      chordGain.gain.setValueAtTime(0, noteStart);
      chordGain.gain.linearRampToValueAtTime(gain, noteStart + 0.01); // Fast attack
      
      // Exponential decay like a piano
      chordGain.gain.setValueAtTime(gain, noteStart + 0.01);
      chordGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);
      
      oscillator.connect(chordGain);
      chordGain.connect(this.gainNode);
      
      oscillator.start(noteStart);
      oscillator.stop(noteStart + noteDuration);
    });
  }
  
  async start(progression: string[], key: string, tempo: number, onChordChange: (index: number) => void, arpeggio: string = 'block') {
    this.stop();
    this.currentProgression = progression;
    this.currentKey = key;
    this.currentTempo = tempo;
    this.arpeggioType = arpeggio;
    this.playCallback = onChordChange;
    this.isPlaying = true;
    this.currentIndex = 0;
    
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.2;
    }
    
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    this.playLoop();
  }
  
  private playLoop = () => {
    if (!this.isPlaying) return;
    
    const chord = this.currentProgression[this.currentIndex];
    const notes = getChordNotes(chord, this.currentKey);
    const duration = 60 / this.currentTempo * 1000 / 1000; // Convert BPM to seconds
    
    // Trigger callback
    if (this.playCallback) {
      this.playCallback(this.currentIndex);
    }
    
    // Play the chord
    this.playChord(notes, duration, 0.15, this.arpeggioType);
    
    // Move to next chord
    this.currentIndex = (this.currentIndex + 1) % this.currentProgression.length;
    
    // Schedule next chord
    this.playTimeoutId = setTimeout(() => {
      this.playLoop();
    }, duration * 1000);
  };
  
  stop() {
    this.isPlaying = false;
    this.currentIndex = 0;
    if (this.playTimeoutId) {
      clearTimeout(this.playTimeoutId);
      this.playTimeoutId = null;
    }
  }
  
  setTempo(bpm: number) {
    this.currentTempo = bpm;
  }
}

