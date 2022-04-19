const { getAllLaunches,
    scheduleNewLaunch,
    isLaunchExists,
    abortLaunch } = require('../../models/launches.model');

const {getPagination} = require('../../services/query');

async function httpGetAllLaunches(req, res) {
    const { skip, limit } = getPagination(req.query);
    return res.status(200).json(await getAllLaunches(skip, limit));
}

async function httpAbortLaunch(req, res) {
    const launchId = Number(req.params.id);
    const existsLaunch = await isLaunchExists(launchId);

    if (!existsLaunch) {
        return res.status(404).json({
            error: 'Launch not found!'
        });
    }

    const aborted = await abortLaunch(launchId);

    if (!aborted) {
        return res.status(400).json({
            error: 'Launch not aborted!'
        });
    }

    return res.status(200).json({
        ok: true
    });
}

async function httpAddNewLaunch(req, res) {
    const launch = req.body;
    console.log(`${launch.mission} launch`)

    if (!launch.mission || !launch.rocket || !launch.launchDate || !launch.target) {
        return res.status(400).json({
            error: 'Missing required launch property!'
        });
    }

    launch.launchDate = new Date(launch.launchDate);

    if (isNaN(launch.launchDate)) {
        return res.status(400).json({
            error: 'invalid date!'
        });
    }

    await scheduleNewLaunch(launch);
    return res.status(200).json(launch);
}

module.exports = {
    httpGetAllLaunches,
    httpAddNewLaunch,
    httpAbortLaunch
};