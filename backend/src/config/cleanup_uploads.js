const { pool } = require('./db');
const {
  DEFAULT_MIN_AGE_MS,
  cleanupOrphanedUploads,
} = require('../services/upload_files.service');

const USAGE = `Uso: npm run cleanup:uploads -- [--dry-run] [--min-age-hours=24]

Remove ficheiros em uploads/products e uploads/avatars que já não estejam
referenciados pela base de dados. Por defeito ignora ficheiros com menos de
24 horas para não apagar uploads ainda em curso.`;

function parseOptions(argv) {
  let dryRun = false;
  let minAgeMs = DEFAULT_MIN_AGE_MS;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg.startsWith('--min-age-hours=')) {
      const hours = Number(arg.slice('--min-age-hours='.length));
      if (!Number.isFinite(hours) || hours < 0) {
        throw new Error('--min-age-hours deve ser um número maior ou igual a zero.');
      }
      minAgeMs = Math.round(hours * 60 * 60 * 1000);
      continue;
    }
    throw new Error(`Opção desconhecida: ${arg}`);
  }

  return { dryRun, minAgeMs };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    console.log(USAGE);
    return;
  }

  const report = await cleanupOrphanedUploads(options);
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length > 0) process.exitCode = 1;
}

async function run() {
  try {
    await main();
  } catch (err) {
    console.error(`[cleanup:uploads] ${err.message}`);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
