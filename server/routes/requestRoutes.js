const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getRequestById,
  cancelRequest,
} = require('../controllers/requestController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.use(protect);

router.post('/', authorize('FARMER'), createRequest);
router.get('/my', authorize('FARMER', 'MASTER'), getMyRequests);
router.get('/:id', getRequestById);
router.patch('/:id/cancel', authorize('FARMER', 'MASTER'), cancelRequest);

module.exports = router;
