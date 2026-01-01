import React from 'react';
import styled from 'styled-components';

const ProfileContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
`;

const EmailText = styled.span`
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
`;

const StatusBadge = styled.span<{$voted: boolean}>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$voted ? '#d4edda' : '#fff3cd'};
  color: ${props => props.$voted ? '#155724' : '#856404'};
  border: 1px solid ${props => props.$voted ? '#c3e6cb' : '#ffeaa7'};
`;

const StatusIcon = styled.span`
  font-size: 0.85rem;
`;

interface UserProfileProps {
  email: string | null;
  hasVoted: boolean;
}

export function UserProfile({email, hasVoted}: UserProfileProps) {
  if (!email) {
    return null;
  }

  return (
    <ProfileContainer>
      <EmailText>{email}</EmailText>
      <StatusBadge $voted={hasVoted}>
        <StatusIcon>{hasVoted ? '✓' : '○'}</StatusIcon>
        {hasVoted ? 'Voted' : 'Not Voted'}
      </StatusBadge>
    </ProfileContainer>
  );
}

