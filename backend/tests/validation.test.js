'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_at_least_32_characters_long';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/nexus_test';

const request = require('supertest');
const app = require('../src/app');
const db = require('../src/utils/testDb');
const { calculateAge, isValidDateOfBirth } = require('../src/utils/age');

const BASE = '/api';
const dateWithAge = (age, reference = new Date()) => {
  const d = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const year = d.getUTCFullYear() - age;
  const month = d.getUTCMonth();
  const day = Math.min(d.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
};

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearCollections(); });
afterAll(async () => { await db.disconnect(); });

const validUser = {
  username: 'valid_user',
  email: 'valid@example.com',
  password: 'ValidPass123',
  fullName: 'Valid User',
};
const signup = (overrides = {}) => request(app).post(`${BASE}/auth/signup`).send({ ...validUser, ...overrides });
const signupToken = async () => {
  const result = await signup();
  expect(result.statusCode).toBe(201);
  return result.body.token;
};
const errorsFor = (response, field) => response.body.errors.some((error) => error.field === field);

describe('input validation regression cases', () => {
  it.each(['   ', '\t\n'])('rejects a whitespace-only username (%j)', async (username) => {
    const response = await signup({ username });
    expect(response.statusCode).toBe(422);
    expect(errorsFor(response, 'username')).toBe(true);
  });

  it('accepts a trimmed valid username and rejects punctuation usernames', async () => {
    expect((await signup({ username: '  valid_user  ' })).statusCode).toBe(201);
    await db.clearCollections();
    const response = await signup({ username: 'user!@#' });
    expect(response.statusCode).toBe(422);
    expect(errorsFor(response, 'username')).toBe(true);
  });

  it('rejects whitespace passwords, non-string passwords and oversized passwords', async () => {
    for (const password of ['        ', 'x'.repeat(129)]) {
      const response = await signup({ password });
      expect(response.statusCode).toBe(422);
      expect(errorsFor(response, 'password')).toBe(true);
    }
    const nonString = await request(app).post(`${BASE}/auth/signup`).send({ ...validUser, password: 12345678 });
    expect(nonString.statusCode).toBe(422);
  });

  it('rejects invalid URLs rather than accepting a dotted substring', async () => {
    for (const portfolioUrl of ['https://..', 'https://example.com not-a-url', 'javascript://example.com']) {
      const response = await signup({ portfolioUrl });
      expect(response.statusCode).toBe(422);
      expect(errorsFor(response, 'portfolioUrl')).toBe(true);
    }
    expect((await signup({ portfolioUrl: 'https://portfolio.example.com/path' })).statusCode).toBe(201);
  });

  it('rejects out-of-range, malformed, or impossible DOB values', async () => {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString().slice(0, 10);
    const leapDayReference = new Date('2024-02-29T12:00:00Z');
    expect(dateWithAge(1, leapDayReference)).toBe('2023-02-28');
    for (const dob of [dateWithAge(9), dateWithAge(101), tomorrow, '2023-02-29', 'not-a-date']) {
      const response = await signup({ dob });
      expect(response.statusCode).toBe(422);
      expect(errorsFor(response, 'dob')).toBe(true);
    }
  });

  it('calculates age correctly around birthdays and leap days', () => {
    expect(calculateAge('2000-10-29', new Date('2026-10-28T12:00:00Z'))).toBe(25);
    expect(calculateAge('2000-10-28', new Date('2026-10-28T12:00:00Z'))).toBe(26);
    expect(calculateAge('2000-02-30', new Date('2026-10-28T12:00:00Z'))).toBeNull();
    expect(isValidDateOfBirth('2016-10-28', new Date('2026-10-28T12:00:00Z'))).toBe(true);
  });

  it('derives age from DOB and rejects a contradictory submitted age', async () => {
    const dob = dateWithAge(20);
    const response = await signup({ dob, age: 19 });
    expect(response.statusCode).toBe(422);
    expect(errorsFor(response, 'age')).toBe(true);
    const accepted = await signup({ dob, age: 20 });
    expect(accepted.statusCode).toBe(201);
    expect(accepted.body.data.user.age).toBe(20);
  });

  it('rejects special-only bios and invalid course values', async () => {
    expect((await signup({ bio: '   !!!   ' })).statusCode).toBe(422);
    await db.clearCollections();
    expect((await signup({ course: '<script>' })).statusCode).toBe(422);
  });

  it('rejects bad file names and too-long contents while allowing the exact name limit', async () => {
    const token = await signupToken();
    for (const name of ['   ', '!!!', 'a'.repeat(101)]) {
      const response = await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send({ name });
      expect(response.statusCode).toBe(422);
    }
    const tooMuchContent = await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send({ name: 'valid-file', content: 'x'.repeat(10001) });
    expect(tooMuchContent.statusCode).toBe(422);
    const allowedMax = await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send({ name: 'a'.repeat(100) });
    expect(allowedMax.statusCode).toBe(201);
  });

  it('rejects direct age changes and recomputes age when DOB changes', async () => {
    const token = await signupToken();
    const emptyAge = await request(app).patch(`${BASE}/users/profile`).set('Authorization', `Bearer ${token}`).send({ age: '' });
    expect(emptyAge.statusCode).toBe(422);
    for (const age of [19.5, 101]) {
      const response = await request(app).patch(`${BASE}/users/profile`).set('Authorization', `Bearer ${token}`).send({ age });
      expect(response.statusCode).toBe(422);
    }
    const dob = dateWithAge(30);
    const updated = await request(app).patch(`${BASE}/users/profile`).set('Authorization', `Bearer ${token}`).send({ dob });
    expect(updated.statusCode).toBe(200);
    expect(updated.body.data.user.age).toBe(30);
  });

  it('rejects blank, mismatched, weak, and oversized password changes', async () => {
    const token = await signupToken();
    const cases = [
      { currentPassword: 'ValidPass123', newPassword: '        ', confirmPassword: '        ' },
      { currentPassword: 'ValidPass123', newPassword: 'NoDigitsHere', confirmPassword: 'NoDigitsHere' },
      { currentPassword: 'ValidPass123', newPassword: 'NewPass123', confirmPassword: 'Different123' },
      { currentPassword: 'ValidPass123', newPassword: 'A1'.repeat(37), confirmPassword: 'A1'.repeat(37) },
      { currentPassword: 'ValidPass123', newPassword: 'é'.repeat(37), confirmPassword: 'é'.repeat(37) },
    ];
    for (const body of cases) {
      const response = await request(app).patch(`${BASE}/users/password`).set('Authorization', `Bearer ${token}`).send(body);
      expect(response.statusCode).toBe(422);
    }
  });
});
