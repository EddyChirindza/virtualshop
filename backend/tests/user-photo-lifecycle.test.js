const test = require('node:test');
const assert = require('node:assert/strict');

const released = [];
const removedNewPhotos = [];
let previousAvatarUrl = '/uploads/avatars/old.jpg';
let failUpdate = false;

const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: {
    pool: {},
    query: async (sql, params = []) => {
      if (sql.startsWith('SELECT avatar_url FROM users')) {
        return { rows: [{ avatar_url: previousAvatarUrl }] };
      }
      if (sql.startsWith('UPDATE users SET avatar_url')) {
        if (failUpdate) throw new Error('Falha simulada.');
        return {
          rows: [{
            id: Number(params[1]),
            full_name: 'Cliente',
            email: 'cliente@example.com',
            phone: '+258840000000',
            birth_date: null,
            gender: null,
            avatar_url: params[0],
            is_verified: true,
            last_login_at: null,
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          }],
        };
      }
      throw new Error(`Query inesperada no teste: ${sql}`);
    },
  },
};

const envPath = require.resolve('../src/config/env');
require.cache[envPath] = {
  id: envPath,
  filename: envPath,
  loaded: true,
  exports: { bcryptSaltRounds: 4 },
};

const photoServicePath = require.resolve('../src/modules/users/profile_photo.service');
require.cache[photoServicePath] = {
  id: photoServicePath,
  filename: photoServicePath,
  loaded: true,
  exports: {
    saveProfilePhoto: async () => ({ avatar_url: '/uploads/avatars/new.jpg' }),
    removeProfilePhoto: async (url) => {
      removedNewPhotos.push(url);
    },
  },
};

const uploadServicePath = require.resolve('../src/services/upload_files.service');
require.cache[uploadServicePath] = {
  id: uploadServicePath,
  filename: uploadServicePath,
  loaded: true,
  exports: {
    removeUnreferencedUploadsSafely: async (urls) => {
      released.push([...urls]);
      return urls;
    },
  },
};

const usersService = require('../src/modules/users/users.service');

test('updateProfilePhoto liberta o avatar anterior depois de guardar o novo', async () => {
  released.length = 0;
  removedNewPhotos.length = 0;
  failUpdate = false;

  const profile = await usersService.updateProfilePhoto(1, 'base64');

  assert.equal(profile.avatarUrl, '/uploads/avatars/new.jpg');
  assert.deepEqual(released, [['/uploads/avatars/old.jpg']]);
  assert.deepEqual(removedNewPhotos, []);
});

test('updateProfilePhoto remove o novo ficheiro se a base de dados falhar', async () => {
  released.length = 0;
  removedNewPhotos.length = 0;
  failUpdate = true;

  await assert.rejects(
    () => usersService.updateProfilePhoto(1, 'base64'),
    /Falha simulada/
  );

  assert.deepEqual(released, []);
  assert.deepEqual(removedNewPhotos, ['/uploads/avatars/new.jpg']);
});
