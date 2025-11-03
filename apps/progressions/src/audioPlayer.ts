// Note frequencies (A4 = 440Hz reference)
const NOTES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];

export function getNoteFrequency(note: string, octave: number = 4): number {
  const semitones: { [key: string]: number } = {
    'C':   0, 'C♯': 1,
    'D♭':  1, 'D':  2, 'D♯':  3,
    'E♭':  3, 'E':  4,
    'F':   5, 'F♯': 6,
    'G♭':  6, 'G':  7, 'G♯':  8,
    'A♭':  8, 'A':  9, 'A♯': 10,
    'B♭': 10, 'B': 11
  };

  // Convert 'b' to '♭' and '#' to '♯' for compatibility, then normalize
  const cleanNote = note.replace(/b/g, '♭').replace(/#/g, '♯').toUpperCase();
  const baseNote = cleanNote.match(/^[A-G][♭♯]?/)?.[0];

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
  // Updated regex to capture: flat, roman numeral, diminished symbol (°), half-diminished (∅), quality, and numeric extensions
  const matches = chord.match(/^(♭)?([IV]+|vi+|ii+|iii+|iv+|v+|vii+)(∅|°|maj7|m7|7|sus4|sus2|dim|aug|\+)?(\d+)?/);

  if (!matches) {
    // Fallback: treat as major I
    return { root: 0, quality: 'major', extensions: [] };
  }

  const [, flatPrefix, roman, qualitySymbol = '', extension = ''] = matches;
  const romanUpper = roman.toUpperCase();
  const interval = ROMAN_TO_INTERVAL[romanUpper] || 0;
  const rootInterval = flatPrefix ? interval - 1 : interval;

  // Check if the original roman numeral is lowercase (minor)
  const isMinor = roman !== roman.toUpperCase();

  // Determine quality based on symbol or default
  let qualityStr: string;
  const extensionsList: string[] = [];

  if (qualitySymbol === '∅') {
    // Half-diminished chord (m7♭5)
    qualityStr = 'halfdim';
    extensionsList.push('7'); // Always includes minor 7th
  } else if (qualitySymbol === '°') {
    // Diminished chord
    qualityStr = 'dim';
    if (extension === '7') {
      extensionsList.push('7'); // Diminished 7th
    }
  } else if (qualitySymbol === '+' || qualitySymbol === 'aug') {
    qualityStr = 'aug';
  } else if (qualitySymbol === 'sus4' || qualitySymbol === 'sus2') {
    qualityStr = qualitySymbol; // sus4 or sus2
  } else if (qualitySymbol === 'dim') {
    qualityStr = 'dim';
    if (extension === '7') {
      extensionsList.push('7');
    }
  } else if (qualitySymbol === 'maj7') {
    qualityStr = 'major';
    extensionsList.push('maj7');
  } else if (qualitySymbol === 'm7') {
    qualityStr = 'minor';
    extensionsList.push('7'); // minor 7th
  } else if (qualitySymbol === '7') {
    qualityStr = isMinor ? 'minor' : 'major';
    extensionsList.push('7'); // dominant 7th or minor 7th
  } else if (extension) {
    // Numeric extension without quality symbol
    qualityStr = isMinor ? 'minor' : 'major';
    extensionsList.push(extension);
  } else {
    // Default quality based on case
    qualityStr = isMinor ? 'minor' : 'major';
  }

  return {
    root: rootInterval,
    quality: qualityStr,
    extensions: extensionsList
  };
}

export function getChordNotes(chord: string, key: string, octave: number = 4): number[] {
  const chordInfo = parseChord(chord);

  // Get key note semitone (C=0, C♯=1, etc.)
  const keyNotes: { [key: string]: number } = {
    'C': 0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3,
    'E': 4, 'F': 5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8,
    'A♭': 8, 'A': 9, 'A♯': 10, 'B♭': 10, 'B': 11
  };

  const cleanKey = key.replace(/m$/, ''); // Remove 'm' from minor keys
  const keySemitone = keyNotes[cleanKey] || 0;
  const rootSemitone = (keySemitone + chordInfo.root) % 12;

  // Build chord tones based on quality and extensions
  let intervals: number[];
  
  // Handle suspended chords first
  if (chordInfo.quality === 'sus4') {
    intervals = [0, 5, 7]; // root, perfect 4th, 5th
  } else if (chordInfo.quality === 'sus2') {
    intervals = [0, 2, 7]; // root, major 2nd, 5th
  } else {
    // Regular chord qualities
    switch (chordInfo.quality) {
      case 'minor':
        intervals = [0, 3, 7]; // root, minor 3rd, 5th
        break;
      case 'major':
        intervals = [0, 4, 7]; // root, major 3rd, 5th
        break;
      case 'halfdim':
        intervals = [0, 3, 6]; // root, minor 3rd, diminished 5th (half-diminished triad)
        break;
      case 'dim':
        intervals = [0, 3, 6]; // root, minor 3rd, diminished 5th
        break;
      case 'aug':
        intervals = [0, 4, 8]; // root, major 3rd, augmented 5th
        break;
      default:
        intervals = [0, 4, 7]; // default to major
    }
    
    // Add extensions
    if (chordInfo.extensions.includes('maj7')) {
      intervals.push(11); // major 7th
    } else if (chordInfo.extensions.includes('7')) {
      if (chordInfo.quality === 'dim') {
        intervals.push(9); // diminished 7th
      } else if (chordInfo.quality === 'halfdim') {
        intervals.push(10); // minor 7th (half-diminished: m7♭5)
      } else {
        intervals.push(10); // minor 7th (dominant 7th for major, minor 7th for minor)
      }
    }
    
    if (chordInfo.extensions.includes('6')) {
      intervals.push(9); // major 6th
    }
    
    if (chordInfo.extensions.includes('9')) {
      // Add 7th first if not already present
      if (!chordInfo.extensions.includes('7') && !chordInfo.extensions.includes('maj7')) {
        intervals.push(10); // dominant 7th
      }
      intervals.push(14); // 9th (octave + 2)
    }
  }

  // Arrange chord tones in a good voicing around middle C
  // This creates a more natural chord sound with proper spacing
  const chordTones: number[] = [];

  // Calculate proper octaves for each interval to center around middle C
  // Middle C is in octave 4. For a chord centered around middle C:
  // - Root in octave 3 or 4 (depending on the note)
  // - 3rd and 5th in octave 4
  intervals.forEach((interval) => {
    const semitone = (rootSemitone + interval) % 12;
    const noteName = NOTES[semitone];

    // Arrange notes to be centered around middle C (octave 4)
    const noteOctave = (interval === 0)? octave - 1 :
                       (interval <= 7) ? octave :
                       octave + 1;

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
  private hyphenatedChords: string[] = [];
  private hyphenatedChordIndex = 0;

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
      // Create multiple oscillators for richer piano sound
      const baseGain = this.audioContext!.createGain();

      // Fundamental tone
      const fundamental = this.audioContext!.createOscillator();
      const fundamentalGain = this.audioContext!.createGain();
      fundamental.type = 'sine';
      fundamental.frequency.value = freq;

      // First harmonic (octave)
      const harmonic2 = this.audioContext!.createOscillator();
      const harmonic2Gain = this.audioContext!.createGain();
      harmonic2.type = 'sine';
      harmonic2.frequency.value = freq * 2;

      // Second harmonic (fifth above octave)
      const harmonic3 = this.audioContext!.createOscillator();
      const harmonic3Gain = this.audioContext!.createGain();
      harmonic3.type = 'sine';
      harmonic3.frequency.value = freq * 3;

      // Fourth harmonic (two octaves)
      const harmonic4 = this.audioContext!.createOscillator();
      const harmonic4Gain = this.audioContext!.createGain();
      harmonic4.type = 'sine';
      harmonic4.frequency.value = freq * 4;

      const noteStart = currentTime + (index * noteDelay);
      const noteDuration = arpeggio === 'block' ? duration : noteDelay * 0.95;

      // Realistic piano envelope: very quick attack, exponential decay with a long tail
      const attack = 0.001;
      const hold = 0.15;
      const sustain = gain * 0.25;

      // Harmonic amplitudes (more realistic piano spectrum)
      const amplitudes = [1.0, 0.3, 0.15, 0.05]; // fundamental, octave, 3rd, 4th

      // Apply envelope to each harmonic
      [fundamentalGain, harmonic2Gain, harmonic3Gain, harmonic4Gain].forEach((hGain, i) => {
        const amplitude = gain * amplitudes[i];
        hGain.gain.setValueAtTime(0, noteStart);
        hGain.gain.linearRampToValueAtTime(amplitude, noteStart + attack);
        hGain.gain.setValueAtTime(amplitude, noteStart + attack);
        hGain.gain.linearRampToValueAtTime(sustain * amplitudes[i], noteStart + hold);
        hGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);
      });

      // Connect oscillators
      fundamental.connect(fundamentalGain);
      harmonic2.connect(harmonic2Gain);
      harmonic3.connect(harmonic3Gain);
      harmonic4.connect(harmonic4Gain);

      [fundamentalGain, harmonic2Gain, harmonic3Gain, harmonic4Gain].forEach(g => g.connect(baseGain));
      baseGain.connect(this.gainNode!);

      // Start all oscillators
      fundamental.start(noteStart);
      fundamental.stop(noteStart + noteDuration);
      harmonic2.start(noteStart);
      harmonic2.stop(noteStart + noteDuration);
      harmonic3.start(noteStart);
      harmonic3.stop(noteStart + noteDuration);
      harmonic4.start(noteStart);
      harmonic4.stop(noteStart + noteDuration);
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

  // Helper function to parse hyphenated chords
  private parseHyphenatedChord(chordString: string): string[] {
    // Check if the chord string contains a hyphen (allowing for spaces around hyphens)
    const trimmed = chordString.trim();
    if (trimmed.includes('-')) {
      // Split by hyphens and trim each part
      return trimmed.split(/-/).map(part => part.trim()).filter(part => part.length > 0);
    }
    return [chordString];
  }

  private playLoop = () => {
    if (!this.isPlaying) return;

    const chord = this.currentProgression[this.currentIndex];

    // Check if this is a hyphenated chord (contains hyphens separating chord symbols)
    const chordParts = this.parseHyphenatedChord(chord);
    const barDuration = 60 / this.currentTempo; // Duration of one bar in seconds

    // If we're in the middle of playing hyphenated chords, continue with the next sub-chord
    if (this.hyphenatedChords.length > 0 && this.hyphenatedChordIndex < this.hyphenatedChords.length) {
      // Play the current sub-chord from the hyphenated sequence
      const subChord = this.hyphenatedChords[this.hyphenatedChordIndex];
      const subChordDuration = barDuration / this.hyphenatedChords.length;
      const notes = getChordNotes(subChord, this.currentKey);

      // Trigger callback with the main progression index
      if (this.playCallback) {
        this.playCallback(this.currentIndex);
      }

      // Play the sub-chord
      this.playChord(notes, subChordDuration, 0.15, this.arpeggioType);

      // Move to next sub-chord
      this.hyphenatedChordIndex++;

      // If we've played all sub-chords, move to next main chord
      if (this.hyphenatedChordIndex >= this.hyphenatedChords.length) {
        this.hyphenatedChords = [];
        this.hyphenatedChordIndex = 0;
        this.currentIndex = (this.currentIndex + 1) % this.currentProgression.length;
      }

      // Schedule next chord/sub-chord
      this.playTimeoutId = setTimeout(() => {
        this.playLoop();
      }, subChordDuration * 1000);
    } else if (chordParts.length > 1) {
      // This is a hyphenated chord - start playing the sequence
      this.hyphenatedChords = chordParts;
      this.hyphenatedChordIndex = 0;

      // Play the first sub-chord
      const subChord = this.hyphenatedChords[0];
      const subChordDuration = barDuration / this.hyphenatedChords.length;
      const notes = getChordNotes(subChord, this.currentKey);

      // Trigger callback
      if (this.playCallback) {
        this.playCallback(this.currentIndex);
      }

      // Play the sub-chord
      this.playChord(notes, subChordDuration, 0.15, this.arpeggioType);

      // Move to next sub-chord
      this.hyphenatedChordIndex++;

      // If this was the only sub-chord, move to next main chord
      if (this.hyphenatedChordIndex >= this.hyphenatedChords.length) {
        this.hyphenatedChords = [];
        this.hyphenatedChordIndex = 0;
        this.currentIndex = (this.currentIndex + 1) % this.currentProgression.length;
      }

      // Schedule next chord/sub-chord
      this.playTimeoutId = setTimeout(() => {
        this.playLoop();
      }, subChordDuration * 1000);
    } else {
      // Regular (non-hyphenated) chord
      const notes = getChordNotes(chord, this.currentKey);
      const duration = barDuration;

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
    }
  };

  stop() {
    this.isPlaying = false;
    this.currentIndex = 0;
    this.hyphenatedChords = [];
    this.hyphenatedChordIndex = 0;
    if (this.playTimeoutId) {
      clearTimeout(this.playTimeoutId);
      this.playTimeoutId = null;
    }
  }

  setTempo(bpm: number) {
    this.currentTempo = bpm;
  }
}

