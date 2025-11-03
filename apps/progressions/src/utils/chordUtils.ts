export function parseChord(chord: string): { root: number; quality: string; extensions: string[] } {
  // Updated regex to capture: flat, roman numeral, diminished symbol (°), quality, and numeric extensions
  const matches = chord.match(/^(♭)?([IV]+|vi+|ii+|iii+|iv+|v+|vii+)(°|maj7|m7|7|sus4|sus2|dim|aug|\+)?(\d+)?/);
  
  if (!matches) {
    return { root: 0, quality: 'major', extensions: [] };
  }
  
  const [, flatPrefix, roman, qualitySymbol = '', extension = ''] = matches;
  const romanUpper = roman.toUpperCase();
  const ROMAN_TO_INTERVAL: { [key: string]: number } = {
    'I': 0, 'II': 2, 'III': 4, 'IV': 5, 'V': 7, 'VI': 9, 'VII': 11,
    'i': 0, 'ii': 2, 'iii': 4, 'iv': 5, 'v': 7, 'vi': 9, 'vii': 11
  };
  const interval = ROMAN_TO_INTERVAL[romanUpper] || 0;
  const rootInterval = flatPrefix ? interval - 1 : interval;
  
  const isMinor = roman !== roman.toUpperCase();
  
  // Determine quality based on symbol or default
  let qualityStr: string;
  const extensionsList: string[] = [];

  if (qualitySymbol === '°') {
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

export function getChordName(chordString: string, tonic: string): string {
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
  
  // Build quality suffix based on parsed chord info
  let suffix = '';
  if (chordInfo.extensions.includes('maj7')) {
    suffix = 'maj7';
  } else if (chordInfo.extensions.includes('7')) {
    if (chordInfo.quality === 'dim') {
      suffix = '°7'; // diminished 7th
    } else {
      suffix = chordInfo.quality === 'minor' ? 'm7' : '7';
    }
  } else if (chordInfo.extensions.includes('6')) {
    suffix = chordInfo.quality === 'minor' ? 'm6' : '6';
  } else if (chordInfo.extensions.includes('9')) {
    suffix = chordInfo.quality === 'minor' ? 'm9' : '9';
  } else if (chordInfo.quality === 'dim') {
    suffix = '°';
  } else if (chordInfo.quality === 'aug') {
    suffix = '+';
  } else if (chordInfo.quality === 'sus4') {
    suffix = 'sus4';
  } else if (chordInfo.quality === 'sus2') {
    suffix = 'sus2';
  } else if (chordInfo.quality === 'minor') {
    suffix = 'm';
  }
  
  return noteName + suffix;
}

