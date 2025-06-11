import * as mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || '';
const EXCEL_PATH = process.argv[2];

if (!EXCEL_PATH) {
    console.error('Usage: npm run seed <excel-file-path>');
    process.exit(1);
}

// Add a plain Mongoose schema for seeding only
const StudentSchema = new mongoose.Schema({
    matricNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    department: String,
    faculty: String,
    phone: String,
    email: { type: String }, // email is now optional and not unique
    isEmailVerified: Boolean,
    skills: [String],
    otp: String,
    otpExpires: Date,
    firstname: String,
    lastname: String,
    course_code: String,
});

async function seed() {
    await mongoose.connect(MONGODB_URI);
    const Student = mongoose.model('Student', StudentSchema);

    const workbook = xlsx.readFile(EXCEL_PATH);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    for (const rowRaw of data) {
        const row = rowRaw as Record<string, any>;
        const matricNumber = row['Matric Number'] || row['matricNumber'] || row['matric_number'] || row['matric_number'];
        const firstname = row['Firstname'] || row['firstname'] || row['first_name'] || '';
        const lastname = row['Lastname'] || row['lastname'] || row['last_name'] || '';
        const name = row['Name'] || row['name'] || ((firstname || lastname) ? `${firstname} ${lastname}`.trim() : undefined);
        const department = row['Department'] || row['department'];
        const faculty = row['Faculty'] || row['faculty'];
        const phone = row['Phone'] || row['phone'];
        const course_code = row['Course Code'] || row['course_code'] || row['course'] || '';
        if (!matricNumber || !name) {
            console.log('Skipping row (missing matricNumber or name):', row);
            continue;
        }
        try {
            const result = await Student.updateOne(
                { matricNumber: matricNumber },
                {
                    $set: {
                        matricNumber: matricNumber,
                        name: name,
                        firstname: firstname,
                        lastname: lastname,
                        department: department,
                        faculty: faculty,
                        phone: phone,
                        course_code: course_code,
                        isEmailVerified: false,
                        skills: []
                    }
                },
                { upsert: true }
            );
            if (result.upsertedCount || result.modifiedCount) {
                console.log(`Seeded: ${matricNumber} - ${name}`);
            } else {
                console.log(`No change for: ${matricNumber} - ${name}`);
            }
        } catch (err) {
            console.error(`Error seeding ${matricNumber} - ${name}:`, err.message);
        }
    }
    await mongoose.disconnect();
    console.log('Seeding complete.');
}

// Add this to ignore the datas folder
// In your .gitignore file, add:
// datas/

seed();
