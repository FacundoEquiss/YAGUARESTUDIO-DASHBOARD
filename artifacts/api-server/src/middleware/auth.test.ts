import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signToken, verifyToken, requireAuth, JwtPayload } from './auth';

// Mock de express Request/Response/NextFunction
function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    cookies: {},
    headers: {},
    ...overrides,
  } as any;
}

function createMockResponse() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

const mockPayload: JwtPayload = {
  userId: 123,
  email: 'test@example.com',
  role: 'user',
};

describe('signToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  it('should sign a token with valid payload', () => {
    const token = signToken(mockPayload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should create a token that can be verified', () => {
    const token = signToken(mockPayload);
    const decoded = verifyToken(token);
    
    expect(decoded).not.toBeNull();
    expect(decoded!.userId).toBe(mockPayload.userId);
    expect(decoded!.email).toBe(mockPayload.email);
    expect(decoded!.role).toBe(mockPayload.role);
  });

  it('should include expiry in token', () => {
    const token = signToken(mockPayload);
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
  });

  it('should throw when JWT_SECRET is not set', () => {
    delete process.env.JWT_SECRET;
    
    expect(() => signToken(mockPayload)).toThrow('JWT_SECRET environment variable is required');
  });
});

describe('verifyToken', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  it('should return null for invalid token', () => {
    const result = verifyToken('invalid-token-string');
    expect(result).toBeNull();
  });

  it('should return null for expired token', () => {
    // Create a token that expired in the past
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoidGVzdEB0ZXN0LmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.expired';
    
    const result = verifyToken(expiredToken);
    expect(result).toBeNull();
  });

  it('should return null for empty token', () => {
    const result = verifyToken('');
    expect(result).toBeNull();
  });
});

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  it('should authenticate with valid Bearer token in Authorization header', () => {
    const token = signToken(mockPayload);
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe(mockPayload.userId);
  });

  it('should authenticate with valid token in cookie', () => {
    const token = signToken(mockPayload);
    const req = createMockRequest({
      cookies: { token },
      headers: {},
    });
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user!.userId).toBe(mockPayload.userId);
  });

  it('should prefer cookie over Authorization header', () => {
    const cookieToken = signToken({ ...mockPayload, userId: 1 });
    const headerToken = signToken({ ...mockPayload, userId: 999 });
    
    const req = createMockRequest({
      cookies: { token: cookieToken },
      headers: { authorization: `Bearer ${headerToken}` },
    });
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user!.userId).toBe(1); // Should use cookie token
  });

  it('should return 401 when no token is provided', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header has no Bearer prefix', () => {
    const req = createMockRequest({
      headers: { authorization: 'invalid-format' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid-token-here' },
    });
    const res = createMockResponse();
    const next = vi.fn();

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
    expect(next).not.toHaveBeenCalled();
  });
});