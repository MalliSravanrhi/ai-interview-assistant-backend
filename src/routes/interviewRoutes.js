import express from 'express';
import multer from 'multer';
import interviewController from '../controllers/interviewController.js';

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    const allowedMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (allowedMimes.includes(file.mimetype)) {
      console.log('✅ File type accepted');
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error('Invalid file type. Only PDF and DOCX are allowed.'));
    }
  }
});

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Interview API is running',
    timestamp: new Date().toISOString(),
    endpoints: {
      upload: 'POST /api/interview/upload',
      question: 'POST /api/interview/question',
      evaluate: 'POST /api/interview/evaluate',
      summary: 'POST /api/interview/summary'
    }
  });
});

router.post('/upload', (req, res, next) => {
  console.log('\n=== Upload Request Received ===');
  console.log('Content-Type:', req.headers['content-type']);
  next();
}, upload.single('resume'), (req, res, next) => {
  console.log('File uploaded successfully, processing...');
  next();
}, interviewController.extractResumeData);

router.post('/question', (req, res, next) => {
  console.log('\n=== Question Request ===');
  console.log('Body:', req.body);
  next();
}, interviewController.getQuestion);

router.post('/evaluate', (req, res, next) => {
  console.log('\n=== Evaluate Request ===');
  next();
}, interviewController.evaluateAnswer);

router.post('/summary', (req, res, next) => {
  console.log('\n=== Summary Request ===');
  next();
}, interviewController.generateCandidateSummary);

router.use((error, req, res, next) => {
  console.error('Route Error:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Maximum file size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload error',
      message: error.message
    });
  }

  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only PDF and DOCX files are allowed'
    });
  }

  res.status(500).json({
    success: false,
    error: 'Server error',
    message: error.message
  });
});

export default router;