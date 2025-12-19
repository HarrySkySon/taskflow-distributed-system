import { Channel } from 'amqplib';
import { NotificationService } from '../services/notification.service';

const QUEUE_NAME = process.env.QUEUE_NAME || 'project_events';

export class ProjectEventConsumer {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  async start(channel: Channel): Promise<void> {
    try {
      // Declare queue (creates if doesn't exist)
      await channel.assertQueue(QUEUE_NAME, {
        durable: true, // Queue survives broker restart
      });

      console.log(`Waiting for messages in queue: ${QUEUE_NAME}`);
      console.log('Press CTRL+C to exit\n');

      // Set prefetch to 1 to handle one message at a time
      channel.prefetch(1);

      // Consume messages from queue
      channel.consume(
        QUEUE_NAME,
        async (msg) => {
          if (msg) {
            try {
              const content = msg.content.toString();
              const event = JSON.parse(content);

              console.log('📥 Received message from queue');

              // Process the event
              await this.notificationService.processEvent(event);

              // Acknowledge the message
              channel.ack(msg);
              console.log('✅ Message processed and acknowledged\n');
            } catch (error) {
              console.error('❌ Error processing message:', error);

              // Negative acknowledgment - requeue the message
              channel.nack(msg, false, true);
            }
          }
        },
        {
          noAck: false, // Manual acknowledgment
        }
      );
    } catch (error) {
      console.error('Error starting consumer:', error);
      throw error;
    }
  }
}
