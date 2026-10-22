'use strict';

function createAttendanceRepository(database) {
    const insertStatement = database.prepare(`
        INSERT OR IGNORE INTO attendance (
            device_ip,
            user_id,
            user_name,
            attendance_time,
            attendance_date,
            status,
            raw_data
        ) VALUES (
            @deviceIp,
            @userId,
            @userName,
            @attendanceTime,
            @attendanceDate,
            @status,
            @rawData
        )
    `);

    const findByIdentityStatement = database.prepare(`
        SELECT *
        FROM attendance
        WHERE device_ip = ?
          AND user_id = ?
          AND attendance_time = ?
        LIMIT 1
    `);

    function save(attendance) {
        if (!attendance) {
            return false;
        }

        const result = insertStatement.run({
            deviceIp: attendance.deviceIp,
            userId: attendance.userId,
            userName: attendance.userName,
            attendanceTime: attendance.dateTime,
            attendanceDate: attendance.date,
            status: attendance.status,
            rawData: JSON.stringify(attendance.raw)
        });

        return result.changes > 0;
    }

    function findByIdentity(deviceIp, userId, attendanceTime) {
        return findByIdentityStatement.get(deviceIp, userId, attendanceTime) || null;
    }

    function getToday(date) {
        return database.prepare(`
            SELECT *
            FROM attendance
            WHERE attendance_date = ?
            ORDER BY attendance_time ASC
        `).all(date);
    }

    function getByDate(date) {
        return database.prepare(`
            SELECT *
            FROM attendance
            WHERE attendance_date = ?
            ORDER BY attendance_time ASC
        `).all(date);
    }

    function getAll() {
        return database.prepare(`
            SELECT *
            FROM attendance
            ORDER BY attendance_time ASC
        `).all();
    }

    function count() {
        return database.prepare('SELECT COUNT(*) AS count FROM attendance').get().count;
    }

    return { save, findByIdentity, getToday, getByDate, getAll, count };
}

module.exports = { createAttendanceRepository };
