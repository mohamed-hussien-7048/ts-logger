'use strict';

const { formatDateTime, formatTime, isValidDate } = require('./dateFormatter');

function normalizeUser(user) {
    if (!user) {
        return null;
    }

    const userId = user.userId ?? user.userid ?? user.uid ?? user.id ?? '';

    if (!String(userId).trim()) {
        return null;
    }

    return {
        userId: String(userId).trim(),
        name: user.name ?? user.userName ?? user.username ?? 'غير معروف'
    };
}

function resolveAttendanceDate(record) {
    const rawTime = record.recordTime
        ?? record.attTime
        ?? record.timestamp
        ?? record.time
        ?? record.datetime
        ?? null;

    if (rawTime instanceof Date) {
        return rawTime;
    }

    return rawTime ? new Date(rawTime) : null;
}

function normalizeAttendance(record, { knownUsers, deviceIp }) {
    if (!record) {
        return null;
    }

    const userId = record.deviceUserId
        ?? record.userId
        ?? record.userid
        ?? record.userSn
        ?? record.uid
        ?? '';

    if (!String(userId).trim()) {
        return null;
    }

    const attendanceDate = resolveAttendanceDate(record);

    if (!isValidDate(attendanceDate)) {
        return null;
    }

    const normalizedUserId = String(userId).trim();
    const user = knownUsers[normalizedUserId];

    return {
        userId: normalizedUserId,
        userName: user?.name ?? record.userName ?? record.name ?? 'غير معروف',
        dateTime: formatDateTime(attendanceDate),
        date: `${attendanceDate.getFullYear()}-${String(attendanceDate.getMonth() + 1).padStart(2, '0')}-${String(attendanceDate.getDate()).padStart(2, '0')}`,
        time: formatTime(attendanceDate),
        status: record.status ?? record.state ?? record.type ?? 'حضور',
        deviceIp,
        raw: record
    };
}

module.exports = { normalizeUser, normalizeAttendance };
