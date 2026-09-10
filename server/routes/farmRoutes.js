const express = require('express');
const router = express.Router();
const {
  createFarm,
  getMyFarms,
  updateFarm,
} = require('../controllers/farmController');
const { protect, authorize } = require('../middleware/auth');

// Protected farm routes - strictly FARMER only
router.use(protect);

router.post('/', authorize('FARMER'), createFarm);
router.get('/my', authorize('FARMER'), getMyFarms);
router.patch('/:id', authorize('FARMER'), updateFarm);

module.exports = router;
