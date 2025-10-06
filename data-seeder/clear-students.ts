import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';

async function clearStudents() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set in .env');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }), 'students');
  const res = await Student.deleteMany({});
  console.log('Cleared students:', res.deletedCount);
  await mongoose.disconnect();
}

clearStudents().catch(err => {
  console.error(err);
  process.exit(1);
});
