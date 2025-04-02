import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { Result, ResultSchema } from './schemas/result.schema';
import {
  QuestionResult,
  QuestionResultSchema,
} from 'src/question-results/schemas/question-result.schema';
import { QuestionResultsService } from 'src/question-results/question-results.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Test, TestSchema } from 'src/tests/schemas/test.schema';
import { UsersService } from 'src/users/users.service';
import { TestsService } from 'src/tests/tests.service';
import { Package, PackageSchema } from 'src/packages/schemas/package.schema';
import { Role, RoleSchema } from 'src/roles/schemas/role.schema';
import { S3Service } from 'src/s3/s3.service';
import {
  Question,
  QuestionSchema,
} from 'src/questions/schemas/question.schema';
import { QuestionsService } from 'src/questions/questions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Result.name, schema: ResultSchema },
      { name: QuestionResult.name, schema: QuestionResultSchema },
      { name: User.name, schema: UserSchema },
      { name: Test.name, schema: TestSchema },
      { name: Package.name, schema: PackageSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
  ],
  controllers: [ResultsController],
  providers: [
    ResultsService,
    QuestionsService,
    QuestionResultsService,
    UsersService,
    TestsService,
    S3Service,
  ],
})
export class ResultsModule {}
