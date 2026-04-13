import React, { useRef, useState, useCallback } from 'react';
import styled from 'styled-components';

// ── Drag hook ─────────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function useSplitDrag(direction: 'horizontal' | 'vertical', initial: number, min = 15, max = 85) {
  const [pct, setPct] = useState(initial);
  const containerRef = useRef<HTMLDivElement>(null);

  const onHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;

    const onMove = (mv: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const raw = direction === 'horizontal'
        ? ((mv.clientX - rect.left) / rect.width)  * 100
        : ((mv.clientY - rect.top)  / rect.height) * 100;
      setPct(clamp(raw, min, max));
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  }, [direction, min, max]);

  return { pct, containerRef, onHandleMouseDown };
}

// ── Styled pieces ─────────────────────────────────────────────────────────────

const HContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const VContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const HHandle = styled.div`
  width: 5px;
  flex-shrink: 0;
  background: #e8eaed;
  cursor: col-resize;
  transition: background 0.15s;
  &:hover { background: #1a73e8; }
`;

const VHandle = styled.div`
  height: 5px;
  flex-shrink: 0;
  background: #e8eaed;
  cursor: row-resize;
  transition: background 0.15s;
  &:hover { background: #1a73e8; }
`;

// ── Components ────────────────────────────────────────────────────────────────

type SplitProps = {
  first:       React.ReactNode;
  second:      React.ReactNode;
  defaultSize?: number;   // % for first pane, default 60
  minSize?:     number;   // min % for each side, default 15
};

export const HSplit = ({ first, second, defaultSize = 60, minSize = 15 }: SplitProps) => {
  const { pct, containerRef, onHandleMouseDown } = useSplitDrag('horizontal', defaultSize, minSize, 100 - minSize);
  return (
    <HContainer ref={containerRef}>
      <div style={{ width: `${pct}%`, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {first}
      </div>
      <HHandle onMouseDown={onHandleMouseDown} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {second}
      </div>
    </HContainer>
  );
};

export const VSplit = ({ first, second, defaultSize = 60, minSize = 15 }: SplitProps) => {
  const { pct, containerRef, onHandleMouseDown } = useSplitDrag('vertical', defaultSize, minSize, 100 - minSize);
  return (
    <VContainer ref={containerRef}>
      <div style={{ height: `${pct}%`, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {first}
      </div>
      <VHandle onMouseDown={onHandleMouseDown} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {second}
      </div>
    </VContainer>
  );
};
