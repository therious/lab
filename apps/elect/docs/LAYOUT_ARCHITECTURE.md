# Layout Architecture

## Summary View Layout

The election summary view uses a **masonry grid layout** to efficiently pack ballot cards of varying heights. This approach ensures optimal space utilization while maintaining a clean, organized appearance.

## Current Implementation

### Muuri React (Masonry Packing)

We use **[Muuri React](https://github.com/paol-imi/muuri-react)** (`muuri-react` npm package) for the summary view layout.

**Why Muuri:**
- **True masonry packing**: Efficiently packs items to minimize vertical space
- **Variable width/height support**: Handles items with different sizes naturally
- **Gap filling**: Shorter items fill gaps below taller items
- **No clipping**: All items that fit are visible and properly arranged
- **Future features**: Supports drag-and-drop, filtering, sorting (currently disabled)

**Configuration:**
- `dragEnabled: false` - Drag-and-drop disabled for now
- `layout.fillGaps: true` - Enables efficient packing
- Items: `width: max-content; min-width: 280px;` (size to content)

**Usage:**
```tsx
import {MuuriComponent} from 'muuri-react';

<MuuriComponent
  dragEnabled={false}
  layout={{ fillGaps: true }}
>
  {ballots.map(ballot => (
    <MuuriItem>
      <BallotCard>
        {/* Content sizes to bands */}
      </BallotCard>
    </MuuriItem>
  ))}
</MuuriComponent>
```

**Note:** Muuri automatically packs items efficiently, filling gaps and handling variable widths/heights. Cards size to their content (bands determine width), and Muuri arranges them optimally.

## Previous Implementation

### Masonry Grid Library (Removed)

We initially tried **[Masonry Grid](https://masonry-grid.js.org/)** but removed it because:
- **Fixed column calculation**: Calculated a fixed number of columns based on `containerWidth / minWidth`
- **Clipping issue**: When cards were wider than the calculated column width, they would clip
- **No natural wrapping**: Items were forced into fixed columns, not based on actual width

This approach didn't work for variable-width cards that need to size to their content.

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

