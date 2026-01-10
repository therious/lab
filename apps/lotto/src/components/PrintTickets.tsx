import { useCallback, useEffect, useState, useRef } from 'react';
import type { LotterySummary } from '../utils/summary';
import { AppUrl } from '../lib/AppUrl';
import './PrintTickets.css';

interface PrintTicketsProps {
  summaries: Record<string, LotterySummary | null>;
  onClose: () => void;
}

export function PrintTickets({ summaries, onClose }: PrintTicketsProps) {
  const [isMounted, setIsMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  
  // Mount asynchronously to avoid blocking click handler
  useEffect(() => {
    // Use requestAnimationFrame to defer rendering to next frame
    const frameId = requestAnimationFrame(() => {
      // Use setTimeout to ensure it's truly async
      setTimeout(() => {
        setIsMounted(true);
      }, 0);
    });
    
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Get single summary per game (or null if not saved)
  const powerballSummary = summaries.powerball || summaries.Powerball || null;
  const megamillionsSummary = summaries.megamillions || summaries['Mega Millions'] || null;
  const lottoSummary = summaries.lotto || summaries.Lotto || null;
  
  const totalSummaries = (powerballSummary ? 1 : 0) + (megamillionsSummary ? 1 : 0) + (lottoSummary ? 1 : 0);
  
  const handlePrint = useCallback(() => {
    // Defer print to avoid blocking
    requestAnimationFrame(() => {
      try {
        window.print();
      } catch (error) {
        // Silently handle print errors (e.g., if print dialog is blocked)
        console.warn('Print failed:', error);
      }
    });
  }, []);

  const handleClose = useCallback(() => {
    // Clean up any pending operations
    setIsMounted(false);
    // Use setTimeout to ensure cleanup happens after current execution
    setTimeout(() => {
      try {
        onClose();
      } catch (error) {
        // Silently handle cleanup errors (e.g., from browser extensions)
        console.warn('Close handler error:', error);
      }
    }, 0);
  }, [onClose]);

  // Handle click outside to close
  useEffect(() => {
    if (!isMounted) return;
    
    const handleClickOutside = (event: MouseEvent) => {
      if (overlayRef.current && event.target && !overlayRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    
    // Add listeners with a small delay to avoid immediate triggers
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMounted, handleClose]);

  if (totalSummaries === 0) {
    return (
      <div className="print-tickets-overlay" ref={overlayRef}>
        <div className="print-tickets-modal">
          <h2>No Saved Tickets</h2>
          <p>You need to generate and save at least one prediction before printing.</p>
          <button onClick={handleClose} className="print-close-button">Close</button>
        </div>
      </div>
    );
  }

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <div className="print-tickets-overlay" ref={overlayRef}>
        <div className="print-tickets-modal">
          <div className="print-tickets-header">
            <h2>Print Preview</h2>
            <div className="print-tickets-actions">
              <button onClick={handlePrint} className="print-button">
                🖨️ Print
              </button>
              <button onClick={handleClose} className="print-close-button">
                Close
              </button>
            </div>
          </div>
          <div className="print-tickets-info">
            <p>Total tickets: {totalSummaries}</p>
            <p>Powerball: {powerballSummary ? 1 : 0} | Mega Millions: {megamillionsSummary ? 1 : 0} | Lotto: {lottoSummary ? 1 : 0}</p>
          </div>
        </div>
      </div>
      
      <div className="print-content">
        <div className="print-header">
          <div className="print-app-url">
            <AppUrl showQrCode={true} qrCodeSize={60} />
          </div>
        </div>

        {powerballSummary && (
          <div className="print-game-section">
            <div className="print-ticket">
              <div className="print-ticket-label">Powerball</div>
              <div className="print-ticket-content">
                <div className="print-ticket-date">
                  {new Date(powerballSummary.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="print-numbers-row">
                  {powerballSummary.numbers.map((num, idx) => (
                    <span key={idx} className="print-number">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {powerballSummary.bonus !== undefined && (
                    <>
                      <span className="print-separator">+</span>
                      <span className="print-number print-bonus">
                        {powerballSummary.bonus.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {megamillionsSummary && (
          <div className="print-game-section">
            <div className="print-ticket">
              <div className="print-ticket-label">Mega Millions</div>
              <div className="print-ticket-content">
                <div className="print-ticket-date">
                  {new Date(megamillionsSummary.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="print-numbers-row">
                  {megamillionsSummary.numbers.map((num, idx) => (
                    <span key={idx} className="print-number">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {megamillionsSummary.bonus !== undefined && (
                    <>
                      <span className="print-separator">+</span>
                      <span className="print-number print-bonus">
                        {megamillionsSummary.bonus.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {lottoSummary && (
          <div className="print-game-section">
            <div className="print-ticket">
              <div className="print-ticket-label">Lotto</div>
              <div className="print-ticket-content">
                <div className="print-ticket-date">
                  {new Date(lottoSummary.timestamp).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                <div className="print-numbers-row">
                  {lottoSummary.numbers.map((num, idx) => (
                    <span key={idx} className="print-number">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {lottoSummary.bonus !== undefined && (
                    <>
                      <span className="print-separator">+</span>
                      <span className="print-number print-bonus">
                        {lottoSummary.bonus.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="print-footer">
          <p className="print-disclaimer">
            <strong>Disclaimer:</strong> These are predicted numbers based on historical data analysis. 
            Lottery numbers are drawn randomly and each combination has equal probability. 
            For entertainment purposes only.
          </p>
        </div>
      </div>
    </>
  );
}

