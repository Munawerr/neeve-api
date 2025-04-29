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
  studentResults: TestResult[];
}

export interface CourseReportData {
  courseInfo: CourseInfo;
  summary: PerformanceSummary;
  // subjects: SubjectInfo[];
  // tests: TestInfo[];
  studentPerformance: any[];
  subjectPerformance: any[];
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

export interface InstituteReportData {
  instituteInfo: InstituteInfo;
  summary: {
    totalStudents: number;
    totalCourses: number;
    totalTests: number;
    testAttempts: number;
    averageScore: string;
  };
  coursePerformance: any[];
  subjectPerformance: SubjectPerformance[];
  testPerformance: TestPerformance[];
}

export interface OverallReportData {
  summary: {
    totalInstitutes: number;
    totalStudents: number;
    totalCourses: number;
    totalTests: number;
    testAttempts: number;
    averageScore: string;
  };
  institutePerformance: any[];
  subjectPerformance: SubjectPerformance[];
  testPerformance: TestPerformance[];
}
