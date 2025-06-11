import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Student extends Document {
  @Prop({ required: true, unique: true })
  matricNumber: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  department: string;

  @Prop()
  faculty: string;

  @Prop()
  phone: string;

  @Prop() // email is now optional and not unique
  email?: string;

  @Prop()
  isEmailVerified: boolean;

  @Prop([String])
  skills: string[];

  @Prop()
  otp: string;

  @Prop()
  otpExpires: Date;

  @Prop()
  firstname?: string;

  @Prop()
  lastname?: string;

  @Prop()
  course_code?: string;
}

export const StudentSchema = SchemaFactory.createForClass(Student);
