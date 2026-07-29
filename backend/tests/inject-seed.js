import { main } from '../scripts/seed-data.js';

main().catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
});
