import { SearchBar as StyledSearchBar, SearchInput } from './StyledComponents';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search progressions or songs..." }: SearchBarProps) {
  return (
    <StyledSearchBar>
      <SearchInput
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </StyledSearchBar>
  );
}

