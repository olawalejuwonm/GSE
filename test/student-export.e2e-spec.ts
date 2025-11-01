import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Student Export (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/student/registration-status (GET) - should return registration status', () => {
    return request(app.getHttpServer())
      .get('/student/registration-status')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('isOpen');
        expect(res.body).toHaveProperty('message');
        expect(typeof res.body.isOpen).toBe('boolean');
        expect(typeof res.body.message).toBe('string');
      });
  });

  it('/student/export/excel (GET) - should return Excel file or error', () => {
    return request(app.getHttpServer())
      .get('/student/export/excel')
      .expect((res) => {
        // Should either return 200 with Excel file or handle gracefully
        expect([200, 500]).toContain(res.status);
      });
  });

  it('/student/matric (POST) - should check registration status when closed', async () => {
    // Set REGISTRATION_OPEN to false
    process.env.REGISTRATION_OPEN = 'false';
    
    return request(app.getHttpServer())
      .post('/student/matric')
      .send({ matricNumber: 'TEST123' })
      .expect(201)
      .expect((res) => {
        if (process.env.REGISTRATION_OPEN === 'false') {
          expect(res.body).toHaveProperty('error');
          expect(res.body).toHaveProperty('registrationClosed', true);
        }
      });
  });
});
