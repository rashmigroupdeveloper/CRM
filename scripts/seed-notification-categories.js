const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultCategories = [
  {
    name: 'System',
    description: 'System notifications and maintenance alerts',
    color: '#6366f1',
    icon: '⚙️'
  },
  {
    name: 'Activity',
    description: 'User activity and engagement notifications',
    color: '#10b981',
    icon: '📈'
  },
  {
    name: 'Communication',
    description: 'Messages and communication updates',
    color: '#3b82f6',
    icon: '💬'
  },
  {
    name: 'Alerts',
    description: 'Important alerts and warnings',
    color: '#f59e0b',
    icon: '🚨'
  },
  {
    name: 'Reminders',
    description: 'Scheduled reminders and follow-ups',
    color: '#8b5cf6',
    icon: '🔔'
  },
  {
    name: 'Updates',
    description: 'Status updates and changes',
    color: '#06b6d4',
    icon: '🔄'
  }
];

const defaultTags = [
  { name: 'Urgent', color: '#dc2626' },
  { name: 'Important', color: '#ea580c' },
  { name: 'Info', color: '#2563eb' },
  { name: 'Success', color: '#16a34a' },
  { name: 'Warning', color: '#ca8a04' },
  { name: 'Follow-up', color: '#7c3aed' },
  { name: 'Meeting', color: '#0891b2' },
  { name: 'Task', color: '#059669' },
  { name: 'Deadline', color: '#dc2626' },
  { name: 'Priority', color: '#7c2d12' }
];

async function seedNotificationCategories() {
  console.log('🌱 Seeding notification categories and tags...');

  try {
    // Seed categories
    for (const category of defaultCategories) {
      await prisma.notification_categories.upsert({
        where: { name: category.name },
        update: {
          ...category,
          updatedAt: new Date()
        },
        create: {
          ...category,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // Seed tags
    for (const tag of defaultTags) {
      await prisma.notification_tags.upsert({
        where: { name: tag.name },
        update: {
          ...tag,
          updatedAt: new Date()
        },
        create: {
          ...tag,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    console.log('✅ Notification categories and tags seeded successfully!');
    console.log(`📊 Created ${defaultCategories.length} categories and ${defaultTags.length} tags`);

  } catch (error) {
    console.error('❌ Error seeding notification categories and tags:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedNotificationCategories()
  .then(() => {
    console.log('🎉 Seeding completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
