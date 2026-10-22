'use strict';

function pad(value) {
    return String(value).padStart(2, '0');
}

function getTodayString(now = new Date()) {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function isValidDate(date) {
    return date instanceof Date && !Number.isNaN(date.getTime());
}

function formatDateTime(date) {
    if (!isValidDate(date)) {
        return null;
    }

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatTime(date) {
    if (!isValidDate(date)) {
        return '00:00:00';
    }

    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

module.exports = { getTodayString, formatDateTime, formatTime, isValidDate };
