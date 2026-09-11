const assert = require('assert');
const jwt = require('jsonwebtoken');
const http = require('http');
const mongoose = require('mongoose');

// Ensure test environment before loading app
process.env.NODE_ENV = 'test';
const app = require('../server');
const { Farm } = require('../models');

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

// In-memory mock store for Farm operations when MongoDB is not connected
const inMemoryFarms = [];

function setupMocksIfNeeded() {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    // Mock Farm.create
    Farm.create = async function (data) {
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        farmerId: data.farmerId,
        name: data.name,
        location: {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          village: data.location.village || '',
        },
        cropType: data.cropType,
        cropStage: data.cropStage || 'GROWING',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      inMemoryFarms.push(doc);
      return doc;
    };

    // Mock Farm.find
    Farm.find = function (query) {
      const results = inMemoryFarms.filter((f) => {
        if (query.farmerId) {
          return f.farmerId.toString() === query.farmerId.toString();
        }
        return true;
      });

      return {
        sort: function () {
          return Promise.resolve([...results].reverse());
        },
        then: function (resolve) {
          return resolve(results);
        },
      };
    };

    // Mock Farm.findById
    Farm.findById = async function (id) {
      const found = inMemoryFarms.find((f) => f._id.toString() === id.toString());
      if (!found) return null;

      // Wrap with save() method to mimic Mongoose document
      return {
        ...found,
        save: async function () {
          found.name = this.name;
          found.location = { ...this.location };
          found.cropType = this.cropType;
          found.cropStage = this.cropStage;
          found.updatedAt = new Date();
          return this;
        },
      };
    };
  }
}

async function runTests() {
  console.log('=== Starting FarmGrid Farm API & Validation Tests ===\n');

  setupMocksIfNeeded();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 1. Setup tokens
    const farmer1Id = '65e9b1111111111111111111';
    const farmer2Id = '65e9b1111111111111111112';
    const ownerId = '65e9b2222222222222222222';
    const masterId = '65e9b3333333333333333333';

    const farmer1Token = jwt.sign({ id: farmer1Id, role: 'FARMER', email: 'farmer1@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });
    const farmer2Token = jwt.sign({ id: farmer2Id, role: 'FARMER', email: 'farmer2@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });
    const ownerToken = jwt.sign({ id: ownerId, role: 'RESOURCE_OWNER', email: 'owner@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });
    const masterToken = jwt.sign({ id: masterId, role: 'MASTER', email: 'master@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });

    // 2. Authentication tests
    console.log('1. Testing Authentication Guard on Farm Endpoints (401 Unauthorized)...');
    const unauthPost = await makeRequest(server, { path: '/api/farms', method: 'POST' }, { name: 'Farm' });
    assert.strictEqual(unauthPost.status, 401, 'POST /api/farms without token must return 401');

    const unauthGet = await makeRequest(server, { path: '/api/farms/my', method: 'GET' });
    assert.strictEqual(unauthGet.status, 401, 'GET /api/farms/my without token must return 401');

    const unauthPatch = await makeRequest(server, { path: `/api/farms/${farmer1Id}`, method: 'PATCH' }, { name: 'New' });
    assert.strictEqual(unauthPatch.status, 401, 'PATCH /api/farms/:id without token must return 401');
    console.log('✔ Correctly returned 401 for unauthenticated requests.\n');

    // 3. Role authorization tests (Only FARMER allowed)
    console.log('2. Testing Role Authorization (Only FARMER allowed, others must receive 403)...');
    
    // RESOURCE_OWNER
    const ownerPost = await makeRequest(server, { path: '/api/farms', method: 'POST', headers: { Authorization: `Bearer ${ownerToken}` } }, { name: 'Farm' });
    assert.strictEqual(ownerPost.status, 403, 'RESOURCE_OWNER on POST /api/farms must return 403');

    const ownerGet = await makeRequest(server, { path: '/api/farms/my', method: 'GET', headers: { Authorization: `Bearer ${ownerToken}` } });
    assert.strictEqual(ownerGet.status, 403, 'RESOURCE_OWNER on GET /api/farms/my must return 403');

    const ownerPatch = await makeRequest(server, { path: `/api/farms/${farmer1Id}`, method: 'PATCH', headers: { Authorization: `Bearer ${ownerToken}` } });
    assert.strictEqual(ownerPatch.status, 403, 'RESOURCE_OWNER on PATCH /api/farms/:id must return 403');

    // MASTER
    const masterPost = await makeRequest(server, { path: '/api/farms', method: 'POST', headers: { Authorization: `Bearer ${masterToken}` } }, { name: 'Farm' });
    assert.strictEqual(masterPost.status, 403, 'MASTER on POST /api/farms must return 403');

    const masterGet = await makeRequest(server, { path: '/api/farms/my', method: 'GET', headers: { Authorization: `Bearer ${masterToken}` } });
    assert.strictEqual(masterGet.status, 403, 'MASTER on GET /api/farms/my must return 403');

    const masterPatch = await makeRequest(server, { path: `/api/farms/${farmer1Id}`, method: 'PATCH', headers: { Authorization: `Bearer ${masterToken}` } });
    assert.strictEqual(masterPatch.status, 403, 'MASTER on PATCH /api/farms/:id must return 403');

    console.log('✔ Non-FARMER roles (RESOURCE_OWNER, MASTER) correctly blocked with 403.\n');

    // 4. POST /api/farms - Latitude & Longitude Validation
    console.log('3. Testing Latitude & Longitude Validation on POST /api/farms...');
    
    // Missing location
    const noLoc = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat' });
    assert.strictEqual(noLoc.status, 400, 'Missing location must return 400');

    // Missing latitude
    const noLat = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { longitude: 77.5 } });
    assert.strictEqual(noLat.status, 400, 'Missing latitude must return 400');

    // Latitude > 90
    const highLat = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: 91.5, longitude: 77.5 } });
    assert.strictEqual(highLat.status, 400, 'Latitude > 90 must return 400');

    // Latitude < -90
    const lowLat = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: -95.0, longitude: 77.5 } });
    assert.strictEqual(lowLat.status, 400, 'Latitude < -90 must return 400');

    // Non-numeric latitude
    const nanLat = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: 'invalid_lat', longitude: 77.5 } });
    assert.strictEqual(nanLat.status, 400, 'Non-numeric latitude must return 400');

    // Missing longitude
    const noLng = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: 12.9 } });
    assert.strictEqual(noLng.status, 400, 'Missing longitude must return 400');

    // Longitude > 180
    const highLng = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: 12.9, longitude: 185.0 } });
    assert.strictEqual(highLng.status, 400, 'Longitude > 180 must return 400');

    // Longitude < -180
    const lowLng = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: 12.9, longitude: -185.0 } });
    assert.strictEqual(lowLng.status, 400, 'Longitude < -180 must return 400');

    // Boolean coordinates
    const boolLat = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: true, longitude: 77.5 } });
    assert.strictEqual(boolLat.status, 400, 'Boolean latitude must return 400');

    console.log('✔ Latitude & Longitude validation correctly enforced.\n');

    // 5. POST /api/farms - Crop Stage Validation
    console.log('4. Testing Crop Stage Validation on POST /api/farms...');
    
    // Invalid crop stage
    const invalidStage = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Green Valley', cropType: 'Wheat', location: { latitude: 12.97, longitude: 77.59 }, cropStage: 'INVALID_STAGE' });
    assert.strictEqual(invalidStage.status, 400, 'Invalid cropStage must return 400');

    console.log('✔ Invalid cropStage rejected with 400.\n');

    // 6. POST /api/farms - Successful creation for Farmer 1 and Farmer 2
    console.log('5. Testing Successful Farm Creation (POST /api/farms)...');
    const validStages = ['SOWING', 'GROWING', 'HARVEST_READY', 'CRITICAL'];
    let createdFarmId1 = null;

    for (const stage of validStages) {
      const res = await makeRequest(server, {
        path: '/api/farms',
        method: 'POST',
        headers: { Authorization: `Bearer ${farmer1Token}` },
      }, {
        name: `Farm Stage ${stage}`,
        cropType: 'Wheat',
        cropStage: stage,
        location: { latitude: 12.9716, longitude: 77.5946, village: 'Kengeri' },
      });
      assert.strictEqual(res.status, 201, `Valid crop stage ${stage} should return 201`);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.cropStage, stage);
      assert.strictEqual(res.body.data.farmerId.toString(), farmer1Id);
      if (!createdFarmId1) createdFarmId1 = res.body.data._id;
    }

    // Farmer 2 creates a farm
    const resFarm2 = await makeRequest(server, {
      path: '/api/farms',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmer2Token}` },
    }, {
      name: 'Farmer 2 Rice Field',
      cropType: 'Rice',
      cropStage: 'GROWING',
      location: { latitude: 13.0827, longitude: 80.2707, village: 'Mandya' },
    });
    assert.strictEqual(resFarm2.status, 201);
    const createdFarmId2 = resFarm2.body.data._id;

    console.log('✔ All valid crop stages accepted and farms created with 201.\n');

    // 7. GET /api/farms/my - Farmer can access only their own farms
    console.log('6. Testing GET /api/farms/my (Farmer can access only their own farms)...');
    const f1MyFarms = await makeRequest(server, {
      path: '/api/farms/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    assert.strictEqual(f1MyFarms.status, 200);
    assert.strictEqual(f1MyFarms.body.success, true);
    assert.strictEqual(f1MyFarms.body.count, 4, 'Farmer 1 should only see their 4 farms');
    f1MyFarms.body.data.forEach((farm) => {
      assert.strictEqual(farm.farmerId.toString(), farmer1Id, 'Farm must belong to Farmer 1');
    });

    const f2MyFarms = await makeRequest(server, {
      path: '/api/farms/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmer2Token}` },
    });
    assert.strictEqual(f2MyFarms.status, 200);
    assert.strictEqual(f2MyFarms.body.count, 1, 'Farmer 2 should only see their 1 farm');
    assert.strictEqual(f2MyFarms.body.data[0].farmerId.toString(), farmer2Id);

    console.log('✔ Farmers can only access their own farms on GET /api/farms/my.\n');

    // 8. PATCH /api/farms/:id - Farmer ownership enforcement
    console.log('7. Testing Ownership Enforcement on PATCH /api/farms/:id...');
    // Farmer 2 trying to update Farmer 1's farm -> must return 403
    const crossFarmerPatch = await makeRequest(server, {
      path: `/api/farms/${createdFarmId1}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer2Token}` },
    }, { name: 'Hacked Farm Name' });
    assert.strictEqual(crossFarmerPatch.status, 403, 'Updating another farmer farm must return 403');
    assert.strictEqual(crossFarmerPatch.body.success, false);
    console.log(`✔ Cross-farmer modification blocked with 403: ${crossFarmerPatch.body.message}`);

    // Update non-existent farm -> must return 404
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const notFoundPatch = await makeRequest(server, {
      path: `/api/farms/${nonExistentId}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { name: 'Non Existent' });
    assert.strictEqual(notFoundPatch.status, 404, 'Non-existent farm must return 404');
    console.log(`✔ Non-existent farm returns 404: ${notFoundPatch.body.message}\n`);

    // 9. PATCH /api/farms/:id - Validation on update
    console.log('8. Testing Validation on PATCH /api/farms/:id...');
    // Invalid latitude
    const patchInvalidLat = await makeRequest(server, {
      path: `/api/farms/${createdFarmId1}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { location: { latitude: 99.9 } });
    assert.strictEqual(patchInvalidLat.status, 400, 'Invalid latitude on patch must return 400');

    // Invalid longitude
    const patchInvalidLng = await makeRequest(server, {
      path: `/api/farms/${createdFarmId1}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { location: { longitude: -199.9 } });
    assert.strictEqual(patchInvalidLng.status, 400, 'Invalid longitude on patch must return 400');

    // Invalid crop stage
    const patchInvalidStage = await makeRequest(server, {
      path: `/api/farms/${createdFarmId1}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, { cropStage: 'ROTTING' });
    assert.strictEqual(patchInvalidStage.status, 400, 'Invalid cropStage on patch must return 400');

    console.log('✔ Validation on PATCH correctly enforced for lat, lng, and cropStage.\n');

    // 10. PATCH /api/farms/:id - Successful update by owner
    console.log('9. Testing Successful PATCH /api/farms/:id by Owner...');
    const patchSuccess = await makeRequest(server, {
      path: `/api/farms/${createdFarmId1}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    }, {
      name: 'Updated Farm Name Alpha',
      location: { latitude: 12.9800, longitude: 77.6000, village: 'Whitefield' },
      cropType: 'Organic Wheat',
      cropStage: 'HARVEST_READY',
    });
    assert.strictEqual(patchSuccess.status, 200, 'Owner update must return 200');
    assert.strictEqual(patchSuccess.body.success, true);
    assert.strictEqual(patchSuccess.body.data.name, 'Updated Farm Name Alpha');
    assert.strictEqual(patchSuccess.body.data.cropStage, 'HARVEST_READY');
    assert.strictEqual(patchSuccess.body.data.location.latitude, 12.9800);
    assert.strictEqual(patchSuccess.body.data.location.village, 'Whitefield');
    console.log('✔ Farm successfully updated with 200.\n');

    console.log('🎉 ALL FARM BACKEND TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
