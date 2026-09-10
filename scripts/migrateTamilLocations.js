/**
 * One-off migration: normalize any Tamil text already stored in
 * CampaignSettings location fields to English. Uses the same smart
 * normalizeLocation() logic as the live update path: known official city
 * names (e.g. கோயம்புத்தூர்) collapse to the correct English city name,
 * known sub-locality/area names keep the existing "Area - City" format,
 * and anything else falls back to phonetic transliteration. Only touches
 * records that actually contain Tamil Unicode characters — already-English
 * values are left untouched.
 *
 * Affected fields:
 *   - CampaignSettings.currentLocation
 *   - CampaignSettings.locationHistory[].location
 *
 * Usage:
 *   node scripts/migrateTamilLocations.js          (apply the changes)
 *   node scripts/migrateTamilLocations.js --dry-run (show what would change, no writes)
 */

const mongoose = require('mongoose');
const CampaignSettings = require('../models/CampaignSettings');
const { hasTamilChars, normalizeLocation } = require('../utils/tamilTransliterate');

// Same connection string already used by product.js (this backend has no
// shared env-based DB config module to reuse).
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://ba:sLAqxQMpCCjI2Gtf@adinnoutdoors.zpylrw9.mongodb.net/adinnoutdoors';

const DRY_RUN = process.argv.includes('--dry-run');

async function migrate() {
  await mongoose.connect(MONGO_URI);
  console.log(`Connected to MongoDB${DRY_RUN ? ' (dry run — no writes will be made)' : ''}.`);

  const docs = await CampaignSettings.find({});
  console.log(`Found ${docs.length} CampaignSettings document(s).`);

  let updatedDocs = 0;
  let updatedCurrentLocation = 0;
  let updatedHistoryEntries = 0;

  for (const doc of docs) {
    let changed = false;

    if (doc.currentLocation && hasTamilChars(doc.currentLocation)) {
      const before = doc.currentLocation;
      const after = normalizeLocation(before);
      console.log(`[currentLocation] "${before}" -> "${after}"`);
      doc.currentLocation = after;
      updatedCurrentLocation += 1;
      changed = true;
    }

    if (Array.isArray(doc.locationHistory)) {
      for (const entry of doc.locationHistory) {
        if (entry.location && hasTamilChars(entry.location)) {
          const before = entry.location;
          const after = normalizeLocation(before);
          console.log(`[locationHistory @ ${entry.updatedAt?.toISOString?.() || entry.updatedAt}] "${before}" -> "${after}"`);
          entry.location = after;
          updatedHistoryEntries += 1;
          changed = true;
        }
      }
    }

    if (changed) {
      updatedDocs += 1;
      if (!DRY_RUN) {
        await doc.save();
      }
    }
  }

  console.log('---');
  console.log(`Documents touched: ${updatedDocs}`);
  console.log(`currentLocation values converted: ${updatedCurrentLocation}`);
  console.log(`locationHistory entries converted: ${updatedHistoryEntries}`);
  console.log(DRY_RUN ? 'Dry run complete — no changes were saved.' : 'Migration complete.');

  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
