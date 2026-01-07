#!/usr/bin/env tsx
/**
 * Generate test votes for elections
 * 
 * This script:
 * 1. Starts the elections server (or uses existing)
 * 2. Generates tokens for voting
 * 3. Creates random votes with bias for general election
 * 4. Submits ~1000 votes
 * 
 * Stops automatically when code files are modified
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = process.env.ELECTIONS_URL || 'http://localhost:4000';
const ELECTION_IDENTIFIER = process.env.ELECTION_ID || '2026-general-election';
const NUM_VOTES = parseInt(process.env.NUM_VOTES || '0', 10); // 0 = run indefinitely
// Delay between votes in milliseconds (default: 3.33ms = ~300 votes/second)
const VOTE_DELAY_MS = parseFloat(process.env.VOTE_DELAY_MS || '20', 10);
// Duration to run in seconds (0 = run indefinitely until cancelled)
const RUN_DURATION_SEC = parseInt(process.env.RUN_DURATION_SEC || '0', 10);

interface TokenResponse {
  status: string;
  token?: string;
  tokens?: {
    token: string;
    view_token?: string;
  };
  election_identifier?: string;
}

interface ElectionData {
  identifier: string;
  title: string;
  ballots: Array<{
    title: string;
    candidates: Array<{
      name: string;
      affiliation?: string;
    }>;
  }>;
}

interface VoteResponse {
  status: string;
  view_token?: string;
  error?: string;
}

/**
 * Check if server is running
 */
async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/elections`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Get election data
 */
async function getElection(identifier: string): Promise<ElectionData | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/elections/${identifier}`);
    if (!response.ok) {
      console.error(`Failed to get election: ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting election: ${error}`);
    return null;
  }
}

/**
 * Generate a test token using debug endpoint
 */
async function generateToken(identifier: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/debug/token?election_identifier=${identifier}`);
    if (!response.ok) {
      console.error(`Failed to generate token: ${response.statusText}`);
      return null;
    }
    const data: TokenResponse = await response.json();
    // Debug endpoint returns { tokens: { token, view_token } }
    // Regular endpoint returns { token, view_token }
    return data.tokens?.token ?? data.token ?? null;
  } catch (error) {
    console.error(`Error generating token: ${error}`);
    return null;
  }
}

/**
 * Submit a vote
 */
async function submitVote(
  identifier: string,
  token: string,
  ballotData: Record<string, any>
): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        election_identifier: identifier,
        token: token,
        ballot_data: ballotData,
      }),
    });

    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        console.error(`Failed to submit vote: ${error.error || response.statusText}`);
      } else {
        const text = await response.text();
        console.error(`Failed to submit vote (non-JSON response): ${response.status} ${response.statusText}`);
        if (text.length < 200) {
          console.error(`Response: ${text}`);
        }
      }
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error submitting vote: ${error}`);
    return false;
  }
}

/**
 * Generate random vote with cycling bias for presidential ballot
 * Bias cycles: Bob Smith (5 min) -> Alice Johnson (5 min) -> Bob Smith (5 min) -> ...
 */
function generateRandomVote(election: ElectionData, elapsedSeconds: number): Record<string, any> {
  const ballotData: Record<string, any> = {};

  // Calculate cycling bias for presidential ballot
  // Cycle: 15 minutes total (5 min Bob -> 5 min Alice -> 5 min Bob -> repeat)
  const cycleDuration = 15 * 60; // 15 minutes in seconds
  const cyclePosition = (elapsedSeconds % cycleDuration) / cycleDuration; // 0.0 to 1.0 within cycle
  // First third (0.0-0.333): Bob favor (1.0 -> 0.0)
  // Second third (0.333-0.667): Alice favor (0.0 -> 1.0)
  // Last third (0.667-1.0): Bob favor again (1.0 -> 0.0)
  let bobBias: number;
  let aliceBias: number;
  if (cyclePosition < 0.333) {
    // First 5 minutes: Bob favor (1.0 -> 0.0)
    bobBias = 1.0 - (cyclePosition * 3);
    aliceBias = 1.0 - bobBias;
  } else if (cyclePosition < 0.667) {
    // Second 5 minutes: Alice favor (0.0 -> 1.0)
    const pos = (cyclePosition - 0.333) * 3; // 0.0 to 1.0 within this third
    aliceBias = pos;
    bobBias = 1.0 - aliceBias;
  } else {
    // Last 5 minutes: Bob favor again (1.0 -> 0.0)
    const pos = (cyclePosition - 0.667) * 3; // 0.0 to 1.0 within this third
    bobBias = 1.0 - pos;
    aliceBias = 1.0 - bobBias;
  }

  for (const ballot of election.ballots) {
    const candidates = ballot.candidates;
    const shuffled = [...candidates].sort(() => Math.random() - 0.5);
    
    // Create score bands (0-5)
    const bands: Record<string, string[]> = {
      '5': [],
      '4': [],
      '3': [],
      '2': [],
      '1': [],
      '0': [],
      'unranked': [],
    };

    // Bias for presidential ballot in general election
    const isGeneralElection = ELECTION_IDENTIFIER === '2026-general-election';
    const isPresidentialBallot = ballot.title === 'Presidential Ballot';
    
    // Distribute candidates with cycling bias for presidential ballot
    for (let i = 0; i < shuffled.length; i++) {
      const candidate = shuffled[i];
      const isAlice = candidate.name === 'Alice Johnson';
      const isBob = candidate.name === 'Bob Smith';
      
      let score: number;
      
      if (isGeneralElection && isPresidentialBallot) {
        // Presidential ballot: cycling bias between Alice and Bob
        if (isBob) {
          // Bob: bias based on bobBias (1.0 = strong favor, 0.0 = neutral)
          const rand = Math.random();
          if (rand < bobBias * 0.75) {
            // Strong bias: 75% chance of high score when bobBias is high
            score = Math.random() < 0.85 ? 5 : 4;
          } else if (rand < bobBias * 0.75 + 0.15) {
            // Medium bias: 15% chance of medium score
            score = 3;
          } else {
            // Low bias: lower scores
            score = Math.floor(Math.random() * 3); // 0, 1, or 2
          }
        } else if (isAlice) {
          // Alice: bias based on aliceBias (1.0 = strong favor, 0.0 = neutral)
          const rand = Math.random();
          if (rand < aliceBias * 0.75) {
            // Strong bias: 75% chance of high score when aliceBias is high
            score = Math.random() < 0.85 ? 5 : 4;
          } else if (rand < aliceBias * 0.75 + 0.15) {
            // Medium bias: 15% chance of medium score
            score = 3;
          } else {
            // Low bias: lower scores
            score = Math.floor(Math.random() * 3); // 0, 1, or 2
          }
        } else {
          // Other candidates: random distribution
          score = Math.floor(Math.random() * 6); // 0-5
        }
      } else if (isGeneralElection) {
        // Other ballots in general election: balanced distribution
        const rand = Math.random();
        if (rand < 0.3) {
          score = Math.random() < 0.5 ? 5 : 4;
        } else if (rand < 0.6) {
          score = 3;
        } else {
          score = Math.floor(Math.random() * 3); // 0, 1, or 2
        }
      } else {
        // Non-general election: random distribution
        score = Math.floor(Math.random() * 6); // 0-5
      }

      bands[score.toString()].push(candidate.name);
    }

    ballotData[ballot.title] = bands;
  }

  return ballotData;
}

/**
 * Watch for code changes and stop test when files are modified
 */
function setupFileWatcher(workspaceRoot: string): () => void {
  const watchPaths = [
    path.join(workspaceRoot, 'servers/elections/lib'),
    path.join(workspaceRoot, 'apps/elect/src'),
  ];
  
  const watchers: fs.FSWatcher[] = [];
  let shouldStop = false;
  
  const checkAndStop = (filePath: string) => {
    // Ignore log files and other non-code files
    if (filePath.endsWith('.log') || filePath.endsWith('.beam') || filePath.includes('_build')) {
      return;
    }
    
    if (!shouldStop) {
      shouldStop = true;
      console.log(`\n🛑 Code file modified: ${filePath}`);
      console.log('🛑 Stopping test script...\n');
      process.exit(0);
    }
  };
  
  watchPaths.forEach(watchPath => {
    if (fs.existsSync(watchPath)) {
      const watcher = fs.watch(watchPath, { recursive: true }, (eventType, filename) => {
        if (filename && (eventType === 'change' || eventType === 'rename')) {
          const fullPath = path.join(watchPath, filename);
          checkAndStop(fullPath);
        }
      });
      watchers.push(watcher);
    }
  });
  
  // Return cleanup function
  return () => {
    watchers.forEach(watcher => watcher.close());
  };
}

/**
 * Main function
 * 
 * NOTE: This script is now on-demand only. It will NOT run automatically.
 * To run stress tests, explicitly invoke this script.
 */
async function main() {
  // Set up file watcher to stop when code changes
  const __filename = new URL(import.meta.url).pathname;
  const __dirname = path.dirname(__filename);
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const cleanupWatcher = setupFileWatcher(workspaceRoot);
  
  // Cleanup on exit
  process.on('SIGINT', () => {
    cleanupWatcher();
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    cleanupWatcher();
    process.exit(0);
  });
  
  console.log('⚠️  This script is on-demand only. It will stop automatically when code files are modified.');
  console.log('⚠️  To run stress tests, explicitly invoke this script.\n');
  console.log('=== Test Vote Generator ===');
  if (NUM_VOTES > 0) {
    console.log(`Target: ${NUM_VOTES} votes`);
  } else {
    console.log(`Duration: ${RUN_DURATION_SEC} seconds (${RUN_DURATION_SEC / 60} minutes)`);
  }
  console.log(`Election: ${ELECTION_IDENTIFIER}`);
  console.log(`Server: ${BASE_URL}\n`);

  // Check server
  console.log('Checking server...');
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error(`❌ Server not running at ${BASE_URL}`);
    console.error('Please start the server first: cd servers/elections && mix phx.server');
    process.exit(1);
  }
  console.log('✅ Server is running\n');

  // Get election data
  console.log(`Fetching election data for ${ELECTION_IDENTIFIER}...`);
  const election = await getElection(ELECTION_IDENTIFIER);
  if (!election) {
    console.error(`❌ Failed to get election: ${ELECTION_IDENTIFIER}`);
    process.exit(1);
  }
  console.log(`✅ Found election: ${election.title}`);
  console.log(`   Ballots: ${election.ballots.length}\n`);

  // Generate votes
  const startTime = Date.now();
  const endTime = RUN_DURATION_SEC > 0 ? startTime + (RUN_DURATION_SEC * 1000) : null;
  
  if (NUM_VOTES > 0) {
    console.log(`Generating ${NUM_VOTES} votes...`);
  } else if (RUN_DURATION_SEC > 0) {
    console.log(`Generating votes for ${RUN_DURATION_SEC} seconds (${RUN_DURATION_SEC / 60} minutes)...`);
  } else {
    console.log(`Generating votes indefinitely (press Ctrl+C to stop)...`);
  }
  console.log(`Rate: ~${(1000 / VOTE_DELAY_MS).toFixed(0)} votes/second (${VOTE_DELAY_MS}ms delay)`);
  console.log(`Bias: Presidential ballot cycles Bob → Alice → Bob (5 min cycles)\n`);
  
  let successCount = 0;
  let failCount = 0;
  let voteIndex = 0;

  // TypeScript: election is confirmed non-null after the check above
  const electionData: ElectionData = election;

  // Run until duration expires or vote count reached
  // Use fire-and-forget approach to achieve high throughput
  const inFlight = new Set<Promise<void>>();
  const maxInFlight = 50; // Limit concurrent requests to avoid overwhelming server
  
  while (true) {
    const now = Date.now();
    const elapsedSeconds = (now - startTime) / 1000;
    
    // Check if we should stop
    if (NUM_VOTES > 0 && voteIndex >= NUM_VOTES) {
      // Wait for all in-flight requests to complete
      await Promise.all(Array.from(inFlight));
      break;
    }
    if (RUN_DURATION_SEC > 0 && endTime && now >= endTime) {
      // Wait for all in-flight requests to complete
      await Promise.all(Array.from(inFlight));
      break;
    }

    // Wait if we have too many in-flight requests
    while (inFlight.size >= maxInFlight) {
      await Promise.race(Array.from(inFlight));
    }

    // Generate vote data with cycling bias
    const ballotData = generateRandomVote(electionData, elapsedSeconds);
    const currentVoteIndex = voteIndex;

    // Fire-and-forget: don't wait for completion
    const votePromise = (async () => {
      try {
        // Generate token
        const token = await generateToken(ELECTION_IDENTIFIER);
        if (!token) {
          failCount++;
          return;
        }

        // Submit vote
        const success = await submitVote(ELECTION_IDENTIFIER, token, ballotData);
        if (success) {
          successCount++;
          const currentIndex = currentVoteIndex;
          
          // Show progress every 1000 votes or every 10 seconds
          if (currentIndex % 1000 === 0 || Math.floor(elapsedSeconds) % 10 === 0) {
            const rate = (successCount / elapsedSeconds).toFixed(0);
            const remaining = NUM_VOTES > 0 
              ? `${NUM_VOTES - currentIndex} remaining`
              : RUN_DURATION_SEC > 0 && endTime
                ? `${((endTime - Date.now()) / 1000).toFixed(0)}s remaining`
                : 'running...';
            const cyclePos = ((elapsedSeconds % (15 * 60)) / (15 * 60)) * 100;
            let biasTarget: string;
            let biasPercent: number;
            if (cyclePos < 33.33) {
              biasTarget = 'Bob';
              biasPercent = 100 - (cyclePos / 33.33) * 100;
            } else if (cyclePos < 66.67) {
              biasTarget = 'Alice';
              biasPercent = ((cyclePos - 33.33) / 33.33) * 100;
            } else {
              biasTarget = 'Bob';
              biasPercent = 100 - ((cyclePos - 66.67) / 33.33) * 100;
            }
            console.log(`  Progress: ${successCount} votes (${rate} votes/sec, ${remaining}, bias: ${biasTarget} ${biasPercent.toFixed(0)}%)`);
          }
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    })();

    inFlight.add(votePromise);
    votePromise.finally(() => inFlight.delete(votePromise));
    
    voteIndex++;

    // Small delay to control rate (but don't block on completion)
    await new Promise(resolve => setTimeout(resolve, VOTE_DELAY_MS));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Results ===');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏱️  Time: ${elapsed}s`);
  console.log(`📊 Rate: ${(successCount / parseFloat(elapsed)).toFixed(1)} votes/sec`);
  
  cleanupWatcher();
}

// Run if executed directly
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

