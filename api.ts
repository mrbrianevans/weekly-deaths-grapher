import axios from "axios"


// Fetch the number of deaths in a particular week between 2010 and 2020
//
// Either both age and sex must be specified, or neither, but never only one
export const fetchWeek = async (year: number, week: number, age_groups = 'all', sex = 'all') => {
    let base_url
    if (year >= 2020) {
        if (age_groups == 'all') age_groups = 'all-ages'
        const latestVersion = await getLatestVersionFromCache()
        base_url = `https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-age-sex/editions/covid-19/versions/${latestVersion}/observations?`
    } else if (2010 <= year && year < 2020)
        base_url = 'https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-age-sex/editions/2010-19/versions/1/observations?'
    else
        return 0
    const response = await axios.get(base_url, {
        params: {
            'week': `week-${week}`,
            'agegroups': age_groups,
            'time': year,
            'geography': 'K04000001',
            'deaths': 'total-registered-deaths',
            'sex': sex
        }
    })
    // console.log(response.request)
    if (response.status === 200) {
        if (response.data.observations === null) {
            // console.error("No registered observations")
            return false
        }
        if (response.data.observations.length !== 1) {
            // console.error("Not one observation")
            return false
        }
        if (!response.data.observations[0].observation) {
            // console.error("The observation is null")
            return false
        }
        // console.log(response.data['observations'])
        return Number(response.data['observations'][0]['observation'])
    } else {
        // console.error("Non OK response code")
        return false
    }
}


const getLatestCovid19Version = () => {
    return axios.get('https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-age-sex/editions/covid-19/versions')
        .then(r => r.data)
        .then(d => d.items)
        .then((i: { version: number }[]) => i[i.length - 1].version)
    // .then(v=>`Version ${v}`)
    // .then(console.log)
}

// stores the latest version number in a db cache for 1 day
const getLatestVersionFromCache = async () => {
    const sqlite = require('sqlite3')
    const db = new sqlite.Database('covid.db')

    return new Promise(resolve => {
        db.get('SELECT * FROM versions ORDER BY updated DESC LIMIT 1', [], async (e, {
            updated,
            version
        }) => {
            if (updated < Date.now() - (1000 * 86400)) {
                const latestVersion = await getLatestCovid19Version()
                if (latestVersion > version) // update the cache if theres a newer version
                    db.run('INSERT INTO versions (version, updated) VALUES (?, ?)', [latestVersion, Date.now()], () => {
                        resolve(latestVersion)
                    })
                else db.run('UPDATE versions SET updated=? WHERE version=?', [Date.now(), latestVersion], () => {
                    resolve(latestVersion)
                })
            } else {
                resolve(version)
            }
        })
    })


}

// console.time("Get version")
// getLatestVersionFromCache()
//     .then(v=>console.timeLog('Get version', v))
//     .then(()=>console.timeEnd('Get version'))