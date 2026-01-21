import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { PostcodeEuClient, PostcodeEuError, ConfigurationError } from '../src/index.js';
import type { AutocompleteResponse, AddressDetails, ValidationResponse } from '../src/index.js';

describe('PostcodeEuClient', () => {
  let client: PostcodeEuClient;
  let fetchMock: Mock;

  beforeEach(() => {
    client = new PostcodeEuClient({
      apiKey: 'test-key',
      apiSecret: 'test-secret',
    });
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create a client with valid credentials', () => {
      const client = new PostcodeEuClient({
        apiKey: 'my-key',
        apiSecret: 'my-secret',
      });
      expect(client).toBeInstanceOf(PostcodeEuClient);
    });

    it('should throw ConfigurationError when apiKey is missing', () => {
      expect(() => {
        new PostcodeEuClient({
          apiKey: '',
          apiSecret: 'secret',
        });
      }).toThrow(ConfigurationError);
      expect(() => {
        new PostcodeEuClient({
          apiKey: '',
          apiSecret: 'secret',
        });
      }).toThrow('apiKey is required');
    });

    it('should throw ConfigurationError when apiSecret is missing', () => {
      expect(() => {
        new PostcodeEuClient({
          apiKey: 'key',
          apiSecret: '',
        });
      }).toThrow(ConfigurationError);
      expect(() => {
        new PostcodeEuClient({
          apiKey: 'key',
          apiSecret: '',
        });
      }).toThrow('apiSecret is required');
    });

    it('should allow custom baseUrl', () => {
      const client = new PostcodeEuClient({
        apiKey: 'key',
        apiSecret: 'secret',
        baseUrl: 'https://custom.api.example.com/',
      });
      expect(client).toBeInstanceOf(PostcodeEuClient);
    });
  });

  describe('autocomplete', () => {
    const mockResponse: AutocompleteResponse = {
      matches: [
        {
          value: 'Amsterdam',
          label: 'Amsterdam',
          context: 'nld/amsterdam',
          precision: 'Locality',
          highlights: [[0, 9]],
        },
        {
          value: 'Amstelveen',
          label: 'Amstelveen',
          context: 'nld/amstelveen',
          precision: 'Locality',
          highlights: [[0, 4]],
        },
      ],
      newContext: null,
    };

    it('should return autocomplete suggestions', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await client.autocomplete('nld', 'amst', 'nl-NL', 'paged');

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].value).toBe('Amsterdam');
      expect(result.matches[0].precision).toBe('Locality');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/international/v1/autocomplete/nld/amst/nl-NL/paged'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('should include session header when provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.autocomplete('nld', 'test', 'nl-NL', 'short', {
        session: 'abc123',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Autocomplete-Session': 'abc123',
          }),
        })
      );
    });

    it('should include language and buildingListMode in path', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.autocomplete('nld', 'test', 'fr-FR', 'paged');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/fr-FR/paged');
    });

    it('should URL-encode context and term', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await client.autocomplete('nld/amsterdam', 'kalver straat', 'nl-NL', 'paged');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('nld%2Famsterdam');
      expect(calledUrl).toContain('kalver%20straat');
    });

    it('should throw PostcodeEuError on API error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({
          error: 'AuthenticationFailed',
          message: 'Invalid credentials',
        }),
      });

      try {
        await client.autocomplete('nld', 'test', 'nl-NL', 'paged');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PostcodeEuError);
        expect((error as PostcodeEuError).statusCode).toBe(401);
        expect((error as PostcodeEuError).errorType).toBe('AuthenticationFailed');
      }
    });
  });

  describe('getDetails', () => {
    const mockDetails: AddressDetails = {
      language: { code: 'nl', name: 'Dutch' },
      address: {
        country: 'NLD',
        locality: 'Amsterdam',
        street: 'Kalverstraat',
        postcode: '1012 PA',
        building: '1',
      },
      mailLines: ['Kalverstraat 1', '1012 PA Amsterdam', 'Netherlands'],
      location: {
        latitude: 52.3728,
        longitude: 4.8936,
      },
      isPoBox: false,
      country: { iso3Code: 'nld', name: 'Netherlands' },
    };

    it('should return address details', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

      const result = await client.getDetails('nld/amsterdam/kalverstraat/1', 'bel');

      expect(result.address?.country).toBe('NLD');
      expect(result.address?.street).toBe('Kalverstraat');
      expect(result.mailLines).toBeDefined();
      expect(result.location?.latitude).toBe(52.3728);
      expect(result.isPoBox).toBe(false);
    });

    it('should include dispatchCountry in path', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

      await client.getDetails('context123', 'bel');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/international/v1/address/context123/bel');
    });

    it('should include session header when provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

      await client.getDetails('context123', 'bel', {
        session: 'session456',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Autocomplete-Session': 'session456',
          }),
        })
      );
    });

    it('should support empty dispatchCountry', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

      await client.getDetails('context123', '');

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/international/v1/address/context123/');
    });

    it('should throw PostcodeEuError when address not found', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: 'AddressNotFound',
          message: 'The requested address was not found',
        }),
      });

      await expect(client.getDetails('invalid-context', '')).rejects.toThrow(PostcodeEuError);
    });
  });

  describe('validate', () => {
    const mockValidResponse: ValidationResponse = {
      country: { iso3Code: 'nld', name: 'Netherlands' },
      matches: [
        {
          status: {
            grade: 'A',
            validationLevel: 'Building',
            isAmbiguous: false,
          },
          address: {
            country: 'NLD',
            locality: 'Amsterdam',
            street: 'Kalverstraat',
            postcode: '1012 PA',
            building: '1',
          },
          mailLines: ['Kalverstraat 1', '1012 PA Amsterdam', 'Netherlands'],
          location: {
            latitude: 52.3728,
            longitude: 4.8936,
          },
        },
      ],
    };

    it('should return validation result with matches', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidResponse,
      });

      const result = await client.validate('nld', { postcode: '1012PA' });

      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].status.grade).toBe('A');
      expect(result.matches[0].status.validationLevel).toBe('Building');
      expect(result.matches[0].address?.locality).toBe('Amsterdam');
    });

    it('should throw ConfigurationError when country is empty', async () => {
      await expect(client.validate('', { postcode: '1012PA' })).rejects.toThrow(ConfigurationError);
      await expect(client.validate('', { postcode: '1012PA' })).rejects.toThrow('country is required');
    });

    it('should throw ConfigurationError when country is not 3 lowercase letters', async () => {
      // Uppercase should fail
      await expect(client.validate('NLD', { postcode: '1012PA' })).rejects.toThrow(ConfigurationError);
      await expect(client.validate('NLD', { postcode: '1012PA' })).rejects.toThrow(
        'country must be a 3 letter ISO 3166-1 alpha-3 country code'
      );

      // Too short
      await expect(client.validate('nl', { postcode: '1012PA' })).rejects.toThrow(ConfigurationError);

      // Too long
      await expect(client.validate('nldd', { postcode: '1012PA' })).rejects.toThrow(ConfigurationError);

      // Contains numbers
      await expect(client.validate('nl1', { postcode: '1012PA' })).rejects.toThrow(ConfigurationError);

      // Mixed case
      await expect(client.validate('Nld', { postcode: '1012PA' })).rejects.toThrow(ConfigurationError);
    });

    it('should include all query parameters when provided', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidResponse,
      });

      await client.validate('nld', {
        postcode: '1012PA',
        locality: 'Amsterdam',
        street: 'Kalverstraat',
        building: '1',
        region: 'Noord-Holland',
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain('postcode=1012PA');
      expect(calledUrl).toContain('locality=Amsterdam');
      expect(calledUrl).toContain('street=Kalverstraat');
      expect(calledUrl).toContain('building=1');
      expect(calledUrl).toContain('region=Noord-Holland');
    });

    it('should support streetAndBuilding parameter', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidResponse,
      });

      await client.validate('nld', {
        postcode: '1012PA',
        streetAndBuilding: 'Kalverstraat 1',
      });

      const calledUrl = fetchMock.mock.calls[0][0] as string;
      // URLSearchParams encodes spaces as + (application/x-www-form-urlencoded)
      expect(calledUrl).toContain('streetAndBuilding=Kalverstraat+1');
    });

    it('should return empty matches for unvalidated address', async () => {
      const mockEmptyResponse: ValidationResponse = {
        matches: [],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyResponse,
      });

      const result = await client.validate('nld', { postcode: 'INVALID' });

      expect(result.matches).toHaveLength(0);
    });

    it('should handle ambiguous matches', async () => {
      const mockAmbiguousResponse: ValidationResponse = {
        matches: [
          {
            status: {
              grade: 'C',
              validationLevel: 'Street',
              isAmbiguous: true,
            },
          },
          {
            status: {
              grade: 'C',
              validationLevel: 'Street',
              isAmbiguous: true,
            },
          },
        ],
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAmbiguousResponse,
      });

      const result = await client.validate('nld', { street: 'Kerkweg' });

      expect(result.matches).toHaveLength(2);
      expect(result.matches[0].status.isAmbiguous).toBe(true);
    });
  });

  describe('authentication', () => {
    it('should send correct Basic auth header', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [] }),
      });

      await client.autocomplete('nld', 'test', 'nl-NL', 'paged');

      const expectedAuth = 'Basic ' + Buffer.from('test-key:test-secret').toString('base64');
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expectedAuth,
          }),
        })
      );
    });
  });
});

describe('PostcodeEuError', () => {
  it('should create error with all properties', () => {
    const error = new PostcodeEuError(
      'Test error',
      400,
      'ValidationError',
      { error: 'ValidationError', message: 'Test error' }
    );

    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.errorType).toBe('ValidationError');
    expect(error.response).toEqual({ error: 'ValidationError', message: 'Test error' });
    expect(error.name).toBe('PostcodeEuError');
  });

  it('should create error from response with JSON body', async () => {
    const mockResponse = {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({
        error: 'Forbidden',
        message: 'Access denied',
      }),
    } as Response;

    const error = await PostcodeEuError.fromResponse(mockResponse);

    expect(error.message).toBe('Access denied');
    expect(error.statusCode).toBe(403);
    expect(error.errorType).toBe('Forbidden');
  });

  it('should create error from response without JSON body', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => {
        throw new Error('Not JSON');
      },
    } as Response;

    const error = await PostcodeEuError.fromResponse(mockResponse);

    expect(error.message).toBe('Internal Server Error');
    expect(error.statusCode).toBe(500);
    expect(error.errorType).toBe('Unknown');
  });
});

describe('ConfigurationError', () => {
  it('should create error with message', () => {
    const error = new ConfigurationError('Missing config');

    expect(error.message).toBe('Missing config');
    expect(error.name).toBe('ConfigurationError');
  });
});
