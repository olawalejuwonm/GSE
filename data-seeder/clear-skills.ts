import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function clearSkills() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const Skill = mongoose.model('Skill', new mongoose.Schema({}, { strict: false }), 'skills');
  const res = await Skill.deleteMany({});
  console.log('Cleared skills:', res.deletedCount);
  await mongoose.disconnect();
}

clearSkills().catch(err => {
  console.error(err);
  process.exit(1);
});
