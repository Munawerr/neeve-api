export interface TestResult {
  student: {
    id: string;
    name: string;
    email: string;
  };
  testName: string;
  subject: string;
  status: string;
  startedAt: Date;
  finishedAt?: Date;
  score: number | string;
  totalMarks: number | string;
  percentage: string;
  correctAnswers: number | string;
  incorrectAnswers: number | string;
  averageTimePerQuestion: string;
}

export interface TestReportData {
  testInfo: {
    id: string;
    name: string;
    subject: string;
  };
  summary: {
    totalTests: number;
    completedTests: number;
    averageScore: string;
    totalScore: number;
    totalPossibleScore: number;
  };
  questionAnalysis: Array<{
    questionId: string;
    attempts: number;
    correct: number;
    incorrect: number;
    correctPercentage: string;
    averageTime: string;
  }>;
  studentResults: TestResult[];
}