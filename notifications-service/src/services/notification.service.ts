interface ProjectEvent {
  event: string;
  timestamp: string;
  data: {
    project_id: number;
    name: string;
    owner_id: number;
    priority?: string;
    deadline?: string;
  };
}

export class NotificationService {
  async processProjectCreated(event: ProjectEvent): Promise<void> {
    console.log('\n======================================');
    console.log('📧 NEW NOTIFICATION');
    console.log('======================================');
    console.log(`Event: ${event.event}`);
    console.log(`Timestamp: ${event.timestamp}`);
    console.log(`\nProject Details:`);
    console.log(`  - ID: ${event.data.project_id}`);
    console.log(`  - Name: ${event.data.name}`);
    console.log(`  - Owner ID: ${event.data.owner_id}`);
    if (event.data.priority) {
      console.log(`  - Priority: ${event.data.priority}`);
    }
    if (event.data.deadline) {
      console.log(`  - Deadline: ${event.data.deadline}`);
    }
    console.log('\n📨 Simulating notification sent to:');
    console.log(`  - Project owner (ID: ${event.data.owner_id})`);
    console.log(`  - Project team members`);
    console.log(`  - Management dashboard`);
    console.log('======================================\n');
  }

  async processProjectUpdated(event: ProjectEvent): Promise<void> {
    console.log('\n======================================');
    console.log('🔔 PROJECT UPDATE NOTIFICATION');
    console.log('======================================');
    console.log(`Event: ${event.event}`);
    console.log(`Timestamp: ${event.timestamp}`);
    console.log(`\nProject Updated:`);
    console.log(`  - ID: ${event.data.project_id}`);
    console.log(`  - Name: ${event.data.name}`);
    console.log('\n📨 Update notification sent to all stakeholders');
    console.log('======================================\n');
  }

  async processProjectDeleted(event: ProjectEvent): Promise<void> {
    console.log('\n======================================');
    console.log('⚠️  PROJECT DELETION NOTIFICATION');
    console.log('======================================');
    console.log(`Event: ${event.event}`);
    console.log(`Timestamp: ${event.timestamp}`);
    console.log(`\nProject Deleted:`);
    console.log(`  - ID: ${event.data.project_id}`);
    console.log(`  - Name: ${event.data.name}`);
    console.log('\n📨 Deletion notification sent to all team members');
    console.log('======================================\n');
  }

  async processEvent(event: ProjectEvent): Promise<void> {
    try {
      switch (event.event) {
        case 'project.created':
          await this.processProjectCreated(event);
          break;
        case 'project.updated':
          await this.processProjectUpdated(event);
          break;
        case 'project.deleted':
          await this.processProjectDeleted(event);
          break;
        default:
          console.log(`Unknown event type: ${event.event}`);
      }
    } catch (error) {
      console.error('Error processing event:', error);
      throw error;
    }
  }
}
