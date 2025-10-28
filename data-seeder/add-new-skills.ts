import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

const SkillSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  trainer: String,
  phone: String,
  maxSelection: { type: Number, default: 120 },
  selectedCount: { type: Number, default: 0 },
  hidden: { type: Boolean, default: false },
});

type NewSkill = {
  code: string;
  description: string;
  trainer: string;
  phone: string;
};

const NEW_SKILLS: NewSkill[] = [
  {
    code: 'TEC80',
    description: 'Natural Cosmetics Formulation',
    trainer: 'Onagun Hamdalat Bisola',
    phone: '08104249293',
  },
  {
    code: 'TEC81',
    description: 'Skin Care Production & Spa',
    trainer: 'Mrs Hassan A Mariam',
    phone: '08106331286',
  },
  {
    code: 'TEC82',
    description: 'Website Design & Coding',
    trainer: 'Olasupo Sodiq',
    phone: '09122169158',
  },
  {
    code: 'TEC83',
    description: 'Acting for Screen and Stage',
    trainer: 'Mr. Femi Atteh',
    phone: '08138379211',
  },
  {
    code: 'TEC84',
    description: 'Domestic Wiring',
    trainer: 'Engr Obafemi, O.A',
    phone: '08063337356',
  },
  {
    code: 'TEC85',
    description: 'Broiler Production B',
    trainer: 'Dr Ayinla Ramat O',
    phone: '07063539043',
  },
  {
    code: 'TEC86',
    description: 'Broiler Production C',
    trainer: 'Dr K.K Safiyu',
    phone: '08060396895',
  },
  {
    code: 'TEC87',
    description: 'Leather Bag Making',
    trainer: 'Olagoke Mujibat Adesewa',
    phone: '08143285589',
  },
];

async function upsertNewSkills() {
  await mongoose.connect(MONGODB_URI);
  const Skill = mongoose.model('Skill', SkillSchema);

  let updated = 0;
  for (const s of NEW_SKILLS) {
    try {
      const res = await Skill.updateOne(
        { code: s.code },
        {
          $set: {
            code: s.code,
            description: s.description,
            trainer: s.trainer,
            phone: s.phone,
            maxSelection: 160,
            hidden: false,
          },
        },
        { upsert: true },
      );
      const action =
        res.upsertedCount && res.upsertedCount > 0
          ? 'Inserted'
          : res.modifiedCount > 0
            ? 'Updated'
            : 'No change';
      console.log(`${action}: ${s.code} - ${s.description}`);
      updated += (res.upsertedCount || 0) + (res.modifiedCount || 0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error upserting ${s.code}:`, msg);
    }
  }

  await mongoose.disconnect();
  console.log(`Done. Affected records: ${updated}`);
}

void upsertNewSkills();
