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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Result.name, schema: ResultSchema },
      { name: QuestionResult.name, schema: QuestionResultSchema },
    ]),
  ],
  controllers: [ResultsController],
  providers: [ResultsService, QuestionResultsService],
})
export class ResultsModule {}
