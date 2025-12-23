import React from 'react';
import { getDictionaryWords } from '../roots/loadDictionary';

// Single-line renderer: displays all examples on one line
// AG Grid passes params object with data property
export const ExamplesCellRendererSingleLine = (params) => {
  const data = params?.data || params;
  if (!data || !data.id) {
    return <span></span>;
  }

  const words = getDictionaryWords(data.id);
  
  if (words.length === 0) {
    return <span style={{ color: '#888' }}>—</span>;
  }

  // Format: Hebrew (part of speech): English
  const formatted = words.map(word => {
    const partOfSpeech = word.t ? ` (${word.t})` : '';
    return `${word.h}${partOfSpeech}: ${word.e}`;
  }).join(' | ');

  return (
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
      {formatted}
    </span>
  );
};

// Multi-line renderer: displays each example on a separate line
// AG Grid passes params object with data property
export const ExamplesCellRendererMultiLine = (params) => {
  const data = params?.data || params;
  if (!data || !data.id) {
    return <span></span>;
  }

  const words = getDictionaryWords(data.id);
  
  if (words.length === 0) {
    return <span style={{ color: '#888' }}>—</span>;
  }

  return (
    <div style={{ lineHeight: '1.4', padding: '2px 0' }}>
      {words.map((word, index) => {
        const partOfSpeech = word.t ? ` (${word.t})` : '';
        return (
          <div key={index} style={{ marginBottom: index < words.length - 1 ? '4px' : '0' }}>
            {word.h}{partOfSpeech}: {word.e}
          </div>
        );
      })}
    </div>
  );
};

