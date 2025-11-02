import { ArpeggioType } from '../types';
import {
  PlayerControls as StyledPlayerControls,
  PlayButton,
  ControlGroup,
  Select,
  TempoSlider,
} from './StyledComponents';

const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const ARPEGGIO_OPTIONS: { value: ArpeggioType; label: string }[] = [
  { value: 'block', label: 'Block (simultaneous)' },
  { value: 'up', label: 'Up' },
  { value: 'down', label: 'Down' },
  { value: 'updown', label: 'Up then Down' },
  { value: 'downup', label: 'Down then Up' }
];

interface PlayerControlsProps {
  isPlaying: boolean;
  tempo: number;
  currentKey: string;
  arpeggioType: ArpeggioType;
  onPlay: () => void;
  onTempoChange: (tempo: number) => void;
  onKeyChange: (key: string) => void;
  onArpeggioChange: (arpeggio: ArpeggioType) => void;
}

export function PlayerControls({
  isPlaying,
  tempo,
  currentKey,
  arpeggioType,
  onPlay,
  onTempoChange,
  onKeyChange,
  onArpeggioChange,
}: PlayerControlsProps) {
  return (
    <StyledPlayerControls>
      <PlayButton onClick={onPlay}>
        {isPlaying ? '⏸ Pause' : '▶ Play'}
      </PlayButton>
      
      <ControlGroup>
        <label>Tempo: {tempo} BPM</label>
        <TempoSlider
          min="20"
          max="180"
          value={tempo}
          onChange={(e) => onTempoChange(Number(e.target.value))}
        />
      </ControlGroup>

      <ControlGroup>
        <label>Key:</label>
        <Select
          value={currentKey}
          onChange={(e) => onKeyChange(e.target.value)}
        >
          {KEYS.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </Select>
      </ControlGroup>

      <ControlGroup>
        <label>Arpeggio:</label>
        <Select
          value={arpeggioType}
          onChange={(e) => onArpeggioChange(e.target.value as ArpeggioType)}
        >
          {ARPEGGIO_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </Select>
      </ControlGroup>
    </StyledPlayerControls>
  );
}
