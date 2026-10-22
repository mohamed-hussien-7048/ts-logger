'use strict';

function createSystemStatus({ settings, databasePath, repository, getDeviceStatus, startedAt = new Date() }) {
    function getServerStatus() {
        return {
            online: true,
            port: settings.httpPort,
            startedAt: startedAt.toISOString(),
            uptime: process.uptime(),
            node: process.version
        };
    }

    function getDatabaseStatus() {
        return {
            connected: true,
            type: 'SQLite',
            path: databasePath,
            totalRecords: repository.count()
        };
    }

    function getCompleteStatus() {
        return {
            server: getServerStatus(),
            database: getDatabaseStatus(),
            device: getDeviceStatus(),
            timestamp: new Date().toISOString()
        };
    }

    return { getServerStatus, getDatabaseStatus, getCompleteStatus };
}

module.exports = { createSystemStatus };
