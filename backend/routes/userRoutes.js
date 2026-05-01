/**
 * Routes for user profile CRUD APIs.
 */
// routes/userRoutes.js
const router = require('express').Router();
const { createUser, getUser, updateUser, deleteUser } = require('../controllers/userController');
router.post('/',       createUser);
router.get('/:id',     getUser);
router.put('/:id',     updateUser);
router.delete('/:id',  deleteUser);
module.exports = router;
