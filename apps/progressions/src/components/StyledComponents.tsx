import styled from 'styled-components';

export const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
`;

export const AppHeader = styled.header`
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

export const AppContent = styled.div`
  display: flex;
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

export const Panel = styled.div`
  flex: 1;
  min-width: 400px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

export const SearchBar = styled.div`
  margin-bottom: 20px;
`;

export const SearchInput = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

export const ProgressionList = styled.div`
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

export const ProgressionItem = styled.div<{ $selected?: boolean }>`
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

export const ProgressionName = styled.div`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
`;

export const ProgressionChords = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
`;

export const ChordBadge = styled.span`
  background: #667eea;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
`;

export const ProgressionKey = styled.div`
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
`;

export const ProgressionSongs = styled.div`
  color: #888;
  font-size: 13px;
`;

export const PlayerControls = styled.div`
  margin-bottom: 30px;
`;

export const PlayButton = styled.button`
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

export const ControlGroup = styled.div`
  margin-top: 20px;

  label {
    display: block;
    margin-bottom: 10px;
    color: #333;
    font-weight: 500;
  }
`;

export const Select = styled.select`
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

export const TempoSlider = styled.input.attrs({ type: 'range' })`
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

export const ChordDisplay = styled.div`
  margin-bottom: 30px;

  h3 {
    margin: 0 0 20px 0;
    color: #333;
  }
`;

export const ChordProgression = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
`;

export const ChordBox = styled.div<{ $active?: boolean }>`
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

export const ChordRoman = styled.div<{ $active?: boolean }>`
  font-size: 24px;
  font-weight: bold;
  color: ${props => props.$active ? 'white' : '#333'};
  margin-bottom: 5px;
`;

export const ChordName = styled.div<{ $active?: boolean }>`
  font-size: 14px;
  color: ${props => props.$active ? 'rgba(255, 255, 255, 0.9)' : '#666'};
  font-weight: normal;
`;

export const ProgressionInfo = styled.div`
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

export const Placeholder = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #999;

  p {
    font-size: 18px;
  }
`;

