/**
 * Configuration options for the PostcodeEuClient
 */
export interface PostcodeEuClientConfig {
  /** Your Postcode.eu API key */
  apiKey: string;
  /** Your Postcode.eu API secret */
  apiSecret: string;
  /** Base URL for the API (defaults to https://api.postcode.eu) */
  baseUrl?: string;
}

/**
 * Options for autocomplete requests
 */
export interface AutocompleteOptions {
  /** Session identifier for billing optimization (X-Autocomplete-Session header) */
  session?: string;
}

/**
 * Building list mode for autocomplete
 */
export type BuildingListMode = 'short' | 'paged';

/**
 * Options for getting address details
 */
export interface GetDetailsOptions {
  /** Session identifier (X-Autocomplete-Session header, should match the one used in autocomplete) */
  session?: string;
}

/**
 * A single autocomplete match/suggestion
 */
export interface AutocompleteMatch {
  /**
   * The value represents all matched address information.
   * If the user selects this match, the current term input must be replaced with this value.
   * Important: Do not alter this string - spacing and casing must remain unchanged.
   */
  value: string;
  /** Label describing this match (e.g., a street or municipality name) */
  label: string;
  /**
   * If the user selects this match, use this as the context parameter in subsequent autocomplete call.
   * Contexts may expire and should not be stored.
   */
  context: string;
  /** Match precision, used to know what type of address information is available */
  precision: AutocompletePrecision;
  /** Character index pairs for highlighting matched portions in the label */
  highlights: HighlightRange[];
  /** Additional information relevant to this match, helps with disambiguation (e.g., postal code for a street) */
  description?: string;
}

/**
 * Precision levels for autocomplete matches
 */
export type AutocompletePrecision =
  | 'None'
  | 'Locality'
  | 'PostalCode'
  | 'Street'
  | 'Address';

/**
 * A range of characters to highlight [start, end]
 */
export type HighlightRange = [start: number, end: number];

/**
 * Response from the autocomplete endpoint
 */
export interface AutocompleteResponse {
  /** Array of matching suggestions */
  matches: AutocompleteMatch[];
  /** New context required for further autocomplete requests. Null if no context update is required. */
  newContext?: string | null;
}

/**
 * Full address details returned by getDetails
 */
export interface AddressDetails {
  /** Language information */
  language?: Language;
  /** The complete address information */
  address?: Address;
  /** Formatted address lines for mailing */
  mailLines?: string[];
  /** Geographic coordinates */
  location?: GeoLocation;
  /** Whether this is a PO Box address */
  isPoBox?: boolean;
  /** Country information */
  country?: Country;
  /** Additional country-specific address details */
  details?: AddressDetailsExtended;
}

/**
 * Structured address components
 */
export interface Address {
  /** ISO 3166-1 alpha-3 country code */
  country: string;
  /** Locality/city name */
  locality: string;
  /** Street name */
  street: string;
  /** Postal code */
  postcode: string;
  /** Building number/identifier */
  building: string;
  /** Building number addition (e.g., apartment number) */
  buildingNumber?: number;
  /** Building number addition */
  buildingNumberAddition?: string;
  /** Region/state/province */
  region?: string;
  /** Sublocality/district */
  sublocality?: string;
}

/**
 * Geographic coordinates
 */
export interface GeoLocation {
  /** Latitude in decimal degrees */
  latitude: number;
  /** Longitude in decimal degrees */
  longitude: number;
  /** Precision indicator of the coordinates */
  precision?: string;
}

/**
 * Input parameters for address validation
 * Note: streetAndBuilding cannot be used together with street or building
 */
export interface ValidateParams {
  /** The postcode */
  postcode?: string;
  /** The locality name */
  locality?: string;
  /** The street name, without building number or name */
  street?: string;
  /** The full building number, including any additions (e.g., "4 A") */
  building?: string;
  /** The region name (province, state, etc.) - useful for disambiguation */
  region?: string;
  /** The street name and building number combined. Cannot be used with street or building params */
  streetAndBuilding?: string;
}

/**
 * Response from the validate endpoint
 */
export interface ValidationResponse {
  /** Country information */
  country?: Country;
  /** List of matches ordered from best to worst */
  matches: ValidationMatch[];
}

/**
 * A single validation match
 */
export interface ValidationMatch {
  /** Match status information */
  status: ValidationStatus;
  /** Language information */
  language?: Language;
  /** The validated address */
  address?: Address;
  /** Formatted address lines for mailing */
  mailLines?: string[];
  /** Geographic coordinates */
  location?: GeoLocation;
  /** Whether this is a PO Box address */
  isPoBox?: boolean;
  /** Country information */
  country?: Country;
  /** Additional address details */
  details?: AddressDetailsExtended;
}

/**
 * Validation status indicating match quality
 */
export interface ValidationStatus {
  /** Grade indicating match quality: A (perfect) to F (extremely poor) */
  grade: ValidationGrade;
  /** Indicates up to which address element the match is validated */
  validationLevel: ValidationLevel;
  /** Whether this match is ambiguous (too similar to other matches) */
  isAmbiguous: boolean;
}

/**
 * Validation grade from A (best) to F (worst)
 */
export type ValidationGrade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * Validation level indicating how much of the address was validated
 */
export type ValidationLevel =
  | 'Building'
  | 'BuildingPartial'
  | 'Street'
  | 'Locality'
  | 'None';

/**
 * Country information
 */
export interface Country {
  /** ISO 3166-1 alpha-3 country code */
  iso3Code?: string;
  /** Country name */
  name?: string;
}

/**
 * Language information
 */
export interface Language {
  /** Language code */
  code?: string;
  /** Language name */
  name?: string;
}

/**
 * Extended address details
 */
export interface AddressDetailsExtended {
  /** Additional structured data about the address */
  [key: string]: unknown;
}

/**
 * Error response from the API
 */
export interface ApiErrorResponse {
  /** Error type/code */
  error: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: Record<string, unknown>;
}
