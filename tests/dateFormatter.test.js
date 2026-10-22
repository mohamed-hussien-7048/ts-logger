'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getTodayString, formatDateTime, formatTime } = require('../src/attendance/dateFormatter');

test('formats a local calendar date as YYYY-MM-DD', () => {
    assert.equal(getTodayString(new Date(2026, 9, 23, 12, 0, 0)), '2026-10-23');
});

test('formats local date and time with zero padding', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);
    assert.equal(formatDateTime(date), '2026-01-02 03:04:05');
    assert.equal(formatTime(date), '03:04:05');
});

test('returns null for an invalid date-time value', () => {
    assert.equal(formatDateTime(new Date('invalid')), null);
});
