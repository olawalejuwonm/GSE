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
      { upsert: true, new: true }
    );
  }

  async setOtp(identifier: string, otp: string) {
    // Always use email for OTP
    return this.studentModel.findOneAndUpdate(
      { email: identifier },
      { $set: { otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } },
      { new: true }
    );
  }

  async verifyOtp(identifier: string, otp: string) {
    // Always use email for OTP
    const student = await this.studentModel.findOne({ email: identifier });
    if (!student || student.otp !== otp || !student.otpExpires || student.otpExpires < new Date()) {
      return false;
    }
    student.isEmailVerified = true;
    student.otp = '';
    student.otpExpires = undefined as any;
    await student.save();
    return true;
  }

  async setSkills(identifier: string, skills: string[]) {
    // Always use email for skills
    // Prevent re-selection if already set
    const student = await this.studentModel.findOne({ email: identifier });
    if (!student) throw new Error('Student not found.');
    if (student.skills && student.skills.length > 0) {
      throw new Error('You have already selected your skills.');
    }
    // Check if any skill is already at max selection
    const skillDocs = await this.skillModel.find({ code: { $in: skills } });
    for (const skill of skillDocs) {
      if ((skill.selectedCount ?? 0) >= (skill.maxSelection ?? 144)) {
        throw new Error(`Skill '${skill.description}' has reached the maximum number of selections.`);
      }
    }
    // Increment selectedCount for each selected skill
    await Promise.all(
      skillDocs.map(skill =>
        this.skillModel.updateOne(
          { code: skill.code },
          { $inc: { selectedCount: 1 } }
        )
      )
    );
    return this.studentModel.findOneAndUpdate(
      { email: identifier },
      { $set: { skills } },
      { new: true }
    );
  }

  async getAllSkills(): Promise<Skill[]> {
    return this.skillModel.find().sort({ description: 1 }).lean();
  }

  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }
}
