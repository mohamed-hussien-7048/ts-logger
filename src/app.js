'use strict';

const express = require('express');
const http = require('node:http');
const { Server } = require('socket.io');
const settings = require('./config/settings');
const { createDatabase } = require('./database/database');
const { createAttendanceRepository } = require('./database/attendanceRepository');
const { getTodayString } = require('./attendance/dateFormatter');
const { normalizeAttendance, normalizeUser } = require('./attendance/attendanceNormalizer');
const { createAttendanceService } = require('./attendance/attendanceService');
const { createDeviceManager } = require('./devices/deviceManager');
const { createAttendanceBroadcaster } = require('./realtime/attendanceBroadcaster');
const { createSystemStatus } = require('./realtime/systemStatus');
const { createAttendanceController } = require('./api/controllers/attendanceController');
const { createAttendanceRouter } = require('./api/routes/attendanceRoutes');

function createLogger() {
    return {
        info: (...values) => console.log(...values),
        warn: (...values) => console.warn(...values),
        error: (...values) => console.error(...values)
    };
}

function createApp({ ZKLib, logger = createLogger(), databasePath = settings.databasePath } = {}) {
    if (!ZKLib) {
        throw new Error('A ZKLib implementation is required.');
    }

    const database = createDatabase(databasePath);
    const repository = createAttendanceRepository(database);
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: settings.socketCorsOrigin,
            methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
    });

    let deviceManager;
    const broadcaster = createAttendanceBroadcaster(io, logger);
    const systemStatus = createSystemStatus({
        settings,
        databasePath,
        repository,
        getDeviceStatus: () => deviceManager ? deviceManager.getDeviceStatus() : {
            connected: false,
            ip: null,
            port: settings.devicePort,
            realtime: false,
            monitoring: false,
            polling: false,
            logCount: 0,
            users: 0
        }
    });

    const attendanceService = createAttendanceService({
        repository,
        normalizer: record => normalizeAttendance(record, {
            knownUsers: deviceManager ? deviceManager.getKnownUsers() : {},
            deviceIp: deviceManager ? deviceManager.getDeviceStatus().ip : null
        }),
        logger,
        broadcastAttendance: broadcaster.broadcastAttendance
    });

    deviceManager = createDeviceManager({
        ZKLib,
        settings,
        io,
        logger,
        attendanceService,
        getStatus: systemStatus.getCompleteStatus,
        broadcastSystemStatus: () => io.emit('system-status', systemStatus.getCompleteStatus())
    });

    app.get('/', (req, res) => {
        res.json({
            status: 'online',
            service: 'ZKTeco Attendance Server',
            port: settings.httpPort,
            server: systemStatus.getServerStatus(),
            database: systemStatus.getDatabaseStatus(),
            device: deviceManager.getDeviceStatus()
        });
    });

    app.get('/api/status', (req, res) => {
        try {
            res.json(systemStatus.getCompleteStatus());
        } catch (error) {
            logger.error('Status request failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    app.use('/api/attendance', createAttendanceRouter(createAttendanceController({
        repository,
        getTodayString,
        logger
    })));

    io.on('connection', socket => {
        logger.info(`Browser connected: ${socket.id}`);
        socket.emit('system-status', systemStatus.getCompleteStatus());
        socket.emit('device-status', {
            status: deviceManager.getDeviceStatus().connected ? 'connected' : 'disconnected',
            ...deviceManager.getDeviceStatus()
        });

        socket.on('setup-device', async data => {
            if (!data) {
                return;
            }

            const ip = String(data.ip || '').trim();
            const port = Number(data.port || settings.devicePort);

            if (!ip || !Number.isInteger(port) || port < 1 || port > 65535) {
                socket.emit('device-status', {
                    status: 'disconnected',
                    connected: false,
                    error: 'IP أو Port غير صحيح'
                });
                return;
            }

            await deviceManager.connectToDevice(ip, port);
        });

        socket.on('get-device-status', () => {
            socket.emit('device-status', deviceManager.getDeviceStatus());
            socket.emit('system-status', systemStatus.getCompleteStatus());
        });

        socket.on('get-system-status', () => {
            socket.emit('system-status', systemStatus.getCompleteStatus());
        });

        socket.on('refresh-attendance', async () => {
            logger.info('طلب Refresh من المتصفح');
            await deviceManager.pollAttendance();
        });

        socket.on('disconnect', () => {
            logger.info(`Browser disconnected: ${socket.id}`);
        });
    });

    let isShuttingDown = false;

    async function shutdown(signal = 'manual') {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;
        logger.info(`جاري إيقاف السيرفر... (${signal})`);

        await deviceManager.shutdown();

        await new Promise(resolve => {
            io.close(() => resolve());
        });

        if (server.listening) {
            await new Promise((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve());
            });
        }

        database.close();
        logger.info('تم إغلاق Node.js Server.');
    }

    return { app, server, io, database, deviceManager, shutdown };
}

module.exports = { createApp, createLogger };
