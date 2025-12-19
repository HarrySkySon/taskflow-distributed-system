import * as amqp from 'amqplib';

let connection: any = null;
let channel: any = null;

const QUEUE_NAME = process.env.QUEUE_NAME || 'project_events';

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

    console.log(`Connecting to RabbitMQ at ${rabbitmqUrl}...`);

    let retries = 5;
    while (retries > 0) {
      try {
        connection = await amqp.connect(rabbitmqUrl);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`RabbitMQ connection failed. Retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!connection) {
      throw new Error('Failed to connect to RabbitMQ');
    }

    console.log('Connected to RabbitMQ');

    if (connection) {
      channel = await connection.createChannel();

      // Declare queue
      await channel.assertQueue(QUEUE_NAME, {
        durable: true,
      });

      console.log(`RabbitMQ channel created and queue '${QUEUE_NAME}' ready`);
    }

    connection.on('error', (err: any) => {
      console.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      console.log('RabbitMQ connection closed');
    });

  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error);
    console.log('Service will continue without event publishing');
  }
};

export const publishEvent = async (eventType: string, data: any): Promise<void> => {
  try {
    if (!channel) {
      console.warn('RabbitMQ channel not available. Event not published.');
      return;
    }

    const event = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: data,
    };

    const message = Buffer.from(JSON.stringify(event));

    channel.sendToQueue(QUEUE_NAME, message, {
      persistent: true,
    });

    console.log(`📤 Event published: ${eventType}`, data);

  } catch (error) {
    console.error('Error publishing event:', error);
  }
};

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    console.log('RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error);
  }
};
