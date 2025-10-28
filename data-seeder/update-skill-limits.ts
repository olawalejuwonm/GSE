import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

const SkillSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  maxSelection: { type: Number, default: 160 },
});

async function updateSkillLimits() {
  await mongoose.connect(MONGODB_URI);
  const Skill = mongoose.model('Skill', SkillSchema);

  console.log('Updating all skill maxSelection limits from 120 to 160...');

  const result = await Skill.updateMany(
    { maxSelection: 120 },
    { $set: { maxSelection: 160 } },
  );

  console.log(`Matched: ${result.matchedCount}`);
  console.log(`Modified: ${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log('Done.');
}

void updateSkillLimits();
