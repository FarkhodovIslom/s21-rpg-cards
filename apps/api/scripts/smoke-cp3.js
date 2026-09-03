'use strict';

const fs = require('fs');
const path = require('path');

let port;

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const envPath = path.join(repoRoot, '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    const key = match[1];
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function probe(p) {
  const res = await fetch('http://127.0.0.1:' + port + p);
  let body = '';
  try { body = await res.text() } catch {}
  return res.status + ' ' + body.slice(0, 200);
}

async function authed(p, cookie) {
  const res = await fetch('http://127.0.0.1:' + port + p, {
    headers: { Cookie: cookie },
  });
  let body = '';
  try { body = await res.text() } catch {}
  return res.status + ' ' + body.slice(0, 250);
}

async function main() {
  const modulePath = path.join(
    __dirname,
    '..',
    'dist',
    'apps',
    'api',
    'src',
    'app.module.js',
  );
  const { AppModule } = require(modulePath);
  const { NestFactory } = require('@nestjs/core');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  await app.listen(0);
  port = app.getHttpServer().address().port;
  console.log('PORT ' + port);
  console.log('NO_COOKIE /api/me/card                -> ' + (await probe('/api/me/card')));
  console.log('NO_COOKIE /api/participants/x        -> ' + (await probe('/api/participants/x')));
  console.log('NO_COOKIE /api/campuses               -> ' + (await probe('/api/campuses')));
  console.log('NO_COOKIE /api/campuses/1/coalitions  -> ' + (await probe('/api/campuses/1/coalitions')));
  console.log('NO_COOKIE /api/coalitions/2/participants -> ' + (await probe('/api/coalitions/2/participants')));

  const { createHmac } = require('crypto');
  const userId = process.env.SMOKE_USER_ID;
  const secret = process.env.TOKEN_ENCRYPTION_KEY;
  if (userId && secret) {
    const sig = createHmac('sha256', secret).update(userId).digest('hex');
    const cookie = 'session=' + userId + '.' + sig;
    console.log('AUTHED   /api/me/card  -> ' + (await authed('/api/me/card', cookie)));
  } else {
    console.log('SKIP authed probes (set SMOKE_USER_ID in env to enable)');
  }
  await app.close();
  process.exit(0);
}

main().catch(function (err) {
  console.error('SMOKE_FAIL ' + (err && err.message ? err.message : 'unknown'));
  process.exit(1);
});
