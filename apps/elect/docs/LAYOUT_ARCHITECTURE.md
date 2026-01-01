# Layout Architecture

## Summary View Layout

The election summary view uses a **masonry grid layout** to efficiently pack ballot cards of varying heights. This approach ensures optimal space utilization while maintaining a clean, organized appearance.

## Current Implementation

### Masonry Grid Library

We use **[Masonry Grid](https://masonry-grid.js.org/)** (`masonry-grid` npm package) for the summary view layout.

**Why Masonry Grid:**
- **TypeScript-first**: Built with TypeScript and includes type definitions
- **Zero dependencies**: Lightweight and doesn't add unnecessary dependencies
- **First-class React support**: Designed specifically for React applications
- **Responsive**: Built-in responsive breakpoint configuration
- **Performance**: Efficient layout algorithm that minimizes reflows

**Configuration:**
- Default: 3 columns
- Responsive breakpoints:
  - Mobile (0px+): 1 column
  - Tablet (768px+): 2 columns
  - Desktop (1024px+): 3 columns
- Gap: 24px between items

**Usage:**
```tsx
<MasonryGrid
  column={3}
  gap={24}
  responsive={{
    0: {column: 1},
    768: {column: 2},
    1024: {column: 3}
  }}
>
  {ballots.map(ballot => <BallotCard ... />)}
</MasonryGrid>
```

## Alternative Libraries Considered

### 1. Muuri
**Status:** Not selected (but considered for future use)

**Pros:**
- Rich feature set: drag-and-drop, sorting, filtering, animations
- Could potentially replace `@atlaskit/pragmatic-drag-and-drop` in the future
- Powerful animation system
- Good for interactive layouts

**Cons:**
- Larger bundle size (~50KB+)
- More complex API
- Overkill for simple masonry layout
- Requires more setup and configuration

**When to consider:**
- If we need drag-and-drop reordering of ballots in the summary view
- If we want animated transitions when ballots are added/removed
- If we need filtering or sorting capabilities in the UI

### 2. FlexMasonry
**Status:** Not selected

**Pros:**
- Very lightweight (~6KB)
- CSS flexbox-based (no JavaScript calculations)
- Zero dependencies
- Simple API

**Cons:**
- Less control over item positioning
- May not pack items as efficiently as JavaScript-based solutions
- Limited React integration (requires manual DOM manipulation)

### 3. Masonry.js
**Status:** Not selected

**Pros:**
- Widely used and well-documented
- Mature library with extensive community support
- Feature-rich

**Cons:**
- Larger bundle size
- Not specifically designed for React (requires wrapper)
- More complex API than needed for our use case

### 4. react-masonry-css
**Status:** Not selected

**Pros:**
- React-specific
- CSS-based (good performance)
- Simple API

**Cons:**
- Less efficient packing than JavaScript-based solutions
- Limited control over responsive behavior

## Switching Libraries

If you want to try a different masonry library:

1. **Install the new library:**
   ```bash
   pnpm add <library-name>
   ```

2. **Update `apps/elect/src/App.tsx`:**
   - Replace the `MasonryGrid` import
   - Update the component usage in `SummaryView`
   - Adjust `BallotCard` styling if needed

3. **Test the layout:**
   - Verify cards pack efficiently
   - Check responsive behavior
   - Ensure no layout shifts during rendering

4. **Update this documentation** with the new choice and rationale

## Ballot Card Constraints

The `BallotCard` component has the following constraints to work well with masonry:

- **Width**: `100%` (fills masonry column)
- **Min-width**: `300px` (ensures readability)
- **Max-width**: `450px` (prevents cards from becoming too wide)
- **Height**: `fit-content` (adapts to content)
- **Margin**: `1.5rem` bottom margin (handled by masonry gap)

These constraints ensure cards:
- Fill their column width efficiently
- Don't become too narrow or too wide
- Adapt to varying content heights
- Maintain consistent spacing

## Future Enhancements

Potential improvements to consider:

1. **Dynamic column count**: Adjust columns based on viewport width more granularly
2. **Animation**: Add smooth transitions when cards are added/removed
3. **Drag-and-drop reordering**: Allow users to reorder ballots (would require Muuri or similar)
4. **Filtering**: Filter ballots by status (confirmed/unconfirmed) with animated transitions
5. **Virtualization**: For elections with many ballots, implement virtual scrolling

## Related Files

- `apps/elect/src/App.tsx` - Main implementation
- `apps/elect/src/masonry-grid.d.ts` - TypeScript declarations
- `apps/elect/package.yaml` - Dependency declaration

