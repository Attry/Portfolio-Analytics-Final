export interface CurrencyInfo {
    code: string;
    symbol: string;
    name: string;
    defaultRateToEuro: number;
    aliases: string[];
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        defaultRateToEuro: 0.8924,
        aliases: ['DOLLAR', 'USD', 'US DOLLAR', 'US$', '$']
    },
    CHF: {
        code: 'CHF',
        symbol: 'CHF ',
        name: 'Swiss Franc',
        defaultRateToEuro: 1.078707,
        aliases: ['CHF', 'SWISS FRANC', 'FRANC']
    },
    GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        defaultRateToEuro: 1.1956,
        aliases: ['GBP', 'POUND', 'STERLING', 'BRITISH POUND', '£']
    },
    JPY: {
        code: 'JPY',
        symbol: '¥',
        name: 'Japanese Yen',
        defaultRateToEuro: 0.005660617,
        aliases: ['JPY', 'YEN', 'JAPANESE YEN', '¥', 'JP¥']
    },
    HKD: {
        code: 'HKD',
        symbol: 'HK$',
        name: 'Hong Kong Dollar',
        defaultRateToEuro: 0.1139645,
        aliases: ['HKD', 'HONG KONG DOLLAR', 'HK$', 'HK DOLLAR']
    },
    SGD: {
        code: 'SGD',
        symbol: 'S$',
        name: 'Singapore Dollar',
        defaultRateToEuro: 0.7002068,
        aliases: ['SGD', 'SINGAPORE DOLLAR', 'S$', 'SG DOLLAR']
    },
    CAD: {
        code: 'CAD',
        symbol: 'C$',
        name: 'Canadian Dollar',
        defaultRateToEuro: 0.6418486,
        aliases: ['CAD', 'CANADIAN DOLLAR', 'C$', 'CA$']
    },
    EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        defaultRateToEuro: 1.0,
        aliases: ['EUR', 'EURO', '€']
    },
    SEK: {
        code: 'SEK',
        symbol: 'kr ',
        name: 'Swedish Krona',
        defaultRateToEuro: 0.087,
        aliases: ['SEK', 'KRONA', 'SWEDISH KRONA']
    },
    NOK: {
        code: 'NOK',
        symbol: 'kr ',
        name: 'Norwegian Krone',
        defaultRateToEuro: 0.088,
        aliases: ['NOK', 'NO', 'KRONE', 'NORWEGIAN KRONE']
    },
    INR: {
        code: 'INR',
        symbol: '₹',
        name: 'Indian Rupee',
        defaultRateToEuro: 1 / 90,
        aliases: ['INR', 'RUPEE', '₹']
    }
};

/**
 * Normalizes any raw currency string (e.g. "Dollar", "USD", "CHF", "GBP", "JPY", "HKD", "SGD", "CAD")
 * into its primary currency code (e.g. "USD", "CHF", "GBP", "JPY", "HKD", "SGD", "CAD", "EUR").
 */
export const normalizeCurrency = (raw?: string | null): string => {
    if (!raw) return 'EUR';
    const cleaned = raw.trim().toUpperCase().replace(/["']/g, '');
    if (!cleaned || cleaned === 'EUR' || cleaned === 'EURO') return 'EUR';

    for (const info of Object.values(SUPPORTED_CURRENCIES)) {
        if (info.code === cleaned || info.aliases.includes(cleaned)) {
            return info.code;
        }
    }

    return cleaned;
};

/**
 * Returns the appropriate currency symbol for display (e.g. "$", "CHF ", "£", "¥", "HK$", "S$", "C$", "€").
 */
export const getCurrencySymbol = (rawCurrency?: string | null, fallback = '€'): string => {
    if (!rawCurrency) return fallback;
    const norm = normalizeCurrency(rawCurrency);
    const info = SUPPORTED_CURRENCIES[norm];
    if (info) return info.symbol;

    if (rawCurrency === 'DOLLAR' || rawCurrency === 'USD') return '$';
    if (rawCurrency === 'CHF') return 'CHF ';
    if (rawCurrency === 'GBP') return '£';
    if (rawCurrency === 'JPY') return '¥';
    if (rawCurrency === 'HKD') return 'HK$';
    if (rawCurrency === 'SGD') return 'S$';
    if (rawCurrency === 'CAD') return 'C$';
    if (rawCurrency === 'EUR') return '€';

    return `${rawCurrency} `;
};

/**
 * Look up the conversion rate of 1 unit of `rawCurrency` into Euro.
 * Checks the given `rates` dictionary for both raw string and normalized code,
 * falling back to default built-in rates if not found in `rates`.
 */
export const getRateToEuro = (rawCurrency?: string | null, rates?: Record<string, number>): number => {
    if (!rawCurrency) return 1.0;
    const norm = normalizeCurrency(rawCurrency);
    if (norm === 'EUR') return 1.0;

    const rawUpper = rawCurrency.trim().toUpperCase().replace(/["']/g, '');

    if (rates) {
        if (rates[rawUpper] && rates[rawUpper] > 0) return rates[rawUpper];
        if (rates[norm] && rates[norm] > 0) return rates[norm];

        const info = SUPPORTED_CURRENCIES[norm];
        if (info) {
            for (const alias of info.aliases) {
                if (rates[alias] && rates[alias] > 0) return rates[alias];
            }
        }
    }

    // Fallback to built-in default conversion ratios
    const info = SUPPORTED_CURRENCIES[norm];
    if (info) return info.defaultRateToEuro;

    return 1.0;
};

/**
 * Takes parsed currency rates from a CSV/sheet and expands all aliases
 * (e.g. if "DOLLAR" is parsed, also sets "USD"; if "GBP" is parsed, also sets "POUND", etc.)
 */
export const expandCurrencyRates = (rawRates: Record<string, number>): Record<string, number> => {
    const result: Record<string, number> = { ...DEFAULT_CURRENCY_RATES };

    for (const [key, rate] of Object.entries(rawRates)) {
        if (!rate || isNaN(rate) || rate <= 0) continue;
        const upper = key.trim().toUpperCase().replace(/["']/g, '');
        result[upper] = rate;

        const norm = normalizeCurrency(upper);
        result[norm] = rate;

        const info = SUPPORTED_CURRENCIES[norm];
        if (info) {
            info.aliases.forEach(alias => {
                result[alias] = rate;
            });
        }
    }

    return result;
};

/**
 * Default preloaded currency rates to Euro (matches Currency conversion sheet)
 */
export const DEFAULT_CURRENCY_RATES: Record<string, number> = {
    EUR: 1.0,
    EURO: 1.0,
    DOLLAR: 0.8924,
    USD: 0.8924,
    CHF: 1.078707,
    GBP: 1.1956,
    POUND: 1.1956,
    JPY: 0.005660617,
    YEN: 0.005660617,
    HKD: 0.1139645,
    SGD: 0.7002068,
    CAD: 0.6418486,
    SEK: 0.087,
    NOK: 0.088,
    NO: 0.088
};
