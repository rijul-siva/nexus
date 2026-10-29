'use strict';

process.env.NODE_ENV    = 'test';
process.env.JWT_SECRET  = 'test_jwt_secret_at_least_32_characters_long';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGO_URI   = 'mongodb://127.0.0.1:27017/nexus_test';

const request = require('supertest');
const app     = require('../src/app');
const db      = require('../src/utils/testDb');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearCollections(); });
afterAll(async ()  => { await db.disconnect(); });

// ── Helpers ───────────────────────────────────────────────────────────────────
const BASE        = '/api';
const defaultUser = {
  username: 'testuser',
  email:    'test@example.com',
  password: 'Test1234',
  fullName: 'Test User',
};

async function registerAndLogin(userData = defaultUser) {
  await request(app).post(`${BASE}/auth/signup`).send(userData);
  const res = await request(app).post(`${BASE}/auth/login`).send({
    username: userData.username,
    password: userData.password,
  });
  return res.body.token;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Health check
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/health', () => {
  it('should return 200 and ok status', async () => {
    const res = await request(app).get(`${BASE}/health`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Auth – Signup
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/signup', () => {
  it('registers a new user and returns 201 + token', async () => {
    const res = await request(app).post(`${BASE}/auth/signup`).send(defaultUser);
    expect(res.statusCode).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.username).toBe(defaultUser.username);
    expect(res.body.data.user.password).toBeUndefined(); // never exposed
  });

  it('rejects duplicate username with 409', async () => {
    await request(app).post(`${BASE}/auth/signup`).send(defaultUser);
    const res = await request(app).post(`${BASE}/auth/signup`).send(defaultUser);
    expect(res.statusCode).toBe(409);
    expect(res.body.status).toBe('fail');
  });

  it('rejects missing email with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/signup`)
      .send({ username: 'newuser', password: 'Test1234' });
    expect(res.statusCode).toBe(422);
  });

  it('rejects short password with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/signup`)
      .send({ username: 'newuser', email: 'x@x.com', password: 'abc' });
    expect(res.statusCode).toBe(422);
  });

  it('rejects password without digit with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/signup`)
      .send({ username: 'newuser', email: 'x@x.com', password: 'onlyletters' });
    expect(res.statusCode).toBe(422);
  });

  it('rejects invalid username characters with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/signup`)
      .send({ username: 'bad user!', email: 'x@x.com', password: 'Test1234' });
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Auth – Login
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post(`${BASE}/auth/signup`).send(defaultUser);
  });

  it('logs in with correct credentials and returns token', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ username: defaultUser.username, password: defaultUser.password });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rejects wrong password with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ username: defaultUser.username, password: 'WrongPass1' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects non-existent username with 401', async () => {
    const res = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ username: 'nobody', password: 'Test1234' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects missing fields with 422', async () => {
    const res = await request(app).post(`${BASE}/auth/login`).send({});
    expect(res.statusCode).toBe(422);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Auth – GET /me
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /api/auth/me', () => {
  it('returns user info when authenticated', async () => {
    const token = await registerAndLogin();
    const res   = await request(app)
      .get(`${BASE}/auth/me`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.username).toBe(defaultUser.username);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get(`${BASE}/auth/me`);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const res = await request(app)
      .get(`${BASE}/auth/me`)
      .set('Authorization', 'Bearer notavalidtoken');
    expect(res.statusCode).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// User Profile
// ═══════════════════════════════════════════════════════════════════════════════
describe('User profile routes', () => {
  let token;
  beforeEach(async () => { token = await registerAndLogin(); });

  it('GET /api/users/profile returns profile', async () => {
    const res = await request(app)
      .get(`${BASE}/users/profile`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.username).toBe(defaultUser.username);
  });

  it('PATCH /api/users/profile updates city and bio', async () => {
    const res = await request(app)
      .patch(`${BASE}/users/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ city: 'Chennai', bio: 'Hello I am a developer' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.city).toBe('Chennai');
    expect(res.body.data.user.bio).toBe('Hello I am a developer');
  });

  it('PATCH /api/users/profile rejects invalid portfolio URL', async () => {
    const res = await request(app)
      .patch(`${BASE}/users/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ portfolioUrl: 'not-a-url' });
    expect(res.statusCode).toBe(422);
  });

  it('PATCH /api/users/profile returns 400 with no valid fields', async () => {
    const res = await request(app)
      .patch(`${BASE}/users/profile`)
      .set('Authorization', `Bearer ${token}`)
      .send({ unknownField: 'value' });
    expect(res.statusCode).toBe(400);
  });

  it('PATCH /api/users/password changes password successfully', async () => {
    const res = await request(app)
      .patch(`${BASE}/users/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'Test1234', newPassword: 'NewPass5678', confirmPassword: 'NewPass5678' });
    expect(res.statusCode).toBe(200);

    // Old password should no longer work
    const loginOld = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ username: defaultUser.username, password: 'Test1234' });
    expect(loginOld.statusCode).toBe(401);

    // New password should work
    const loginNew = await request(app)
      .post(`${BASE}/auth/login`)
      .send({ username: defaultUser.username, password: 'NewPass5678' });
    expect(loginNew.statusCode).toBe(200);
  });

  it('PATCH /api/users/password rejects wrong current password', async () => {
    const res = await request(app)
      .patch(`${BASE}/users/password`)
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'WrongOld1', newPassword: 'NewPass5678', confirmPassword: 'NewPass5678' });
    expect(res.statusCode).toBe(401);
  });

  it('DELETE /api/users/account removes account', async () => {
    const res = await request(app)
      .delete(`${BASE}/users/account`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(204);

    // Subsequent requests with same token should 401 (user gone)
    const me = await request(app)
      .get(`${BASE}/auth/me`)
      .set('Authorization', `Bearer ${token}`);
    expect(me.statusCode).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Files CRUD
// ═══════════════════════════════════════════════════════════════════════════════
describe('File CRUD routes', () => {
  let token;
  const newFile = { name: 'MyDoc.txt', type: 'Document', content: 'Hello World' };

  beforeEach(async () => { token = await registerAndLogin(); });

  it('POST /api/files creates a file', async () => {
    const res = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    expect(res.statusCode).toBe(201);
    expect(res.body.data.file.name).toBe(newFile.name);
    expect(res.body.data.file.content).toBe(newFile.content);
  });

  it('POST /api/files rejects duplicate name for same user', async () => {
    await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    const res = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/files rejects missing name with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'Document', content: 'x' });
    expect(res.statusCode).toBe(422);
  });

  it('POST /api/files rejects invalid type with 422', async () => {
    const res = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'File.txt', type: 'InvalidType' });
    expect(res.statusCode).toBe(422);
  });

  it('GET /api/files returns all files for the user', async () => {
    await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send(newFile);
    await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send({ name: 'Second.txt', type: 'Note' });

    const res = await request(app).get(`${BASE}/files`).set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.results).toBe(2);
  });

  it('GET /api/files?q= filters by name', async () => {
    await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send(newFile);
    await request(app).post(`${BASE}/files`).set('Authorization', `Bearer ${token}`).send({ name: 'Spreadsheet.csv', type: 'Spreadsheet' });

    const res = await request(app)
      .get(`${BASE}/files?q=spreadsheet`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.results).toBe(1);
    expect(res.body.data.files[0].name).toBe('Spreadsheet.csv');
  });

  it('GET /api/files/:id returns a single file', async () => {
    const create = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    const id = create.body.data.file._id;

    const res = await request(app)
      .get(`${BASE}/files/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.file._id).toBe(id);
  });

  it('GET /api/files/:id returns 404 for wrong id', async () => {
    const res = await request(app)
      .get(`${BASE}/files/507f1f77bcf86cd799439011`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(404);
  });

  it('PATCH /api/files/:id updates content', async () => {
    const create = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    const id = create.body.data.file._id;

    const res = await request(app)
      .patch(`${BASE}/files/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Updated content here.' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.file.content).toBe('Updated content here.');
  });

  it('PATCH /api/files/:id returns 404 for another user\'s file', async () => {
    const create = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    const id = create.body.data.file._id;

    // Register a second user
    const token2 = await registerAndLogin({
      username: 'otheruser', email: 'other@example.com', password: 'Other1234', fullName: 'Other User',
    });

    const res = await request(app)
      .patch(`${BASE}/files/${id}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ content: 'Hacked!' });
    expect(res.statusCode).toBe(404); // scoped to owner, not 403
  });

  it('DELETE /api/files/:id removes the file', async () => {
    const create = await request(app)
      .post(`${BASE}/files`)
      .set('Authorization', `Bearer ${token}`)
      .send(newFile);
    const id = create.body.data.file._id;

    const del = await request(app)
      .delete(`${BASE}/files/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.statusCode).toBe(204);

    const get = await request(app)
      .get(`${BASE}/files/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.statusCode).toBe(404);
  });

  it('404 route returns proper message', async () => {
    const res = await request(app).get('/api/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('fail');
  });
});

