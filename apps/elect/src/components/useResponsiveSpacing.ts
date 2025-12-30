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
const REJECT_BORDER_HEIGHT = 3;
const REJECT_PADDING = 16;

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
      const bandGapsHeight = (totalBands - 1) * DEFAULT_BAND_GAP;
      const candidateGapsHeight = totalCandidates * DEFAULT_CANDIDATE_GAP;
      const bandPaddingHeight = totalBands * DEFAULT_BAND_PADDING * 2;
      const candidatePaddingHeight = totalCandidates * DEFAULT_CANDIDATE_PADDING * 2;
      const rejectBorderHeight = REJECT_BORDER_HEIGHT + REJECT_PADDING;

      let requiredHeight = labelHeight + candidateAreaHeight + bandGapsHeight + 
                          candidateGapsHeight + bandPaddingHeight + candidatePaddingHeight + rejectBorderHeight;

      let bandGap = DEFAULT_BAND_GAP;
      let candidateGap = DEFAULT_CANDIDATE_GAP;
      let bandPadding = DEFAULT_BAND_PADDING;
      let candidatePadding = DEFAULT_CANDIDATE_PADDING;
      let horizontal = false;

      // If we need more space, reduce gaps first
      if (requiredHeight > availableHeight) {
        const deficit = requiredHeight - availableHeight;
        const reducibleGaps = (totalBands - 1) * (DEFAULT_BAND_GAP - MIN_BAND_GAP);
        
        if (deficit <= reducibleGaps) {
          bandGap = Math.max(MIN_BAND_GAP, DEFAULT_BAND_GAP - Math.ceil(deficit / (totalBands - 1)));
          requiredHeight = labelHeight + candidateAreaHeight + (totalBands - 1) * bandGap + 
                          candidateGapsHeight + bandPaddingHeight + candidatePaddingHeight + rejectBorderHeight;
        } else {
          bandGap = MIN_BAND_GAP;
          const remainingDeficit = deficit - reducibleGaps;
          
          // Reduce candidate gaps
          const reducibleCandidateGaps = totalCandidates * (DEFAULT_CANDIDATE_GAP - MIN_CANDIDATE_GAP);
          if (remainingDeficit <= reducibleCandidateGaps) {
            candidateGap = Math.max(MIN_CANDIDATE_GAP, DEFAULT_CANDIDATE_GAP - Math.ceil(remainingDeficit / totalCandidates));
            requiredHeight = labelHeight + candidateAreaHeight + (totalBands - 1) * bandGap + 
                            totalCandidates * candidateGap + bandPaddingHeight + candidatePaddingHeight + rejectBorderHeight;
          } else {
            candidateGap = MIN_CANDIDATE_GAP;
            const stillRemaining = remainingDeficit - reducibleCandidateGaps;
            
            // Reduce padding
            const reducibleBandPadding = totalBands * (DEFAULT_BAND_PADDING - MIN_BAND_PADDING) * 2;
            const reducibleCandidatePadding = totalCandidates * (DEFAULT_CANDIDATE_PADDING - MIN_CANDIDATE_PADDING) * 2;
            const totalReduciblePadding = reducibleBandPadding + reducibleCandidatePadding;
            
            if (stillRemaining <= totalReduciblePadding) {
              const bandPaddingReduction = Math.min(
                stillRemaining / 2,
                reducibleBandPadding
              );
              const candidatePaddingReduction = stillRemaining - bandPaddingReduction;
              
              bandPadding = Math.max(
                MIN_BAND_PADDING,
                DEFAULT_BAND_PADDING - Math.ceil(bandPaddingReduction / (totalBands * 2))
              );
              candidatePadding = Math.max(
                MIN_CANDIDATE_PADDING,
                DEFAULT_CANDIDATE_PADDING - Math.ceil(candidatePaddingReduction / (totalCandidates * 2))
              );
              requiredHeight = labelHeight + candidateAreaHeight + (totalBands - 1) * bandGap + 
                              totalCandidates * candidateGap + totalBands * bandPadding * 2 + 
                              totalCandidates * candidatePadding * 2 + rejectBorderHeight;
            } else {
              bandPadding = MIN_BAND_PADDING;
              candidatePadding = MIN_CANDIDATE_PADDING;
              
              // Check if horizontal layout would help
              const estimatedHorizontalWidth = totalCandidates * 150; // rough estimate
              if (availableWidth > estimatedHorizontalWidth) {
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

