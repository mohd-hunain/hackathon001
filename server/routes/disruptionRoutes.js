const express = require('express');
const router = express.Router();
const {
  createDisruption,
  reallocateDisruption,
  getDisruptions,
} = require('../controllers/disruptionController');
const { protect, authorize } = require('../middleware/auth');

// Protected disruption routes - Only MASTER can access
router.use(protect);
router.use(authorize('MASTER'));

router.post('/', createDisruption);
router.post('/:id/reallocate', reallocateDisruption);
router.get('/', getDisruptions);

module.exports = router;
