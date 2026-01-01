# UI Features Documentation

## Overview

This document describes the UI-specific features and presentation logic for the Elect voting application.

## Table of Contents

1. [Tab Management](#tab-management)
2. [Tab Status Badges](#tab-status-badges)
3. [Winner Ordering Presentation](./WINNER_ORDERING_PRESENTATION.md)
4. [Layout Architecture](./LAYOUT_ARCHITECTURE.md)
5. [Conditional Views](#conditional-views)

## Tab Management

### Conditional Tab Display

The application dynamically shows/hides tabs based on election status:

- **Results Tab**: Always available (users can view results for any election)
- **Summary Tab**: Only available when election is **open** (not upcoming)
- **Ballot Tabs**: Only available when election is **open** (not upcoming)

**Rationale**: Upcoming elections should not allow ballot submission or viewing of draft ballots. Users can only view results.

### Single Tab Behavior

When only one tab is available (e.g., closed election showing only Results):
- **Navbar is hidden** - No navigation needed for single view
- **Direct rendering** - The single view is rendered directly without routing
- **Automatic redirect** - Invalid paths redirect to the single available tab

**Implementation**: See `App.tsx` - `availableTabs` logic and conditional rendering.

## Tab Status Badges

Ballot tabs display status badges to indicate completion state:

### Badge Types

1. **Green Checkmark (Confirmed)**
   - **When**: Ballot is confirmed (user has toggled confirmation)
   - **Style**: Green background (#4caf50), white checkmark
   - **Meaning**: User has confirmed this ballot is ready

2. **Pastel Green Checkmark (All Ranked, Not Confirmed)**
   - **When**: All candidates are ranked but ballot is not confirmed
   - **Style**: Pastel green border (#a5d6a7), pastel green checkmark, transparent background
   - **Meaning**: Ballot is complete but not yet confirmed

3. **Orange Percentage Pill (Partially Filled)**
   - **When**: Some candidates are ranked but not all
   - **Style**: Orange background (#ff9800), white text showing percentage
   - **Meaning**: Ballot is in progress (e.g., "45%")

4. **No Badge**
   - **When**: No candidates have been ranked
   - **Meaning**: Ballot has not been started

### Badge Updates

Badges update in real-time as users:
- Rank candidates (triggers percentage calculation)
- Complete all rankings (shows pastel green checkmark)
- Confirm/unconfirm ballots (toggles green checkmark)

**Implementation**: See `App.tsx` - Badge rendering logic in navbar.

## Conditional Views

### Election Status-Based Views

The UI adapts based on election status:

#### Upcoming Elections
- **Summary Tab**: Hidden (no ballot submission allowed)
- **Ballot Tabs**: Hidden (no ballot editing allowed)
- **Results Tab**: Available (users can preview results)
- **Submit Button**: Disabled with text "Voting Not Yet Open"

#### Open Elections
- **Summary Tab**: Available (users can view and submit ballots)
- **Ballot Tabs**: Available (users can edit individual ballots)
- **Results Tab**: Available (users can view live results)
- **Submit Button**: Enabled when all ballots are confirmed

#### Closed Elections
- **Summary Tab**: Hidden (voting period ended)
- **Ballot Tabs**: Hidden (voting period ended)
- **Results Tab**: Available (users can view final results)
- **Navbar**: Hidden (only one tab available)

### Submission Prevention

The UI prevents submission for upcoming elections at multiple levels:
1. **Button State**: Submit button is disabled and shows "Voting Not Yet Open"
2. **Handler Check**: `handleSubmit` function explicitly checks status and shows alert
3. **Server Validation**: Server also validates voting window (defense in depth)

## Layout Features

### Masonry Packing

The summary and results views use masonry packing for efficient space utilization:
- **Library**: Muuri React (`muuri-react`)
- **Rationale**: Cards have variable heights based on content; masonry efficiently packs them
- **Gap**: 0.375rem (6px) between cards
- **Alignment**: Leftmost cards align with other containers (compensated margin)

See [Layout Architecture](./LAYOUT_ARCHITECTURE.md) for detailed information.

### Responsive Design

- **Cards**: Minimum width 280px, size to content
- **Wrapping**: Cards wrap naturally based on viewport width
- **Alignment**: Consistent left alignment across all containers

## Related Documentation

### Server Documentation
- [Winner Ordering Notation](../../../servers/elections/docs/WINNER_ORDERING_NOTATION.md) - Data structure and tie classification
- [Winner Ordering Analysis](../../../servers/elections/docs/WINNER_ORDERING_ANALYSIS.md) - Algorithm ordering details
- [Elections Server README](../../../servers/elections/README.md) - Server API and architecture

### UI Documentation
- [Winner Ordering Presentation](./WINNER_ORDERING_PRESENTATION.md) - How winner ordering is displayed
- [Layout Architecture](./LAYOUT_ARCHITECTURE.md) - Masonry layout implementation

