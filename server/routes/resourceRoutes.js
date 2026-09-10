const express = require('express');
const router = express.Router();
const {
  getAllResources,
  createResource,
  getMyResources,
  updateResource,
  deleteResource,
} = require('../controllers/resourceController');
const { protect, authorize } = require('../middleware/auth');

// Protected routes
router.use(protect);

router.get('/', getAllResources);
router.post('/', authorize('RESOURCE_OWNER', 'MASTER'), createResource);
router.get('/my', authorize('RESOURCE_OWNER', 'MASTER'), getMyResources);
router.patch('/:id', authorize('RESOURCE_OWNER', 'MASTER'), updateResource);
router.delete('/:id', authorize('RESOURCE_OWNER', 'MASTER'), deleteResource);

module.exports = router;
