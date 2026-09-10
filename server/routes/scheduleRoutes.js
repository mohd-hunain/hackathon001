const express = require('express');
const router = express.Router();
const {
  getResourceSchedule,
  generateSchedule,
} = require('../controllers/scheduleController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.use(protect);

router.get('/resource/:resourceId', getResourceSchedule);
router.post('/generate', authorize('MASTER'), generateSchedule);

module.exports = router;
