'use strict';

const settings = require('./config/settings');
const { createApp, createLogger } = require('./app');

function loadZKLib() {
    try {
        return require('node-zklib');
    } catch (error) {
        console.error('تعذر تحميل node-zklib. ثبت الاعتماديات باستخدام npm install.');
        throw error;
    }
}

async function main() {
    const logger = createLogger();
    const ZKLib = loadZKLib();
    const application = createApp({ ZKLib, logger });

    application.server.listen(settings.httpPort, settings.host, () => {
        logger.info(`HTTP Server: http://${settings.host}:${settings.httpPort}`);
        logger.info(`Socket.IO: http://${settings.host}:${settings.httpPort}`);
        logger.info(`SQLite: ${settings.databasePath}`);
        logger.info('SERVER ONLINE');
        logger.info('في انتظار ربط جهاز البصمة من الصفحة...');
    });

    let shutdownRequested = false;

    async function handleShutdown(signal) {
        if (shutdownRequested) {
            return;
        }

        shutdownRequested = true;

        try {
            await application.shutdown(signal);
            process.exitCode = 0;
        } catch (error) {
            logger.error('فشل إيقاف السيرفر بشكل منظم:', error);
            process.exitCode = 1;
        }
    }

    process.on('SIGINT', () => void handleShutdown('SIGINT'));
    process.on('SIGTERM', () => void handleShutdown('SIGTERM'));

    process.on('unhandledRejection', error => {
        logger.error('Unhandled Promise Rejection:', error);
    });

    process.on('uncaughtException', error => {
        logger.error('Uncaught Exception:', error);
        void handleShutdown('uncaughtException');
    });
}

main().catch(error => {
    console.error('تعذر تشغيل السيرفر:', error);
    process.exitCode = 1;
});
