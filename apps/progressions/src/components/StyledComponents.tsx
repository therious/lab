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

export const SearchBarContainer = styled.div.attrs(named('SearchBarContainer'))`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  
  > div {
    flex: 1;
    margin-bottom: 0;
  }
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

export const SongListItem = styled.li.withConfig({
  shouldForwardProp: (prop) => prop !== '$selected',
})<{ $selected?: boolean }>`
  cursor: pointer;
  padding: 8px 12px !important;
  margin: 4px 0 !important;
  border-radius: 6px;
  background: ${props => props.$selected ? '#e3d5f5' : 'transparent'} !important;
  border: 2px solid ${props => props.$selected ? '#667eea' : 'transparent'} !important;
  border-bottom: ${props => props.$selected ? '2px solid #667eea' : '1px solid #f0f0f0'} !important;
  transition: all 0.2s;
  color: ${props => props.$selected ? '#333' : '#666'} !important;
  
  &:hover {
    background: ${props => props.$selected ? '#e3d5f5' : '#f0f0f0'} !important;
    border-color: ${props => props.$selected ? '#667eea' : '#ccc'} !important;
  }
  
  &:last-child {
    border-bottom: ${props => props.$selected ? '2px solid #667eea' : 'none'} !important;
  }
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
    margin: 0;
    max-height: 400px;
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
  }

  /* Base li styles - SongListItem will override */
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

export const YouTubeSearchContainer = styled.div.attrs(named('YouTubeSearchContainer'))`
  border-top: 2px solid #e0e0e0;
  padding-top: 20px;
  margin-top: 20px;
`;

export const YouTubeSearchHeader = styled.div.attrs(named('YouTubeSearchHeader'))`
  margin-bottom: 15px;

  h4 {
    margin: 0 0 10px 0;
    color: #333;
    font-size: 16px;
  }
`;

export const YouTubeVideoList = styled.div.attrs(named('YouTubeVideoList'))`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
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

export const YouTubeVideoItem = styled.div.attrs(named('YouTubeVideoItem'))`
  display: flex;
  gap: 12px;
  padding: 10px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: transparent;

  &:hover {
    border-color: #667eea;
    background: #f8f9ff;
    transform: translateX(4px);
  }
`;

export const YouTubeThumbnail = styled.img.attrs(named('YouTubeThumbnail'))`
  width: 120px;
  height: 90px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
`;

export const YouTubeVideoInfo = styled.div.attrs(named('YouTubeVideoInfo'))`
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
`;

export const YouTubeVideoTitle = styled.div.attrs(named('YouTubeVideoTitle'))`
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
`;

export const YouTubeVideoChannel = styled.div.attrs(named('YouTubeVideoChannel'))`
  font-size: 12px;
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const YouTubeLoading = styled.div.attrs(named('YouTubeLoading'))`
  text-align: center;
  padding: 20px;
  color: #667eea;
  font-size: 14px;
`;

export const YouTubeError = styled.div.attrs(named('YouTubeError'))`
  padding: 15px;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
  color: #856404;
  font-size: 14px;

  p {
    margin: 0 0 8px 0;

    &:last-child {
      margin-bottom: 0;
    }
  }

  a {
    color: #667eea;
    text-decoration: underline;
  }
`;

export const YouTubeEmpty = styled.div.attrs(named('YouTubeEmpty'))`
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
`;

export const YouTubeVideoEmbed = styled.div.attrs(named('YouTubeVideoEmbed'))`
  border-top: 2px solid #e0e0e0;
  padding-top: 20px;
  margin-top: 20px;

  h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 16px;
  }

  iframe {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

export const YouTubeFallbackButton = styled.button.attrs(named('YouTubeFallbackButton'))`
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    background: linear-gradient(135deg, #cc0000 0%, #990000 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }

  &::before {
    content: '▶';
    font-size: 14px;
  }
`;

