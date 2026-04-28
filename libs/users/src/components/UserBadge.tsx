import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useUsersCtx } from '../context';
import { signout } from '../auth';
import { hashColor } from './avatar-utils';
import { avatarBlobCache, fetchAvatarBlob } from './avatar-cache';

// ── Popup (fixed-position to escape any parent overflow:hidden) ───────────────

const PopupFixed = styled.div<{ $top: number; $right: number }>`
  position: fixed;
  top: ${p => p.$top}px;
  right: ${p => p.$right}px;
  background: #1a237e;
  border: 1px solid #3949ab;
  border-radius: 6px;
  padding: 10px 14px 6px;
  z-index: 10000;
  min-width: 180px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
`;

const PopupLabel = styled.div`
  font-size: 10px;
  color: #7986cb;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
`;

const PopupName = styled.div`
  font-size: 13px;
  color: #e8eaf6;
  font-weight: 500;
  margin-bottom: 2px;
  word-break: break-all;
`;

const PopupEmail = styled.div`
  font-size: 12px;
  color: #9fa8da;
  margin-bottom: 8px;
  word-break: break-all;
`;

const PopupDivider = styled.div`
  height: 1px;
  background: #3949ab;
  margin: 0 -14px 6px;
`;

const SignoutBtn = styled.button`
  display: block;
  width: calc(100% + 28px);
  margin: 0 -14px -6px;
  padding: 7px 14px;
  background: transparent;
  border: none;
  border-radius: 0 0 6px 6px;
  color: #e8eaf6;
  font-size: 13px;
  cursor: pointer;
  text-align: left;
  &:hover { background: #3949ab; }
`;

// ── Wrap ──────────────────────────────────────────────────────────────────────

const Wrap = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s;
  flex-shrink: 0;
  &:hover { background: rgba(255,255,255,0.15); }
`;

// ── Avatar ────────────────────────────────────────────────────────────────────

interface AvatarMiniProps {
  uid: string;
  photoURL: string | null;
  email: string;
  displayName: string;
  size?: number;
}

const AvatarMini = ({ uid, photoURL, email, displayName, size = 28 }: AvatarMiniProps) => {
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

// ── UserBadge ─────────────────────────────────────────────────────────────────

export function UserBadge() {
  const { auth, db, useSelector } = useUsersCtx();
  const me = useSelector((s: any) => s.chat.me);

  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState<{ top: number; right: number }>({ top: 0, right: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  if (!me) return null;

  const { uid, email, displayName, photoURL } = me;

  const showPopup = () => {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setOpen(true);
  };

  const handleSignout = (e: React.MouseEvent) => {
    e.stopPropagation();
    signout(auth, db);
  };

  return (
    <Wrap ref={wrapRef} onMouseEnter={showPopup} onMouseLeave={() => setOpen(false)}>
      <AvatarMini uid={uid} photoURL={photoURL ?? null} email={email} displayName={displayName} />
      {open && (
        <PopupFixed $top={pos.top} $right={pos.right}>
          <PopupLabel>Signed in as</PopupLabel>
          {displayName && <PopupName>{displayName}</PopupName>}
          <PopupEmail>{email}</PopupEmail>
          <PopupDivider />
          <SignoutBtn onClick={handleSignout}>Sign out</SignoutBtn>
        </PopupFixed>
      )}
    </Wrap>
  );
}
