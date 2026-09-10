const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const farmRoutes = require('./farmRoutes');
const resourceRoutes = require('./resourceRoutes');
const requestRoutes = require('./requestRoutes');
const scheduleRoutes = require('./scheduleRoutes');
const masterRoutes = require('./masterRoutes');
const disruptionRoutes = require('./disruptionRoutes');

router.use('/auth', authRoutes);
router.use('/farms', farmRoutes);
router.use('/resources', resourceRoutes);
router.use('/requests', requestRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/master', masterRoutes);
router.use('/disruptions', disruptionRoutes);

module.exports = router;
