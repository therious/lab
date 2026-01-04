import React from 'react';
import {BuildInfo} from './BuildInfo';
import {UserProfile} from './UserProfile';

interface UserProfileWidgetProps {
  serverBuildInfo?: any;
  userEmail?: string;
  hasVoted?: boolean;
}

/**
 * Wrapper component that positions BuildInfo and UserProfile together
 * as a right-justified pair. This ensures they stay together and are
 * positioned correctly relative to each other.
 */
export function UserProfileWidget({ serverBuildInfo, userEmail, hasVoted }: UserProfileWidgetProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginLeft: 'auto'
    }}>
      <BuildInfo serverBuildInfo={serverBuildInfo} />
      <UserProfile email={userEmail} hasVoted={hasVoted} />
    </div>
  );
}
