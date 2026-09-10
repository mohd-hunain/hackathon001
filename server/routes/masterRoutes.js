const express = require('express');
const router = express.Router();
const {
  getMasterDashboard,
  getMasterRequests,
  getMasterConflicts,
  allocateResource,
} = require('../controllers/masterController');
const { protect, authorize } = require('../middleware/auth');

// Protected master routes
router.use(protect);
router.use(authorize('MASTER'));

router.get('/dashboard', getMasterDashboard);
router.get('/requests', getMasterRequests);
router.get('/conflicts', getMasterConflicts);
router.post('/allocate', allocateResource);

module.exports = router;
