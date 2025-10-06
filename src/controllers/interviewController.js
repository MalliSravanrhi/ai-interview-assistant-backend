import pdf from 'pdf-parse';
import mammoth from 'mammoth';

function extractDetailsWithRegex(resumeText) {
  console.log('Using regex extraction...');
  console.log('Resume text length:', resumeText.length);

  const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;

  const lines = resumeText.split('\n').filter(line => line.trim());
  let name = null;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+){1,3}$/.test(line) && line.length < 50) {
      name = line;
      break;
    }
  }

  const emailMatch = resumeText.match(emailRegex);
  const phoneMatch = resumeText.match(phoneRegex);

  const result = {
    name: name || null,
    email: emailMatch ? emailMatch[0] : null,
    phone: phoneMatch ? phoneMatch[0] : null
  };

  console.log('Extracted data:', result);
  return result;
}

export async function extractResumeData(req, res) {
  try {
    console.log('=== Resume Upload Started ===');
    console.log('Request received');

    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    let resumeText = '';

    try {
      if (req.file.mimetype === 'application/pdf') {
        console.log('Processing PDF file...');
        const data = await pdf(req.file.buffer);
        resumeText = data.text;
        console.log('PDF text extracted, length:', resumeText.length);
      }
      else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('Processing DOCX file...');
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        resumeText = result.value;
        console.log('DOCX text extracted, length:', resumeText.length);
      }
      else {
        console.error('Invalid file type:', req.file.mimetype);
        return res.status(400).json({
          success: false,
          error: 'Invalid file format. Only PDF and DOCX are allowed.'
        });
      }
    } catch (fileError) {
      console.error('File parsing error:', fileError);
      return res.status(400).json({
        success: false,
        error: 'Could not read file. File may be corrupted or password protected.',
        details: fileError.message
      });
    }

    if (!resumeText || resumeText.trim().length < 10) {
      console.error('No text extracted from file');
      return res.status(400).json({
        success: false,
        error: 'Could not extract text from resume. Please ensure the file contains readable text.'
      });
    }

    console.log('Resume text preview:', resumeText.substring(0, 200));

    const extractedData = extractDetailsWithRegex(resumeText);

    console.log('=== Extraction Complete ===');
    console.log('Final extracted data:', extractedData);

    res.json({
      success: true,
      data: extractedData,
      resumeText: resumeText.substring(0, 500)
    });

  } catch (error) {
    console.error('=== ERROR in extractResumeData ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);

    res.status(500).json({
      success: false,
      error: 'Failed to process resume',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

export async function getQuestion(req, res) {
  try {
    console.log('=== Question Generation ===');
    const { difficulty, questionNumber } = req.body;

    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty level'
      });
    }

    const questionBank = {
      easy: [
        "What is the difference between let, const, and var in JavaScript?",
        "Explain what React Hooks are and name three commonly used hooks.",
        "What is the purpose of package.json in a Node.js project?",
        "What is the Virtual DOM in React?",
        "Explain the difference between == and === in JavaScript.",
        "What is NPM and what is it used for?"
      ],
      medium: [
        "How would you implement user authentication in a MERN stack application?",
        "Explain the concept of middleware in Express.js with an example.",
        "What are the differences between SQL and NoSQL databases? When would you use each?",
        "How do you handle asynchronous operations in JavaScript?",
        "Explain the concept of state management in React.",
        "What is CORS and how do you handle it in Node.js?"
      ],
      hard: [
        "Design a system to handle 10,000 concurrent WebSocket connections. What are the key considerations?",
        "How would you implement caching strategies in a high-traffic Node.js API?",
        "Describe how you would architect a microservices-based e-commerce platform.",
        "How would you optimize a React application experiencing performance issues?",
        "Explain database indexing and when you would use it.",
        "Design a scalable real-time notification system."
      ]
    };

    const questionList = questionBank[difficulty];
    const question = questionList[questionNumber % questionList.length];

    console.log('Generated question:', { difficulty, questionNumber, question });

    res.json({
      success: true,
      question,
      difficulty
    });

  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate question',
      message: error.message
    });
  }
}

export async function evaluateAnswer(req, res) {
  try {
    console.log('=== Answer Evaluation ===');
    const { question, answer, difficulty } = req.body;

    if (!question || answer === undefined || !difficulty) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: question, answer, difficulty'
      });
    }

    console.log('Evaluating:', { difficulty, answerLength: answer.length });

    let score = calculateScore(answer, difficulty);

    console.log('Score calculated:', score);

    res.json({
      success: true,
      score,
      maxScore: 10
    });

  } catch (error) {
    console.error('Error evaluating answer:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to evaluate answer',
      message: error.message
    });
  }
}

function calculateScore(answer, difficulty) {
  if (!answer || answer.trim().length === 0) return 0;

  const length = answer.trim().length;
  const words = answer.trim().split(/\s+/).length;

  let score = 0;

  if (difficulty === 'easy') {
    if (words < 10) score = 3;
    else if (words < 30) score = 6;
    else if (words < 50) score = 8;
    else score = 9;
  } else if (difficulty === 'medium') {
    if (words < 15) score = 2;
    else if (words < 40) score = 5;
    else if (words < 70) score = 7;
    else score = 8;
  } else {
    if (words < 20) score = 2;
    else if (words < 50) score = 4;
    else if (words < 100) score = 6;
    else score = 7;
  }

  const technicalKeywords = [
    'react', 'node', 'express', 'mongodb', 'api', 'rest', 'async', 'await',
    'promise', 'function', 'component', 'state', 'props', 'hook', 'middleware',
    'database', 'query', 'authentication', 'authorization', 'jwt', 'bcrypt',
    'virtual dom', 'closure', 'prototype', 'callback', 'es6', 'arrow function'
  ];

  const answerLower = answer.toLowerCase();
  const keywordCount = technicalKeywords.filter(kw => answerLower.includes(kw)).length;

  if (keywordCount >= 3) score = Math.min(score + 1, 10);
  if (keywordCount >= 5) score = Math.min(score + 1, 10);

  return score;
}

export async function generateCandidateSummary(req, res) {
  try {
    console.log('=== Summary Generation ===');
    const { candidateData } = req.body;

    if (!candidateData || !candidateData.answers) {
      return res.status(400).json({
        success: false,
        error: 'Invalid candidate data'
      });
    }

    const summary = generateSummary(candidateData);
    const totalScore = candidateData.answers.reduce((sum, a) => sum + a.score, 0);
    const averageScore = (totalScore / (candidateData.answers.length * 10) * 100).toFixed(1);

    console.log('Summary generated:', { averageScore, summary });

    res.json({
      success: true,
      summary,
      averageScore,
      totalQuestions: candidateData.answers.length
    });

  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate summary',
      message: error.message
    });
  }
}

function generateSummary(candidateData) {
  const { answers, name } = candidateData;
  const avgScore = answers.reduce((sum, a) => sum + a.score, 0) / answers.length;
  const percentage = ((avgScore / 10) * 100).toFixed(0);

  const easyScores = answers.filter(a => a.difficulty === 'easy').map(a => a.score);
  const mediumScores = answers.filter(a => a.difficulty === 'medium').map(a => a.score);
  const hardScores = answers.filter(a => a.difficulty === 'hard').map(a => a.score);

  const avgEasy = easyScores.length > 0 ? (easyScores.reduce((a, b) => a + b, 0) / easyScores.length).toFixed(1) : 0;
  const avgMedium = mediumScores.length > 0 ? (mediumScores.reduce((a, b) => a + b, 0) / mediumScores.length).toFixed(1) : 0;
  const avgHard = hardScores.length > 0 ? (hardScores.reduce((a, b) => a + b, 0) / hardScores.length).toFixed(1) : 0;

  let summary = `${name || 'Candidate'} scored ${percentage}% overall (Easy: ${avgEasy}/10, Medium: ${avgMedium}/10, Hard: ${avgHard}/10). `;

  if (avgScore >= 8) {
    summary += "Demonstrated excellent technical knowledge and problem-solving abilities. Strong candidate for the full-stack developer position.";
  } else if (avgScore >= 6) {
    summary += "Showed good understanding of fundamental concepts with solid performance. ";
    if (parseFloat(avgHard) < 5) {
      summary += "Could benefit from more experience with complex system design.";
    } else {
      summary += "Good potential for growth in the team.";
    }
  } else if (avgScore >= 4) {
    summary += "Demonstrated basic understanding but showed gaps in technical depth. Consider for junior positions with mentorship.";
  } else {
    summary += "Requires significant improvement in technical fundamentals. Recommend additional training before full-stack role.";
  }

  return summary;
}

export default {
  extractResumeData,
  getQuestion,
  evaluateAnswer,
  generateCandidateSummary
};