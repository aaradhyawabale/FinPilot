const router = require('express').Router();
const { getAnalysis, simulateFuture, analyzeGoal } = require('../controllers/analysisController');

router.get('/:userId',          getAnalysis);
router.post('/simulate',        simulateFuture);
router.post('/goal-planner',    analyzeGoal);

module.exports = router;
