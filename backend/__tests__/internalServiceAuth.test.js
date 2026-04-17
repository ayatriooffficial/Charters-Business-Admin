const jwt = require('jsonwebtoken');

const ORIGINAL_ENV = { ...process.env };

const createResponse = () => {
  const res = {
    statusCode: null,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.payload = body;
      return this;
    },
  };

  jest.spyOn(res, 'status');
  jest.spyOn(res, 'json');
  return res;
};

const loadMiddleware = () => {
  jest.resetModules();
  return require('../middleware/internalServiceAuth');
};

describe('internalServiceAuth middleware', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.INTERNAL_SERVICE_KEY_RING_JSON;
    delete process.env.CHARTERS_SERVICE_KEY_RING_JSON;
    delete process.env.INTERNAL_SERVICE_KEYS;
    delete process.env.CHARTERS_SERVICE_KEYS;
    delete process.env.CHARTERS_SERVICE_KEY;
    delete process.env.INTERNAL_SERVICE_KEY;
    delete process.env.SERVICE_KEY;
    delete process.env.INTERNAL_SHARED_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.INTERNAL_ACTING_TOKEN_ISSUER;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('accepts a matching legacy service key', () => {
    process.env.CHARTERS_SERVICE_KEY = 'svc-key';
    const { requireInternalService } = loadMiddleware();
    const req = { headers: { 'x-service-key': 'svc-key' } };
    const res = createResponse();
    const next = jest.fn();

    requireInternalService(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.internalService).toEqual({ keyId: null });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an invalid legacy service key', () => {
    process.env.CHARTERS_SERVICE_KEY = 'svc-key';
    const { requireInternalService } = loadMiddleware();
    const req = { headers: { 'x-service-key': 'wrong-key' } };
    const res = createResponse();
    const next = jest.fn();

    requireInternalService(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.payload).toEqual({ success: false, message: 'Forbidden' });
  });

  it('accepts a valid acting admin token', () => {
    process.env.INTERNAL_SHARED_SECRET = 'shared-secret';
    const { verifyRequiredActingToken } = loadMiddleware();
    const token = jwt.sign(
      { adminId: 'admin-1', role: 'admin' },
      process.env.INTERNAL_SHARED_SECRET,
      { issuer: 'profile-branding', expiresIn: '5m' }
    );
    const req = { headers: { 'x-acting-admin-token': token } };
    const res = createResponse();
    const next = jest.fn();

    verifyRequiredActingToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.internalActor.adminId).toBe('admin-1');
    expect(req.internalActor.role).toBe('admin');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a missing acting admin token', () => {
    process.env.INTERNAL_SHARED_SECRET = 'shared-secret';
    const { verifyRequiredActingToken } = loadMiddleware();
    const req = { headers: {} };
    const res = createResponse();
    const next = jest.fn();

    verifyRequiredActingToken(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.payload).toEqual({
      success: false,
      message: 'Missing acting admin token',
    });
  });
});
