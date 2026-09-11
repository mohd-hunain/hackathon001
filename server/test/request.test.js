const assert = require('assert');
const jwt = require('jsonwebtoken');
const http = require('http');
const mongoose = require('mongoose');

// Ensure test environment before loading app
process.env.NODE_ENV = 'test';
const app = require('../server');
const { Farm, BookingRequest } = require('../models');

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

// In-memory mock store
const mockFarms = [
  {
    _id: new mongoose.Types.ObjectId('65e9a1111111111111111111'),
    farmerId: new mongoose.Types.ObjectId('65e9b1111111111111111111'), // Farmer 1
    name: 'Green Field 1',
    cropType: 'Wheat',
    cropStage: 'GROWING',
  },
  {
    _id: new mongoose.Types.ObjectId('65e9a2222222222222222222'),
    farmerId: new mongoose.Types.ObjectId('65e9b1111111111111111112'), // Farmer 2
    name: 'Golden Field 2',
    cropType: 'Paddy',
    cropStage: 'HARVEST_READY',
  },
];

const inMemoryRequests = [];

function setupMocksIfNeeded() {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    Farm.findById = async function (id) {
      const found = mockFarms.find((f) => f._id.toString() === id.toString());
      return found || null;
    };

    BookingRequest.create = async function (data) {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryRequests.push(doc);
      return doc;
    };
  }
}

async function runTests() {
  console.log('=== Starting FarmGrid Farmer Booking Request API Tests ===\n');

  setupMocksIfNeeded();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const farmer1Id = '65e9b1111111111111111111';
    const farmer2Id = '65e9b1111111111111111112';
    const ownerId = '65e9b2222222222222222222';

    const farmer1Token = jwt.sign({ id: farmer1Id, role: 'FARMER', email: 'farmer1@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });
    const farmer2Token = jwt.sign({ id: farmer2Id, role: 'FARMER', email: 'farmer2@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });
    const ownerToken = jwt.sign({ id: ownerId, role: 'RESOURCE_OWNER', email: 'owner@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });

    const validStart = new Date(Date.now() + 3600000).toISOString(); // +1 hour
    const validEnd = new Date(Date.now() + 3600000 * 5).toISOString(); // +5 hours (240 min window)

    // 1. Authentication guard
    console.log('1. Testing Authentication Guard on POST /api/requests (401 Unauthorized)...');
    const unauthRes = await makeRequest(server, { path: '/api/requests', method: 'POST' }, { farmId: mockFarms[0]._id });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated request must return 401');
    console.log('✔ Correctly returned 401 for unauthenticated request.\n');

    // 2. Role guard
    console.log('2. Testing Role Authorization on POST /api/requests (RESOURCE_OWNER must receive 403)...');
    const ownerRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${ownerToken}` },
    }, { farmId: mockFarms[0]._id });
    assert.strictEqual(ownerRes.status, 403, 'RESOURCE_OWNER must be rejected with 403');
    console.log('✔ Correctly returned 403 for non-FARMER role.\n');

    // 3. Farm Ownership Verification
    console.log('3. Testing Farm Ownership Verification...');
    // Farmer 1 attempts to submit request for Farmer 2's farm -> must return 403
    const crossFarmRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      farmId: mockFarms[1]._id, // Belongs to Farmer 2
      resourceType: 'Tractor',
      earliestStart: validStart,
      latestEnd: validEnd,
      requiredDurationMinutes: 120,
    });
    assert.strictEqual(crossFarmRes.status, 403, 'Submitting request for another farmer farm must return 403');
    console.log(`✔ Cross-farm booking blocked with 403: ${crossFarmRes.body.message}`);

    // Non-existent farm
    const fakeFarmId = new mongoose.Types.ObjectId().toString();
    const notFoundFarmRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      farmId: fakeFarmId,
      resourceType: 'Tractor',
      earliestStart: validStart,
      latestEnd: validEnd,
      requiredDurationMinutes: 120,
    });
    assert.strictEqual(notFoundFarmRes.status, 404, 'Non-existent farm must return 404');
    console.log(`✔ Non-existent farm returns 404: ${notFoundFarmRes.body.message}\n`);

    // 4. Time Window Validation
    console.log('4. Testing Time Window Validation (earliestStart must be before latestEnd)...');
    // earliestStart after latestEnd
    const invertedDatesRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      farmId: mockFarms[0]._id,
      resourceType: 'Tractor',
      earliestStart: validEnd,
      latestEnd: validStart, // start > end
      requiredDurationMinutes: 60,
    });
    assert.strictEqual(invertedDatesRes.status, 400, 'earliestStart >= latestEnd must return 400');
    console.log(`✔ Inverted time window correctly rejected with 400: ${invertedDatesRes.body.message}`);

    // Invalid date format
    const badDateRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      farmId: mockFarms[0]._id,
      resourceType: 'Tractor',
      earliestStart: 'not-a-date',
      latestEnd: validEnd,
      requiredDurationMinutes: 60,
    });
    assert.strictEqual(badDateRes.status, 400, 'Invalid date format must return 400');
    console.log('✔ Malformed date rejected with 400.\n');

    // 5. Duration Fitting Inside Window
    console.log('5. Testing Required Duration Fits Inside Window...');
    // Window is 240 minutes, but required duration is 300 minutes -> must return 400
    const oversizedDurationRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      farmId: mockFarms[0]._id,
      resourceType: 'Tractor',
      earliestStart: validStart,
      latestEnd: validEnd, // 240 minutes window
      requiredDurationMinutes: 300, // exceeds window!
    });
    assert.strictEqual(oversizedDurationRes.status, 400, 'Duration exceeding window must return 400');
    console.log(`✔ Oversized duration rejected with 400: ${oversizedDurationRes.body.message}\n`);

    // 6. Crop Stage Validation
    console.log('6. Testing Crop Stage Validation on Request Creation...');
    const badStageRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      farmId: mockFarms[0]._id,
      resourceType: 'Tractor',
      earliestStart: validStart,
      latestEnd: validEnd,
      requiredDurationMinutes: 120,
      cropStage: 'UNKNOWN_STAGE',
    });
    assert.strictEqual(badStageRes.status, 400, 'Invalid cropStage must return 400');
    console.log(`✔ Invalid cropStage rejected with 400: ${badStageRes.body.message}\n`);

    // 7. Successful Request Submission & Priority Engine Preparation
    console.log('7. Testing Successful Request Submission & Backend Priority Preparation...');
    // Attempting to inject a frontend priorityScore (must be ignored and computed on backend)
    const validPayload = {
      farmId: mockFarms[0]._id,
      resourceType: 'Tractor',
      earliestStart: validStart,
      latestEnd: validEnd,
      requiredDurationMinutes: 120,
      cropStage: 'CRITICAL',
      urgencyJustification: 'Rain forecast in 2 days, urgent ploughing needed',
      weatherRiskScore: 22,
      resourceConstraintScore: 5,
      priorityScore: 999, // FRONTEND ATTEMPTED SPOOFING - MUST BE OVERRIDDEN
    };

    const successRes = await makeRequest(server, {
      path: '/api/requests',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, validPayload);

    assert.strictEqual(successRes.status, 201, 'Valid request should return 201');
    assert.strictEqual(successRes.body.success, true);
    const data = successRes.body.data;

    // Check status is PENDING
    assert.strictEqual(data.status, 'PENDING', 'Request status must be PENDING');
    console.log('✔ Request saved with status: PENDING');

    // Check frontend spoofed priorityScore was ignored and overridden
    assert.notStrictEqual(data.priorityScore, 999, 'Frontend priorityScore must NOT be accepted');
    assert(data.priorityScore >= 0 && data.priorityScore <= 100, 'Priority score must be out of 100');
    console.log(`✔ Priority score computed strictly on backend: ${data.priorityScore}/100 (spoofed 999 rejected)`);

    // Check priority breakdown factors prepared for shared priority engine
    assert(data.priorityBreakdown, 'Priority breakdown must be present');
    assert(typeof data.priorityBreakdown.urgencyDeadline === 'number');
    assert(typeof data.priorityBreakdown.weatherRisk === 'number');
    assert.strictEqual(data.priorityBreakdown.cropReadiness, 20, 'CRITICAL stage must receive 20 readiness points');
    assert(typeof data.priorityBreakdown.queueWaiting === 'number');
    assert(typeof data.priorityBreakdown.distanceLogistics === 'number');
    assert.strictEqual(data.priorityBreakdown.resourceConstraints, 5, 'Resource constraint score maxed at 5');
    console.log('✔ Priority breakdown prepared with all 6 official factors:', data.priorityBreakdown);

    // Check explanation generated
    assert(typeof data.explanation === 'string' && data.explanation.length > 0);
    console.log(`✔ Human-readable explanation generated: "${data.explanation}"\n`);

    console.log('🎉 ALL FARMER BOOKING REQUEST TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
