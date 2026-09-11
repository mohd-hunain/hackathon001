const assert = require('assert');
const jwt = require('jsonwebtoken');
const http = require('http');
const mongoose = require('mongoose');

// Ensure test environment before loading app
process.env.NODE_ENV = 'test';
const app = require('../server');
const { Resource, BookingRequest, Schedule } = require('../models');

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

// IDs for test users and resources
const farmerId = '65e9b1111111111111111111';
const ownerId = '65e9b2222222222222222222';
const otherOwnerId = '65e9b3333333333333333333';
const masterId = '65e9b4444444444444444444';

// Track created resources for cleanup/assertions
let createdResourceId = null;

// Browse mock data uses populated ownerId (object with _id, name, etc.)
// findById mock data uses plain ObjectId for ownerId (as Mongoose returns before populate)
const mockBrowseResources = [
  {
    _id: new mongoose.Types.ObjectId('65e9c1111111111111111111'),
    name: 'Mahindra 575 DI Tractor',
    category: 'MACHINERY',
    type: 'Tractor',
    specifications: '45 HP, 4WD with 2-bottom MB plough',
    location: { latitude: 12.9716, longitude: 77.5946, village: 'Kengeri' },
    operatingWindow: { startTime: '06:00', endTime: '18:00' },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 30,
    ownerId: {
      _id: new mongoose.Types.ObjectId(ownerId),
      name: 'Ramesh Resource Hub',
      phone: '+919876543210',
      email: 'ramesh@farmgrid.io',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() { return this; },
  },
  {
    _id: new mongoose.Types.ObjectId('65e9c2222222222222222222'),
    name: 'John Deere Combined Harvester',
    category: 'MACHINERY',
    type: 'Harvester',
    specifications: '75 HP Multi-crop Harvester',
    location: { latitude: 13.0827, longitude: 80.2707, village: 'Mandya Hub' },
    operatingWindow: { startTime: '07:00', endTime: '19:00' },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 45,
    ownerId: {
      _id: new mongoose.Types.ObjectId(ownerId),
      name: 'Ramesh Resource Hub',
      phone: '+919876543210',
      email: 'ramesh@farmgrid.io',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() { return this; },
  },
  {
    _id: new mongoose.Types.ObjectId('65e9c3333333333333333333'),
    name: 'Kirloskar Diesel Portable Pump 5HP',
    category: 'IRRIGATION',
    type: 'Portable Pump',
    specifications: '5 HP High Flow Diesel Irrigation Pump with 100m hose',
    location: { latitude: 12.2958, longitude: 76.6394, village: 'Mysuru Rural' },
    operatingWindow: { startTime: '05:00', endTime: '20:00' },
    maintenanceStatus: 'MAINTENANCE',
    bufferMinutes: 15,
    ownerId: {
      _id: new mongoose.Types.ObjectId(ownerId),
      name: 'Ramesh Resource Hub',
      phone: '+919876543210',
      email: 'ramesh@farmgrid.io',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() { return this; },
  },
];

// findById returns documents with plain ObjectId ownerId (not populated)
const mockFindByIdResources = [
  {
    _id: new mongoose.Types.ObjectId('65e9c1111111111111111111'),
    name: 'Mahindra 575 DI Tractor',
    category: 'MACHINERY',
    type: 'Tractor',
    specifications: '45 HP, 4WD with 2-bottom MB plough',
    location: { latitude: 12.9716, longitude: 77.5946, village: 'Kengeri' },
    operatingWindow: { startTime: '06:00', endTime: '18:00' },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 30,
    ownerId: new mongoose.Types.ObjectId(ownerId),
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() { return this; },
    save() { return Promise.resolve(this); },
    deleteOne() { return Promise.resolve(); },
  },
  {
    _id: new mongoose.Types.ObjectId('65e9c2222222222222222222'),
    name: 'John Deere Combined Harvester',
    category: 'MACHINERY',
    type: 'Harvester',
    specifications: '75 HP Multi-crop Harvester',
    location: { latitude: 13.0827, longitude: 80.2707, village: 'Mandya Hub' },
    operatingWindow: { startTime: '07:00', endTime: '19:00' },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 45,
    ownerId: new mongoose.Types.ObjectId(ownerId),
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() { return this; },
    save() { return Promise.resolve(this); },
    deleteOne() { return Promise.resolve(); },
  },
  {
    _id: new mongoose.Types.ObjectId('65e9c3333333333333333333'),
    name: 'Kirloskar Diesel Portable Pump 5HP',
    category: 'IRRIGATION',
    type: 'Portable Pump',
    specifications: '5 HP High Flow Diesel Irrigation Pump with 100m hose',
    location: { latitude: 12.2958, longitude: 76.6394, village: 'Mysuru Rural' },
    operatingWindow: { startTime: '05:00', endTime: '20:00' },
    maintenanceStatus: 'MAINTENANCE',
    bufferMinutes: 15,
    ownerId: new mongoose.Types.ObjectId(ownerId),
    createdAt: new Date(),
    updatedAt: new Date(),
    toObject() { return this; },
    save() { return Promise.resolve(this); },
    deleteOne() { return Promise.resolve(); },
  },
];

// Track mock state for Schedule and BookingRequest
let mockActiveSchedules = [];
let mockPendingRequests = [];

function setupMocksIfNeeded() {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    // Mock Resource.find for browsing (returns populated ownerId)
    Resource.find = function (filter = {}) {
      let filtered = [...mockBrowseResources];

      if (filter.category) {
        filtered = filtered.filter((r) => r.category === filter.category);
      }
      if (filter.type) {
        if (filter.type.$regex) {
          filtered = filtered.filter((r) => filter.type.$regex.test(r.type));
        } else {
          filtered = filtered.filter((r) => r.type === filter.type);
        }
      }
      if (filter.maintenanceStatus) {
        filtered = filtered.filter((r) => r.maintenanceStatus === filter.maintenanceStatus);
      }
      if (filter.ownerId) {
        filtered = filtered.filter(
          (r) => (r.ownerId._id || r.ownerId).toString() === filter.ownerId.toString()
        );
      }

      return {
        populate: function () { return this; },
        sort: function () { return Promise.resolve(filtered); },
        then: function (resolve) { return resolve(filtered); },
      };
    };

    // Mock Resource.findById returns plain ObjectId ownerId (not populated)
    Resource.findById = function (id) {
      const resource = mockFindByIdResources.find((r) => r._id.toString() === id.toString());
      return Promise.resolve(resource ? resource : null);
    };

    // Mock Resource.create
    Resource.create = function (data) {
      const newResource = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject() { return this; },
        save() { return Promise.resolve(this); },
        deleteOne() { return Promise.resolve(); },
      };
      createdResourceId = newResource._id.toString();
      mockBrowseResources.push(newResource);
      return Promise.resolve(newResource);
    };

    // Mock Schedule.find for active scheduling constraint checks
    Schedule.find = function (filter = {}) {
      return Promise.resolve(mockActiveSchedules.filter((s) => {
        if (filter.resourceId && s.resourceId.toString() !== filter.resourceId.toString()) {
          return false;
        }
        if (filter.status && filter.status.$in) {
          return filter.status.$in.includes(s.status);
        }
        return true;
      }));
    };

    // Mock BookingRequest.find for pending request checks
    BookingRequest.find = function (filter = {}) {
      return Promise.resolve(mockPendingRequests.filter((r) => {
        if (filter.resourceId && r.resourceId.toString() !== filter.resourceId.toString()) {
          return false;
        }
        if (filter.status && filter.status.$in) {
          return filter.status.$in.includes(r.status);
        }
        return true;
      }));
    };
  }
}

async function runTests() {
  console.log('=== Starting FarmGrid Resource Owner Backend Tests ===\n');

  setupMocksIfNeeded();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  const farmerToken = jwt.sign(
    { id: farmerId, role: 'FARMER', email: 'farmer@farmgrid.io' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const ownerToken = jwt.sign(
    { id: ownerId, role: 'RESOURCE_OWNER', email: 'owner@farmgrid.io' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const otherOwnerToken = jwt.sign(
    { id: otherOwnerId, role: 'RESOURCE_OWNER', email: 'other@farmgrid.io' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const masterToken = jwt.sign(
    { id: masterId, role: 'MASTER', email: 'master@farmgrid.io' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  let passed = 0;
  let failed = 0;

  function logPass(msg) {
    passed++;
    console.log(`✔ ${msg}`);
  }

  function logFail(msg, err) {
    failed++;
    console.error(`✘ ${msg}: ${err}`);
  }

  try {
    // ========================================================================
    // 1. ROLE-BASED ACCESS: Only RESOURCE_OWNER can create resources
    // ========================================================================
    console.log('\n--- 1. Role-Based Access Control ---');

    // 1a. FARMER cannot create resources
    const farmerCreateRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${farmerToken}` },
      },
      {
        name: 'Unauthorized Tractor',
        category: 'MACHINERY',
        type: 'Tractor',
        location: { latitude: 12.0, longitude: 77.0 },
      }
    );
    try {
      assert.strictEqual(farmerCreateRes.status, 403);
      logPass('FARMER cannot create resources (403)');
    } catch (e) {
      logFail('FARMER should get 403 on POST /api/resources', e.message);
    }

    // 1b. Unauthenticated user cannot access
    const unauthRes = await makeRequest(server, {
      path: '/api/resources',
      method: 'GET',
    });
    try {
      assert.strictEqual(unauthRes.status, 401);
      logPass('Unauthenticated access returns 401');
    } catch (e) {
      logFail('Unauthenticated GET should return 401', e.message);
    }

    // ========================================================================
    // 2. RESOURCE CREATION (POST /api/resources)
    // ========================================================================
    console.log('\n--- 2. Resource Creation (POST /api/resources) ---');

    // 2a. Valid resource creation
    const validResource = {
      name: 'Test Mini Truck',
      category: 'TRANSPORT',
      type: 'Mini Truck',
      specifications: '1.5 ton capacity, diesel',
      location: { latitude: 12.5, longitude: 77.3, village: 'Test Village' },
      operatingWindow: { startTime: '07:00', endTime: '19:00' },
      maintenanceStatus: 'OPERATIONAL',
      bufferMinutes: 20,
    };

    const createRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      validResource
    );
    try {
      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.success, true);
      assert.strictEqual(createRes.body.data.name, 'Test Mini Truck');
      assert.strictEqual(createRes.body.data.category, 'TRANSPORT');
      logPass('Valid resource creation returns 201 with correct data');
    } catch (e) {
      logFail('Valid resource creation', e.message);
    }

    // 2b. Invalid category
    const invalidCatRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      {
        name: 'Invalid Resource',
        category: 'FLYING_CARPET',
        type: 'Magic',
        location: { latitude: 12.0, longitude: 77.0 },
      }
    );
    try {
      assert.strictEqual(invalidCatRes.status, 400);
      assert.strictEqual(invalidCatRes.body.success, false);
      assert(
        invalidCatRes.body.errors.some((e) => e.includes('Invalid category')),
        'Should mention invalid category'
      );
      logPass('Invalid category rejected with 400 and descriptive error');
    } catch (e) {
      logFail('Invalid category validation', e.message);
    }

    // 2c. Invalid maintenance status
    const invalidMaintRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      {
        name: 'Bad Status Resource',
        category: 'MACHINERY',
        type: 'Tractor',
        location: { latitude: 12.0, longitude: 77.0 },
        maintenanceStatus: 'FLYING',
      }
    );
    try {
      assert.strictEqual(invalidMaintRes.status, 400);
      assert(
        invalidMaintRes.body.errors.some((e) => e.includes('Invalid maintenanceStatus')),
        'Should mention invalid maintenance status'
      );
      logPass('Invalid maintenanceStatus rejected with descriptive error');
    } catch (e) {
      logFail('Invalid maintenance status validation', e.message);
    }

    // 2d. Invalid operating window (startTime >= endTime)
    const invalidWindowRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      {
        name: 'Bad Window Resource',
        category: 'MACHINERY',
        type: 'Tractor',
        location: { latitude: 12.0, longitude: 77.0 },
        operatingWindow: { startTime: '20:00', endTime: '06:00' },
      }
    );
    try {
      assert.strictEqual(invalidWindowRes.status, 400);
      assert(
        invalidWindowRes.body.errors.some((e) => e.includes('startTime must be earlier')),
        'Should mention start/end time order'
      );
      logPass('Invalid operatingWindow (start >= end) rejected');
    } catch (e) {
      logFail('Invalid operating window validation', e.message);
    }

    // 2e. Invalid operating window format
    const invalidTimeFormatRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      {
        name: 'Bad Time Format',
        category: 'MACHINERY',
        type: 'Tractor',
        location: { latitude: 12.0, longitude: 77.0 },
        operatingWindow: { startTime: 'morning', endTime: 'evening' },
      }
    );
    try {
      assert.strictEqual(invalidTimeFormatRes.status, 400);
      assert(
        invalidTimeFormatRes.body.errors.some((e) => e.includes('HH:MM')),
        'Should mention HH:MM format'
      );
      logPass('Invalid time format rejected with HH:MM instruction');
    } catch (e) {
      logFail('Invalid time format validation', e.message);
    }

    // 2f. Negative bufferMinutes
    const negativeBufferRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      {
        name: 'Negative Buffer',
        category: 'MACHINERY',
        type: 'Tractor',
        location: { latitude: 12.0, longitude: 77.0 },
        bufferMinutes: -10,
      }
    );
    try {
      assert.strictEqual(negativeBufferRes.status, 400);
      assert(
        negativeBufferRes.body.errors.some((e) => e.includes('negative')),
        'Should mention negative buffer'
      );
      logPass('Negative bufferMinutes rejected');
    } catch (e) {
      logFail('Negative buffer validation', e.message);
    }

    // 2g. Missing required fields
    const missingFieldsRes = await makeRequest(
      server,
      {
        path: '/api/resources',
        method: 'POST',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      {}
    );
    try {
      assert.strictEqual(missingFieldsRes.status, 400);
      assert(missingFieldsRes.body.errors.length >= 3, 'Should report multiple missing fields');
      logPass('Missing required fields rejected with multiple errors');
    } catch (e) {
      logFail('Missing fields validation', e.message);
    }

    // ========================================================================
    // 3. GET MY RESOURCES (GET /api/resources/my)
    // ========================================================================
    console.log('\n--- 3. Get My Resources (GET /api/resources/my) ---');

    const myRes = await makeRequest(server, {
      path: '/api/resources/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    try {
      assert.strictEqual(myRes.status, 200);
      assert.strictEqual(myRes.body.success, true);
      assert(Array.isArray(myRes.body.data));
      logPass('RESOURCE_OWNER can fetch own resources');
    } catch (e) {
      logFail('GET /api/resources/my', e.message);
    }

    // FARMER cannot access /my
    const farmerMyRes = await makeRequest(server, {
      path: '/api/resources/my',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    try {
      assert.strictEqual(farmerMyRes.status, 403);
      logPass('FARMER cannot access GET /api/resources/my (403)');
    } catch (e) {
      logFail('FARMER /api/resources/my access', e.message);
    }

    // ========================================================================
    // 4. UPDATE RESOURCE (PATCH /api/resources/:id)
    // ========================================================================
    console.log('\n--- 4. Update Resource (PATCH /api/resources/:id) ---');

    // 4a. Owner can update own resource
    const updateRes = await makeRequest(
      server,
      {
        path: `/api/resources/${mockResources[0]._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      { name: 'Updated Tractor Name', bufferMinutes: 45 }
    );
    try {
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.success, true);
      logPass('RESOURCE_OWNER can update own resource');
    } catch (e) {
      logFail('Owner update own resource', e.message);
    }

    // 4b. Other owner cannot update someone else's resource
    const otherUpdateRes = await makeRequest(
      server,
      {
        path: `/api/resources/${mockResources[0]._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${otherOwnerToken}` },
      },
      { name: 'Hijacked Name' }
    );
    try {
      assert.strictEqual(otherUpdateRes.status, 403);
      logPass('Other RESOURCE_OWNER cannot update another owner\'s resource (403)');
    } catch (e) {
      logFail('Cross-owner update prevention', e.message);
    }

    // 4c. FARMER cannot update resources
    const farmerUpdateRes = await makeRequest(
      server,
      {
        path: `/api/resources/${mockResources[0]._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${farmerToken}` },
      },
      { name: 'Farmer Hijack' }
    );
    try {
      assert.strictEqual(farmerUpdateRes.status, 403);
      logPass('FARMER cannot update resources (403)');
    } catch (e) {
      logFail('FARMER update prevention', e.message);
    }

    // 4d. Invalid category on update
    const invalidCatUpdateRes = await makeRequest(
      server,
      {
        path: `/api/resources/${mockResources[0]._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      { category: 'INVALID_CAT' }
    );
    try {
      assert.strictEqual(invalidCatUpdateRes.status, 400);
      logPass('Invalid category on update rejected');
    } catch (e) {
      logFail('Invalid category update validation', e.message);
    }

    // 4e. Invalid maintenance status on update
    const invalidMaintUpdateRes = await makeRequest(
      server,
      {
        path: `/api/resources/${mockResources[0]._id}`,
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      { maintenanceStatus: 'DESTROYED' }
    );
    try {
      assert.strictEqual(invalidMaintUpdateRes.status, 400);
      logPass('Invalid maintenanceStatus on update rejected');
    } catch (e) {
      logFail('Invalid maintenance status update validation', e.message);
    }

    // 4f. Resource not found
    const notFoundRes = await makeRequest(
      server,
      {
        path: '/api/resources/65e9c9999999999999999999',
        method: 'PATCH',
        headers: { Authorization: `Bearer ${ownerToken}` },
      },
      { name: 'Ghost' }
    );
    try {
      assert.strictEqual(notFoundRes.status, 404);
      logPass('Non-existent resource returns 404');
    } catch (e) {
      logFail('Resource not found on update', e.message);
    }

    // ========================================================================
    // 5. DELETE RESOURCE (DELETE /api/resources/:id)
    // ========================================================================
    console.log('\n--- 5. Delete Resource (DELETE /api/resources/:id) ---');

    // 5a. FARMER cannot delete resources
    const farmerDeleteRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[1]._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    try {
      assert.strictEqual(farmerDeleteRes.status, 403);
      logPass('FARMER cannot delete resources (403)');
    } catch (e) {
      logFail('FARMER delete prevention', e.message);
    }

    // 5b. Other owner cannot delete someone else's resource
    const otherDeleteRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[1]._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${otherOwnerToken}` },
    });
    try {
      assert.strictEqual(otherDeleteRes.status, 403);
      logPass('Other RESOURCE_OWNER cannot delete another owner\'s resource (403)');
    } catch (e) {
      logFail('Cross-owner delete prevention', e.message);
    }

    // 5c. Cannot delete resource with active schedule
    mockActiveSchedules = [
      {
        _id: new mongoose.Types.ObjectId(),
        resourceId: new mongoose.Types.ObjectId(mockResources[2]._id.toString()),
        status: 'SCHEDULED',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
      },
    ];

    const activeScheduleDeleteRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[2]._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    try {
      assert.strictEqual(activeScheduleDeleteRes.status, 409);
      assert(
        activeScheduleDeleteRes.body.message.includes('active or scheduled'),
        'Should mention active bookings'
      );
      logPass('Cannot delete resource with active schedules (409)');
    } catch (e) {
      logFail('Active schedule delete protection', e.message);
    }

    // Clear active schedules, add pending requests
    mockActiveSchedules = [];
    mockPendingRequests = [
      {
        _id: new mongoose.Types.ObjectId(),
        resourceId: new mongoose.Types.ObjectId(mockResources[2]._id.toString()),
        status: 'PENDING',
      },
    ];

    // 5d. Cannot delete resource with pending booking requests
    const pendingReqDeleteRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[2]._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    try {
      assert.strictEqual(pendingReqDeleteRes.status, 409);
      assert(
        pendingReqDeleteRes.body.message.includes('pending or active booking'),
        'Should mention pending requests'
      );
      logPass('Cannot delete resource with pending booking requests (409)');
    } catch (e) {
      logFail('Pending request delete protection', e.message);
    }

    // 5e. Can delete resource with no active constraints
    mockActiveSchedules = [];
    mockPendingRequests = [];

    const successDeleteRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[2]._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    try {
      assert.strictEqual(successDeleteRes.status, 200);
      assert.strictEqual(successDeleteRes.body.success, true);
      logPass('Resource with no active constraints deleted successfully');
    } catch (e) {
      logFail('Successful resource deletion', e.message);
    }

    // ========================================================================
    // 6. BROWSING (GET /api/resources) - Farmer-facing
    // ========================================================================
    console.log('\n--- 6. Resource Browsing (GET /api/resources) ---');

    const browseRes = await makeRequest(server, {
      path: '/api/resources',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    try {
      assert.strictEqual(browseRes.status, 200);
      assert.strictEqual(browseRes.body.success, true);
      assert(Array.isArray(browseRes.body.data));
      logPass(`FARMER can browse resources (${browseRes.body.count} returned)`);
    } catch (e) {
      logFail('FARMER browse resources', e.message);
    }

    // Validate field presence
    if (browseRes.body.data && browseRes.body.data.length > 0) {
      const resource = browseRes.body.data[0];
      try {
        assert(resource.name, 'name present');
        assert(resource.category, 'category present');
        assert(resource.type, 'type present');
        assert(resource.location, 'location present');
        assert(resource.operatingWindow, 'operatingWindow present');
        assert(resource.maintenanceStatus, 'maintenanceStatus present');
        assert(resource.bufferMinutes !== undefined, 'bufferMinutes present');
        logPass('All required fields present in browsing response');
      } catch (e) {
        logFail('Field presence validation', e.message);
      }
    }

    // Category filter
    const catFilterRes = await makeRequest(server, {
      path: '/api/resources?category=MACHINERY',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    try {
      assert.strictEqual(catFilterRes.status, 200);
      catFilterRes.body.data.forEach((r) => {
        assert.strictEqual(r.category, 'MACHINERY');
      });
      logPass('Category filtering works correctly');
    } catch (e) {
      logFail('Category filter', e.message);
    }

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n========================================');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('========================================');

    if (failed > 0) {
      console.log('\n❌ SOME TESTS FAILED');
      process.exit(1);
    } else {
      console.log('\n🎉 ALL RESOURCE OWNER BACKEND TESTS PASSED SUCCESSFULLY!');
      process.exit(0);
    }
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
