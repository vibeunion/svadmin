export interface PhoneDialCode {
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  /** International dialling prefix without the leading `+`. */
  dial: string;
  name: string;
}

/** Curated dialling codes covering common enterprise locales; hosts can pass their own list. */
export const PHONE_DIAL_CODES: readonly PhoneDialCode[] = [
  { country: 'AR', dial: '54', name: 'Argentina' },
  { country: 'AU', dial: '61', name: 'Australia' },
  { country: 'AT', dial: '43', name: 'Austria' },
  { country: 'BH', dial: '973', name: 'Bahrain' },
  { country: 'BD', dial: '880', name: 'Bangladesh' },
  { country: 'BE', dial: '32', name: 'Belgium' },
  { country: 'BR', dial: '55', name: 'Brazil' },
  { country: 'BG', dial: '359', name: 'Bulgaria' },
  { country: 'CA', dial: '1', name: 'Canada' },
  { country: 'CL', dial: '56', name: 'Chile' },
  { country: 'CN', dial: '86', name: 'China' },
  { country: 'CO', dial: '57', name: 'Colombia' },
  { country: 'HR', dial: '385', name: 'Croatia' },
  { country: 'CZ', dial: '420', name: 'Czechia' },
  { country: 'DK', dial: '45', name: 'Denmark' },
  { country: 'EG', dial: '20', name: 'Egypt' },
  { country: 'EE', dial: '372', name: 'Estonia' },
  { country: 'FI', dial: '358', name: 'Finland' },
  { country: 'FR', dial: '33', name: 'France' },
  { country: 'DE', dial: '49', name: 'Germany' },
  { country: 'GR', dial: '30', name: 'Greece' },
  { country: 'HK', dial: '852', name: 'Hong Kong' },
  { country: 'HU', dial: '36', name: 'Hungary' },
  { country: 'IS', dial: '354', name: 'Iceland' },
  { country: 'IN', dial: '91', name: 'India' },
  { country: 'ID', dial: '62', name: 'Indonesia' },
  { country: 'IE', dial: '353', name: 'Ireland' },
  { country: 'IL', dial: '972', name: 'Israel' },
  { country: 'IT', dial: '39', name: 'Italy' },
  { country: 'JP', dial: '81', name: 'Japan' },
  { country: 'JO', dial: '962', name: 'Jordan' },
  { country: 'KZ', dial: '7', name: 'Kazakhstan' },
  { country: 'KE', dial: '254', name: 'Kenya' },
  { country: 'KW', dial: '965', name: 'Kuwait' },
  { country: 'LV', dial: '371', name: 'Latvia' },
  { country: 'LT', dial: '370', name: 'Lithuania' },
  { country: 'LU', dial: '352', name: 'Luxembourg' },
  { country: 'MY', dial: '60', name: 'Malaysia' },
  { country: 'MT', dial: '356', name: 'Malta' },
  { country: 'MX', dial: '52', name: 'Mexico' },
  { country: 'MA', dial: '212', name: 'Morocco' },
  { country: 'NL', dial: '31', name: 'Netherlands' },
  { country: 'NZ', dial: '64', name: 'New Zealand' },
  { country: 'NG', dial: '234', name: 'Nigeria' },
  { country: 'NO', dial: '47', name: 'Norway' },
  { country: 'OM', dial: '968', name: 'Oman' },
  { country: 'PK', dial: '92', name: 'Pakistan' },
  { country: 'PE', dial: '51', name: 'Peru' },
  { country: 'PH', dial: '63', name: 'Philippines' },
  { country: 'PL', dial: '48', name: 'Poland' },
  { country: 'PT', dial: '351', name: 'Portugal' },
  { country: 'QA', dial: '974', name: 'Qatar' },
  { country: 'RO', dial: '40', name: 'Romania' },
  { country: 'RU', dial: '7', name: 'Russia' },
  { country: 'SA', dial: '966', name: 'Saudi Arabia' },
  { country: 'RS', dial: '381', name: 'Serbia' },
  { country: 'SG', dial: '65', name: 'Singapore' },
  { country: 'SK', dial: '421', name: 'Slovakia' },
  { country: 'SI', dial: '386', name: 'Slovenia' },
  { country: 'ZA', dial: '27', name: 'South Africa' },
  { country: 'KR', dial: '82', name: 'South Korea' },
  { country: 'ES', dial: '34', name: 'Spain' },
  { country: 'LK', dial: '94', name: 'Sri Lanka' },
  { country: 'SE', dial: '46', name: 'Sweden' },
  { country: 'CH', dial: '41', name: 'Switzerland' },
  { country: 'TW', dial: '886', name: 'Taiwan' },
  { country: 'TH', dial: '66', name: 'Thailand' },
  { country: 'TR', dial: '90', name: 'Türkiye' },
  { country: 'UA', dial: '380', name: 'Ukraine' },
  { country: 'AE', dial: '971', name: 'United Arab Emirates' },
  { country: 'GB', dial: '44', name: 'United Kingdom' },
  { country: 'US', dial: '1', name: 'United States' },
  { country: 'UY', dial: '598', name: 'Uruguay' },
  { country: 'UZ', dial: '998', name: 'Uzbekistan' },
  { country: 'VE', dial: '58', name: 'Venezuela' },
  { country: 'VN', dial: '84', name: 'Vietnam' },
] as const;

export function findDialCodeByCountry(
  country: string,
  codes: readonly PhoneDialCode[] = PHONE_DIAL_CODES,
): PhoneDialCode | undefined {
  const target = country.trim().toUpperCase();
  return codes.find((entry) => entry.country === target);
}

const digitsOnly = (value: string): string => value.replace(/\D+/gu, '');

/** Builds an E.164 string (`+<dial><national>`), or an empty string when there is no number. */
export function toE164(
  country: string,
  nationalNumber: string,
  codes: readonly PhoneDialCode[] = PHONE_DIAL_CODES,
): string {
  const national = digitsOnly(nationalNumber);
  if (national.length === 0) return '';
  const entry = findDialCodeByCountry(country, codes);
  if (!entry) return `+${national}`;
  return `+${entry.dial}${national.replace(/^0+/u, '')}`;
}

/** Longest-prefix match so `380` wins over `1` for shared dial prefixes. */
export function splitE164(
  value: string,
  fallbackCountry = 'CN',
  codes: readonly PhoneDialCode[] = PHONE_DIAL_CODES,
): { country: string; nationalNumber: string } {
  const digits = digitsOnly(value);
  if (digits.length === 0) return { country: fallbackCountry, nationalNumber: '' };

  const byDialLength = [...codes].sort((a, b) => b.dial.length - a.dial.length);
  for (const entry of byDialLength) {
    if (digits.startsWith(entry.dial)) {
      return { country: entry.country, nationalNumber: digits.slice(entry.dial.length) };
    }
  }
  return { country: fallbackCountry, nationalNumber: digits };
}

/** Formats a national number in loose groups of 3–4 digits for readability. */
export function formatNationalNumber(value: string): string {
  const digits = digitsOnly(value);
  return digits.replace(/(\d{3,4})(?=\d)/gu, '$1 ').trim();
}