const launchesDB = require('./launches.mongo');
const planetsDB = require('./planets.mongo');
const axios = require('axios');

const DEFAULT_FLIGHT_NUMBER = 100;

async function populateLaunches() {
    const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

    const response = await axios.post(SPACEX_API_URL, {
        query: {
        },
        options: {
            pagination: false,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        customers: 1
                    }
                }
            ]
        }
    });

    if(response.status !== 200) {
        console.log('Problem downloading launch data');
        throw new Error('The launch data download failed!');
    }

    const launchDocs = response.data.docs;

    for (const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success'],
            customers: customers,

        };

        await saveLaunch(launch);
    }
}

async function loadLaunchData() {
    const firstLaunch = await findLaunch({
        flightNumber: 1,
        rocket: 'Falcon 1',
        mission: 'FalconSat'
    });

    if (firstLaunch) {
        console.log('Launch data already loaded');
        return;
    } else {
        await populateLaunches();
    }

}

async function findLaunch(filter) {
    return launchesDB.findOne(filter);
}

async function isLaunchExists(id) {
    return await findLaunch({
        flightNumber: id
    });
}

async function getLatestFlightNumber() {
    const latestLaunch = await launchesDB
        .findOne()
        .sort('-flightNumber');

    if (!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function getAllLaunches(skip, limit) {
    return await launchesDB.find({}, {
        '__v': 0,
        '_id': 0
    })
    .sort({flightNumber: 1})
    .skip(skip)
    .limit(limit);
}

async function saveLaunch(launch) {
    await launchesDB.findOneAndUpdate({
        flightNumber: launch.flightNumber,
    }, launch, {
        upsert: true
    });
}

async function scheduleNewLaunch(launch) {
    const planet = await planetsDB.findOne({
        keplerName: launch.target
    });

    if (!planet) {
        throw new Error('No matching planet found!');
    }

    const flightNumber = await getLatestFlightNumber() + 1;

    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['Zero to Mastery', 'NASA'],
        flightNumber: flightNumber
    });

    await saveLaunch(newLaunch);
}

async function abortLaunch(id) {
    const updatedLaunch = await launchesDB.updateOne({
        flightNumber: id
    },
        {
            upcoming: false,
            success: false
        });

    return updatedLaunch.modifiedCount === 1;
}

module.exports = {
    getAllLaunches,
    scheduleNewLaunch,
    isLaunchExists,
    abortLaunch,
    loadLaunchData
};