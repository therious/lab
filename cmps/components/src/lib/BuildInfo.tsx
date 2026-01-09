import React from 'react';
import styled from 'styled-components';
import { dateTimeToLocal } from '@therious/utils';
import { useTooltip } from './useTooltip';

interface BuildInfoData {
  commitHash: string;
  branch: string;
  authoredDate: string;
  committedDate: string;
  builtDate: string;
  mnemonic?: string;
}

interface BuildInfoProps {
  buildInfo?: BuildInfoData | null;
  className?: string;
  style?: React.CSSProperties;
}

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #dee2e6;
  font-size: 10px;
  color: #666;
  font-family: monospace;
  line-height: 1.2;
  position: relative;
  cursor: help;
`;

const WidgetLine = styled.div`
  &:last-child {
    color: #999;
  }
`;

const MnemonicText = styled.span`
  color: darkcyan;
`;

const TooltipTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TooltipLabelCell = styled.td`
  text-align: right;
  padding-right: 0.75rem;
  padding-bottom: 0.25rem;
`;

const TooltipValueCell = styled.td`
  text-align: left;
  padding-bottom: 0.25rem;
  font-family: monospace;
`;

const GreyText = styled.span`
  color: #999;
`;

const TooltipValueCellLast = styled(TooltipValueCell)`
  padding-bottom: 0;
`;

interface DateDisplayParts {
  identical: string; // Portion that's identical to previous (shown in grey)
  different: string; // Portion that's different (shown in normal color)
  isFullyIdentical: boolean; // If entire date is identical
}

/**
 * Format a date string for display with grey highlighting for identical portions
 * Returns date in yyyy-mm-dd HH:MM:SS format (local time)
 * Identical portions are returned separately to be rendered in grey
 */
function formatDateForDisplay(
  dateStr: string,
  previousDateStr: string | null
): DateDisplayParts {
  const fullDateStr = dateTimeToLocal(dateStr);

  if (!previousDateStr) {
    // First date - show full date and time (no grey portions)
    return {
      identical: '',
      different: fullDateStr,
      isFullyIdentical: false
    };
  }

  const prevFormatted = dateTimeToLocal(previousDateStr);

  // If dates are exactly the same (identical strings), show full string in grey
  if (fullDateStr === prevFormatted) {
    return {
      identical: fullDateStr,
      different: '',
      isFullyIdentical: true
    };
  }

  // Check if same date by splitting on space and comparing date portion
  const [currentDatePart, currentTimePart] = fullDateStr.split(' ');
  const [prevDatePart] = prevFormatted.split(' ');

  // If same date (different time), show date in grey, time in normal
  if (currentDatePart === prevDatePart) {
    return {
      identical: currentDatePart + ' ',
      different: currentTimePart,
      isFullyIdentical: false
    };
  }

  // Different date - find common prefix character by character
  let commonPrefix = '';
  const minLength = Math.min(fullDateStr.length, prevFormatted.length);
  for (let i = 0; i < minLength; i++) {
    if (fullDateStr[i] === prevFormatted[i]) {
      commonPrefix += fullDateStr[i];
    } else {
      break;
    }
  }

  // If there's a common prefix, show it in grey
  if (commonPrefix.length > 0) {
    return {
      identical: commonPrefix,
      different: fullDateStr.substring(commonPrefix.length),
      isFullyIdentical: false
    };
  }

  // No common prefix - show full string in normal color
  return {
    identical: '',
    different: fullDateStr,
    isFullyIdentical: false
  };
}

/**
 * Format mnemonic: wrap in double quotes and replace hyphens with spaces
 */
function formatMnemonic(mnemonic: string): string {
  return `${mnemonic.replace(/-/g, ' ')}`;
}

/**
 * BuildInfo component displays build information (commit hash, branch, dates)
 *
 * This component is designed to be reusable across all UI-only applications.
 *
 * Styled to match UserProfile widget: same height, padding, background, border-radius, border
 * Positioned on the right side, just before UserProfile widget with small gap
 *
 * @param buildInfo - Optional build info data. If not provided, component will try to import from '../build-info.json'
 * @param className - Optional CSS class name
 * @param style - Optional inline styles
 */
export function BuildInfo({ buildInfo: buildInfoProp, className, style }: BuildInfoProps) {
  // Format dates (use empty strings if buildInfo not available)
  const authoredParts = buildInfoProp ? formatDateForDisplay(buildInfoProp.authoredDate, null) : { identical: '', different: '', isFullyIdentical: false };
  const committedParts = buildInfoProp ? formatDateForDisplay(
    buildInfoProp.committedDate,
    buildInfoProp.authoredDate
  ) : { identical: '', different: '', isFullyIdentical: false };
  const builtParts = buildInfoProp ? formatDateForDisplay(
    buildInfoProp.builtDate,
    buildInfoProp.committedDate
  ) : { identical: '', different: '', isFullyIdentical: false };

  // Format mnemonic
  const formattedMnemonic = buildInfoProp?.mnemonic ? formatMnemonic(buildInfoProp.mnemonic) : null;

  // Tooltip content (conditionally rendered based on buildInfoProp)
  const tooltipContent = buildInfoProp ? (
    <>
      <TooltipTable>
        <tbody>

        {formattedMnemonic && (
          <tr>
            <TooltipLabelCell>Mnemonic:</TooltipLabelCell>
            <TooltipValueCell><MnemonicText>{formattedMnemonic}</MnemonicText></TooltipValueCell>
          </tr>
        )}
        <tr>
          <TooltipLabelCell>Hash:</TooltipLabelCell>
          <TooltipValueCell>{buildInfoProp.commitHash}</TooltipValueCell>
        </tr>
        <tr>
          <TooltipLabelCell>Branch:</TooltipLabelCell>
          <TooltipValueCell>{buildInfoProp.branch}</TooltipValueCell>
        </tr>
        <tr>
          <TooltipLabelCell>Authored:</TooltipLabelCell>
          <TooltipValueCell>
            {authoredParts.identical && <GreyText>{authoredParts.identical}</GreyText>}
            {authoredParts.different}
          </TooltipValueCell>
        </tr>
        <tr>
          <TooltipLabelCell>Committed:</TooltipLabelCell>
          <TooltipValueCell>
            {committedParts.identical && <GreyText>{committedParts.identical}</GreyText>}
            {committedParts.different}
          </TooltipValueCell>
        </tr>
        <tr>
          <TooltipLabelCell>Built:</TooltipLabelCell>
          <TooltipValueCellLast>
            {builtParts.identical && <GreyText>{builtParts.identical}</GreyText>}
            {builtParts.different}
          </TooltipValueCellLast>
        </tr>
        </tbody>
      </TooltipTable>
    </>
  ) : null;

  // Always call hook unconditionally (hooks must be called in the same order)
  const {containerRef, tooltipProps, tooltip } = useTooltip(tooltipContent);

  return buildInfoProp
    ?<Container ref={containerRef} className={className} style={style}{...tooltipProps}>
      <WidgetLine>{buildInfoProp.commitHash}</WidgetLine>
      {formattedMnemonic && (<WidgetLine><MnemonicText>{formattedMnemonic}</MnemonicText></WidgetLine>)}
      {tooltip}
     </Container>
    : null;
}
