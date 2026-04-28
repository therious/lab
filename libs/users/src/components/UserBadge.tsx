import React, { useState, useEffect } from 'react';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import styled from 'styled-components';
import { signout } from '../auth';
import { hashColor } from './avatar-utils';
import { avatarBlobCache, fetchAvatarBlob } from './avatar-cache';

// ── Styles ────────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px 3px 4px;
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  &:hover { background: rgba(255,255,255,0.12); }
`;

const DisplayName = styled.span`
  font-size: 13px;
  color: #c5cae9;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SignoutPopup = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background: #1a237e;
  border: 1px solid #3949ab;
  border-radius: 6px;
  padding: 4px;
  z-index: 10000;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
`;

const SignoutBtn = styled.button`
  display: block;
  width: 100%;
  padding: 6px 14px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: #e8eaf6;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  &:hover { background: #3949ab; }
`;

// ── Avatar (photo or initial) ─────────────────────────────────────────────────

interface AvatarMiniProps {
  uid: string;
  photoURL: string | null;
  email: string;
  displayName: string;
  size?: number;
}

const AvatarMini = ({ uid, photoURL, email, displayName, size = 26 }: AvatarMiniProps) => {
  const [imgSrc, setImgSrc] = useState<string | null>(() =>
    photoURL ? (avatarBlobCache.get(uid) ?? photoURL) : null
  );

  useEffect(() => {
    if (!photoURL) { setImgSrc(null); return; }
    if (avatarBlobCache.has(uid)) { setImgSrc(avatarBlobCache.get(uid)!); return; }
    fetchAvatarBlob(uid, photoURL).then(url => { if (url) setImgSrc(url); });
  }, [uid, photoURL]);

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt=""
        style={{ width: size, height: size, borderRadius: '50%', display: 'block', flexShrink: 0 }}
        onError={() => {
          if (photoURL) fetchAvatarBlob(uid, photoURL).then(url => { if (url) setImgSrc(url); });
          setImgSrc(avatarBlobCache.get(uid) ?? null);
        }}
      />
    );
  }

  const label = (displayName || email || '?')[0].toUpperCase();
  const bg    = hashColor(email);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.46), flexShrink: 0,
    }}>
      {label}
    </div>
  );
};

// ── UserProfile ───────────────────────────────────────────────────────────────

export interface UserBadgeProps {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  auth: Auth;
  db: Firestore;
}

export function UserBadge({ uid, email, displayName, photoURL, auth, db }: UserBadgeProps) {
  const [open, setOpen] = useState(false);

  const handleSignout = (e: React.MouseEvent) => {
    e.stopPropagation();
    signout(auth, db);
  };

  return (
    <Wrap
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <AvatarMini uid={uid} photoURL={photoURL} email={email} displayName={displayName} />
      <DisplayName>{displayName || email}</DisplayName>
      {open && (
        <SignoutPopup>
          <SignoutBtn onClick={handleSignout}>Sign out</SignoutBtn>
        </SignoutPopup>
      )}
    </Wrap>
  );
}
