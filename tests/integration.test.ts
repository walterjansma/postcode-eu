/**
 * Integration tests for the Postcode.eu API
 *
 * These tests make real API calls and require valid credentials.
 * They are skipped by default in CI.
 *
 * To run these tests locally:
 * 1. Set POSTCODE_EU_API_KEY and POSTCODE_EU_API_SECRET environment variables
 * 2. Run: npm test -- --run integration
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PostcodeEuClient, PostcodeEuError } from '../src/index.js';

const API_KEY = process.env.POSTCODE_EU_API_KEY;
const API_SECRET = process.env.POSTCODE_EU_API_SECRET;
const SKIP_INTEGRATION = !API_KEY || !API_SECRET;

describe.skipIf(SKIP_INTEGRATION)('Integration Tests', () => {
  let client: PostcodeEuClient;

  beforeAll(() => {
    client = new PostcodeEuClient({
      apiKey: API_KEY!,
      apiSecret: API_SECRET!,
    });
  });

  describe('autocomplete', () => {
    it('should return suggestions for Dutch address', async () => {
      const result = await client.autocomplete('nld', 'amsterdam', 'nl-NL', 'paged');

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0]).toHaveProperty('value');
      expect(result.matches[0]).toHaveProperty('context');
      expect(result.matches[0]).toHaveProperty('precision');
    });

    it('should return suggestions for German address', async () => {
      const result = await client.autocomplete('deu', 'berlin', 'de-DE', 'paged');

      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should narrow down results with more specific input', async () => {
      const broad = await client.autocomplete('nld', 'amst', 'nl-NL', 'paged');
      const specific = await client.autocomplete('nld', 'amsterdam kalverstraat', 'nl-NL', 'paged');

      // More specific search should have different results
      expect(broad.matches[0]?.context).not.toBe(specific.matches[0]?.context);
    });
  });

  describe('getDetails', () => {
    it('should return full address details', async () => {
      // First get an address context via autocomplete
      const suggestions = await client.autocomplete('nld', 'amsterdam kalverstraat 1', 'nl-NL', 'paged');

      // Find an address-precision match
      const addressMatch = suggestions.matches.find((m) => m.precision === 'Address');

      if (addressMatch) {
        const details = await client.getDetails(addressMatch.context, 'nld');

        expect(details.address).toBeDefined();
        expect(details.address?.country).toBeDefined();
        expect(details.address?.locality).toBeDefined();
        expect(details.address?.street).toBeDefined();
        expect(details.mailLines).toBeDefined();
      }
    });
  });

  describe('validate', () => {
    it('should validate a correct Dutch address', async () => {
      const result = await client.validate('nld', {
        postcode: '1012AB',
        locality: 'Amsterdam',
      });

      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.matches[0].status.grade).toBeDefined();
      expect(result.matches[0].status.validationLevel).toBeDefined();
    });

    it('should validate with full address details', async () => {
      const result = await client.validate('nld', {
        postcode: '1012PA',
        street: 'Kalverstraat',
        building: '1',
        locality: 'Amsterdam',
      });

      expect(result.matches.length).toBeGreaterThan(0);
      const bestMatch = result.matches[0];
      expect(bestMatch.status.grade).toMatch(/^[A-F]$/);
    });

    it('should validate a correct German address', async () => {
      const result = await client.validate('deu', {
        postcode: '10115',
        locality: 'Berlin',
      });

      expect(result.matches.length).toBeGreaterThan(0);
    });

    it('should return empty matches for invalid address', async () => {
      const result = await client.validate('nld', {
        postcode: '0000AA',
      });

      // Invalid addresses may return no matches or low-grade matches
      if (result.matches.length > 0) {
        expect(['D', 'E', 'F']).toContain(result.matches[0].status.grade);
      }
    });

    it('should support streetAndBuilding parameter', async () => {
      const result = await client.validate('nld', {
        postcode: '1012PA',
        streetAndBuilding: 'Kalverstraat 1',
      });

      expect(result.matches.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid credentials', async () => {
      const badClient = new PostcodeEuClient({
        apiKey: 'invalid-key',
        apiSecret: 'invalid-secret',
      });

      await expect(badClient.autocomplete('nld', 'test', 'nl-NL', 'paged')).rejects.toThrow(PostcodeEuError);
    });
  });
});
