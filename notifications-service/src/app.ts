import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notifications Service is running',
    timestamp: new Date().toISOString(),
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Notifications Service',
    status: 'active',
    queue: process.env.QUEUE_NAME || 'project_events',
    timestamp: new Date().toISOString(),
  });
});

export default app;
