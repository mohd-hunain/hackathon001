const express = require('express');
const router = express.Router();
const {
  createFarm,
  getMyFarms,
  updateFarm,
} = require('../controllers/farmController');
const { protect, authorize } = require('../middleware/auth');

// Protected farm routes
router.use(protect);

router.post('/', authorize('FARMER', 'MASTER'), createFarm);
router.get('/my', authorize('FARMER', 'MASTER'), getMyFarms);
router.patch('/:id', authorize('FARMER', 'MASTER'), updateFarm);

module.exports = router;
