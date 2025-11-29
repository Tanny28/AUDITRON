import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // Create demo organization
    const org = await prisma.organization.upsert({
        where: { email: 'demo@auditron.ai' },
        update: {},
        create: {
            name: 'Demo Organization',
            email: 'demo@auditron.ai',
            phone: '+91 9876543210',
            gstNumber: '29ABCDE1234F1Z5',
            panNumber: 'ABCDE1234F',
            subscriptionTier: 'PROFESSIONAL',
        },
    });

    console.log('✅ Created organization:', org.name);

    // Create demo admin user
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
        where: { email: 'admin@auditron.ai' },
        update: {},
        create: {
            email: 'admin@auditron.ai',
            passwordHash: adminPassword,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            isActive: true,
            emailVerified: true,
            organizationId: org.id,
        },
    });

    console.log('✅ Created admin user:', admin.email);

    // Create demo CA user
    const caPassword = await hashPassword('ca123');
    const ca = await prisma.user.upsert({
        where: { email: 'ca@auditron.ai' },
        update: {},
        create: {
            email: 'ca@auditron.ai',
            passwordHash: caPassword,
            firstName: 'CA',
            lastName: 'Professional',
            role: 'CA',
            isActive: true,
            emailVerified: true,
            organizationId: org.id,
        },
    });

    console.log('✅ Created CA user:', ca.email);

    // Create demo regular user
    const userPassword = await hashPassword('user123');
    const user = await prisma.user.upsert({
        where: { email: 'user@auditron.ai' },
        update: {},
        create: {
            email: 'user@auditron.ai',
            passwordHash: userPassword,
            firstName: 'Regular',
            lastName: 'User',
            role: 'USER',
            isActive: true,
            emailVerified: true,
            organizationId: org.id,
        },
    });

    console.log('✅ Created regular user:', user.email);

    console.log('\n🎉 Seeding completed!');
    console.log('\n📝 Demo credentials:');
    console.log('Admin: admin@auditron.ai / admin123');
    console.log('CA: ca@auditron.ai / ca123');
    console.log('User: user@auditron.ai / user123');
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
