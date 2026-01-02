import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import styled from 'styled-components';
import {actions} from '../actions-integration';

const ProfileContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-left: auto;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e9ecef;
  }
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

const LogoutButton = styled.button`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  transition: background 0.2s;

  &:hover {
    background: #c82333;
  }
`;

interface UserProfileProps {
  email: string | null;
  hasVoted: boolean;
}

export function UserProfile({email, hasVoted}: UserProfileProps) {
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();

  if (!email) {
    return null;
  }

  const handleLogout = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    // Dispatch logout action - middleware will clear sessionStorage
    actions.election.logout();
    // Navigate after logout
    navigate('/');
  };

  return (
    <ProfileContainer
      onMouseEnter={() => setShowLogout(true)}
      onMouseLeave={() => setShowLogout(false)}
      onClick={handleLogout}
      title="Click to log out securely"
    >
      <EmailText>{email}</EmailText>
      <StatusBadge $voted={hasVoted}>
        <StatusIcon>{hasVoted ? '✓' : '○'}</StatusIcon>
        {hasVoted ? 'Voted' : 'Not Voted'}
      </StatusBadge>
      {showLogout && (
        <LogoutButton onClick={handleLogout}>
          Log Out Securely
        </LogoutButton>
      )}
    </ProfileContainer>
  );
}

