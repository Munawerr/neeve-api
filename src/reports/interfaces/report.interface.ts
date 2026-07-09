// Common interfaces for report data

export interface StudentInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  institute?: string;
}

export interface SubjectInfo {
  id: string;
  name: string;
}

export interface CourseInfo {
  id: string;
  name: string;
  code: string;
}

export interface TestInfo {
  id: string;
  name: string;
  subject?: string;
}

export interface InstituteInfo {
  id: string;
  name: string;
}

export interface PerformanceSummary {
  totalTests: number;
  completedTests: number;
  averageScore: string;
  totalScore: number;
  totalPossibleScore: number;
  subjectCount: number;
}

export interface SubjectPerformance {
  subject: string;
  totalTests: number;
  completedTests: number;
  totalScore: number;
  totalPossibleScore: number;
  averageScore: string;
}

export interface TestPerformance {
  test: string;
  attempts: number;
  completed: number;
  totalScore: number;
  totalPossibleScore: number;
  averageScore: string;
}

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
  finishedAt: Date;
  score: number | string;
  totalMarks: number | string;
  percentage: string;
  correctAnswers: number | string;
  incorrectAnswers: number | string;
  averageTimePerQuestion: string;
}

export interface StudentReportData {
  studentInfo: StudentInfo;
  summary: PerformanceSummary;
  subjectPerformance: SubjectPerformance[];
  testResults: TestResult[];
}

export interface SubjectReportData {
  subjectInfo: SubjectInfo;
  summary: PerformanceSummary;
  testPerformance: TestPerformance[];
  testTypeDistributions: any[];
  leaderboard: any;
}

export interface CourseReportData {
  courseInfo: CourseInfo;
  summary: any;
  subjectPerformance: any[];
  testTypeDistributions: any[];
  leaderboard: any;
}

export interface TestReportData {
  testInfo: {
    id: string;
    name: string;
    subject?: string;
    testType?: string;
    totalMarks?: number;
    duration?: number;
    date?: string;
    testsCount?: number;
    subjectsCovered?: string[];
  };
  summary: {
    totalStudents: number;
    totalAttempts: number;
    completedAttempts: number;
    avgScore: string;
    avgPercentage: string;
    highestScore: string;
    lowestScore: string;
    avgTimeTaken: string;
  };
  questionAnalysis: Array<{
    questionNo: number;
    totalAttempts: number;
    correct: number;
    incorrect: number;
    avgTime: string;
  }>;
  studentResults: any[];
  testTypeDistributions: any[];
  leaderboard: any;
}

export interface InstituteReportData {
  instituteInfo: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  summary: {
    totalStudents: number;
    totalCourses: number;
    totalTests: number;
    testAttempts: number;
    totalCompleted: number;
    averageScore: string;
    avgPercentage: string;
  };
  coursePerformance: any[];
  subjectPerformance: SubjectPerformance[];
  testPerformance: TestPerformance[];
  testTypeDistributions: any[];
  leaderboard: any;
}

export interface OverallReportData {
  summary: {
    totalInstitutes: number;
    totalStudents: number;
    totalCourses: number;
    totalTests: number;
    testAttempts: number;
    totalCompleted: number;
    averageScore: string;
    avgPercentage: string;
  };
  institutePerformance: any[];
  subjectPerformance: SubjectPerformance[];
  testPerformance: TestPerformance[];
  testTypeDistributions: any[];
  leaderboard: any;
}
