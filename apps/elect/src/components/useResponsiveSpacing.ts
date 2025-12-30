import {useState, useEffect, useRef} from 'react';

interface SpacingConfig {
  bandGap: number;
  bandPadding: number;
  candidateGap: number;
  candidatePadding: number;
  candidateHeight: number;
  horizontal: boolean;
}

const CANDIDATE_HEIGHT = 48;
const MIN_BAND_GAP = 1;
const MIN_CANDIDATE_GAP = 2;
const MIN_BAND_PADDING = 2;
const MIN_CANDIDATE_PADDING = 2;
const DEFAULT_BAND_GAP = 8;
const DEFAULT_CANDIDATE_GAP = 4;
const DEFAULT_BAND_PADDING = 8;
const DEFAULT_CANDIDATE_PADDING = 12;
const BAND_LABEL_HEIGHT = 24;
const GROUP_LABEL_HEIGHT = 24;
const REJECT_BORDER_HEIGHT = 0; // Removed border
const REJECT_PADDING = 0; // Removed padding, gap will handle spacing

export function useResponsiveSpacing(
  containerRef: React.RefObject<HTMLDivElement>,
  totalCandidates: number,
  totalBands: number
): SpacingConfig {
  const [config, setConfig] = useState<SpacingConfig>({
    bandGap: DEFAULT_BAND_GAP,
    bandPadding: DEFAULT_BAND_PADDING,
    candidateGap: DEFAULT_CANDIDATE_GAP,
    candidatePadding: DEFAULT_CANDIDATE_PADDING,
    candidateHeight: CANDIDATE_HEIGHT,
    horizontal: false,
  });

  useEffect(() => {
    const calculateSpacing = () => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const availableHeight = container.clientHeight;
      const availableWidth = container.clientWidth;

      // Calculate required height
      const labelHeight = GROUP_LABEL_HEIGHT + BAND_LABEL_HEIGHT * totalBands;
      const candidateAreaHeight = totalCandidates * CANDIDATE_HEIGHT;
      const candidateGapsHeight = totalCandidates * DEFAULT_CANDIDATE_GAP;
      const bandPaddingHeight = totalBands * DEFAULT_BAND_PADDING * 2;
      const candidatePaddingHeight = totalCandidates * DEFAULT_CANDIDATE_PADDING * 2;
      
      // Include gap between approve and reject groups in band gaps calculation
      // There are (totalBands - 1) gaps between bands, plus 1 gap between approve and reject groups
      const bandGapsHeight = totalBands * DEFAULT_BAND_GAP;

      let requiredHeight = labelHeight + candidateAreaHeight + bandGapsHeight + 
                          candidateGapsHeight + bandPaddingHeight + candidatePaddingHeight;

      let bandGap = DEFAULT_BAND_GAP;
      let candidateGap = DEFAULT_CANDIDATE_GAP;
      let bandPadding = DEFAULT_BAND_PADDING;
      let candidatePadding = DEFAULT_CANDIDATE_PADDING;
      let horizontal = false;

      // If we need more space, reduce gaps first
      if (requiredHeight > availableHeight) {
        const deficit = requiredHeight - availableHeight;
        const reducibleGaps = totalBands * (DEFAULT_BAND_GAP - MIN_BAND_GAP);
        
        if (deficit <= reducibleGaps) {
          // Distribute deficit across all gaps (including gap between approve and reject groups)
          const gapReduction = Math.ceil(deficit / totalBands);
          bandGap = Math.max(MIN_BAND_GAP, DEFAULT_BAND_GAP - gapReduction);
          requiredHeight = labelHeight + candidateAreaHeight + totalBands * bandGap + 
                          candidateGapsHeight + bandPaddingHeight + candidatePaddingHeight;
        } else {
          bandGap = MIN_BAND_GAP;
          const remainingDeficit = deficit - reducibleGaps;
          
          // Recalculate required height with minimum gaps
          requiredHeight = labelHeight + candidateAreaHeight + totalBands * bandGap + 
                          candidateGapsHeight + bandPaddingHeight + candidatePaddingHeight;
          
          // Reduce candidate gaps
          const reducibleCandidateGaps = totalCandidates * (DEFAULT_CANDIDATE_GAP - MIN_CANDIDATE_GAP);
          if (remainingDeficit <= reducibleCandidateGaps) {
            const candidateGapReduction = Math.ceil(remainingDeficit / totalCandidates);
            candidateGap = Math.max(MIN_CANDIDATE_GAP, DEFAULT_CANDIDATE_GAP - candidateGapReduction);
            requiredHeight = labelHeight + candidateAreaHeight + totalBands * bandGap + 
                            totalCandidates * candidateGap + bandPaddingHeight + candidatePaddingHeight;
          } else {
            candidateGap = MIN_CANDIDATE_GAP;
            const stillRemaining = remainingDeficit - reducibleCandidateGaps;
            
            // Recalculate required height with minimum candidate gaps
            requiredHeight = labelHeight + candidateAreaHeight + totalBands * bandGap + 
                            totalCandidates * candidateGap + bandPaddingHeight + candidatePaddingHeight;
            
            // Reduce padding
            const reducibleBandPadding = totalBands * (DEFAULT_BAND_PADDING - MIN_BAND_PADDING) * 2;
            const reducibleCandidatePadding = totalCandidates * (DEFAULT_CANDIDATE_PADDING - MIN_CANDIDATE_PADDING) * 2;
            const totalReduciblePadding = reducibleBandPadding + reducibleCandidatePadding;
            
            if (stillRemaining <= totalReduciblePadding) {
              // Distribute padding reduction proportionally
              const bandPaddingRatio = reducibleBandPadding / totalReduciblePadding;
              const candidatePaddingRatio = reducibleCandidatePadding / totalReduciblePadding;
              
              const bandPaddingReduction = stillRemaining * bandPaddingRatio;
              const candidatePaddingReduction = stillRemaining * candidatePaddingRatio;
              
              bandPadding = Math.max(
                MIN_BAND_PADDING,
                DEFAULT_BAND_PADDING - Math.ceil(bandPaddingReduction / (totalBands * 2))
              );
              candidatePadding = Math.max(
                MIN_CANDIDATE_PADDING,
                DEFAULT_CANDIDATE_PADDING - Math.ceil(candidatePaddingReduction / (totalCandidates * 2))
              );
              requiredHeight = labelHeight + candidateAreaHeight + totalBands * bandGap + 
                              totalCandidates * candidateGap + totalBands * bandPadding * 2 + 
                              totalCandidates * candidatePadding * 2;
            } else {
              bandPadding = MIN_BAND_PADDING;
              candidatePadding = MIN_CANDIDATE_PADDING;
              
              // Recalculate required height with minimum padding
              requiredHeight = labelHeight + candidateAreaHeight + totalBands * bandGap + 
                              totalCandidates * candidateGap + totalBands * bandPadding * 2 + 
                              totalCandidates * candidatePadding * 2;
              
              // Check if horizontal layout would help
              const estimatedHorizontalWidth = totalCandidates * 150; // rough estimate
              if (availableWidth > estimatedHorizontalWidth && requiredHeight > availableHeight) {
                horizontal = true;
              }
            }
          }
        }
      }

      setConfig({
        bandGap,
        bandPadding,
        candidateGap,
        candidatePadding,
        candidateHeight: CANDIDATE_HEIGHT,
        horizontal,
      });
    };

    calculateSpacing();
    
    const resizeObserver = new ResizeObserver(calculateSpacing);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, totalCandidates, totalBands]);

  return config;
}

