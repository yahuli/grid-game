
async function test() {
    const baseUrl = 'http://localhost:3000';

    console.log('1. Testing protected route without token...');
    const res1 = await fetch(`${baseUrl}/api/admin/admins`);
    console.log(`Status: ${res1.status}`);
    if (res1.status === 401) console.log('PASS'); else console.log('FAIL');

    console.log('\n2. Testing login...');
    const res2 = await fetch(`${baseUrl}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
    const data2 = await res2.json();
    console.log(`Status: ${res2.status}`);
    if (res2.status === 200 && data2.token) console.log('PASS'); else console.log('FAIL', data2);

    if (data2.token) {
        console.log('\n3. Testing protected route with token...');
        const res3 = await fetch(`${baseUrl}/api/admin/admins`, {
            headers: { 'Authorization': `Bearer ${data2.token}` }
        });
        console.log(`Status: ${res3.status}`);
        if (res3.status === 200) console.log('PASS'); else console.log('FAIL');
    }
}

test().catch(console.error);
