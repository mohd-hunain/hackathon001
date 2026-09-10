const assert = require('assert');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET || 'farmgrid_jwt_secret_key_2026';

// Helper to make HTTP requests against express app
function makeRequest(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== Starting FarmGrid Authentication & Role Authorization Tests ===\n');

  process.env.NODE_ENV = 'test';
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 1. Test Password Hashing
    console.log('1. Testing Password Hashing...');
    const rawPassword = 'SecureFarmPassword123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPassword, salt);
    assert(hash !== rawPassword, 'Hash should not match plaintext password');
    assert(await bcrypt.compare(rawPassword, hash), 'Password should compare true with hash');
    assert(!(await bcrypt.compare('WrongPassword', hash)), 'Invalid password should not compare');
    console.log('✔ Password hashing verified.\n');

    // 2. Generate Tokens for each role
    console.log('2. Generating Tokens for FARMER, RESOURCE_OWNER, and MASTER...');
    const farmerToken = jwt.sign(
      { id: '65e9b1111111111111111111', role: 'FARMER', email: 'farmer@farmgrid.io' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const ownerToken = jwt.sign(
      { id: '65e9b2222222222222222222', role: 'RESOURCE_OWNER', email: 'owner@farmgrid.io' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const masterToken = jwt.sign(
      { id: '65e9b3333333333333333333', role: 'MASTER', email: 'master@farmgrid.io' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    console.log('✔ JWT tokens created for all 3 official roles.\n');

    // 3. Test Unauthenticated Access (Must be 401)
    console.log('3. Testing Unauthenticated Request to Protected Route (GET /api/master/dashboard)...');
    const unauthRes = await makeRequest(server, {
      path: '/api/master/dashboard',
      method: 'GET',
    });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request should return 401');
    assert.strictEqual(unauthRes.body.success, false);
    console.log(`✔ Correctly returned HTTP ${unauthRes.status}: ${unauthRes.body.message}\n`);

    // 4. Test Invalid JWT Token (Must be 401)
    console.log('4. Testing Request with Invalid JWT Token...');
    const invalidTokenRes = await makeRequest(server, {
      path: '/api/master/dashboard',
      method: 'GET',
      headers: { Authorization: 'Bearer invalid_garbage_token_123' },
    });
    assert.strictEqual(invalidTokenRes.status, 401, 'Invalid token should return 401');
    console.log(`✔ Correctly returned HTTP ${invalidTokenRes.status}: ${invalidTokenRes.body.message}\n`);

    // 5. Test FARMER Access to Master APIs (Must be 403 Forbidden)
    console.log('5. Testing FARMER Access to Master APIs (GET /api/master/dashboard)...');
    const farmerMasterRes = await makeRequest(server, {
      path: '/api/master/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(farmerMasterRes.status, 403, 'FARMER must be rejected with 403 on Master API');
    console.log(`✔ Correctly returned HTTP ${farmerMasterRes.status}: ${farmerMasterRes.body.message}\n`);

    // 6. Test RESOURCE_OWNER Access to Master APIs (Must be 403 Forbidden)
    console.log('6. Testing RESOURCE_OWNER Access to Master APIs (GET /api/master/dashboard)...');
    const ownerMasterRes = await makeRequest(server, {
      path: '/api/master/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(ownerMasterRes.status, 403, 'RESOURCE_OWNER must be rejected with 403 on Master API');
    console.log(`✔ Correctly returned HTTP ${ownerMasterRes.status}: ${ownerMasterRes.body.message}\n`);

    // 7. Test Disruption API Access (Only MASTER allowed)
    console.log('7. Testing FARMER Access to Disruption API (GET /api/disruptions)...');
    const farmerDisruptRes = await makeRequest(server, {
      path: '/api/disruptions',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(farmerDisruptRes.status, 403, 'FARMER must be rejected with 403 on Disruption API');
    console.log(`✔ Correctly returned HTTP ${farmerDisruptRes.status}: ${farmerDisruptRes.body.message}`);

    console.log('   Testing RESOURCE_OWNER Access to Disruption API (GET /api/disruptions)...');
    const ownerDisruptRes = await makeRequest(server, {
      path: '/api/disruptions',
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    assert.strictEqual(ownerDisruptRes.status, 403, 'RESOURCE_OWNER must be rejected with 403 on Disruption API');
    console.log(`✔ Correctly returned HTTP ${ownerDisruptRes.status}: ${ownerDisruptRes.body.message}\n`);

    // 8. Test Master Access to Master Dashboard & Disruptions
    console.log('8. Testing MASTER Access to Master Dashboard & Disruptions...');
    const masterRes = await makeRequest(server, {
      path: '/api/master/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${masterToken}` },
    });
    // With mock DB or in-memory, status is either 200 (if DB connected) or 500 (if MongoDB query fails due to no live DB), but NOT 401 or 403
    assert(masterRes.status !== 401 && masterRes.status !== 403, 'MASTER should NOT be denied by auth/role middleware');
    console.log(`✔ Auth & Authorization succeeded for MASTER (Status: ${masterRes.status}, authorized through guard).\n`);

    // 9. Test Master Scheduling Access (POST /api/schedule/generate)
    console.log('9. Testing FARMER Access to Schedule Generate (POST /api/schedule/generate)...');
    const farmerSchedRes = await makeRequest(server, {
      path: '/api/schedule/generate',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: { resourceId: '65e9b1111111111111111111' },
    });
    assert.strictEqual(farmerSchedRes.status, 403, 'FARMER must be rejected with 403 on Master Schedule Generate');
    console.log(`✔ Correctly returned HTTP ${farmerSchedRes.status}: ${farmerSchedRes.body.message}\n`);

    console.log('🎉 ALL AUTHENTICATION AND ROLE AUTHORIZATION TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
