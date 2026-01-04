# Test Vote Generator

Generates random test votes for elections with configurable bias.

## Setup

```bash
cd servers/elections/scripts
npm install
```

## Usage

```bash
# Generate 1000 votes for general election (default)
npm run generate-votes

# Or with custom parameters
ELECTION_ID=2026-general-election NUM_VOTES=1000 npm run generate-votes

# Or use tsx directly
tsx generate-test-votes.ts
```

## Environment Variables

- `ELECTIONS_URL`: Server URL (default: `http://localhost:4000`)
- `ELECTION_ID`: Election identifier (default: `2026-general-election`)
- `NUM_VOTES`: Number of votes to generate (default: `1000`)

## Bias Logic

For the general election (`2026-general-election`):
- **Democratic candidates**: 60% chance of score 4-5, 30% chance of 3, 10% chance of 0-2
- **Republican candidates**: 30% chance of score 4-5, 30% chance of 3, 40% chance of 0-2
- **Other candidates**: Random distribution (0-5)

For other elections: Random distribution for all candidates.

## Requirements

- Elections server must be running on `http://localhost:4000`
- Election must exist and be open for voting
- Server must have debug token generation enabled (for testing)

