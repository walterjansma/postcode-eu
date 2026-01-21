import type { ApiErrorResponse } from './types.js';

/**
 * Custom error class for Postcode.eu API errors
 */
export class PostcodeEuError extends Error {
  /** HTTP status code from the response */
  public readonly statusCode: number;
  /** Error type/code from the API */
  public readonly errorType: string;
  /** Original API error response */
  public readonly response?: ApiErrorResponse;

  constructor(
    message: string,
    statusCode: number,
    errorType: string = 'Unknown',
    response?: ApiErrorResponse
  ) {
    super(message);
    this.name = 'PostcodeEuError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.response = response;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if ('captureStackTrace' in Error) {
      (Error as { captureStackTrace: (target: object, constructor: Function) => void }).captureStackTrace(this, PostcodeEuError);
    }
  }

  /**
   * Create a PostcodeEuError from an API response
   */
  static async fromResponse(response: Response): Promise<PostcodeEuError> {
    let errorData: ApiErrorResponse | undefined;
    let message = `API request failed with status ${response.status}`;
    let errorType = 'Unknown';

    try {
      errorData = (await response.json()) as ApiErrorResponse;
      if (errorData.message) {
        message = errorData.message;
      }
      if (errorData.error) {
        errorType = errorData.error;
      }
    } catch {
      // Response body is not JSON, use status text
      message = response.statusText || message;
    }

    return new PostcodeEuError(message, response.status, errorType, errorData);
  }
}

/**
 * Error thrown when client configuration is invalid
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';

    if ('captureStackTrace' in Error) {
      (Error as { captureStackTrace: (target: object, constructor: Function) => void }).captureStackTrace(this, ConfigurationError);
    }
  }
}
