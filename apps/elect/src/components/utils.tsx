import React from 'react';
import {METHOD_NAME_MAP} from './constants';

export function formatMethodName(method: string): string {
  return METHOD_NAME_MAP[method] || method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}

export function formatWinnersWithOrdering(winners: string[], winnerOrder?: any[]): React.ReactElement {
  if (!winnerOrder || winnerOrder.length === 0) {
    // Fallback to simple list if no ordering available
    return <span>{winners.join(', ')}</span>;
  }
  
  // Build ordered display with tooltips
  const parts: JSX.Element[] = [];
  
  winnerOrder.forEach((orderItem, idx) => {
    if (idx > 0) {
      parts.push(<span key={`sep-${idx}`}>, </span>);
    }
    
    const position = orderItem.position;
    const tied = orderItem.tied;
    const tieType = orderItem.tie_type;
    
    // Determine symbol and tooltip
    let symbol = '';
    let tooltipText = '';
    
    if (tied && tieType) {
      if (tieType === 'statistical') {
        symbol = '';
        // Find all candidates at this position for tooltip
        const tiedCandidates = winnerOrder
          .filter(item => item.position === position)
          .map(item => item.candidate);
        tooltipText = `${tiedCandidates.join(', ')} are statistically tied for ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} place`;
      } else if (tieType === 'peculiar') {
        symbol = '*';
        const tiedCandidates = winnerOrder
          .filter(item => item.position === position)
          .map(item => item.candidate);
        tooltipText = `${tiedCandidates.join(', ')} are tied for ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} place by metrics peculiar to this voting method`;
      } else if (tieType === 'ambiguous') {
        symbol = '†';
        const tiedCandidates = winnerOrder
          .filter(item => item.position === position)
          .map(item => item.candidate);
        tooltipText = `${tiedCandidates.join(', ')} are only effectively tied for ${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} place by this algorithm, having no method with which to order relative to each other`;
      }
    }
    
    // Create tooltip element - numbers and symbols same size, not nested superscript
    const superscriptStyle: React.CSSProperties = {
      fontSize: '0.85em',
      verticalAlign: 'super',
      cursor: tied ? 'help' : 'default',
      textDecoration: tied ? 'underline' : 'none',
      textDecorationStyle: tied ? 'dotted' : 'solid',
      color: tied ? '#0066cc' : 'inherit',
      display: 'inline-block'
    };
    
    parts.push(
      <span key={orderItem.candidate}>
        {orderItem.candidate}
        <sup style={superscriptStyle} title={tied ? tooltipText : undefined}>
          {position}{symbol}
        </sup>
      </span>
    );
  });
  
  return <span>{parts}</span>;
}

export function getStatusColorAndLabel(status: string, isClosed: boolean): {color: string; label: string} {
  const isError = status === 'error';
  const isNoVotes = status === 'no_votes';
  const isConclusive = status === 'conclusive';
  const isInconclusive = status === 'inconclusive';
  
  if (isError) {
    return {color: '#d32f2f', label: 'Error'};
  } else if (isNoVotes) {
    return {color: '#999', label: 'No Votes'};
  } else if (isConclusive) {
    // "Final" only if election is closed, otherwise "Leading"
    return {color: '#2e7d32', label: isClosed ? 'Final' : 'Leading'};
  } else if (isInconclusive) {
    return {color: '#ff9800', label: 'Indeterminate'};
  } else {
    return {color: '#2196f3', label: 'Unknown'};
  }
}

