/**
 * Quick script to test which Claude models work with your API key
 * Run: npx tsx check-models.ts
 */

import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

console.log(`Testing API key: ${apiKey.substring(0, 15)}...`);
console.log('Key type:', apiKey.startsWith('sk-ant-api03') ? 'API v3' : 'Standard');
console.log('\nTesting models...\n');

const client = new Anthropic({ apiKey });

const modelsToTest = [
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
  'claude-3-5-haiku-20241022',
];

async function testModel(model: string) {
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 5,
      messages: [{ role: 'user', content: 'hi' }],
    });
    console.log(`✅ ${model} - WORKS`);
    return true;
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('not_found')) {
      console.log(`❌ ${model} - Model not found`);
    } else if (errorMsg.includes('authentication')) {
      console.log(`❌ ${model} - Auth error`);
    } else {
      console.log(`❌ ${model} - ${errorMsg.substring(0, 50)}`);
    }
    return false;
  }
}

async function main() {
  const results: string[] = [];
  
  for (const model of modelsToTest) {
    const works = await testModel(model);
    if (works) {
      results.push(model);
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  if (results.length > 0) {
    console.log('✅ Working models:');
    results.forEach(m => console.log(`   ${m}`));
    console.log('\nUse one of these with --model flag:');
    console.log(`   npx tsx src/fetch-dictionary-definitions.ts --model ${results[0]} --max-cost 1.00`);
  } else {
    console.log('❌ No working models found');
    console.log('\nPossible issues:');
    console.log('1. API key may not have access to these models');
    console.log('2. Check your Anthropic console: https://console.anthropic.com/');
    console.log('3. Verify your API key permissions');
  }
}

main().catch(console.error);

