import React from 'react';
import styled from 'styled-components';

const BrandingLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: white;
  text-decoration: none;
  font-style: italic;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
`;

const BrandingLabel = styled.span`
  vertical-align: top;
  opacity: 0.8;
`;

export interface BrandingProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Netlify deployment badge — shown in the Navbar rightContent slot on deployed builds.
 * Renders nothing when the netlify SVG asset is absent (i.e. in local dev without the asset).
 */
export function NetlifyBranding({ className, style }: BrandingProps) {
  return (
    <BrandingLink
      href="https://www.netlify.com"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
    >
      <BrandingLabel>deployed via</BrandingLabel>
      <img height="18px" src="/netlify/full-logo-dark.svg" alt="Netlify" />
    </BrandingLink>
  );
}
