'use strict';

const path = require('node:path');

const DATA_DIRECTORY = path.join(__dirname, '..', '..', 'data');

module.exports = {
    httpPort: Number(process.env.PORT || 5000),
    host: process.env.HOST || '0.0.0.0',
    databasePath: process.env.DATABASE_PATH || path.join(DATA_DIRECTORY, 'attendance.db'),
    devicePort: Number(process.env.DEVICE_PORT || 4370),
    deviceConnectionTimeout: Number(process.env.DEVICE_CONNECTION_TIMEOUT || 10000),
    deviceInactivityTimeout: Number(process.env.DEVICE_INACTIVITY_TIMEOUT || 4000),
    pollingInterval: Number(process.env.POLLING_INTERVAL || 2000),
    socketCorsOrigin: process.env.SOCKET_CORS_ORIGIN || '*'
};
