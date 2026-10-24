import { describe, it, expect } from 'vitest';
import { rectSizeKm, isRectWithinKm, clampOffsetToKm } from '../src/js/geometry.js';

// Höchstgröße der Export-Fläche (10 × 10 km): reine Größenrechnung

describe('Export-Fläche: Größenrechnung', () => {
  it('rechnet Grad in km um (Breite schrumpft mit dem Breitenkreis)', () => {
    const { widthKm, heightKm } = rectSizeKm({ south: 49, north: 49.1, west: 11, east: 11.1 });
    expect(heightKm).toBeCloseTo(11.13, 1);
    expect(widthKm).toBeCloseTo(11.13 * Math.cos((49.05 * Math.PI) / 180), 1);
  });

  it('erlaubt genau 10 × 10 km (mit Rundungstoleranz) und verbietet mehr', () => {
    const lat = 49.5;
    const dLat = 10 / 111.32;
    const dLng = 10 / (111.32 * Math.cos((lat * Math.PI) / 180));
    expect(isRectWithinKm({ south: lat, north: lat + dLat, west: 11, east: 11 + dLng }, 10)).toBe(true);
    expect(isRectWithinKm({ south: lat, north: lat + dLat * 1.02, west: 11, east: 11 + dLng }, 10)).toBe(false);
    expect(isRectWithinKm({ south: lat, north: lat + dLat, west: 11, east: 11 + dLng * 1.02 }, 10)).toBe(false);
  });
});

describe('clampOffsetToKm', () => {
  it('lässt kleine Versätze unverändert', () => {
    expect(clampOffsetToKm(0.01, 0.01, 49, 10)).toEqual({ dLat: 0.01, dLng: 0.01, clamped: false });
  });

  it('verkleinert zu große Versätze auf die Höchstgröße und behält das Seitenverhältnis', () => {
    const lat = 48;
    const { dLat, dLng, clamped } = clampOffsetToKm(0.5, 1.0, lat, 10);
    expect(clamped).toBe(true);
    const { widthKm, heightKm } = rectSizeKm({ south: lat, north: lat + dLat, west: 11, east: 11 + dLng });
    expect(Math.max(widthKm, heightKm)).toBeCloseTo(10, 1);
    expect(dLng / dLat).toBeCloseTo(2, 5);
  });

  it('funktioniert auch mit negativen Versätzen (Ziehen nach links unten)', () => {
    const { dLat, dLng } = clampOffsetToKm(-0.5, -0.5, 50, 10);
    expect(dLat).toBeLessThan(0);
    expect(dLng).toBeLessThan(0);
    expect(Math.abs(dLat) * 111.32).toBeLessThanOrEqual(10.0001);
  });
});
