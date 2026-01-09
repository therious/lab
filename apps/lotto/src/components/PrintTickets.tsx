import React, { useCallback } from 'react';
import type { LotterySummary } from '../utils/summary';
import { AppUrl } from '../lib/AppUrl';
import './PrintTickets.css';

interface PrintTicketsProps {
  summaries: Record<string, LotterySummary[]>;
  onClose: () => void;
}

export function PrintTickets({ summaries, onClose }: PrintTicketsProps) {
  // Handle both key formats: lowercase keys from getAllSummaries or direct game names
  const powerballSummaries = summaries.powerball || summaries.Powerball || [];
  const megamillionsSummaries = summaries.megamillions || summaries['Mega Millions'] || [];
  const lottoSummaries = summaries.lotto || summaries.Lotto || [];
  
  const totalSummaries = powerballSummaries.length + megamillionsSummaries.length + lottoSummaries.length;
  
  if (totalSummaries === 0) {
    return (
      <div className="print-tickets-overlay">
        <div className="print-tickets-modal">
          <h2>No Saved Tickets</h2>
          <p>You need to generate and save at least one prediction before printing.</p>
          <button onClick={onClose} className="print-close-button">Close</button>
        </div>
      </div>
    );
  }

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      <div className="print-tickets-overlay">
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
            <p>Powerball: {powerballSummaries.length} | Mega Millions: {megamillionsSummaries.length} | Lotto: {lottoSummaries.length}</p>
          </div>
        </div>
      </div>
      
      <div className="print-content">
        <div className="print-header">
          <div className="print-app-url">
            <AppUrl showQrCode={true} qrCodeSize={60} />
          </div>
        </div>

        {powerballSummaries.length > 0 && (
          <div className="print-game-section">
            {powerballSummaries.map((summary, index) => (
              <div key={index} className="print-ticket">
                <div className="print-ticket-label">Powerball</div>
                <div className="print-numbers-row">
                  {summary.prediction.numbers.map((num, idx) => (
                    <span key={idx} className="print-number">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {summary.prediction.bonus !== undefined && (
                    <>
                      <span className="print-separator">+</span>
                      <span className="print-number print-bonus">
                        {summary.prediction.bonus.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
                {summary.prediction.handPickedMain && summary.prediction.handPickedMain.length > 0 && (
                  <div className="print-handpicked">
                    Hand-picked: {summary.prediction.handPickedMain.map(n => n.toString().padStart(2, '0')).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {megamillionsSummaries.length > 0 && (
          <div className="print-game-section">
            {megamillionsSummaries.map((summary, index) => (
              <div key={index} className="print-ticket">
                <div className="print-ticket-label">Mega Millions</div>
                <div className="print-numbers-row">
                  {summary.prediction.numbers.map((num, idx) => (
                    <span key={idx} className="print-number">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {summary.prediction.bonus !== undefined && (
                    <>
                      <span className="print-separator">+</span>
                      <span className="print-number print-bonus">
                        {summary.prediction.bonus.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
                {summary.prediction.handPickedMain && summary.prediction.handPickedMain.length > 0 && (
                  <div className="print-handpicked">
                    Hand-picked: {summary.prediction.handPickedMain.map(n => n.toString().padStart(2, '0')).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {lottoSummaries.length > 0 && (
          <div className="print-game-section">
            {lottoSummaries.map((summary, index) => (
              <div key={index} className="print-ticket">
                <div className="print-ticket-label">Lotto</div>
                <div className="print-numbers-row">
                  {summary.prediction.numbers.map((num, idx) => (
                    <span key={idx} className="print-number">
                      {num.toString().padStart(2, '0')}
                    </span>
                  ))}
                  {summary.prediction.bonus !== undefined && (
                    <>
                      <span className="print-separator">+</span>
                      <span className="print-number print-bonus">
                        {summary.prediction.bonus.toString().padStart(2, '0')}
                      </span>
                    </>
                  )}
                </div>
                {summary.prediction.handPickedMain && summary.prediction.handPickedMain.length > 0 && (
                  <div className="print-handpicked">
                    Hand-picked: {summary.prediction.handPickedMain.map(n => n.toString().padStart(2, '0')).join(', ')}
                  </div>
                )}
              </div>
            ))}
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

