'use strict';

function createDeviceManager({ ZKLib, settings, io, logger, attendanceService, getStatus, broadcastSystemStatus }) {
    let zkInstance = null;
    let deviceConfig = { ip: null, port: settings.devicePort };
    let deviceConnected = false;
    let monitoringStarted = false;
    let pollingRunning = false;
    let pollingTimer = null;
    let realtimeStarted = false;
    let knownUsers = {};
    let lastKnownLogCount = 0;
    let processingDevice = false;

    function getKnownUsers() {
        return knownUsers;
    }

    function getDeviceStatus() {
        return {
            connected: deviceConnected,
            ip: deviceConfig.ip,
            port: deviceConfig.port,
            realtime: realtimeStarted,
            monitoring: monitoringStarted,
            polling: Boolean(pollingTimer),
            logCount: lastKnownLogCount,
            users: Object.keys(knownUsers).length
        };
    }

    async function loadUsers() {
        try {
            logger.info('جاري تحميل الموظفين من جهاز البصمة...');
            const response = await zkInstance.getUsers();
            const users = response?.data || [];
            knownUsers = {};

            for (const user of users) {
                const normalized = require('../attendance/attendanceNormalizer').normalizeUser(user);
                if (normalized) {
                    knownUsers[normalized.userId] = normalized;
                }
            }

            logger.info(`تم تحميل ${Object.keys(knownUsers).length} موظف.`);
        } catch (error) {
            logger.error('خطأ في تحميل الموظفين:', error);
        }
    }

    async function getDeviceInfo() {
        try {
            const info = await zkInstance.getInfo();
            logger.info('DEVICE INFO:', info);

            if (info && typeof info.logCounts === 'number') {
                lastKnownLogCount = info.logCounts;
            }

            return info;
        } catch (error) {
            logger.error('خطأ في getInfo():', error.message);
            return null;
        }
    }

    async function loadInitialAttendance() {
        try {
            logger.info('جاري قراءة سجلات الحضور الحالية...');
            const response = await zkInstance.getAttendances();
            const records = response?.data || [];
            let savedCount = 0;

            logger.info(`تم استلام ${records.length} سجل من الجهاز.`);

            for (const record of records) {
                const attendance = normalizeRecord(record);
                if (attendance && attendanceService.saveNormalized(attendance)) {
                    savedCount += 1;
                }
            }

            logger.info(`تم حفظ ${savedCount} سجل جديد من الأرشيف.`);
            await getDeviceInfo();
        } catch (error) {
            logger.error('خطأ أثناء تحميل سجلات الحضور:', error);
        }
    }

    function normalizeRecord(record) {
        return require('../attendance/attendanceNormalizer').normalizeAttendance(record, {
            knownUsers,
            deviceIp: deviceConfig.ip
        });
    }

    async function startRealtimeMonitoring() {
        if (!zkInstance || realtimeStarted) {
            return;
        }

        try {
            logger.info('تشغيل Real-Time Monitoring...');

            try {
                if (typeof zkInstance.enableDevice === 'function') {
                    await zkInstance.enableDevice();
                    logger.info('تم Enable للجهاز.');
                }
            } catch (error) {
                logger.warn('Enable device لم ينجح، سنستمر:', error.message);
            }

            if (typeof zkInstance.getRealTimeLogs !== 'function') {
                logger.warn('المكتبة الحالية لا تحتوي getRealTimeLogs().');
                return;
            }

            zkInstance.getRealTimeLogs(data => {
                logger.info('REAL-TIME EVENT RECEIVED', data);
                attendanceService.process(data, 'REAL-TIME');
            });

            realtimeStarted = true;
            monitoringStarted = true;
            broadcastSystemStatus();
        } catch (error) {
            logger.error('فشل تشغيل Real-Time Monitoring:', error);
        }
    }

    async function pollAttendance() {
        if (!zkInstance || !deviceConnected || pollingRunning) {
            return;
        }

        pollingRunning = true;

        try {
            const info = await zkInstance.getInfo();
            if (!info) {
                return;
            }

            const currentLogCount = Number(info.logCounts || 0);

            if (lastKnownLogCount !== 0 && currentLogCount <= lastKnownLogCount) {
                return;
            }

            logger.info('POLLING: اكتشفنا زيادة في سجلات الجهاز');
            logger.info(`السابق: ${lastKnownLogCount}`);
            logger.info(`الحالي: ${currentLogCount}`);

            const response = await zkInstance.getAttendances();
            const records = response?.data || [];

            logger.info(`POLLING: تم استلام ${records.length} سجل`);

            for (const record of records) {
                attendanceService.process(record, 'POLLING');
            }

            lastKnownLogCount = currentLogCount;
            logger.info(`POLLING انتهى. آخر LogCount = ${lastKnownLogCount}`);
        } catch (error) {
            logger.warn('خطأ في POLLING:', error.message || error);
        } finally {
            pollingRunning = false;
        }
    }

    function stopPolling() {
        if (pollingTimer) {
            clearInterval(pollingTimer);
            pollingTimer = null;
        }
    }

    function startPolling() {
        stopPolling();
        logger.info('تشغيل Fallback Polling كل 2 ثانية...');
        pollingTimer = setInterval(() => {
            void pollAttendance();
        }, settings.pollingInterval);
    }

    async function disconnectCurrentDevice() {
        stopPolling();

        if (!zkInstance) {
            return;
        }

        try {
            logger.info('فصل الاتصال القديم...');
            await zkInstance.disconnect();
        } catch (error) {
            logger.warn('خطأ أثناء فصل الجهاز القديم:', error.message);
        }

        zkInstance = null;
    }

    function resetConnectionState(ip, port) {
        deviceConnected = false;
        realtimeStarted = false;
        monitoringStarted = false;
        lastKnownLogCount = 0;
        deviceConfig = { ip, port };
    }

    function emitDeviceStatus(status, ip, port, connected, extra = {}) {
        io.emit('device-status', { status, ip, port, connected, ...extra });
    }

    async function connectToDevice(ip, port) {
        if (processingDevice) {
            logger.warn('يوجد طلب اتصال آخر قيد التنفيذ.');
            return;
        }

        processingDevice = true;

        try {
            await disconnectCurrentDevice();
            resetConnectionState(ip, port);
            emitDeviceStatus('connecting', ip, port, false);
            broadcastSystemStatus();

            logger.info(`محاولة الاتصال بجهاز ZKTeco ${ip}:${port}`);

            zkInstance = new ZKLib(
                ip,
                port,
                settings.deviceConnectionTimeout,
                settings.deviceInactivityTimeout,
                0,
                'tcp'
            );

            await zkInstance.createSocket();
            const info = await zkInstance.getInfo();

            deviceConnected = true;

            if (info && typeof info.logCounts === 'number') {
                lastKnownLogCount = info.logCounts;
            }

            emitDeviceStatus('connected', ip, port, true, { info });
            broadcastSystemStatus();

            await loadUsers();
            await loadInitialAttendance();
            await startRealtimeMonitoring();
            startPolling();

            monitoringStarted = true;
            broadcastSystemStatus();
            logger.info('تم تجهيز الجهاز بالكامل. الجهاز الآن في وضع المراقبة.');
        } catch (error) {
            deviceConnected = false;
            realtimeStarted = false;
            monitoringStarted = false;

            logger.error('فشل الاتصال بالجهاز:', error);

            emitDeviceStatus('disconnected', ip, port, false, {
                error: error.message || String(error)
            });

            broadcastSystemStatus();
        } finally {
            processingDevice = false;
        }
    }

    async function shutdown() {
        stopPolling();

        if (zkInstance) {
            try {
                await zkInstance.disconnect();
            } catch (error) {
                logger.warn('خطأ أثناء فصل الجهاز:', error.message);
            }
            zkInstance = null;
        }
    }

    return {
        connectToDevice,
        getDeviceStatus,
        getKnownUsers,
        pollAttendance,
        shutdown
    };
}

module.exports = { createDeviceManager };
