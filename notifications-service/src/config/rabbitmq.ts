import * as amqp from 'amqplib';
import dotenv from 'dotenv';

dotenv.config();

let connection: any = null;
let channel: any = null;

export const connectRabbitMQ = async (): Promise<any> => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

    console.log(`Connecting to RabbitMQ at ${rabbitmqUrl}...`);
    connection = await amqp.connect(rabbitmqUrl);

    console.log('Connected to RabbitMQ');

    if (connection) {
      channel = await connection.createChannel();
      console.log('RabbitMQ channel created');

      connection.on('error', (err: any) => {
        console.error('RabbitMQ connection error:', err);
      });

      connection.on('close', () => {
        console.log('RabbitMQ connection closed');
      });
    }

    if (!channel) {
      throw new Error('Failed to create RabbitMQ channel');
    }

    return channel;
  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    throw error;
  }
};

export const getChannel = (): any => {
  if (!channel) {
    throw new Error('RabbitMQ channel not initialized');
  }
  return channel;
};

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
      console.log('RabbitMQ channel closed');
    }
    if (connection) {
      await connection.close();
      console.log('RabbitMQ connection closed');
    }
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
    throw error;
  }
};
