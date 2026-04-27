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
  const chordTones: number[] = [];

  intervals.forEach((interval) => {
    const semitone = (rootSemitone + interval) % 12;
    const noteName = NOTES[semitone];

    const noteOctave = (interval === 0)? octave - 1 :
                       (interval <= 7) ? octave :
                       octave + 1;

    chordTones.push(getNoteFrequency(noteName, noteOctave));
  });

  return chordTones;
}

// ── Sampler engine (Salamander Grand Piano C2–C7 samples) ────────────────────
// Adapted from https://github.com/gregjopa/piano-flash-cards (MIT licence).
// Samples: Salamander Grand Piano by Alexander Holm (CC BY 3.0).

type SampleMap = { C2: AudioBuffer; C3: AudioBuffer; C4: AudioBuffer;
                   C5: AudioBuffer; C6: AudioBuffer; C7: AudioBuffer };

/** Convert a frequency (Hz) to the nearest MIDI note number. */
function freqToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

/** Pick the nearest C-sample for a given MIDI note to minimise pitch shifting.
 *  Returns [detuneInCents, sample]. */
function bestSample(midi: number, samples: SampleMap): [number, AudioBuffer] {
  // MIDI numbers for C2–C7: 36, 48, 60, 72, 84, 96
  const sampleMidi = [36, 48, 60, 72, 84, 96];
  const keys = ['C2', 'C3', 'C4', 'C5', 'C6', 'C7'] as const;

  let best = 0;
  let bestDist = Math.abs(midi - sampleMidi[0]);
  for (let i = 1; i < sampleMidi.length; i++) {
    const d = Math.abs(midi - sampleMidi[i]);
    if (d < bestDist) { bestDist = d; best = i; }
  }

  return [(midi - sampleMidi[best]) * 100, samples[keys[best]]];
}

class SamplerEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private samples: SampleMap | null = null;
  private loading: Promise<void>;

  constructor(ctx: AudioContext, masterGain: GainNode) {
    this.ctx = ctx;
    this.masterGain = masterGain;

    // Polyfill Safari's callback-based decodeAudioData
    if (this.ctx.decodeAudioData.length !== 1) {
      const orig = this.ctx.decodeAudioData.bind(this.ctx);
      this.ctx.decodeAudioData = (buf) =>
        new Promise((res, rej) => orig(buf, res, rej));
    }

    const names = ['C2v10', 'C3v10', 'C4v10', 'C5v10', 'C6v10', 'C7v10'];
    this.loading = Promise.all(
      names.map(n => this.loadSample(`/audio/${n}.mp3`))
    ).then(([C2, C3, C4, C5, C6, C7]) => {
      this.samples = { C2, C3, C4, C5, C6, C7 };
      console.log('[SamplerEngine] piano samples ready');
    }).catch(err => {
      console.error('[SamplerEngine] failed to load samples:', err);
      throw err;
    });
  }

  private loadSample(url: string): Promise<AudioBuffer> {
    return fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(buf => this.ctx.decodeAudioData(buf));
  }

  /** Returns true once all samples have been decoded and are ready. */
  get ready(): boolean { return this.samples !== null; }

  /** Wait until samples are loaded (used before first playback). */
  whenReady(): Promise<void> { return this.loading; }

  /**
   * Schedule a single piano note via sample + pitch-shift.
   * @param freq     Target frequency in Hz
   * @param startAt  AudioContext timestamp to begin playback
   * @param duration Envelope duration in seconds (sample fades out at end)
   * @param gain     Peak gain (0–1)
   */
  scheduleNote(freq: number, startAt: number, duration: number, gain: number) {
    if (!this.samples) return;

    const midi = freqToMidi(freq);
    const [detuneCents, sample] = bestSample(midi, this.samples);

    const src = this.ctx.createBufferSource();
    src.buffer = sample;
    if (src.detune) {
      src.detune.value = detuneCents;
    } else {
      src.playbackRate.value = 2 ** (detuneCents / 1200);
    }

    // Simple piano envelope: instant attack, exponential decay
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, startAt);
    env.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

    src.connect(env);
    env.connect(this.masterGain);
    src.start(startAt);
    src.stop(startAt + duration + 0.05); // small buffer past envelope end
  }
}

// ── ChordPlayer ──────────────────────────────────────────────────────────────

export class ChordPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sampler: SamplerEngine | null = null;
  private isPlaying = false;
  private currentProgression: string[] = [];
  private currentKey = 'C';
  private currentTempo = 60;
  private currentIndex = 0;
  private playCallback: ((index: number) => void) | null = null;
  private playTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private arpeggioType = 'block';
  private hyphenatedChords: string[] = [];
  private hyphenatedChordIndex = 0;

  constructor() {
    try {
      this.audioContext = new AudioContext();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.6;
      this.sampler = new SamplerEngine(this.audioContext, this.gainNode);
    } catch (e) {
      console.error('Failed to initialize AudioContext:', e);
    }
  }

  playChord(frequencies: number[], duration: number, gain: number = 0.6, arpeggio: string = 'block') {
    if (!this.audioContext || !this.sampler || !this.sampler.ready) return;

    const currentTime = this.audioContext.currentTime;

    // Build play order for arpeggiation
    let noteOrder = [...frequencies];
    if (arpeggio === 'down') {
      noteOrder = [...frequencies].reverse();
    } else if (arpeggio === 'updown') {
      noteOrder = [...frequencies, ...frequencies.slice().reverse().slice(1)];
    } else if (arpeggio === 'downup') {
      const rev = [...frequencies].reverse();
      noteOrder = [...rev, ...frequencies.slice(1)];
    }

    const noteDelay = arpeggio === 'block' ? 0 : duration / noteOrder.length;
    const noteDuration = arpeggio === 'block' ? duration : Math.max(noteDelay * 2, duration * 0.6);

    noteOrder.forEach((freq, i) => {
      this.sampler!.scheduleNote(freq, currentTime + i * noteDelay, noteDuration, gain);
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
      this.gainNode.gain.value = 0.6;
      this.sampler = new SamplerEngine(this.audioContext, this.gainNode);
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Wait for samples if they haven't loaded yet
    if (this.sampler && !this.sampler.ready) {
      try {
        await this.sampler.whenReady();
      } catch (err) {
        console.error('[ChordPlayer] cannot start — sample loading failed:', err);
        this.isPlaying = false;
        return;
      }
    }

    this.playLoop();
  }

  private parseHyphenatedChord(chordString: string): string[] {
    const trimmed = chordString.trim();
    if (trimmed.includes('-')) {
      return trimmed.split(/-/).map(p => p.trim()).filter(p => p.length > 0);
    }
    return [chordString];
  }

  private playLoop = () => {
    if (!this.isPlaying) return;

    const chord = this.currentProgression[this.currentIndex];
    const chordParts = this.parseHyphenatedChord(chord);
    const barDuration = 60 / this.currentTempo;

    if (this.hyphenatedChords.length > 0 && this.hyphenatedChordIndex < this.hyphenatedChords.length) {
      const subChord = this.hyphenatedChords[this.hyphenatedChordIndex];
      const subChordDuration = barDuration / this.hyphenatedChords.length;
      const notes = getChordNotes(subChord, this.currentKey);

      if (this.playCallback) this.playCallback(this.currentIndex);
      this.playChord(notes, subChordDuration, 0.6, this.arpeggioType);

      this.hyphenatedChordIndex++;
      if (this.hyphenatedChordIndex >= this.hyphenatedChords.length) {
        this.hyphenatedChords = [];
        this.hyphenatedChordIndex = 0;
        this.currentIndex = (this.currentIndex + 1) % this.currentProgression.length;
      }

      this.playTimeoutId = setTimeout(this.playLoop, subChordDuration * 1000);

    } else if (chordParts.length > 1) {
      this.hyphenatedChords = chordParts;
      this.hyphenatedChordIndex = 0;

      const subChord = this.hyphenatedChords[0];
      const subChordDuration = barDuration / this.hyphenatedChords.length;
      const notes = getChordNotes(subChord, this.currentKey);

      if (this.playCallback) this.playCallback(this.currentIndex);
      this.playChord(notes, subChordDuration, 0.6, this.arpeggioType);

      this.hyphenatedChordIndex++;
      if (this.hyphenatedChordIndex >= this.hyphenatedChords.length) {
        this.hyphenatedChords = [];
        this.hyphenatedChordIndex = 0;
        this.currentIndex = (this.currentIndex + 1) % this.currentProgression.length;
      }

      this.playTimeoutId = setTimeout(this.playLoop, subChordDuration * 1000);

    } else {
      const notes = getChordNotes(chord, this.currentKey);
      const duration = barDuration;

      if (this.playCallback) this.playCallback(this.currentIndex);
      this.playChord(notes, duration, 0.6, this.arpeggioType);

      this.currentIndex = (this.currentIndex + 1) % this.currentProgression.length;
      this.playTimeoutId = setTimeout(this.playLoop, duration * 1000);
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
