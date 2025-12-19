import app from './app';
import { initDatabase } from './config/database';
import { connectRabbitMQ, closeRabbitMQ } from './utils/eventPublisher';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4002;

const startServer = async () => {
  try {
    console.log('Initializing database...');
    await initDatabase();
    console.log('Database initialized successfully');

    console.log('Connecting to RabbitMQ...');
    await connectRabbitMQ();

    app.listen(PORT, () => {
      console.log(`Projects Service is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API endpoints: http://localhost:${PORT}/api/projects`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing RabbitMQ connection');
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing RabbitMQ connection');
  await closeRabbitMQ();
  process.exit(0);
});

startServer();
