import crypto from 'crypto';

/**
 * RFC 8785: JSON Canonicalization Scheme (JCS) implementation.
 *
 * Requirements:
 * 1. Whitespace: No whitespace outside of string literals.
 * 2. Key ordering: Object property keys are sorted lexicographically by UTF-16 code units.
 * 3. Numbers: Serialized according to ECMAScript specification (IEEE 754 64-bit double).
 *    No unnecessary exponents, -0 is serialized as 0.
 * 4. Strings: Control characters (U+0000..U+001F) escaped as \u00XX.
 *    Quotes \" and backslashes \\ escaped. Solidus / NOT escaped.
 * 5. UTF-8 encoded bytes for hashing.
 */

export function canonicalizeJson(data: any): string {
  if (data === null || data === undefined) {
    return 'null';
  }

  if (typeof data === 'boolean') {
    return data ? 'true' : 'false';
  }

  if (typeof data === 'number') {
    if (!Number.isFinite(data)) {
      throw new TypeError('Cannot canonicalize non-finite number');
    }
    // Handle -0 -> 0 per RFC 8785
    if (Object.is(data, -0)) {
      return '0';
    }
    // ECMAScript Number.prototype.toString produces the exact representation specified in RFC 8785
    return data.toString();
  }

  if (typeof data === 'string') {
    return escapeString(data);
  }

  if (Array.isArray(data)) {
    const elements = data.map(item => canonicalizeJson(item === undefined ? null : item));
    return `[${elements.join(',')}]`;
  }

  if (typeof data === 'object') {
    // Sort object keys by UTF-16 code unit values
    const keys = Object.keys(data).sort((a, b) => {
      const minLen = Math.min(a.length, b.length);
      for (let i = 0; i < minLen; i++) {
        const codeA = a.charCodeAt(i);
        const codeB = b.charCodeAt(i);
        if (codeA !== codeB) {
          return codeA - codeB;
        }
      }
      return a.length - b.length;
    });

    const entries: string[] = [];
    for (const key of keys) {
      const val = data[key];
      // RFC 8785: omit undefined properties
      if (val === undefined || typeof val === 'symbol' || typeof val === 'function') {
        continue;
      }
      entries.push(`${escapeString(key)}:${canonicalizeJson(val)}`);
    }

    return `{${entries.join(',')}}`;
  }

  return 'null';
}

function escapeString(str: string): string {
  let result = '"';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const code = str.charCodeAt(i);

    switch (char) {
      case '"':
        result += '\\"';
        break;
      case '\\':
        result += '\\\\';
        break;
      case '\b':
        result += '\\b';
        break;
      case '\f':
        result += '\\f';
        break;
      case '\n':
        result += '\\n';
        break;
      case '\r':
        result += '\\r';
        break;
      case '\t':
        result += '\\t';
        break;
      default:
        if (code <= 0x1f) {
          result += `\\u00${code.toString(16).padStart(2, '0')}`;
        } else {
          result += char;
        }
    }
  }
  result += '"';
  return result;
}

/**
 * Computes deterministic SHA-256 hash in hexadecimal format
 */
export function hashCanonicalPayload(data: any): string {
  const canonicalString = canonicalizeJson(data);
  return crypto.createHash('sha256').update(Buffer.from(canonicalString, 'utf8')).digest('hex');
}

/**
 * Builds the canonical message string that the Android Keystore must sign for approval
 */
export function buildCanonicalApprovalMessage(params: {
  requestId: string;
  deviceId: string;
  actionType: string;
  targetObjectId: string;
  canonicalPayloadHash: string;
  nonce: string;
  expiresAt: string;
}): string {
  return [
    'MONOVOICE_ACTION_APPROVAL_V2',
    `requestId:${params.requestId}`,
    `deviceId:${params.deviceId}`,
    `actionType:${params.actionType}`,
    `targetObjectId:${params.targetObjectId}`,
    `canonicalPayloadHash:${params.canonicalPayloadHash}`,
    `nonce:${params.nonce}`,
    `expiresAt:${params.expiresAt}`
  ].join('\n');
}

/**
 * Builds the canonical HTTP request authentication string that the phone must sign
 */
export function buildDeviceRequestMessage(params: {
  method: string;
  path: string;
  bodyHash: string;
  deviceId: string;
  authChallenge: string;
  expiresAt: string;
}): string {
  return [
    'MONOVOICE_DEVICE_REQUEST_V1',
    `method:${params.method.toUpperCase()}`,
    `path:${params.path}`,
    `bodyHash:${params.bodyHash}`,
    `deviceId:${params.deviceId}`,
    `authChallenge:${params.authChallenge}`,
    `expiresAt:${params.expiresAt}`
  ].join('\n');
}
