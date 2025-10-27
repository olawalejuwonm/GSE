import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from './student.schema';
import { Skill } from './skill.schema';
import * as crypto from 'crypto';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<Student>,
    @InjectModel(Skill.name) private skillModel: Model<Skill>,
  ) {}

  async findByMatricNumber(matricNumber: string) {
    return this.studentModel.findOne({ matricNumber });
  }

  async findByEmail(email: string) {
    return this.studentModel.findOne({ email });
  }

  async createOrUpdateStudent(data: Partial<Student>) {
    // Use matricNumber as the main identifier
    return this.studentModel.findOneAndUpdate(
      { matricNumber: data.matricNumber },
      { $set: data },
      { upsert: true, new: true },
    );
  }

  async setOtp(identifier: string, otp: string) {
    // Always use email for OTP
    // Do not regenerate if already set; remove expiry if present
    const student = await this.studentModel.findOne({ email: identifier });
    if (!student) return null;
    if (student.otp && String(student.otp).trim().length > 0) {
      // Ensure no expiry is enforced going forward
      if (student.otpExpires) {
        student.otpExpires = undefined;
        await student.save();
      }
      return student;
    }
    student.otp = otp;
    student.otpExpires = undefined;
    await student.save();
    return student;
  }

  async verifyOtp(identifier: string, otp: string) {
    // Always use email for OTP
    const student = await this.studentModel.findOne({ email: identifier });
    if (!student || student.otp !== otp) {
      return false;
    }
    student.isEmailVerified = true;
    // Do not clear OTP; keep it reusable. Also ensure no expiry is set.
    student.otpExpires = undefined;
    await student.save();
    return true;
  }

  async setSkills(identifier: string, skills: string[]) {
    // Always use email for skills
    // Prevent re-selection if already set
    const student = await this.studentModel.findOne({ email: identifier });
    if (!student) throw new Error('Student not found.');
    if (student.skills && student.skills.length > 0) {
      // Return the trainers for the previously selected skills
      const skillDocs = await this.skillModel
        .find({ code: { $in: student.skills } })
        .lean();
      return { student, skillDocs, alreadyRegistered: true };
    }
    // Check and increment selectedCount for each selected skill using conditional update
    const skillDocs = await this.skillModel.find({ code: { $in: skills } });

    // Try to increment each skill atomically (best-effort using conditional update)
    const incremented: string[] = [];
    try {
      for (const skill of skillDocs) {
        const res = await this.skillModel.updateOne(
          {
            code: skill.code,
            $expr: { $lt: ['$selectedCount', '$maxSelection'] },
          },
          { $inc: { selectedCount: 1 } },
        );
        // If update didn't modify anything, re-check the current document to determine why
        if (res.modifiedCount === 0) {
          const fresh = await this.skillModel
            .findOne({ code: skill.code })
            .lean();
          if (!fresh) {
            throw new Error(
              `Skill '${skill.code}' not found when attempting to increment.`,
            );
          }
          if ((fresh.selectedCount ?? 0) >= (fresh.maxSelection ?? 120)) {
            throw new Error(
              `Skill '${skill.description}' has reached the maximum number of selections.`,
            );
          }
          // If we reach here it means the conditional update simply didn't apply; throw a generic error
          throw new Error(
            `Failed to increment selection for skill '${skill.description}'. Please try again.`,
          );
        }
        incremented.push(skill.code);
      }
    } catch (err) {
      // Rollback any increments we did
      if (incremented.length > 0) {
        await Promise.all(
          incremented.map((code) =>
            this.skillModel.updateOne(
              { code },
              { $inc: { selectedCount: -1 } },
            ),
          ),
        );
      }
      throw err;
    }
    const updatedStudent = await this.studentModel.findOneAndUpdate(
      { email: identifier },
      { $set: { skills } },
      { new: true },
    );
    return { student: updatedStudent, skillDocs };
  }

  async getAllSkills(): Promise<Skill[]> {
    return this.skillModel
      .find({ hidden: { $ne: true } })
      .sort({ description: 1 })
      .lean();
  }

  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }
}
