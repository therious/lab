import { expect, describe, test } from 'vitest';
import { hashToWords, wordsToHash, reverseString } from '../bip39';

describe('reverseString', () => {
  test('reverses a string correctly', () => {
    expect(reverseString('abc123')).toBe('321cba');
    expect(reverseString('hello')).toBe('olleh');
    expect(reverseString('')).toBe('');
  });
});

describe('hashToWords', () => {
  test('converts hash to bip39 phrase', () => {
    const phrase = hashToWords('abc123');
    expect(phrase).toBeTruthy();
    expect(typeof phrase).toBe('string');
    expect(phrase.split(' ').length).toBeGreaterThan(0);
  });

  test('handles different hash lengths', () => {
    const hashes = ['abc123', 'abc12345', '01234567', '012345678'];
    hashes.forEach(hash => {
      const phrase = hashToWords(hash);
      expect(phrase).toBeTruthy();
      expect(phrase.split(' ').length).toBeGreaterThan(0);
    });
  });

  test('respects limit parameter', () => {
    const hash = '0123456789abc';
    const phrase1 = hashToWords(hash, 6);
    const phrase2 = hashToWords(hash, 8);
    expect(phrase1).not.toBe(phrase2);
  });
});

describe('wordsToHash', () => {
  test('converts phrase back to hash', () => {
    const originalHash = 'abc123';
    const phrase = hashToWords(originalHash);
    const recoveredHash = wordsToHash(phrase, originalHash.length);
    expect(recoveredHash).toBe(originalHash);
  });

  test('round-trip conversion works for various hash lengths', () => {
    const testHashes = [
      'abc123',
      'abc12345',
      '01234567',
      '012345678',
      '0123456789',
      '0123456789a',
      '0123456789ab',
      '0123456789abc',
      '8dd2f3e9',
      '8dd2f3e9a',
      '8dd2f3e9ab',
      '8dd2f3e9abc',
      'cad490fd',
      'cad490fda',
      'cad490fdab',
      'cad490fdabc',
    ];

    testHashes.forEach(hash => {
      const phrase = hashToWords(hash);
      const recoveredHash = wordsToHash(phrase, hash.length);
      expect(recoveredHash).toBe(hash);
    });
  });

  test('throws error for invalid phrase', () => {
    expect(() => {
      wordsToHash('invalid word phrase', 6);
    }).toThrow('invalid phrase exception');
  });

  test('handles different hash character lengths correctly', () => {
    const hash = '8dd2f3e9cad490123fdab';
    for (let i = hash.length; i > 4; i--) {
      const nhash = hash.slice(0, i);
      const phrase = hashToWords(nhash);
      const recoveredHash = wordsToHash(phrase, nhash.length);
      expect(recoveredHash).toBe(nhash);
    }
  });
});

describe('hashToWords and wordsToHash integration', () => {
  test('maintains consistency across multiple conversions', () => {
    const testHashes = [
      'abc123',
      '01234567',
      '8dd2f3e9',
      'cad490fd',
      '8dd2f3e9cad490123fdab',
    ];

    testHashes.forEach(hash => {
      const phrase = hashToWords(hash);
      const hash1 = wordsToHash(phrase, hash.length);
      const phrase2 = hashToWords(hash1);
      const hash2 = wordsToHash(phrase2, hash.length);
      
      expect(hash1).toBe(hash);
      expect(hash2).toBe(hash);
    });
  });
});

