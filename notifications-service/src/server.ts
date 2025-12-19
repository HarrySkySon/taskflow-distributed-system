import app from './app';
import { connectRabbitMQ, closeRabbitMQ } from './config/rabbitmq';
import { ProjectEventConsumer } from './consumers/project.consumer';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 4004;

const startServer = async () => {
  try {
    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`\n✅ Notifications Service HTTP server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   Status: http://localhost:${PORT}/status\n`);
    });

    // Connect to RabbitMQ with retry logic
    let retries = 5;
    let channel;

    while (retries > 0) {
      try {
        channel = await connectRabbitMQ();
        break;
      } catch (error) {
        retries--;
        console.log(`Retrying RabbitMQ connection... (${retries} attempts left)`);
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!channel) {
      throw new Error('Failed to establish RabbitMQ connection');
    }

    // Start consuming events
    const consumer = new ProjectEventConsumer();
    await consumer.start(channel);

    console.log('✅ Notifications Service fully started and ready to receive events!\n');

  } catch (error) {
    console.error('❌ Failed to start Notifications Service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  await closeRabbitMQ();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nShutting down gracefully...');
  await closeRabbitMQ();
  process.exit(0);
});

startServer();
