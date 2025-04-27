export interface CourseOverview {
  _id: string;
  title: string;
  code: string;
  subjectCount: number;
  topicCount: number;
}

export interface CoursePerformanceStats {
  averageScore: number;
  completionRate: number;
  studentCount: number;
}

export interface CourseEnrollmentTrend {
  courseId: string;
  courseName: string;
  month: string;
  count: number;
}

export interface TopPerformingCourse {
  _id: string;
  title: string;
  performance: number;
  studentCount: number;
}