import {Request, Response} from "express";
import * as sqlite from "sqlite3";

export const covidVsAverage = async (req: Request, res: Response) => {
    const db = new sqlite.Database('covid.db')
    const getInterval = `
        SELECT week, SUM(deaths) AS deaths
        FROM weekly_deaths
        WHERE year = ?
        GROUP BY week
    `
    const eachYearsDeaths = {} // 2010: [{week:1, deaths: 5}], 2011: [{week:1, deaths: 5}]
    const datatable = [] // | week | 2010 | 2011 | 2012 ... 2021
    for (let year = 2010; year <= 2021; year++) {
        eachYearsDeaths[year] = await new Promise((resolve, reject) => db.all(getInterval, [year], (e, r) => {
            if (e) reject(e); else resolve(r)
        }))
    }
    datatable.push(['Week',
        {"type": "string", "role": "tooltip", "p": {"html": true}},
        '2021',
        '2020',
        {label: 'COVID - 10Y_Average', id: 'difference_series'},
        {label: 'Reported covid deaths (fake data)', id: 'covid_series'},
        ...Object.keys(eachYearsDeaths)
            .slice(0, 10)
            .map(year => ({
                label: `${year}`,
                role: 'interval',
                type: 'number',
                id: `series${year}`
            }))
    ])
    console.log(datatable)
    for (let week = 1; week <= 53; week++) {
        // html tooltip for each datapoint
        const covidFigure = eachYearsDeaths[2021].find(row => row.week == week)?.deaths ||
            eachYearsDeaths[2020].find(row => row.week == week)?.deaths
        const averageFigure = Object.keys(eachYearsDeaths)
                .slice(0, 10)
                .map(year => eachYearsDeaths[year]
                    .find(row => row.week == week)?.deaths || 0)
                .reduce((previousValue, currentValue) => previousValue + currentValue) /
            Object.values(eachYearsDeaths).slice(0, 10)
                .filter((value: [{ week: number }]) => value.find(row => row.week == week)).length
        const tooltip = `<div>
               <p>
                   <b>COVID: </b>${covidFigure}
               </p>
               <p>
                    <b>10Y-average: </b>${Math.round(averageFigure)}
               </p></div>`

        datatable.push([week, tooltip,
            eachYearsDeaths[2021].find(row => row.week == week)?.deaths,
            eachYearsDeaths[2020].find(row => row.week == week)?.deaths,
            covidFigure - averageFigure,
            (covidFigure - averageFigure) * (0.5 + Math.random()),
            ...Object.keys(eachYearsDeaths)
                .slice(0, 10)
                .map(year => eachYearsDeaths[year]
                    .find(row => row.week == week)?.deaths)
        ])
    }
    res.status(200).json(datatable)
}
