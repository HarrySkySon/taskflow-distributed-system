import express, { Application } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import projectRoutes from './routes/project.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

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
    message: 'Projects Service is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', projectRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
