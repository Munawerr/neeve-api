export interface TestResult {
  student: {
    id: any;
    name: any;
    email: any;
  };
  status: any;
  startedAt: any;
  finishedAt: any;
  score: any;
  totalMarks: any;
  percentage: string;
  correctAnswers: any;
  incorrectAnswers: any;
  averageTimePerQuestion: string;
  testName: string; // Added missing property
  subject: string; // Added missing property
}