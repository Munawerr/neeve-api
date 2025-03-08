export const findAllByStudentIdExample = {
  status: 200,
  message: 'Results retrieved successfully',
  data: [
    {
      _id: '60d21b4667d0d8992e610c85',
      test: {
        _id: '60d21b4667d0d8992e610c83',
        title: 'Sample Test',
        subject: '60d21b4667d0d8992e610c82',
        marksPerQuestion: 1,
        testDuration: 60,
        testType: 'MOCK',
        questions: [],
      },
      subject: {
        _id: '60d21b4667d0d8992e610c82',
        code: 'MATH101',
        title: 'Mathematics',
        color: {
          solid: '#000000',
          accent: '#FFFFFF',
        },
      },
      institute: {
        _id: '60d21b4667d0d8992e610c81',
        full_name: 'Institute Name',
        email: 'institute@example.com',
        status: 'ACTIVE',
      },
      student: {
        _id: '60d21b4667d0d8992e610c84',
        full_name: 'Student Name',
        email: 'student@example.com',
        status: 'ACTIVE',
      },
      questionResults: [
        {
          _id: '60d21b4667d0d8992e610c86',
          questionText: 'What is the capital of France?',
          createdAt: '2021-06-23T14:28:54.000Z',
          options: [
            { text: 'Paris', isCorrect: true, isChecked: true },
            { text: 'London', isCorrect: false, isChecked: false },
            { text: 'Berlin', isCorrect: false, isChecked: false },
          ],
          corAnsExp: 'Paris is the capital of France.',
        },
      ],
      marksSummary: {
        totalMarks: 10,
        obtainedMarks: 1,
        averageMarks: 10,
        correctAnswers: 1,
        incorrectAnswers: 9,
        averageTimePerQuestion: 1.5,
      },
      status: 'NOT_FINISHED',
      startedAt: '2021-06-23T14:28:54.000Z',
      finishedAt: null,
      numOfQuestions: 10,
      marksPerQuestion: 1,
    },
  ],
};

export const findOneExample = {
  status: 200,
  message: 'Result retrieved successfully',
  data: {
    _id: '60d21b4667d0d8992e610c85',
    test: {
      _id: '60d21b4667d0d8992e610c83',
      title: 'Sample Test',
      subject: '60d21b4667d0d8992e610c82',
      marksPerQuestion: 1,
      testDuration: 60,
      testType: 'MOCK',
      questions: [],
    },
    subject: {
      _id: '60d21b4667d0d8992e610c82',
      code: 'MATH101',
      title: 'Mathematics',
      color: {
        solid: '#000000',
        accent: '#FFFFFF',
      },
    },
    institute: {
      _id: '60d21b4667d0d8992e610c81',
      full_name: 'Institute Name',
      email: 'institute@example.com',
      status: 'ACTIVE',
    },
    student: {
      _id: '60d21b4667d0d8992e610c84',
      full_name: 'Student Name',
      email: 'student@example.com',
      status: 'ACTIVE',
    },
    questionResults: [
      {
        _id: '60d21b4667d0d8992e610c86',
        questionText: 'What is the capital of France?',
        createdAt: '2021-06-23T14:28:54.000Z',
        options: [
          { text: 'Paris', isCorrect: true, isChecked: true },
          { text: 'London', isCorrect: false, isChecked: false },
          { text: 'Berlin', isCorrect: false, isChecked: false },
        ],
        corAnsExp: 'Paris is the capital of France.',
      },
    ],
    marksSummary: {
      totalMarks: 10,
      obtainedMarks: 1,
      averageMarks: 10,
      correctAnswers: 1,
      incorrectAnswers: 9,
      averageTimePerQuestion: 1.5,
    },
    status: 'NOT_FINISHED',
    startedAt: '2021-06-23T14:28:54.000Z',
    finishedAt: null,
    numOfQuestions: 10,
    marksPerQuestion: 1,
  },
};

export const reportCardExample = {
  status: 200,
  message: 'Report card retrieved successfully',
  data: [
    {
      topicId: '60d21b4667d0d8992e610c80',
      topicCode: 'MATH101',
      topicTitle: 'Mathematics',
      totalMarks: 100,
      obtainedMarks: 90,
      averageMarks: 90,
      correctAnswers: 90,
      incorrectAnswers: 10,
      averageTimePerQuestion: 1.5,
    },
  ],
};

export const subjectReportCardExample = {
  status: 200,
  message: 'Subject report card retrieved successfully',
  data: {
    subjectId: '60d21b4667d0d8992e610c82',
    totalMarks: 100,
    obtainedMarks: 90,
    averageMarks: 90,
    correctAnswers: 90,
    incorrectAnswers: 10,
    averageTimePerQuestion: 1.5,
  },
};

export const combinedReportCardExample = {
  status: 200,
  message: 'Combined report card retrieved successfully',
  data: {
    totalMarks: 100,
    obtainedMarks: 90,
    averageMarks: 90,
    correctAnswers: 90,
    incorrectAnswers: 10,
    averageTimePerQuestion: 1.5,
    testSummary: {
      totalTestsInCourse: 10,
      testsTakenByStudent: 5,
      remainingTests: 5,
    },
  },
};
