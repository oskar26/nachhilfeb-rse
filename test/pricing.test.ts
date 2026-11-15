import { describe, expect, it } from 'vitest';
import { formatAdPrice } from '../src/lib/utils';
import {
  PRICE_GUIDELINE,
  PRICE_MODE_LABELS,
  assessPrice,
  formatPriceLabel,
  formatPriceParts,
  normalizePriceDuration,
  normalizePriceMode,
  priceDurationMinutes,
} from '../src/lib/pricing';

describe('PRICE_GUIDELINE', () => {
  it('locks the approved session and hourly values', () => {
    expect(PRICE_GUIDELINE.sessionMinutes).toBe(45);
    expect(PRICE_GUIDELINE.sessionPrice).toBe(12);
    expect(PRICE_GUIDELINE.hourlyPrice).toBe(16);
  });

  it('documents the researched student-tutor range without inventing data', () => {
    expect(PRICE_GUIDELINE.studentHourlyMin).toBe(10);
    expect(PRICE_GUIDELINE.studentHourlyMax).toBe(20);
    expect(PRICE_GUIDELINE.marketMedianHourly).toBe(20);
    expect(PRICE_GUIDELINE.cologneMedianHourly).toBe(24);
    expect(PRICE_GUIDELINE.studentRangeLabel).toBe('10–20 € pro Stunde');
    expect(PRICE_GUIDELINE.copy).toContain('12 € pro 45 Minuten');
    expect(PRICE_GUIDELINE.copy).toContain('10–20 € pro Stunde');
    expect(PRICE_GUIDELINE.marketBasis).toContain('Median Köln');
  });
});

describe('normalizePriceMode', () => {
  it('keeps the three allowed modes', () => {
    expect(normalizePriceMode('fixed')).toBe('fixed');
    expect(normalizePriceMode('vb')).toBe('vb');
    expect(normalizePriceMode('free')).toBe('free');
  });

  it('normalizes legacy and German aliases', () => {
    expect(normalizePriceMode('Verhandlungsbasis')).toBe('vb');
    expect(normalizePriceMode('negotiable')).toBe('vb');
    expect(normalizePriceMode('Kostenlos')).toBe('free');
    expect(normalizePriceMode('gratis')).toBe('free');
    expect(normalizePriceMode('Festpreis')).toBe('fixed');
  });

  it('falls back to fixed for unknown or missing values', () => {
    expect(normalizePriceMode(undefined)).toBe('fixed');
    expect(normalizePriceMode(null)).toBe('fixed');
    expect(normalizePriceMode(42)).toBe('fixed');
    expect(normalizePriceMode('anything-else')).toBe('fixed');
  });

  it('has German labels for every mode', () => {
    expect(PRICE_MODE_LABELS).toEqual({
      fixed: 'Festpreis',
      vb: 'Verhandlungsbasis',
      free: 'Kostenlos',
    });
  });
});

describe('normalizePriceDuration', () => {
  it('normalizes the API unit tokens and numeric minute values', () => {
    expect(normalizePriceDuration('45min')).toBe('45min');
    expect(normalizePriceDuration('60')).toBe('60min');
    expect(normalizePriceDuration(60)).toBe('60min');
    expect(normalizePriceDuration('1h')).toBe('1h');
    expect(normalizePriceDuration('h')).toBe('1h');
    expect(normalizePriceDuration(undefined)).toBe('45min');
  });

  it('converts the price unit to minutes for the hourly assessment', () => {
    expect(priceDurationMinutes('45min')).toBe(45);
    expect(priceDurationMinutes('60min')).toBe(60);
    expect(priceDurationMinutes('1h')).toBe(60);
    expect(priceDurationMinutes(90)).toBe(90);
    expect(priceDurationMinutes(undefined)).toBe(45);
  });
});

describe('assessPrice', () => {
  it('rates 12 € per 45 minutes as fair at 16 €/h', () => {
    const result = assessPrice({ price: 12, mode: 'fixed', duration: '45min' });
    expect(result.tone).toBe('good');
    expect(result.title).toBe('Fair');
    expect(result.hourly).toBe(16);
    expect(result.hourlyLabel).toBe('16 €/h');
    expect(result.detail).toContain('10–20 €/h');
    expect(result.detail).toContain('24 €/h');
    expect(result.basis).toBe(PRICE_GUIDELINE.marketBasis);
  });

  it('marks prices below 10 €/h as günstig without shaming them', () => {
    const result = assessPrice({ price: 9, mode: 'fixed', duration: '60min' });
    expect(result.tone).toBe('low');
    expect(result.title).toBe('Günstig');
    expect(result.hourlyLabel).toBe('9 €/h');
  });

  it('keeps the 10–20 €/h range inclusive and fair', () => {
    expect(assessPrice({ price: 10, mode: 'fixed', duration: '60min' }).tone).toBe('good');
    expect(assessPrice({ price: 20, mode: 'fixed', duration: '60min' }).tone).toBe('good');
  });

  it('marks 20–24 €/h as gehoben but below the Cologne median', () => {
    const result = assessPrice({ price: 21, mode: 'fixed', duration: '60min' });
    expect(result.tone).toBe('high');
    expect(result.title).toBe('Gehoben');
    expect(result.detail).toContain('nicht über dem Kölner Median');
  });

  it('marks prices above the Cologne median as over the usual frame', () => {
    const result = assessPrice({ price: 25, mode: 'fixed', duration: '60min' });
    expect(result.tone).toBe('high');
    expect(result.title).toBe('Über dem üblichen Rahmen');
    expect(result.detail).toContain('über dem Kölner Median');
  });

  it('explains free and negotiable prices without inventing an hourly rate', () => {
    const free = assessPrice({ mode: 'free' });
    expect(free.tone).toBe('free');
    expect(free.title).toBe('Ehrenamtlich');
    expect(free.hourly).toBeNull();

    const vb = assessPrice({ mode: 'vb' });
    expect(vb.tone).toBe('vb');
    expect(vb.title).toBe('Verhandlungsbasis');
    expect(vb.detail).toContain('12 € / 45 Min');
    expect(vb.hourly).toBeNull();
  });

  it('asks for a price when a fixed mode has no usable value', () => {
    expect(assessPrice({ mode: 'fixed' }).tone).toBe('missing');
    expect(assessPrice({ price: 0, mode: 'fixed' }).tone).toBe('missing');
    expect(assessPrice({ price: -3, mode: 'fixed' }).tone).toBe('missing');
  });
});

describe('formatPriceParts', () => {
  it('formats a 45-minute fixed price', () => {
    const parts = formatPriceParts({ price: 12, mode: 'fixed', duration: '45min' });
    expect(parts).toEqual({
      mode: 'fixed',
      primary: '12 €',
      unit: '45 Min',
      label: '12 € / 45 Min',
    });
  });

  it('formats a 60-minute fixed price', () => {
    const parts = formatPriceParts({ price: 16, mode: 'fixed', duration: 60 });
    expect(parts).toEqual({
      mode: 'fixed',
      primary: '16 €',
      unit: '60 Min',
      label: '16 € / 60 Min',
    });
  });

  it('matches formatAdPrice semantics for every mode', () => {
    const cases = [
      { price: 12, mode: 'fixed' as const, duration: '45min', unit: '45min' },
      { price: 16, mode: 'fixed' as const, duration: '60min', unit: '60min' },
      { price: null, mode: 'vb' as const, duration: '45min', unit: '45min' },
      { price: null, mode: 'free' as const, duration: '45min', unit: '45min' },
    ];

    for (const entry of cases) {
      const parts = formatPriceParts(entry);
      expect(parts.label).toBe(
        formatAdPrice({
          mode: entry.mode,
          value: entry.price ?? undefined,
          unit: entry.unit,
        }),
      );
    }
  });

  it('supports the compact positional form', () => {
    expect(formatPriceParts(12, 'fixed', '45min')).toEqual(
      formatPriceParts({ price: 12, mode: 'fixed', duration: '45min' }),
    );
  });

  it('returns "VB" and "Kostenlos" without a unit', () => {
    expect(formatPriceParts({ price: 12, mode: 'vb' })).toEqual({
      mode: 'vb',
      primary: 'VB',
      unit: null,
      label: 'VB',
    });
    expect(formatPriceParts({ price: 12, mode: 'free' })).toEqual({
      mode: 'free',
      primary: 'Kostenlos',
      unit: null,
      label: 'Kostenlos',
    });
  });

  it('treats a fixed price without a value as "Preis auf Anfrage"', () => {
    expect(formatPriceParts({ mode: 'fixed' })).toEqual({
      mode: 'fixed',
      primary: 'Preis auf Anfrage',
      unit: null,
      label: 'Preis auf Anfrage',
    });
    expect(formatPriceParts({ price: Number.NaN, mode: 'fixed' }).label).toBe(
      'Preis auf Anfrage',
    );
    expect(formatPriceParts({ price: -12, mode: 'fixed' }).label).toBe(
      'Preis auf Anfrage',
    );
    expect(formatPriceParts({ price: 0, mode: 'fixed' }).label).toBe(
      'Preis auf Anfrage',
    );
  });

  it('accepts numeric strings from JSON', () => {
    expect(formatPriceParts({ price: '12', mode: 'fixed', duration: '45min' }).label).toBe(
      '12 € / 45 Min',
    );
  });

  it('exposes a label helper', () => {
    expect(
      formatPriceLabel({ price: 12, mode: 'fixed', duration: '45min' }),
    ).toBe('12 € / 45 Min');
  });
});
