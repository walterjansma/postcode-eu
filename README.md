# postcode-eu

A lightweight TypeScript client for the [Postcode.eu](https://www.postcode.eu/) International Address API.

> **Note:** This package is not affiliated with Postcode.eu. You need your own [Postcode.eu API credentials](https://www.postcode.eu/) to use this package.

## Features

- Zero dependencies (uses native `fetch`)
- Fully typed with TypeScript
- Supports ESM and CommonJS
- Node.js 18+

## Installation

```bash
npm install postcode-eu
```

## Quick Start

```typescript
import { PostcodeEuClient } from 'postcode-eu';

const client = new PostcodeEuClient({
  apiKey: 'your-api-key',
  apiSecret: 'your-api-secret',
});

// Autocomplete
const suggestions = await client.autocomplete('nld', 'amsterdam kalver', 'nl-NL', 'paged');

// Get full address details
const details = await client.getDetails(suggestions.matches[0].context, 'nld');

// Validate an address
const validation = await client.validate('nld', {
  postcode: '1012AB',
  street: 'Kalverstraat',
  building: '1',
});
```

## Usage

This package is designed for **backend use**. While autocomplete is typically a frontend UX pattern, you should use this package server-side to:

1. **Keep API credentials secure** - Never expose your API key in browser code
2. **Proxy requests** - Your frontend calls your backend, which calls Postcode.eu

```
Frontend → Your Backend API → Postcode.eu API
```

## API Reference

### `autocomplete(context, term, language, buildingListMode, options?)`

Get address suggestions as users type.

```typescript
const result = await client.autocomplete('nld', 'amsterdam', 'nl-NL', 'paged');
// result.matches: [{ value, label, context, precision, highlights }]

// Drilldown with selected match
const more = await client.autocomplete(result.matches[0].context, result.matches[0].value, 'nl-NL', 'paged');
```

**Parameters:**
- `context` - Country code (`"nld"`, `"bel"`, `"deu"`) or context from previous match
- `term` - Search term (use `value` from selected match on drilldown)
- `language` - Language tag (`"nl-NL"`, `"en-GB"`, `"de-DE"`)
- `buildingListMode` - `"short"` or `"paged"` (recommended)
- `options.session` - Optional session ID for billing optimization

**Precision levels:** `None`, `Locality`, `PostalCode`, `Street`, `Address`

---

### `getDetails(context, dispatchCountry, options?)`

Get full address details for a match with precision `"Address"`.

```typescript
const details = await client.getDetails(match.context, 'nld');
// details: { address, mailLines, location, country, isPoBox }
```

**Parameters:**
- `context` - Context from an autocomplete match
- `dispatchCountry` - ISO3 code for mailLines formatting (use `""` to omit country line)
- `options.session` - Optional session ID

---

### `validate(country, params)`

Validate and correct address data.

```typescript
const result = await client.validate('nld', {
  postcode: '1012PA',
  street: 'Kalverstraat',
  building: '1',
  locality: 'Amsterdam',
});

if (result.matches.length > 0) {
  const best = result.matches[0];
  console.log(best.status.grade);           // 'A' to 'F'
  console.log(best.status.validationLevel); // 'Building', 'Street', 'Locality', 'None'
  console.log(best.address);                // Corrected address
}
```

**Parameters:**
- `country` - ISO3 country code (lowercase)
- `params` - `{ postcode, locality, street, building, region, streetAndBuilding }`

---

## Error Handling

```typescript
import { PostcodeEuError } from 'postcode-eu';

try {
  await client.validate('nld', { postcode: '1234AB' });
} catch (error) {
  if (error instanceof PostcodeEuError) {
    console.log(error.statusCode); // 401, 404, 429
    console.log(error.message);
  }
}
```

## License

MIT