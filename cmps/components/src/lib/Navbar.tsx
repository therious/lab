import React, { ReactNode } from 'react';
import { NavLink, NavLinkProps } from 'react-router-dom';
import styled from 'styled-components';
import { useBuildInfoTooltip } from './BuildInfo';
import { NetlifyBranding } from './Branding';

// ── Palette ───────────────────────────────────────────────────────────────────

const midnight = '#0b2383';
const linkIdle = '#c5cae9';
const linkActive = '#fff';
const linkActiveBg = '#3949ab';
const linkHoverBg = '#283593';

// ── App shell layout ──────────────────────────────────────────────────────────

export const AppLayout = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const AppBody = styled.main`
  flex: 1;
  min-height: 0;
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

// ── Disabled nav item (no access) ────────────────────────────────────────────

export const NavItemDisabled = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #4a5080;
  text-decoration: none;
  white-space: nowrap;
  cursor: not-allowed;
  user-select: none;
`;

// ── Toggle switch ─────────────────────────────────────────────────────────────

const ToggleWrapper = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  flex-shrink: 0;
`;

const ToggleLabel = styled.span`
  color: ${linkIdle};
  font-size: 12px;
  user-select: none;
`;

const ToggleTrack = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  width: 32px;
  height: 17px;
  border-radius: 9px;
  padding: 2px;
  box-sizing: border-box;
  background: ${p => p.$on ? '#4caf50' : 'rgba(255,255,255,0.18)'};
  transition: background 0.18s;
  flex-shrink: 0;
`;

const ToggleThumb = styled.span<{ $on: boolean }>`
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: ${p => p.$on ? '#fff' : '#9fa8da'};
  transition: transform 0.18s, background 0.18s;
  transform: translateX(${p => p.$on ? '15px' : '0'});
`;

export interface NavToggleProps {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}

export function NavToggle({ on, onClick, children }: NavToggleProps) {
  return (
    <ToggleWrapper onClick={onClick}>
      <ToggleLabel>{children}</ToggleLabel>
      <ToggleTrack $on={on}>
        <ToggleThumb $on={on} />
      </ToggleTrack>
    </ToggleWrapper>
  );
}

// ── Navbar shell ──────────────────────────────────────────────────────────────

const NavBar = styled.nav`
  flex-shrink: 0;
  background: ${midnight};
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 4px;
  overflow: hidden;
  box-sizing: border-box;
`;

const Title = styled.div`
  color: #e8eaf6;
  font-weight: bold;
  font-size: 15px;
  margin-right: 8px;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  cursor: default;
`;

// BrandingSlot: flex:1 so it fills the gap between nav links and rightContent.
// When rightContent is present it centers within that gap; otherwise it right-justifies.
const BrandingSlot = styled.div<{ $hasRight: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: ${p => p.$hasRight ? 'center' : 'flex-end'};
  min-width: 0;
`;

const RightSlot = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`;

// ── Navbar component ──────────────────────────────────────────────────────────

export interface NavbarProps {
  /** Bold title text shown on the left */
  title?: ReactNode;
  /** When provided, hovering the title reveals the BuildInfo tooltip */
  buildInfo?: Parameters<typeof useBuildInfoTooltip>[0];
  /** Nav links and other content placed after the title */
  children?: ReactNode;
  /** Show the Netlify deployment badge. Centered when rightContent is present, right-justified otherwise. */
  branding?: boolean;
  /** Content placed flush to the right (UserBadge, toggles, …) */
  rightContent?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Navbar({ title, buildInfo, children, branding, rightContent, className, style }: NavbarProps) {
  const { containerRef, tooltipProps, tooltip } = useBuildInfoTooltip(buildInfo);
  return (
    <NavBar className={className} style={style}>
      {title && (
        <Title ref={containerRef} {...(buildInfo ? tooltipProps : {})}>
          {title}
          {tooltip}
        </Title>
      )}
      {children}
      {branding && <BrandingSlot $hasRight={!!rightContent}><NetlifyBranding /></BrandingSlot>}
      {rightContent && <RightSlot>{rightContent}</RightSlot>}
    </NavBar>
  );
}
