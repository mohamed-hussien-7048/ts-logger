'use strict';

function createAttendanceBroadcaster(io, logger) {
    function broadcastAttendance(attendance) {
        logger.info('بصمة جديدة', {
            userId: attendance.userId,
            userName: attendance.userName,
            date: attendance.date,
            time: attendance.time,
            status: attendance.status,
            deviceIp: attendance.deviceIp
        });

        io.emit('new-attendance', {
            date: attendance.date,
            userId: attendance.userId,
            userName: attendance.userName,
            time: attendance.time,
            timeOriginal: attendance.time,
            status: attendance.status,
            deviceIp: attendance.deviceIp
        });
    }

    return { broadcastAttendance };
}

module.exports = { createAttendanceBroadcaster };
