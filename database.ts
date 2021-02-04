import * as sqlite from 'sqlite3'
import {fetchWeek} from "./api";

const age_groups: (year: number) => string[] = (year) => {
    if (year < 2020)
        return ["0-1", "1-14", "15-44", "45-64", "65-74", "75-84", "85+"]
    else
        return ["0-1", "1-4", "5-9", "10-14", "15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49",
            "50-54", "55-59", "60-64", "65-69", "70-74", "75-79", "80-84", "85-89", "90+"]
}

// this loads all data into the database from where it last left off. Takes over 2 hours to run from empty
export const loadDatabase = async () => {
    let d = new sqlite.Database('covid.db')

    const getLatestResult: () => Promise<{ year, week }> = () => {
        return new Promise(resolve => {
            d.get("SELECT year, week FROM weekly_deaths ORDER BY year desc, week desc", (e, r) => {
                resolve(r)
            })
        })
    }

    const insertRow = (year, week, sex, age_group, deaths) => {
        return new Promise((resolve, reject) => {
            d.run("INSERT INTO weekly_deaths (year, week, sex, age_group, deaths) VALUES (?, ?, ?, ?, ?)",
                [year, week, sex, age_group, deaths],
                (err) => {
                    if (err)
                        reject(err)
                    else
                        resolve('OK')
                })
        })

    }
    const {year: latestYear, week: latestWeek} = await getLatestResult()
    for (let year = latestYear, week = latestWeek + 1, hasNextWeek = true, hasNextYear = true; hasNextYear && year < 2024; year++, week = 1, hasNextWeek = true) {
        console.log("Year ", year)
        while (hasNextWeek) {
            if (week <= latestWeek && year == latestYear) week = latestWeek + 1
            console.log("Week", week)
            for (let age_group_index in age_groups(year)) {
                const age_group = age_groups(year)[age_group_index]
                for (let sexIndex in ['male', 'female']) {
                    const sex = ['male', 'female'][sexIndex]
                    const result = await fetchWeek(year, week, age_group, sex)
                    if (result !== false) {
                        await insertRow(year, week, sex, age_group, result).then((r) => {
                            if (r === 'OK')
                                process.stdout.write('\x1b[32m.\x1b[0m')
                            else
                                throw new Error("Not okay")
                        }).catch(e => {
                            process.stdout.write('\x1b[31me\x1b[0m')
                        })
                    } else {
                        process.stdout.write('\x1b[31m.\x1b[0m')
                        hasNextWeek = false
                        // console.log(`Reached the end of ${year} at week ${week}`, year, week, sex, age_group)
                        break
                    }
                }
                if (!hasNextWeek) break;
            }
            console.log()
            week++
        }
        if (!hasNextWeek && week === 2) hasNextYear = false;
    }

    d.close()
}


// if year is zero, it returns all years. same for week. if age_groups or sex is all, it returns the sum of all
export const fetchDeathsFromDb = async (year: number = 0, week: number = 0, age_groups = 'all', sex = 'all') => {
    const statement = "SELECT sum(deaths) as deaths"
        + (year !== 0 ? ',year' : '')
        + (week !== 0 ? ',week' : '')
        + (age_groups !== 'all' ? ',age_group' : '')
        + (sex !== 'all' ? ',sex' : '')
        + " FROM weekly_deaths"
        + ((year !== 0 || week !== 0 || age_groups !== 'all' || sex !== 'all') ? ' WHERE ' : '')
        + (year !== 0 ? 'year=? AND ' : '')
        + (week !== 0 ? 'week=? AND ' : '')
        + (age_groups !== 'all' ? 'age_group=? AND ' : '')
        + (sex !== 'all' ? 'sex=? AND ' : '')
        + 'true;'
    const params = []
    if (year !== 0) params.push(year)
    if (week !== 0) params.push(week)
    if (age_groups !== 'all') params.push(age_groups)
    if (sex !== 'all') params.push(sex)

    // console.log("Query: ", statement)
    // console.log("Params: ", params)

    const result = await new Promise((resolve, reject) => {
        let d = new sqlite.Database('covid.db')
        d.get(statement, params, (e, r) => {
            if (e) reject(e)
            else resolve(r)
        })
        d.close()
    })

    // console.log('Result: ', result, 'requested:', year, week, age_groups, sex)
    if (year !== 0 && result['year'] !== year) return false
    if (week !== 0 && result['week'] !== week) return false
    if (age_groups !== 'all' && result['age_group'] !== age_groups) return false
    if (sex !== 'all' && result['sex'] !== sex) return false
    await new Promise(resolve => setTimeout(resolve, 100))
    return result['deaths']
}

// returns a nice list of strings of the different options for a given dimension. Year can optionally be specified (default 2020)
export const fetchOptionsFromDb = async (dimension: 'year' | 'week' | 'age_group' | 'sex', year = 2020) => {
    if (!['year', 'week', 'age_group', 'sex'].includes(dimension)) return false
    const statement = `SELECT DISTINCT ${dimension} FROM weekly_deaths ` + (dimension === 'year' ? ';' : `WHERE year=?;`)
    console.log(statement)
    const params = (dimension === 'year' ? [] : [year])
    const results: {}[] = await new Promise((resolve, reject) => {
        let d = new sqlite.Database('covid.db')
        d.all(statement, params, (e, r) => {
            if (e) reject(e)
            else resolve(r)
        })
        d.close()
    })
    const options = []
    results.forEach(result => options.push(result[dimension]))
    return options
}



// console.time("Loading database")
// loadDatabase().then(()=>console.timeEnd("Loading database"))

// fetchOptionsFromDb('week', 2020).then(console.log)

// fetchDeathsFromDb(2022, 3).then(console.log)
