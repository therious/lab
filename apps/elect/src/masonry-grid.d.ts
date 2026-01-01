declare module 'masonry-grid' {
  import { ReactNode } from 'react';

  export interface MasonryGridProps {
    minWidth?: number;
    gap?: number;
    children: ReactNode;
  }

  const MasonryGrid: React.FC<MasonryGridProps>;
  export default MasonryGrid;
}

