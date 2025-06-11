import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Student } from './student.schema';
import * as crypto from 'crypto';

@Injectable()
export class StudentService {
  constructor(@InjectModel(Student.name) private studentModel: Model<Student>) {}

  async findByMatricNumber(matricNumber: string) {
    return this.studentModel.findOne({ matricNumber });
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
    // identifier can be email or matricNumber
    const query = identifier.includes('@') ? { email: identifier } : { matricNumber: identifier };
    return this.studentModel.findOneAndUpdate(
      query,
      { $set: { otp, otpExpires: new Date(Date.now() + 10 * 60 * 1000) } },
      { new: true }
    );
  }

  async verifyOtp(identifier: string, otp: string) {
    const query = identifier.includes('@') ? { email: identifier } : { matricNumber: identifier };
    const student = await this.studentModel.findOne(query);
    if (!student || student.otp !== otp || student.otpExpires < new Date()) {
      return false;
    }
    student.isEmailVerified = true;
    student.otp = '';
    student.otpExpires = undefined as any;
    await student.save();
    return true;
  }

  async setSkills(identifier: string, skills: string[]) {
    const query = identifier.includes('@') ? { email: identifier } : { matricNumber: identifier };
    return this.studentModel.findOneAndUpdate(
      query,
      { $set: { skills } },
      { new: true }
    );
  }

  generateOtp() {
    return crypto.randomInt(100000, 999999).toString();
  }
}
