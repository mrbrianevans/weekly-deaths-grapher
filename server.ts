const express = require('express')
const server = express()
const httpServer = require('http').Server(server)
const io = require('socket.io')(httpServer)
const path = require('path')
const axios = require('axios').default

server.get('/', (req, res)=>{
    res.sendFile(path.resolve(__dirname, 'index.html'))
})

server.get('/js', (req, res)=>{
    res.sendFile(path.resolve(__dirname, 'client.js'))
})
server.get('/css', (req, res)=>{
    res.sendFile(path.resolve(__dirname, 'stylesheet.css'))
})

// Fetch the number of deaths in a particular week between 2010 and 2020
//
// Either both age and sex must be specified, or neither, but never only one
const fetchWeek = async(year, week, age_groups='all', sex='all') => {
    let base_url
    if (year >= 2020) {
        if (age_groups == 'all') age_groups = 'all-ages'
        base_url = 'https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-age-sex/editions/covid-19/versions/14/observations?'
    }
    else if (2010 <= year && year < 2020)
        base_url = 'https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-age-sex/editions/2010-19/versions/1/observations?'
    else
        return 0
    const response = await axios.get(base_url, {params: {
            'week': `week-${week}`,
            'agegroups': age_groups,
            'time': year,
            'geography': 'K04000001',
            'deaths': 'total-registered-deaths',
            'sex': sex
        }})
    // console.log(response.request)
    if(response.status===200){
        if(response.data.observations === null) {
        console.error("No registered observations")
            return false
        }
        if(response.data.observations.length !== 1) {
        console.error("Not one observation")
            return false
        }
        if(!response.data.observations[0].observation) {
        console.error("The observation is null")
            return false
        }
        // console.log(response.data['observations'])
        return Number(response.data['observations'][0]['observation'])
    }else {
        console.error("Non OK response code")
        return false
    }
}

server.get('/fetch', async(req, res)=>{
    const {year, week} = req.query
    const observation = await fetchWeek(year, week)
    if (observation)
        res.status(200).send(observation)
    else
        res.status(501).send("Cannot get statistic")
})

io.on('connection', (socket)=>{
    console.log("\x1b[36mNew connection started\x1b[0m")
    socket.on('fetch', async(params)=>{
        console.log("Emitting all datapoints", params)
        for (let year = params["start_year"]; year <= params["end_year"]; year++) {
            for (let week = 1; week <= 53; week += Number(params["week_intervals"])) {
                const result = await fetchWeek(year, week, params.age_groups, params.sex)
                if(result)
                    socket.emit('dataPoint', {year: year, week: week, value: result, ...params})
                else {
                    console.log(`Reached the end of ${year} at week ${week}`)
                    break
                }
            }
        }
        socket.emit('finished', true)
    })

})


httpServer.listen(3000, ()=>console.log(`\x1b[32mListening on http://localhost:3000\x1b[0m`))
