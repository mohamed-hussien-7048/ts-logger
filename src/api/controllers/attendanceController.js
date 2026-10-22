'use strict';

function createAttendanceController({ repository, getTodayString, logger }) {
    function handleQuery(res, query, payloadFactory) {
        try {
            const rows = query();
            res.json(payloadFactory(rows));
        } catch (error) {
            logger.error('Attendance query failed:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    function getToday(req, res) {
        const date = getTodayString();
        handleQuery(res, () => repository.getToday(date), rows => ({
            success: true,
            date,
            count: rows.length,
            data: rows
        }));
    }

    function getByDate(req, res) {
        const { date } = req.params;
        handleQuery(res, () => repository.getByDate(date), rows => ({
            success: true,
            date,
            count: rows.length,
            data: rows
        }));
    }

    function getAll(req, res) {
        handleQuery(res, () => repository.getAll(), rows => ({
            success: true,
            count: rows.length,
            data: rows
        }));
    }

    return { getToday, getByDate, getAll };
}

module.exports = { createAttendanceController };
