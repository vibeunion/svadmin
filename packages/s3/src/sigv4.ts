import { createHash, createHmac, type BinaryLike } from 'node:crypto';

const EMPTY_PAYLOAD_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export function awsUriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/gu, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** Encode an object key without encoding the `/` separators. */
export function encodeObjectKey(key: string): string {
  return key.split('/').map((segment) => awsUriEncode(segment)).join('/');
}

export interface AwsV4SignInput {
  method: string;
  host: string;
  canonicalUri: string;
  query: readonly (readonly [string, string])[];
  region: string;
  service?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  now: Date;
  payload?: string;
  extraHeaders?: Readonly<Record<string, string>>;
}

export interface AwsV4SignedRequest {
  headers: Record<string, string>;
  canonicalQuery: string;
  canonicalRequest: string;
  signature: string;
}

function timestamps(now: Date): { amzDate: string; dateStamp: string } {
  const amzDate = now.toISOString().replace(/[-:]/gu, '').replace(/\.\d{3}/u, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmacSha256(key: BinaryLike, value: string): Buffer {
  return createHmac('sha256', key).update(value, 'utf8').digest();
}

function headerValue(value: string): string {
  return value.trim().replace(/[ \t]+/gu, ' ');
}

export function canonicalQueryString(query: readonly (readonly [string, string])[]): string {
  return query
    .map(([key, value]) => [awsUriEncode(key), awsUriEncode(value)] as const)
    .sort((left, right) => {
      if (left[0] < right[0]) return -1;
      if (left[0] > right[0]) return 1;
      if (left[1] < right[1]) return -1;
      if (left[1] > right[1]) return 1;
      return 0;
    })
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
}

/**
 * Sign one S3 request with AWS Signature Version 4.
 * The payload hash is the SHA-256 of the body. GET and HEAD use the empty-string hash.
 */
export function signAwsV4(input: AwsV4SignInput): AwsV4SignedRequest {
  const service = input.service ?? 's3';
  const { amzDate, dateStamp } = timestamps(input.now);
  const payloadHash = input.payload === undefined || input.payload.length === 0
    ? EMPTY_PAYLOAD_HASH
    : sha256Hex(input.payload);
  const headers = new Map<string, string>();
  headers.set('host', headerValue(input.host));
  headers.set('x-amz-content-sha256', payloadHash);
  headers.set('x-amz-date', amzDate);
  if (input.sessionToken !== undefined && input.sessionToken.length > 0) {
    headers.set('x-amz-security-token', headerValue(input.sessionToken));
  }
  if (input.extraHeaders) {
    for (const [name, value] of Object.entries(input.extraHeaders)) {
      headers.set(name.toLowerCase(), headerValue(value));
    }
  }

  const names = [...headers.keys()].sort();
  const canonicalHeaders = names.map((name) => `${name}:${headers.get(name) ?? ''}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalQuery = canonicalQueryString(input.query);
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const dateKey = hmacSha256(`AWS4${input.secretAccessKey}`, dateStamp);
  const regionKey = hmacSha256(dateKey, input.region);
  const serviceKey = hmacSha256(regionKey, service);
  const signingKey = hmacSha256(serviceKey, 'aws4_request');
  const signature = hmacSha256(signingKey, stringToSign).toString('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const requestHeaders: Record<string, string> = { authorization };
  for (const name of names) {
    const value = headers.get(name);
    if (value !== undefined) requestHeaders[name] = value;
  }
  return { headers: requestHeaders, canonicalQuery, canonicalRequest, signature };
}
