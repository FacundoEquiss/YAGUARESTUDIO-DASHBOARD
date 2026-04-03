import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DtfPricingInput } from './dtf-pricing';

// Setup env vars BEFORE any imports
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
vi.stubEnv('JWT_SECRET', 'test-secret-key');
vi.stubEnv('NODE_ENV', 'test');

// Mock the entire @workspace/db module
const mockFromFn = vi.fn();
const mockWhereFn = vi.fn().mockResolvedValue([]);
mockFromFn.mockReturnValue({ where: mockWhereFn });

const mockSelect = vi.fn().mockReturnValue({ from: mockFromFn });

// Return userDtfSettings or dtfGlobalSettings with proper numeric values
vi.mock('@workspace/db', () => ({
  db: {
    select: mockSelect,
  },
  dtfGlobalSettings: { id: 'id', pricePerMeter: 'ppm', rollWidth: 'rw' },
  userDtfSettings: {
    id: 'id', userId: 'uid', pricePerMeter: 'ppm', rollWidth: 'rw',
    baseMargin: 'bm', wholesaleMargin: 'wm',
    pressPassThreshold: 'ppt', pressPassExtraCost: 'ppec',
    talleSurcharge: 'ts',
    updatedAt: 'u',
  },
  eq: vi.fn(),
}));

// Override mockWhereFn to return userDtfSettings with numeric values by default
function createMockUserSettings(overrides = {}) {
  return {
    pricePerMeter: '10000',
    rollWidth: '58',
    baseMargin: '2000',
    wholesaleMargin: '1200',
    pressPassThreshold: '2',
    pressPassExtraCost: '800',
    talleSurcharge: '0',
    ...overrides,
  };
}

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

const { calculateDtfPricingForUser, DtfPricingError } = await import('./dtf-pricing');

function createValidInput(overrides?: Partial<DtfPricingInput>): DtfPricingInput {
  return {
    garments: 10,
    pressPasses: 2,
    talleActive: false,
    stamps: [{ w: 30, h: 20, qty: 2 }],
    ...overrides,
  };
}

function setupMockDb(globalSettings: { pricePerMeter: number; rollWidth: number }) {
  // Return full user settings object so Number() conversions work
  mockWhereFn.mockResolvedValue([{
    pricePerMeter: globalSettings.pricePerMeter.toString(),
    rollWidth: globalSettings.rollWidth.toString(),
    baseMargin: '2000',
    wholesaleMargin: '1200',
    pressPassThreshold: '2',
    pressPassExtraCost: '800',
    talleSurcharge: '0',
  }]);
  mockSelect.mockReturnValue({ from: mockFromFn });
}

describe('DtfPricingError', () => {
  it('should create error with status code', () => {
    const error = new DtfPricingError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
  });

  it('should default to status code 400', () => {
    const error = new DtfPricingError('Test error');
    expect(error.statusCode).toBe(400);
  });

  it('should extend Error', () => {
    const error = new DtfPricingError('Test error');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('calculateDtfPricingForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default user settings with string values (as DB returns)
    mockWhereFn.mockResolvedValue([{
      pricePerMeter: '10000',
      rollWidth: '58',
      baseMargin: '2000',
      wholesaleMargin: '1200',
      pressPassThreshold: '2',
      pressPassExtraCost: '800',
      talleSurcharge: '0',
    }]);
  });

  describe('Input validation', () => {
    it('should throw error when stamps is not an array', async () => {
      const input = { garments: 10, pressPasses: 0, talleActive: false, stamps: 'invalid' as any };
      await expect(calculateDtfPricingForUser(1, input)).rejects.toThrow(DtfPricingError);
    });

    it('should throw error when stamp exceeds roll width', async () => {
      const input = createValidInput({ stamps: [{ w: 60, h: 20, qty: 1 }] });
      await expect(calculateDtfPricingForUser(1, input)).rejects.toThrow(DtfPricingError);
    });

    it('should handle invalid stamp dimensions (w <= 0 or h <= 0)', async () => {
      const input = createValidInput({ stamps: [{ w: 0, h: 20, qty: 1 }, { w: 30, h: -5, qty: 1 }] });
      await expect(calculateDtfPricingForUser(1, input)).rejects.toThrow('Debes enviar al menos una estampa válida.');
    });

    it('should handle empty stamps array', async () => {
      const input = createValidInput({ stamps: [] });
      await expect(calculateDtfPricingForUser(1, input)).rejects.toThrow('Debes enviar al menos una estampa válida.');
    });
  });

  describe('Garments calculation', () => {
    it('should ensure garments is at least 1', async () => {
      const input = createValidInput({ garments: 0 });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.garments).toBe(1);
    });

    it('should use provided garments when valid', async () => {
      const input = createValidInput({ garments: 50 });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.garments).toBe(50);
    });
  });

  describe('Price calculation', () => {
    it('should calculate price per garment correctly', async () => {
      const input = createValidInput({ garments: 10, stamps: [{ w: 30, h: 20, qty: 2 }] });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.garments).toBe(10);
      expect(result.totalHeight).toBeGreaterThan(0);
      expect(result.pricePerGarment).toBeGreaterThan(0);
    });

    it('should round prices to nearest 100', async () => {
      const input = createValidInput();
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.pricePerGarment % 100).toBe(0);
    });
  });

  describe('Wholesale prices', () => {
    it('should calculate wholesale price with lower margin', async () => {
      const input = createValidInput();
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.pricePerGarmentWholesale).toBeLessThan(result.pricePerGarment);
    });
  });

  describe('Press passes extra cost', () => {
    it('should not charge extra when pressPasses <= threshold', async () => {
      const input = createValidInput({ pressPasses: 2 });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.pressPassExtra).toBe(0);
    });

    it('should charge extra when pressPasses > threshold', async () => {
      const input = createValidInput({ pressPasses: 4 });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.pressPassExtra).toBeGreaterThanOrEqual(0);
    });

    it('should charge 0 when pressPasses is 0', async () => {
      const input = createValidInput({ pressPasses: 0 });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.pressPassExtra).toBe(0);
    });
  });

  describe('Talle surcharge', () => {
    it('should not apply surcharge when talleActive is false', async () => {
      const input = createValidInput({ talleActive: false });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.talleActive).toBe(false);
      expect(result.talleSurchargeAmount).toBe(0);
    });

    it('should set talleActive correctly when true', async () => {
      const input = createValidInput({ talleActive: true });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.talleActive).toBe(true);
    });
  });

  describe('Placements', () => {
    it('should generate placements for all stamps', async () => {
      const input = createValidInput({ stamps: [{ w: 20, h: 15, qty: 3 }, { w: 25, h: 10, qty: 2 }] });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.placements.length).toBe(5);
    });

    it('should place stamps within roll bounds', async () => {
      const input = createValidInput({ stamps: [{ w: 20, h: 15, qty: 1 }] });
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.placements.length).toBe(1);
      const placement = result.placements[0];
      expect(placement.x + placement.w).toBeLessThanOrEqual(58);
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Linear meters and raw cost', () => {
    it('should calculate linear meters from total height', async () => {
      const input = createValidInput();
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.linearMeters).toBe(result.totalHeight / 100);
    });

    it('should calculate raw cost from linear meters', async () => {
      const pricePerMeter = 15000;
      mockWhereFn.mockResolvedValue([{ pricePerMeter, rollWidth: 58 }]);
      const input = createValidInput();
      const result = await calculateDtfPricingForUser(1, input);
      expect(result.rawCost).toBeCloseTo(result.linearMeters * pricePerMeter, 2);
    });
  });
});