/**
 * Postcode.eu International Address API Client
 *
 * A lightweight TypeScript client for the Postcode.eu API,
 * providing address autocomplete, details, and validation.
 *
 * @packageDocumentation
 */

export { PostcodeEuClient } from './client.js';
export { PostcodeEuError, ConfigurationError } from './errors.js';
export type {
  // Client configuration
  PostcodeEuClientConfig,
  AutocompleteOptions,
  GetDetailsOptions,
  // Autocomplete types
  AutocompleteResponse,
  AutocompleteMatch,
  AutocompletePrecision,
  HighlightRange,
  BuildingListMode,
  // Address details types
  AddressDetails,
  Address,
  GeoLocation,
  // Validation types
  ValidateParams,
  ValidationResponse,
  ValidationMatch,
  ValidationStatus,
  ValidationGrade,
  ValidationLevel,
  Country,
  Language,
  AddressDetailsExtended,
  // Error types
  ApiErrorResponse,
} from './types.js';
