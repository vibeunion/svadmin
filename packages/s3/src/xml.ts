export interface ListedObject {
  key: string;
  size: number;
  lastModified: string | null;
  etag: string | null;
  storageClass: string | null;
}

export interface ListBucketPage {
  objects: ListedObject[];
  prefixes: string[];
  isTruncated: boolean;
  nextContinuationToken: string | null;
}

export interface S3ErrorBody {
  code: string | null;
  message: string | null;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/gu, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_match, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&');
}

function tagText(block: string, tag: string): string | null {
  const match = new RegExp(`<(?:[\\w.-]+:)?${tag}>([\\s\\S]*?)</(?:[\\w.-]+:)?${tag}>`, 'u').exec(block);
  const text = match?.[1];
  if (text === undefined) return null;
  return decodeXmlEntities(text.trim());
}

function decodeListedText(value: string, urlEncoded: boolean): string {
  if (!urlEncoded) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    throw new Error('@svadmin/s3 could not decode an object key from the S3 listing');
  }
}

function stripEtag(value: string | null): string | null {
  if (value === null) return null;
  const unquoted = value.startsWith('W/') ? value.slice(2) : value;
  if (unquoted.startsWith('"') && unquoted.endsWith('"') && unquoted.length >= 2) {
    return unquoted.slice(1, -1);
  }
  return unquoted;
}

export function parseListBucketResult(xml: string): ListBucketPage {
  const urlEncoded = /<(?:[\w.-]+:)?EncodingType>\s*url\s*</iu.test(xml);
  const objects: ListedObject[] = [];
  for (const match of xml.matchAll(/<(?:[\w.-]+:)?Contents>([\s\S]*?)<\/(?:[\w.-]+:)?Contents>/gu)) {
    const block = match[1] ?? '';
    const rawKey = tagText(block, 'Key');
    if (rawKey === null) continue;
    const size = Number(tagText(block, 'Size') ?? '0');
    objects.push({
      key: decodeListedText(rawKey, urlEncoded),
      size: Number.isFinite(size) ? size : 0,
      lastModified: tagText(block, 'LastModified'),
      etag: stripEtag(tagText(block, 'ETag')),
      storageClass: tagText(block, 'StorageClass'),
    });
  }

  const prefixes: string[] = [];
  for (const match of xml.matchAll(/<(?:[\w.-]+:)?CommonPrefixes>([\s\S]*?)<\/(?:[\w.-]+:)?CommonPrefixes>/gu)) {
    const rawPrefix = tagText(match[1] ?? '', 'Prefix');
    if (rawPrefix !== null) prefixes.push(decodeListedText(rawPrefix, urlEncoded));
  }

  const token = tagText(xml, 'NextContinuationToken');
  return {
    objects,
    prefixes,
    isTruncated: tagText(xml, 'IsTruncated') === 'true',
    nextContinuationToken: token === null ? null : decodeListedText(token, urlEncoded),
  };
}

export function parseS3Error(xml: string): S3ErrorBody {
  return {
    code: tagText(xml, 'Code'),
    message: tagText(xml, 'Message'),
  };
}
