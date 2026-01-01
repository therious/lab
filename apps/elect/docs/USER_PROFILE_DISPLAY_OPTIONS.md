# User Profile Display Options

## Current Implementation

The user profile shows:
- **Email address** (user identifier)
- **Status badge**: "Voted" (green) or "Not Voted" (yellow) with icon

## Design Options for Vote Status Display

### Option 1: Badge with Icon (Current)
```
[email@example.com] [✓ Voted]  or  [email@example.com] [○ Not Voted]
```
- **Pros**: Clear, compact, color-coded
- **Cons**: Takes horizontal space

### Option 2: Icon Only (Minimal)
```
[email@example.com] [✓]  or  [email@example.com] [○]
```
- **Pros**: Very compact, tooltip shows full status
- **Cons**: Less immediately clear without tooltip

### Option 3: Text with Color Coding
```
[email@example.com] [Voted] (green text)  or  [email@example.com] [Not Voted] (yellow text)
```
- **Pros**: Explicit text, no icon needed
- **Cons**: More verbose

### Option 4: Dropdown Menu
```
[email@example.com ▼]
  - Status: Voted / Not Voted
  - Logout / Switch Account
```
- **Pros**: Can add more options (logout, switch account)
- **Cons**: Requires click to see status

### Option 5: Status Icon on Email
```
[✓ email@example.com] (green)  or  [○ email@example.com] (yellow)
```
- **Pros**: Very compact, status is part of email display
- **Cons**: Icon might be confused with email validation

### Option 6: Separate Status Line
```
email@example.com
Status: ✓ Voted (green)  or  Status: ○ Not Voted (yellow)
```
- **Pros**: Very clear, can show more details
- **Cons**: Takes vertical space

## Recommendation

**Option 1 (Current)** is recommended because:
- Clear and explicit
- Color coding provides immediate visual feedback
- Compact but readable
- Follows common UI patterns (badges)

## Future Enhancements

1. **Tooltip**: Add tooltip on hover showing:
   - "Voted at: [timestamp]" or "Not yet voted"
   - Token type (preview vs. regular)

2. **Click to Logout**: Make profile clickable to:
   - Clear sessionStorage
   - Return to landing page
   - Request new token

3. **Account Switching**: Allow user to:
   - See which account they're logged in as
   - Switch to different email/account
   - View vote history (if implemented)

4. **Visual Distinction**: 
   - Make "Voted" more prominent (maybe larger badge)
   - Add subtle animation when status changes
   - Show timestamp of vote submission

