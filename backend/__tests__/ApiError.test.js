const ApiError = require('../utils/ApiError');

describe('ApiError', () => {
  it('constructs a normal Error with backend metadata', () => {
    const error = new ApiError(400, 'Bad request', ['details']);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.success).toBe(false);
    expect(error.errors).toEqual(['details']);
    expect(error.data).toBeNull();
  });
});
