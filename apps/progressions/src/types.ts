export type Chord = string; // e.g., 'I', 'i', 'ii', 'IV', 'bVI', 'bVII', 'VII7', 'VIImaj7'

export interface ChordProgression {
  n?: number; // Optional progression number
  name: string;
  progression: Chord[];
  songs: string[];
  key: string; // e.g., 'C', 'D', 'Am', etc.
}

