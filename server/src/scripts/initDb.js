import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(serverRoot, '.env') });

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
console.log(`[SHADO Database Setup] Current DATABASE_URL: ${dbUrl}`);

const isSqlite = dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:');
const schemaFile = isSqlite ? 'prisma/schema.sqlite.prisma' : 'prisma/schema.prisma';

console.log(`[SHADO Database Setup] Using schema: ${schemaFile}`);

try {
  // If SQLite is used, ensure schema is synced
  if (isSqlite) {
    fs.copyFileSync(
      path.join(serverRoot, 'prisma/schema.sqlite.prisma'),
      path.join(serverRoot, 'prisma/schema.prisma.active')
    );
  } else {
    fs.copyFileSync(
      path.join(serverRoot, 'prisma/schema.prisma'),
      path.join(serverRoot, 'prisma/schema.prisma.active')
    );
  }

  console.log('[SHADO Database Setup] Generating Prisma Client...');
  execSync(`npx prisma generate --schema=./${schemaFile}`, {
    cwd: serverRoot,
    stdio: 'inherit',
  });

  console.log('[SHADO Database Setup] Pushing database schema...');
  execSync(`npx prisma db push --schema=./${schemaFile} --accept-data-loss`, {
    cwd: serverRoot,
    stdio: 'inherit',
  });

  console.log('[SHADO Database Setup] Database initialized successfully!');
} catch (error) {
  console.error('[SHADO Database Setup] Error during DB initialization:', error.message);
  process.exit(1);
}
