// routes/expenseRoutes.js
const router = require('express').Router({ mergeParams: true });
const { getExpenses, addExpense, updateExpense, deleteExpense } = require('../controllers/expenseController');
router.get('/:userId',                    getExpenses);
router.post('/:userId',                   addExpense);
router.put('/:userId/:expId',             updateExpense);
router.delete('/:userId/:expId',          deleteExpense);
module.exports = router;
