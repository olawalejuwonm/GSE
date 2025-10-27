import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Student, StudentSchema } from './student.schema';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { MailerService } from './mailer.service';
import { Skill, SkillSchema } from './skill.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI || ''),
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Skill.name, schema: SkillSchema },
    ]),
  ],
  controllers: [AppController, StudentController],
  providers: [AppService, StudentService, MailerService],
})
export class AppModule {}
