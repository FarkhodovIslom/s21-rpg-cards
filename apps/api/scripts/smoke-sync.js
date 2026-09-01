// Dev-only smoke script for the CP2 sync pipeline: boots the compiled app
// (dist output) and POSTs /sync/run with force, so the whole
// cron -> service -> DB path can be exercised without waiting for a cron
// tick. Cwd-independent; run from the repo root with:
//   node apps/api/scripts/smoke-sync.js
'use strict';

const fs = require('fs');
const path = require('path');

async function main() {
  // Load the repo-root .env manually (only keys not already set): the script
  // must work regardless of cwd, and ConfigModule envFilePath is cwd-relative.
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

  // Require the compiled app only AFTER env vars are in place: constructors
  // of PrismaService and School21ClientService read process.env at import
  // time.
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
  const port = app.getHttpServer().address().port;

  const res = await fetch('http://127.0.0.1:' + port + '/sync/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ force: true }),
  });

  const text = await res.text();
  console.log('SMOKE_HTTP_STATUS ' + res.status);
  console.log('SMOKE_BODY ' + text);

  await app.close();
  process.exit([200, 201].includes(res.status) ? 0 : 1);
}

main().catch((error) => {
  console.error('SMOKE_FAIL ' + error.message);
  process.exit(1);
});
