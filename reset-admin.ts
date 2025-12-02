import { getAdminByUsername, changeAdminPassword, createAdmin } from './lib/db';

async function reset() {
    const admin = await getAdminByUsername('admin');
    if (admin) {
        console.log('Updating admin password...');
        await changeAdminPassword(admin.id, 'admin123');
        console.log('Password updated.');
    } else {
        console.log('Creating admin...');
        await createAdmin('admin', 'admin123');
        console.log('Admin created.');
    }
}

reset().catch(console.error);
