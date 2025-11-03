import styled from 'styled-components';

// Helper to add data-component attribute
const named = (name: string) => ({ 'data-n': name } as any);

export const AppContainer = styled.div.attrs(named('AppContainer'))`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

export const AppHeader = styled.header.attrs(named('AppHeader'))`
  text-align: center;
  color: white;
  margin-bottom: 30px;

  h1 {
    margin: 0 0 10px 0;
    font-size: 2.5em;
  }

  p {
    margin: 0;
    opacity: 0.9;
  }
`;

export const AppContent = styled.div.attrs(named('AppContent'))`
  display: flex;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

export const Panel = styled.div.attrs(named('Panel'))`
  flex: 1;
  min-width: 400px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

export const SearchBar = styled.div.attrs(named('SearchBar'))`
  margin-bottom: 20px;
  position: relative;
`;

export const SearchInput = styled.input.attrs(named('SearchInput'))<{ $hasClear?: boolean }>`
  width: 100%;
  padding: 12px ${props => props.$hasClear ? '40px' : '12px'} 12px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

export const ClearButton = styled.button.attrs(named('ClearButton'))`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 18px;
  line-height: 1;
  transition: color 0.2s;

  &:hover {
    color: #667eea;
  }

  &:focus {
    outline: none;
    color: #667eea;
  }
`;

export const ProgressionList = styled.div.attrs(named('ProgressionList'))`
  max-height: 600px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #667eea;
    border-radius: 4px;

    &:hover {
      background: #764ba2;
    }
  }
`;

export const ProgressionItem = styled.div.attrs(named('ProgressionItem'))<{ $selected?: boolean }>`
  padding: 15px;
  margin-bottom: 10px;
  border: 2px solid ${props => props.$selected ? '#667eea' : '#e0e0e0'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background: ${props => props.$selected ? '#f0f2ff' : 'transparent'};

  &:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }
`;

export const ProgressionName = styled.div.attrs(named('ProgressionName'))`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
`;

export const ProgressionChords = styled.div.attrs(named('ProgressionChords'))`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

export const ChordBadge = styled.span.attrs(named('ChordBadge'))`
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
`;

export const ProgressionKey = styled.div.attrs(named('ProgressionKey'))`
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
`;

export const ProgressionSongs = styled.div.attrs(named('ProgressionSongs'))`
  color: #888;
  font-size: 13px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ProgressionSongsContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== '$expanded',
}).attrs(named('ProgressionSongsContainer'))<{ $expanded?: boolean }>`
  color: #888;
  font-size: 13px;
  line-height: 1.4;
  
  ${props => !props.$expanded && `
    max-height: calc(1.4em * 2);
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  `}
`;

export const ExpandToggle = styled.button.attrs(named('ExpandToggle'))`
  background: none;
  border: none;
  color: #667eea;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 0;
  margin-top: 4px;
  text-decoration: underline;
  font-weight: 500;
  
  &:hover {
    color: #764ba2;
  }
`;

export const PlayerControls = styled.div.attrs(named('PlayerControls'))`
  margin-bottom: 30px;
`;

export const PlayButton = styled.button.attrs(named('PlayButton'))`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
`;

export const ControlGroup = styled.div.attrs(named('ControlGroup'))`
  margin-top: 20px;

  label {
    display: block;
    margin-bottom: 10px;
    color: #333;
    font-weight: 500;
  }
`;

export const Select = styled.select.attrs(named('Select'))`
  width: 100%;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  background: white;
  cursor: pointer;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &:hover {
    border-color: #667eea;
  }
`;

export const TempoSlider = styled.input.attrs({
  type: 'range',
  ...named('TempoSlider')
})`
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: #e0e0e0;
  outline: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #667eea;
    cursor: pointer;
    border: none;
  }
`;

export const ChordDisplay = styled.div.attrs(named('ChordDisplay'))`
  margin-bottom: 30px;

  h3 {
    margin: 0 0 20px 0;
    color: #333;
  }
`;

export const ChordProgression = styled.div.attrs(named('ChordProgression'))`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const ChordBox = styled.div.attrs(named('ChordBox'))<{ $active?: boolean }>`
  flex: 1;
  min-width: 80px;
  padding: 15px;
  background: ${props => props.$active 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : '#f5f5f5'};
  border: 2px solid ${props => props.$active ? '#667eea' : '#e0e0e0'};
  border-radius: 8px;
  text-align: center;
  transition: all 0.3s;
  transform: ${props => props.$active ? 'scale(1.1)' : 'scale(1)'};
  box-shadow: ${props => props.$active 
    ? '0 4px 12px rgba(102, 126, 234, 0.4)' 
    : 'none'};
`;

export const ChordRoman = styled.div.attrs(named('ChordRoman'))<{ $active?: boolean }>`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.$active ? 'white' : '#333'};
  margin-bottom: 5px;
`;

export const ChordName = styled.div.attrs(named('ChordName'))<{ $active?: boolean }>`
  font-size: 14px;
  color: ${props => props.$active ? 'rgba(255, 255, 255, 0.9)' : '#666'};
  font-weight: normal;
`;

export const ProgressionInfo = styled.div.attrs(named('ProgressionInfo'))`
  border-top: 2px solid #e0e0e0;
  padding-top: 20px;

  h4 {
    margin: 0 0 10px 0;
    color: #333;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 8px 0;
    color: #666;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }
  }
`;

export const Placeholder = styled.div.attrs(named('Placeholder'))`
  text-align: center;
  padding: 60px 20px;
  color: #999;

  p {
    font-size: 18px;
  }
`;

