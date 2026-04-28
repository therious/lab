import React, { ReactNode } from 'react';
import { NavLink, NavLinkProps } from 'react-router-dom';
import styled from 'styled-components';

// ── Palette ───────────────────────────────────────────────────────────────────

const midnight = '#0b2383';
const linkIdle = '#c5cae9';
const linkActive = '#fff';
const linkActiveBg = '#3949ab';
const linkHoverBg = '#283593';

// ── App shell layout ──────────────────────────────────────────────────────────

export const AppLayout = styled.div`
  display: grid;
  height: 100vh;
  width: 100vw;
  grid-template-rows: 44px minmax(0, 1fr);
  grid-template-areas: "Navbar" "Body";
  box-sizing: border-box;
`;

export const AppBody = styled.main`
  grid-area: Body;
  overflow: hidden;
`;

// ── Nav link ──────────────────────────────────────────────────────────────────

type NavItemProps = NavLinkProps & { $active?: boolean };

export const NavItem = styled(NavLink)<NavItemProps>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: ${p => (p as NavItemProps).$active ? linkActive : linkIdle};
  background: ${p => (p as NavItemProps).$active ? linkActiveBg : 'transparent'};
  text-decoration: none;
  white-space: nowrap;
  &:hover { background: ${linkHoverBg}; color: ${linkActive}; }
`;

// ── Divider ───────────────────────────────────────────────────────────────────

export const NavDivider = styled.div`
  width: 1px;
  height: 20px;
  background: #3949ab;
  margin: 0 8px;
  flex-shrink: 0;
`;

// ── Navbar shell ──────────────────────────────────────────────────────────────

const NavBar = styled.nav`
  grid-area: Navbar;
  background: ${midnight};
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 4px;
  overflow: hidden;
`;

const Title = styled.span`
  color: #e8eaf6;
  font-weight: bold;
  font-size: 15px;
  margin-right: 8px;
  letter-spacing: 0.03em;
  flex-shrink: 0;
`;

const RightSlot = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

// ── Navbar component ──────────────────────────────────────────────────────────

export interface NavbarProps {
  /** Bold title text shown on the left */
  title?: ReactNode;
  /** Nav links and other content placed after the title */
  children?: ReactNode;
  /** Content placed flush to the right (UserProfile, BuildInfo, toggles, …) */
  rightContent?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Navbar({ title, children, rightContent, className, style }: NavbarProps) {
  return (
    <NavBar className={className} style={style}>
      {title && <Title>{title}</Title>}
      {children}
      {rightContent && <RightSlot>{rightContent}</RightSlot>}
    </NavBar>
  );
}
