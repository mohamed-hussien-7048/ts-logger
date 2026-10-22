'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUser, normalizeAttendance } = require('../src/attendance/attendanceNormalizer');

test('normalizes supported user ID field names', () => {
    assert.deepEqual(normalizeUser({ userid: 17, username: 'Mona' }), {
        userId: '17',
        name: 'Mona'
    });
});

test('normalizes an attendance record and uses the known employee name', () => {
    const result = normalizeAttendance({
        deviceUserId: 17,
        recordTime: new Date(2026, 9, 23, 8, 9, 10),
        status: 'حضور'
    }, {
        knownUsers: { '17': { userId: '17', name: 'Mona' } },
        deviceIp: '192.168.1.201'
    });

    assert.equal(result.userId, '17');
    assert.equal(result.userName, 'Mona');
    assert.equal(result.date, '2026-10-23');
    assert.equal(result.time, '08:09:10');
    assert.equal(result.deviceIp, '192.168.1.201');
});

test('rejects attendance records without a user ID or valid timestamp', () => {
    assert.equal(normalizeAttendance({ recordTime: new Date() }, { knownUsers: {}, deviceIp: '127.0.0.1' }), null);
    assert.equal(normalizeAttendance({ userId: '1', recordTime: 'not-a-date' }, { knownUsers: {}, deviceIp: '127.0.0.1' }), null);
});
