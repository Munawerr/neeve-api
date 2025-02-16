import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuestionResultsController } from './question-results.controller';
import { QuestionResultsService } from './question-results.service';
import {
  QuestionResult,
  QuestionResultSchema,
} from './schemas/question-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QuestionResult.name, schema: QuestionResultSchema },
    ]),
  ],
  controllers: [QuestionResultsController],
  providers: [QuestionResultsService],
})
export class QuestionResultsModule {}
