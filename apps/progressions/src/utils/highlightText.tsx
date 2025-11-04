import React from 'react';

interface HighlightTextProps {
  text: string;
  searchTerm: string;
}

export function HighlightText({ text, searchTerm }: HighlightTextProps) {
  if (!searchTerm.trim()) {
    return <>{text}</>;
  }

  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        // When splitting with a capturing group in the regex, the matches are included
        // in the result array. We can identify matches by testing if they match the regex
        if (!part) {
          return null;
        }
        
        // Create a new regex for each test to avoid state issues
        const testRegex = new RegExp(`^${escapedTerm}$`, 'i');
        const isMatch = testRegex.test(part);
        
        return isMatch ? (
          <mark key={index} style={{ backgroundColor: '#ffeb3b', padding: '0 2px', borderRadius: '2px' }}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        );
      })}
    </>
  );
}

