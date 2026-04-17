const { requestId } = require('../middleware/requestId');

describe('requestId middleware', () => {
  it('reuses a valid incoming request id', () => {
    const req = { headers: { 'x-request-id': 'req-123' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.requestId).toBe('req-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'req-123');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('generates a new request id when the incoming one is invalid', () => {
    const req = { headers: { 'x-request-id': '***invalid***' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', req.requestId);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
