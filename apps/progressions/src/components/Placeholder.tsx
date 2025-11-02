import { Placeholder as StyledPlaceholder } from './StyledComponents';

interface PlaceholderProps {
  message?: string;
}

export function Placeholder({ message = "Select a progression from the list to begin" }: PlaceholderProps) {
  return (
    <StyledPlaceholder>
      <p>{message}</p>
    </StyledPlaceholder>
  );
}

