const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');

// GET все заявки
router.get('/', rentalController.getAllRentals);

// GET заявки пользователя
router.get('/user/:userId', rentalController.getUserRentals);

// GET статистика
router.get('/stats/overview', rentalController.getStats);

// POST новая заявка
router.post('/', rentalController.createRental);

// PUT одобрить заявку
router.put('/:id/approve', rentalController.approveRental);

// PUT отклонить заявку
router.put('/:id/reject', rentalController.rejectRental);

module.exports = router;
