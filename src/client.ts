import { PostcodeEuError, ConfigurationError } from './errors.js';
import type {
  PostcodeEuClientConfig,
  AutocompleteOptions,
  GetDetailsOptions,
  AutocompleteResponse,
  AddressDetails,
  ValidateParams,
  ValidationResponse,
  BuildingListMode,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.postcode.eu';

/**
 * Client for the Postcode.eu International Address API
 *
 * @example
 * ```typescript
 * const client = new PostcodeEuClient({
 *   apiKey: 'your-api-key',
 *   apiSecret: 'your-api-secret',
 * });
 *
 * // Get address suggestions
 * const suggestions = await client.autocomplete('nld', 'amsterdam');
 *
 * // Get full address details
 * const details = await client.getDetails(suggestions.matches[0].context);
 *
 * // Validate a postal code
 * const validation = await client.validate('nld', '1012AB');
 * ```
 */
export class PostcodeEuClient {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly baseUrl: string;
  private readonly authHeader: string;

  /**
   * Create a new PostcodeEuClient instance
   *
   * @param config - Configuration options
   * @throws {ConfigurationError} If apiKey or apiSecret is missing
   */
  constructor(config: PostcodeEuClientConfig) {
    if (!config.apiKey) {
      throw new ConfigurationError('apiKey is required');
    }
    if (!config.apiSecret) {
      throw new ConfigurationError('apiSecret is required');
    }

    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') ?? DEFAULT_BASE_URL;

    // Pre-compute the authorization header
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    const encoded =
      typeof Buffer !== 'undefined'
        ? Buffer.from(credentials).toString('base64')
        : btoa(credentials);
    this.authHeader = `Basic ${encoded}`;
  }

  /**
   * Make an authenticated request to the API
   */
  private async request<T>(
    endpoint: string,
    options?: {
      params?: Record<string, string | undefined>;
      session?: string;
    }
  ): Promise<T> {
    // Build URL with query parameters
    const url = new URL(endpoint, this.baseUrl);
    if (options?.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      Accept: 'application/json',
    };

    // Add session header if provided
    if (options?.session) {
      headers['X-Autocomplete-Session'] = options.session;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw await PostcodeEuError.fromResponse(response);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get address autocomplete suggestions
   *
   * @param context - Context for the search. Must start with a 3-letter ISO 3166-1 Alpha-3 country code (e.g., "nld", "bel", "deu"). On drilldown, use the context from the selected match.
   * @param term - Search term (e.g., "Damrak 1", "2012ES 30"). On drilldown, use the value from the selected match unchanged.
   * @param language - Language tag for localized results (e.g., "nl-NL", "fr-FR", "en-GB")
   * @param buildingListMode - How to present building suggestions: "short" (first few) or "paged" (allows browsing)
   * @param options - Additional options
   * @returns Autocomplete response with matching suggestions
   *
   * @example
   * ```typescript
   * // Search in the Netherlands
   * const results = await client.autocomplete('nld', 'amsterdam kalver', 'nl-NL', 'paged');
   *
   * // Continue searching within a context - use value and context from selected match
   * const match = results.matches[0];
   * const moreResults = await client.autocomplete(match.context, match.value, 'nl-NL', 'paged');
   * ```
   */
  async autocomplete(
    context: string,
    term: string,
    language: string,
    buildingListMode: BuildingListMode,
    options: AutocompleteOptions = {}
  ): Promise<AutocompleteResponse> {
    const encodedContext = encodeURIComponent(context);
    const encodedTerm = encodeURIComponent(term);
    const encodedLanguage = encodeURIComponent(language);
    const endpoint = `/international/v1/autocomplete/${encodedContext}/${encodedTerm}/${encodedLanguage}/${buildingListMode}`;

    return this.request<AutocompleteResponse>(endpoint, {
      session: options.session,
    });
  }

  /**
   * Get full address details for a selected autocomplete match
   *
   * @param context - Context string from an autocomplete match with precision "Address"
   * @param dispatchCountry - Dispatching country ISO3 code, used to determine country address line presence. Pass empty string "" if not needed.
   * @param options - Additional options
   * @returns Full address details including formatted mail lines
   *
   * @example
   * ```typescript
   * const suggestions = await client.autocomplete('nld', 'amsterdam kalverstraat 1', 'nl-NL', 'paged');
   * const addressMatch = suggestions.matches.find(m => m.precision === 'Address');
   * if (addressMatch) {
   *   // Include country in mailLines when dispatching from Belgium
   *   const details = await client.getDetails(addressMatch.context, 'bel');
   *   console.log(details.mailLines); // ['Kalverstraat 1', '1012 PA Amsterdam', 'Netherlands']
   *
   *   // Or without country line
   *   const detailsNoCountry = await client.getDetails(addressMatch.context, '');
   *   console.log(detailsNoCountry.mailLines); // ['Kalverstraat 1', '1012 PA Amsterdam']
   * }
   * ```
   */
  async getDetails(
    context: string,
    dispatchCountry: string,
    options: GetDetailsOptions = {}
  ): Promise<AddressDetails> {
    const encodedContext = encodeURIComponent(context);
    const encodedDispatchCountry = encodeURIComponent(dispatchCountry);
    const endpoint = `/international/v1/address/${encodedContext}/${encodedDispatchCountry}`;

    return this.request<AddressDetails>(endpoint, {
      session: options.session,
    });
  }

  /**
   * Validate and correct a full address from raw input fields
   *
   * @param country - ISO 3166-1 alpha-3 country code (e.g., "nld", "bel", "deu"), must be lowercase
   * @param params - Address components to validate
   * @returns Validation response with matches ordered from best to worst
   *
   * @example
   * ```typescript
   * // Validate with separate fields
   * const result = await client.validate('nld', {
   *   postcode: '1012AB',
   *   street: 'Kalverstraat',
   *   building: '1',
   *   locality: 'Amsterdam',
   * });
   *
   * if (result.matches.length > 0) {
   *   const bestMatch = result.matches[0];
   *   console.log(`Grade: ${bestMatch.status.grade}`);
   *   console.log(`Validation level: ${bestMatch.status.validationLevel}`);
   *   console.log(`Address: ${bestMatch.mailLines?.join(', ')}`);
   * }
   *
   * // Validate with combined street and building
   * const result2 = await client.validate('nld', {
   *   postcode: '1012AB',
   *   streetAndBuilding: 'Kalverstraat 1',
   *   locality: 'Amsterdam',
   * });
   * ```
   */
  async validate(
    country: string,
    params: ValidateParams = {}
  ): Promise<ValidationResponse> {
    const encodedCountry = encodeURIComponent(country.toLowerCase());
    const endpoint = `/international/v1/validate/${encodedCountry}`;

    return this.request<ValidationResponse>(endpoint, {
      params: {
        postcode: params.postcode,
        locality: params.locality,
        street: params.street,
        building: params.building,
        region: params.region,
        streetAndBuilding: params.streetAndBuilding,
      },
    });
  }
}
