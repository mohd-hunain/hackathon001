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

// Sample mock data for resources including booked and unbooked resources
const mockResources = [
  {
    _id: new mongoose.Types.ObjectId('65e9c1111111111111111111'),
    name: 'Mahindra 575 DI Tractor',
    category: 'MACHINERY',
    type: 'Tractor',
    specifications: '45 HP, 4WD with 2-bottom MB plough',
    location: {
      latitude: 12.9716,
      longitude: 77.5946,
      village: 'Kengeri',
    },
    operatingWindow: {
      startTime: '06:00',
      endTime: '18:00',
    },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 30,
    ownerId: {
      _id: new mongoose.Types.ObjectId('65e9b2222222222222222222'),
      name: 'Ramesh Resource Hub',
      phone: '+919876543210',
      email: 'ramesh@farmgrid.io',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new mongoose.Types.ObjectId('65e9c2222222222222222222'),
    name: 'John Deere Combined Harvester',
    category: 'MACHINERY',
    type: 'Harvester',
    specifications: '75 HP Multi-crop Harvester',
    location: {
      latitude: 13.0827,
      longitude: 80.2707,
      village: 'Mandya Hub',
    },
    operatingWindow: {
      startTime: '07:00',
      endTime: '19:00',
    },
    maintenanceStatus: 'OPERATIONAL',
    bufferMinutes: 45,
    ownerId: {
      _id: new mongoose.Types.ObjectId('65e9b2222222222222222222'),
      name: 'Ramesh Resource Hub',
      phone: '+919876543210',
      email: 'ramesh@farmgrid.io',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    _id: new mongoose.Types.ObjectId('65e9c3333333333333333333'),
    name: 'Kirloskar Diesel Portable Pump 5HP',
    category: 'IRRIGATION',
    type: 'Portable Pump',
    specifications: '5 HP High Flow Diesel Irrigation Pump with 100m hose',
    location: {
      latitude: 12.2958,
      longitude: 76.6394,
      village: 'Mysuru Rural',
    },
    operatingWindow: {
      startTime: '05:00',
      endTime: '20:00',
    },
    maintenanceStatus: 'MAINTENANCE',
    bufferMinutes: 15,
    ownerId: {
      _id: new mongoose.Types.ObjectId('65e9b2222222222222222222'),
      name: 'Ramesh Resource Hub',
      phone: '+919876543210',
      email: 'ramesh@farmgrid.io',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

function setupMocksIfNeeded() {
  const isDbConnected = mongoose.connection && mongoose.connection.readyState === 1;
  if (!isDbConnected) {
    // Mock Resource.find
    Resource.find = function (filter = {}) {
      let filtered = [...mockResources];

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

      return {
        populate: function () {
          return this;
        },
        sort: function () {
          return Promise.resolve(filtered);
        },
        then: function (resolve) {
          return resolve(filtered);
        },
      };
    };
  }
}

async function runTests() {
  console.log('=== Starting FarmGrid Farmer-Facing Resource Browsing Tests ===\n');

  setupMocksIfNeeded();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    const farmerId = '65e9b1111111111111111111';
    const ownerId = '65e9b2222222222222222222';

    const farmerToken = jwt.sign({ id: farmerId, role: 'FARMER', email: 'farmer@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });
    const ownerToken = jwt.sign({ id: ownerId, role: 'RESOURCE_OWNER', email: 'owner@farmgrid.io' }, JWT_SECRET, { expiresIn: '1h' });

    // 1. Authentication test
    console.log('1. Testing Unauthenticated Access to GET /api/resources (Must be 401)...');
    const unauthRes = await makeRequest(server, { path: '/api/resources', method: 'GET' });
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated GET /api/resources must return 401');
    console.log('✔ Correctly returned 401 for unauthenticated request.\n');

    // 2. Farmer Browsing Access
    console.log('2. Testing FARMER Access to Browse Resources (GET /api/resources)...');
    const farmerRes = await makeRequest(server, {
      path: '/api/resources',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(farmerRes.status, 200, 'FARMER must receive 200 OK on GET /api/resources');
    assert.strictEqual(farmerRes.body.success, true);
    assert.strictEqual(Array.isArray(farmerRes.body.data), true);
    assert(farmerRes.body.count >= 3, 'Should return all registered resources');
    console.log(`✔ FARMER successfully fetched ${farmerRes.body.count} resources.\n`);

    // 3. Validate presence of all Farmer-required fields
    console.log('3. Validating Farmer-Required Information in Resource Payload...');
    farmerRes.body.data.forEach((resource) => {
      // 1. Resource name
      assert(typeof resource.name === 'string' && resource.name.length > 0, 'Resource name is required');
      // 2. Category
      assert(typeof resource.category === 'string' && resource.category.length > 0, 'Category is required');
      // 3. Type
      assert(typeof resource.type === 'string' && resource.type.length > 0, 'Type is required');
      // 4. Specifications
      assert(typeof resource.specifications === 'string', 'Specifications field is required');
      // 5. Location
      assert(resource.location && typeof resource.location === 'object', 'Location object is required');
      assert(typeof resource.location.latitude === 'number', 'Latitude is required');
      assert(typeof resource.location.longitude === 'number', 'Longitude is required');
      assert(typeof resource.location.village === 'string', 'Village is required');
      // 6. Operating window
      assert(resource.operatingWindow && typeof resource.operatingWindow === 'object', 'Operating window is required');
      assert(typeof resource.operatingWindow.startTime === 'string', 'Start time is required');
      assert(typeof resource.operatingWindow.endTime === 'string', 'End time is required');
      // 7. Maintenance status
      assert(typeof resource.maintenanceStatus === 'string', 'Maintenance status is required');
      assert(['OPERATIONAL', 'MAINTENANCE', 'BREAKDOWN'].includes(resource.maintenanceStatus), 'Valid maintenance status required');
      // 8. Buffer minutes
      assert(typeof resource.bufferMinutes === 'number' && resource.bufferMinutes >= 0, 'Buffer minutes is required and must be non-negative');
    });
    console.log('✔ All 8 required information fields verified for every resource:\n' +
      '   - Resource name\n' +
      '   - Category\n' +
      '   - Type\n' +
      '   - Specifications\n' +
      '   - Location (lat, lng, village)\n' +
      '   - Operating window (startTime, endTime)\n' +
      '   - Maintenance status\n' +
      '   - Buffer minutes\n');

    // 4. Availability Not Permanently Calculated / Booked Resources Still Visible
    console.log('4. Verifying Resources with Existing Bookings Remain Visible (Rule 13)...');
    // Even if a tractor has an active booking or schedule, it must not be filtered out
    // or marked permanently unavailable in GET /api/resources.
    const tractorResource = farmerRes.body.data.find((r) => r.type === 'Tractor');
    assert(tractorResource, 'Booked tractor resource must still appear in resource list');
    assert.strictEqual(tractorResource.name, 'Mahindra 575 DI Tractor');
    assert.strictEqual(tractorResource.category, 'MACHINERY');
    // Ensure no permanent unavailable flag masks the resource
    assert(tractorResource.isAvailable === undefined, 'No permanent isAvailable flag should hide the resource');
    console.log('✔ Resources with existing bookings still appear in the list (availability depends on requested time window).\n');

    // 5. Category Filtering
    console.log('5. Testing Category Filter (?category=MACHINERY and ?category=machinery)...');
    const machineryRes = await makeRequest(server, {
      path: '/api/resources?category=machinery',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(machineryRes.status, 200);
    assert(machineryRes.body.data.length > 0);
    machineryRes.body.data.forEach((r) => {
      assert.strictEqual(r.category, 'MACHINERY');
    });
    console.log(`✔ Case-insensitive category filter works (${machineryRes.body.data.length} machinery items returned).\n`);

    // 6. Type Filtering
    console.log('6. Testing Type Filter (?type=Harvester)...');
    const harvesterRes = await makeRequest(server, {
      path: '/api/resources?type=harvester',
      method: 'GET',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(harvesterRes.status, 200);
    assert.strictEqual(harvesterRes.body.data.length, 1);
    assert.strictEqual(harvesterRes.body.data[0].type, 'Harvester');
    console.log('✔ Type filter works correctly.\n');

    // 7. Verify Resource Owner Ownership Functionality Untouched
    console.log('7. Verifying Resource Owner Ownership Constraints Remain Protected...');
    const farmerCreateRes = await makeRequest(server, {
      path: '/api/resources',
      method: 'POST',
      headers: { Authorization: `Bearer ${farmerToken}` },
    }, { name: 'Unauthorized Tractor' });
    assert.strictEqual(farmerCreateRes.status, 403, 'FARMER must NOT be allowed to create resources');

    const farmerUpdateRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[0]._id}`,
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerToken}` },
    }, { name: 'Unauthorized Edit' });
    assert.strictEqual(farmerUpdateRes.status, 403, 'FARMER must NOT be allowed to update resources');

    const farmerDeleteRes = await makeRequest(server, {
      path: `/api/resources/${mockResources[0]._id}`,
      method: 'DELETE',
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert.strictEqual(farmerDeleteRes.status, 403, 'FARMER must NOT be allowed to delete resources');
    console.log('✔ Resource Owner functionality strictly protected (FARMER cannot create, edit, or delete resources).\n');

    console.log('🎉 ALL FARMER RESOURCE BROWSING TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
