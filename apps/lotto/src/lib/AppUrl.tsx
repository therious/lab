import React, { useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styled from 'styled-components';

const Container = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  font-size: 0.85rem;
`;

const UrlText = styled.div`
  color: #333;
  word-break: break-all;
  text-align: left;
`;

const QrCodeContainer = styled.div`
  display: inline-block;
  padding: 0.5rem;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

interface AppUrlProps {
  className?: string;
  style?: React.CSSProperties;
  showQrCode?: boolean;
  qrCodeSize?: number;
}

/**
 * Generic component to display the application URL (protocol, hostname, port only)
 * Can be used in print layouts
 */
export function AppUrl({ className, style, showQrCode = true, qrCodeSize = 100 }: AppUrlProps) {
  const [isReady, setIsReady] = useState(false);
  
  const appUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    
    const { protocol, hostname, port } = window.location;
    
    // Build URL with protocol, hostname, and port (if not default)
    let url = `${protocol}//${hostname}`;
    
    // Only add port if it's not the default port for the protocol
    if (port) {
      const isDefaultPort = 
        (protocol === 'http:' && port === '80') ||
        (protocol === 'https:' && port === '443');
      
      if (!isDefaultPort) {
        url += `:${port}`;
      }
    }
    
    return url;
  }, []);

  // Defer QR code rendering to avoid blocking
  useEffect(() => {
    if (showQrCode && appUrl) {
      const timeoutId = setTimeout(() => {
        setIsReady(true);
      }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      setIsReady(true);
    }
  }, [showQrCode, appUrl]);

  if (!appUrl) {
    return null;
  }

  return (
    <Container className={className} style={style}>
      {showQrCode && isReady && (
        <QrCodeContainer>
          <QRCodeSVG value={appUrl} size={qrCodeSize} level="M" />
        </QrCodeContainer>
      )}
      <UrlText>{appUrl}</UrlText>
    </Container>
  );
}

