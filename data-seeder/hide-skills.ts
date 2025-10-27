import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

const SkillSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  hidden: { type: Boolean, default: false },
});

const HIDDEN_DESCRIPTIONS = [
  'Indoor Catering Service',
  'Toiletries Production (B)',
  'Powdered Detergent/ Shampoo Making',
  'Toilet Cleaner/ Distilled/ Deionized Water Production',
  'Bead Making & Wire Works',
  'Shoe and Belt Making (A)',
  'Shoe and Belt Making (B)',
  'Tye & dye (B)',
  'Indigenous Snacks Production',
  'Printing Work, Branding & Graphic Design (B)',
  'Glass blowing',
  'Glass Design',
  'Waste Management and Recycling A',
  'Animal Feed Formulation',
  'Tye & dye (A)',
  'Domestic Animal Rearing',
];

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function hideSkills() {
  await mongoose.connect(MONGODB_URI);
  const Skill = mongoose.model('Skill', SkillSchema);

  let updated = 0;
  for (const desc of HIDDEN_DESCRIPTIONS) {
    const regex = new RegExp(`^${escapeRegex(desc)}$`, 'i');
    const res = await Skill.updateMany(
      { description: regex },
      { $set: { hidden: true } },
    );
    if (res.modifiedCount > 0 || res.matchedCount > 0) {
      console.log(
        `Hidden: ${desc} (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`,
      );
    } else {
      console.warn(`Not found: ${desc}`);
    }
    updated += res.modifiedCount ?? 0;
  }

  console.log(`Done. Skills updated (hidden=true): ${updated}`);
  await mongoose.disconnect();
}

hideSkills().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Failed to hide skills:', msg);
  process.exit(1);
});
