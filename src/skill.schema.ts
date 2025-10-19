import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Skill extends Document {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  description: string;

  @Prop()
  trainer?: string;

  @Prop()
  phone?: string;

  @Prop({ default: 120 })
  @Prop({ default: 120 })
  maxSelection?: number;

  @Prop({ default: 0 })
  selectedCount?: number;
}

export const SkillSchema = SchemaFactory.createForClass(Skill);