#!/usr/bin/env tsx
/**
 * Generate votes for Tennessee Capital Referendum
 * 
 * This script simulates voters from each of the four major Tennessee cities
 * and generates votes based on distance preferences:
 * - Memphis voters (42%): Memphis > Nashville > Chattanooga > Knoxville
 * - Nashville voters (26%): Nashville > Chattanooga > Knoxville > Memphis
 * - Knoxville voters (17%): Knoxville > Chattanooga > Nashville > Memphis
 * - Chattanooga voters (15%): Chattanooga > Knoxville > Nashville > Memphis
 * 
 * Votes are scored based on distance - closer cities get higher scores.
 */

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = process.env.ELECTIONS_URL || 'http://localhost:4000';
const ELECTION_IDENTIFIER = process.env.ELECTION_ID || 'tennessee-capital-referendum-2026';
const NUM_VOTES = parseInt(process.env.NUM_VOTES || '1000', 10);
const VOTE_DELAY_MS = parseFloat(process.env.VOTE_DELAY_MS || '100', 10);

// Voter distribution (percentages)
const VOTER_DISTRIBUTION = {
  memphis: 0.42,      // 42%
  nashville: 0.26,    // 26%
  knoxville: 0.17,    // 17%
  chattanooga: 0.15   // 15%
};

// City order for each voter group (by preference/distance)
const CITY_PREFERENCES = {
  memphis: ['Memphis', 'Nashville', 'Chattanooga', 'Knoxville'],
  nashville: ['Nashville', 'Chattanooga', 'Knoxville', 'Memphis'],
  knoxville: ['Knoxville', 'Chattanooga', 'Nashville', 'Memphis'],
  chattanooga: ['Chattanooga', 'Knoxville', 'Nashville', 'Memphis']
};

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
    candidates: Array<{name: string}>;
  }>;
}

async function checkServer(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { method: 'GET' });
    return response.ok;
  } catch {
    try {
      const response = await fetch(`${BASE_URL}/api/dashboard`, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

async function getElection(identifier: string): Promise<ElectionData | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/dashboard/${identifier}`);
    if (!response.ok) {
      console.error(`Failed to get election: ${response.status} ${response.statusText}`);
      return null;
    }
    const data = await response.json();
    return {
      identifier: data.election_identifier || identifier,
      title: data.results?.metadata?.election_identifier || identifier,
      ballots: data.results?.results || []
    };
  } catch (error) {
    console.error(`Error getting election: ${error}`);
    return null;
  }
}

async function generateToken(identifier: string): Promise<string | null> {
  try {
    const response = await fetch(`${BASE_URL}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ election_identifier: identifier }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      console.error(`Failed to generate token: ${error.error || response.statusText}`);
      return null;
    }

    const data: TokenResponse = await response.json();
    return data.tokens?.token || data.token || null;
  } catch (error) {
    console.error(`Error generating token: ${error}`);
    return null;
  }
}

async function submitVote(identifier: string, token: string, ballotData: Record<string, any>): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/api/votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      }
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Error submitting vote: ${error}`);
    return false;
  }
}

function generateVoteForCity(city: keyof typeof CITY_PREFERENCES, candidates: Array<{name: string}>): Record<string, any> {
  const preferences = CITY_PREFERENCES[city];
  const ballotData: Record<string, any> = {};
  const candidateMap = new Map<string, number>();
  candidates.forEach((candidate, idx) => {
    candidateMap.set(candidate.name, idx);
  });
  
  // Score based on preference order: 1st = 5, 2nd = 4, 3rd = 2, 4th = 0
  const scores = [5, 4, 2, 0];
  
  preferences.forEach((cityName, rank) => {
    const candidateIdx = candidateMap.get(cityName);
    if (candidateIdx !== undefined) {
      ballotData[candidateIdx.toString()] = [scores[rank]];
    }
  });
  
  candidates.forEach((candidate, idx) => {
    if (!preferences.includes(candidate.name)) {
      ballotData[idx.toString()] = [0];
    }
  });
  
  ballotData.unranked = [];
  return ballotData;
}

function getVoterCity(voteIndex: number): keyof typeof CITY_PREFERENCES {
  const random = (voteIndex * 7919 + 9973) % 10000 / 10000;
  let cumulative = 0;
  for (const [city, percentage] of Object.entries(VOTER_DISTRIBUTION)) {
    cumulative += percentage;
    if (random < cumulative) {
      return city as keyof typeof CITY_PREFERENCES;
    }
  }
  return 'memphis';
}

async function main() {
  console.log('=== Tennessee Capital Referendum Vote Generator ===');
  console.log(`Target: ${NUM_VOTES} votes`);
  console.log(`Election: ${ELECTION_IDENTIFIER}`);
  console.log(`Server: ${BASE_URL}\n`);

  console.log('Checking server...');
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error(`❌ Server not running at ${BASE_URL}`);
    process.exit(1);
  }
  console.log('✅ Server is running\n');

  console.log(`Fetching election data for ${ELECTION_IDENTIFIER}...`);
  const election = await getElection(ELECTION_IDENTIFIER);
  if (!election) {
    console.error(`❌ Failed to get election: ${ELECTION_IDENTIFIER}`);
    process.exit(1);
  }
  console.log(`✅ Found election: ${election.title}`);
  
  const capitalBallot = election.ballots.find(b => b.title.includes('Capital') || b.title.includes('capital'));
  if (!capitalBallot) {
    console.error(`❌ Could not find capital referendum ballot`);
    process.exit(1);
  }
  console.log(`   Ballot: ${capitalBallot.title}`);
  console.log(`   Candidates: ${capitalBallot.candidates.map(c => c.name).join(', ')}\n`);

  const startTime = Date.now();
  let successCount = 0;
  let failCount = 0;
  const inFlight = new Set<Promise<void>>();
  const maxInFlight = 10;

  console.log('Generating votes...');
  console.log('Voter distribution:');
  console.log(`  Memphis: ${(VOTER_DISTRIBUTION.memphis * 100).toFixed(0)}%`);
  console.log(`  Nashville: ${(VOTER_DISTRIBUTION.nashville * 100).toFixed(0)}%`);
  console.log(`  Knoxville: ${(VOTER_DISTRIBUTION.knoxville * 100).toFixed(0)}%`);
  console.log(`  Chattanooga: ${(VOTER_DISTRIBUTION.chattanooga * 100).toFixed(0)}%\n`);

  for (let voteIndex = 0; voteIndex < NUM_VOTES; voteIndex++) {
    while (inFlight.size >= maxInFlight) {
      await Promise.race(Array.from(inFlight));
    }

    const voterCity = getVoterCity(voteIndex);
    const ballotData = generateVoteForCity(voterCity, capitalBallot.candidates);
    const currentVoteIndex = voteIndex;

    const votePromise = (async () => {
      try {
        const token = await generateToken(ELECTION_IDENTIFIER);
        if (!token) {
          failCount++;
          return;
        }

        const success = await submitVote(ELECTION_IDENTIFIER, token, {
          [capitalBallot.title]: ballotData
        });
        
        if (success) {
          successCount++;
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          
          if (currentVoteIndex % 100 === 0 || Math.floor(elapsedSeconds) % 10 === 0) {
            const rate = (successCount / elapsedSeconds).toFixed(0);
            const cityCounts: Record<string, number> = {};
            for (let i = 0; i <= currentVoteIndex; i++) {
              const city = getVoterCity(i);
              cityCounts[city] = (cityCounts[city] || 0) + 1;
            }
            console.log(`  Progress: ${successCount} votes (${rate} votes/sec)`);
            console.log(`    City distribution: Memphis: ${cityCounts.memphis || 0}, Nashville: ${cityCounts.nashville || 0}, Knoxville: ${cityCounts.knoxville || 0}, Chattanooga: ${cityCounts.chattanooga || 0}`);
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
    
    await new Promise(resolve => setTimeout(resolve, VOTE_DELAY_MS));
  }

  await Promise.all(Array.from(inFlight));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=== Results ===');
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⏱️  Time: ${elapsed}s`);
  console.log(`📊 Rate: ${(successCount / parseFloat(elapsed)).toFixed(1)} votes/sec`);
  
  const finalCityCounts: Record<string, number> = {};
  for (let i = 0; i < NUM_VOTES; i++) {
    const city = getVoterCity(i);
    finalCityCounts[city] = (finalCityCounts[city] || 0) + 1;
  }
  console.log('\nFinal voter distribution:');
  console.log(`  Memphis: ${finalCityCounts.memphis || 0} (${((finalCityCounts.memphis || 0) / NUM_VOTES * 100).toFixed(1)}%)`);
  console.log(`  Nashville: ${finalCityCounts.nashville || 0} (${((finalCityCounts.nashville || 0) / NUM_VOTES * 100).toFixed(1)}%)`);
  console.log(`  Knoxville: ${finalCityCounts.knoxville || 0} (${((finalCityCounts.knoxville || 0) / NUM_VOTES * 100).toFixed(1)}%)`);
  console.log(`  Chattanooga: ${finalCityCounts.chattanooga || 0} (${((finalCityCounts.chattanooga || 0) / NUM_VOTES * 100).toFixed(1)}%)`);
}

main().catch(console.error);
