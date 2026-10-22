'use strict';

function createAttendanceService({ repository, normalizer, logger, broadcastAttendance }) {
    function saveNormalized(attendance) {
        return repository.save(attendance);
    }

    function process(record, source = 'unknown') {
        const attendance = normalizer(record);

        if (!attendance) {
            logger.warn('سجل غير مفهوم:', record);
            return false;
        }

        logger.info(`Attendance received [${source}] → ${attendance.userId} @ ${attendance.dateTime}`);

        const saved = saveNormalized(attendance);

        if (!saved) {
            logger.info('السجل موجود مسبقًا - تم تجاهله');
            return false;
        }

        logger.info('تم حفظ البصمة في SQLite');
        broadcastAttendance(attendance);
        return true;
    }

    return { saveNormalized, process };
}

module.exports = { createAttendanceService };
