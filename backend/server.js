// backend/server.js
import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import topicRoutes from './routes/topicRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';
import voiceInterviewRoutes from './routes/voiceInterviewRoutes.js';
import setDailyQuestions from './utils/dailyCron.js';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';

dotenv.config();

// Connect to database
connectDB().catch(err => {
  console.error('❌ Database connection failed:', err);
  process.exit(1);
});

const app = express();
const server = createServer(app);

// Enhanced CORS configuration
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes - MAKE SURE THIS IS CORRECT
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/voice-interview', voiceInterviewRoutes);

// Test route to verify auth routes
app.get('/api/auth/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth test route is working!',
    timestamp: new Date().toISOString()
  });
});

// Run the daily cron job
setDailyQuestions();

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'CodeBuddy API is running...',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    routes: ['auth', 'users', 'topics', 'questions', 'progress', 'badges', 'voice-interview']
  });
});

// 404 handler - This should be after all routes
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API Base: http://localhost:${PORT}/api`);
});