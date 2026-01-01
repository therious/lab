declare module 'masonry-grid' {
  import { ReactNode } from 'react';

  export interface ResponsiveConfig {
    [breakpoint: number]: {
      column: number;
    };
  }

  export interface MasonryGridProps {
    column?: number;
    gap?: number;
    responsive?: ResponsiveConfig;
    children: ReactNode;
  }

  export const MasonryGrid: React.FC<MasonryGridProps>;
}

