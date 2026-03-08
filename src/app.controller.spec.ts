import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';
import { CoursesService } from './courses/courses.service';
import { UsersService } from './users/users.service';
import { AnalyticsService } from './analytics/analytics.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const appServiceMock = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: CACHE_MANAGER,
          useValue: {},
        },
        {
          provide: AppService,
          useValue: appServiceMock,
        },
        {
          provide: AuthService,
          useValue: {},
        },
        {
          provide: CoursesService,
          useValue: {},
        },
        {
          provide: UsersService,
          useValue: {},
        },
        {
          provide: AnalyticsService,
          useValue: {},
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
