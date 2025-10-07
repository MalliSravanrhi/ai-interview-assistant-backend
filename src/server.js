import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import interviewRoutes from './routes/interviewRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/interview', interviewRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Interview Assistant API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/interview/health',
      upload: 'POST /api/interview/upload',
      question: 'POST /api/interview/question',
      evaluate: 'POST /api/interview/evaluate',
      summary: 'POST /api/interview/summary'
    }
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Test health: http://localhost:${PORT}/api/interview/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  if (process.env.GEMINI_API_KEY) {
    console.log('✅ Gemini API configured');
  } else if (process.env.ANTHROPIC_API_KEY) {
    console.log('✅ Anthropic API configured');
  } else {
    console.log('⚠️  No AI API keys found - using regex fallback mode');
    console.log('   Get free Gemini key: https://makersuite.google.com/app/apikey');
  }
});

export default app;