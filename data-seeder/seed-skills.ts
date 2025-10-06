import * as mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
// Accept full path built from argv to allow filenames with spaces or special chars
const argPath = process.argv.slice(2).join(' ').trim();
const EXCEL_PATH = argPath || './datas/GSE 301 SKILL LIST.xlsx';

const SkillSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  trainer: String,
  phone: String,
  maxSelection: { type: Number, default: 140 },
  selectedCount: { type: Number, default: 0 },
});

async function seedSkills() {
  await mongoose.connect(MONGODB_URI);
  const Skill = mongoose.model('Skill', SkillSchema);

  try {
    const workbook = xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as unknown as any[];
      if (!row[1] || !row[2]) continue; // skip if no code or description
      const code = String(row[1]).trim();
      const description = String(row[2]).trim();
      const trainer = row[3] ? String(row[3]).trim() : '';
      const phone = row[4] ? String(row[4]).trim() : '';
      try {
        await Skill.updateOne(
          { code },
          { $set: { code, description, trainer, phone, maxSelection: 140 } },
          { upsert: true }
        );
        console.log(`Seeded: ${code} - ${description}`);
      } catch (err) {
        console.error(`Error seeding ${code}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Failed to read Excel file at '${EXCEL_PATH}':`, err.message || err);
    console.error('Tip: if your filename contains spaces or special characters, enclose it in quotes.');
    await mongoose.disconnect();
    process.exit(1);
  }
  await mongoose.disconnect();
  console.log('Skill seeding complete.');
}

seedSkills();
