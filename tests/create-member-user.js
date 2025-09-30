const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createMemberUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('member123', 12);
    
    // Create the member user
    const memberUser = await prisma.user.create({
      data: {
        email: 'member@maskwise.com',
        password: hashedPassword,
        role: 'MEMBER',
        firstName: 'Test',
        lastName: 'Member',
        isActive: true
      }
    });
    
    console.log('✅ Created member user:');
    console.log('   Email: member@maskwise.com');
    console.log('   Password: member123');
    console.log('   Role: MEMBER');
    console.log('   User ID:', memberUser.id);
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️  Member user already exists: member@maskwise.com');
    } else {
      console.error('❌ Error creating member user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createMemberUser();