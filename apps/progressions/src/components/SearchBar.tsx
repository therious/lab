import { SearchBar as StyledSearchBar, SearchInput, ClearButton } from './StyledComponents';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onClear, placeholder = "Search progressions or songs..." }: SearchBarProps) {
  return (
    <StyledSearchBar>
      <SearchInput
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        $hasClear={value.length > 0}
      />
      {value.length > 0 && (
        <ClearButton onClick={onClear} aria-label="Clear search">
          ×
        </ClearButton>
      )}
    </StyledSearchBar>
  );
}

