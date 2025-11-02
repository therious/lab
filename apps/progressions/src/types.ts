export type Chord = string; // e.g., 'I', 'i', 'ii', 'IV', '♭VI', '♭VII', 'VII7', 'VIImaj7'

export type ArpeggioType = 'block' | 'up' | 'down' | 'updown' | 'downup';

export interface ChordProgression {
  n?: number; // Optional progression number
  name: string;
  progression: Chord[];
  songs: string[];
  key: string; // e.g., 'C', 'D', 'Am', etc.
}

