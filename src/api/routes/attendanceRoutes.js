'use strict';

const express = require('express');

function createAttendanceRouter(controller) {
    const router = express.Router();

    router.get('/', controller.getAll);
    router.get('/today', controller.getToday);
    router.get('/date/:date', controller.getByDate);

    return router;
}

module.exports = { createAttendanceRouter };
