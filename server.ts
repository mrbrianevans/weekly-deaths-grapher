import {fetchWeek} from "./api";
import {fetchDeathsFromDb, loadDatabase} from "./database";
import {covidVsAverage} from "./endpoints";
import * as fs from "fs";

const express = require('express')
const server = express()
const httpServer = require('http').Server(server)
const io = require('socket.io')(httpServer)
const path = require('path')

server.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'))
})

server.get('/js', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client.js'))
})
server.get('/css', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'stylesheet.css'))
})
server.get('/covid-vs-average', covidVsAverage)

server.get('/10-year-average/:file', (req, res) => {
    if (fs.existsSync(path.resolve(__dirname, '10-year-average', req.params?.file || 'NOT')))
        res.status(200).sendFile(path.resolve(__dirname, '10-year-average', req.params.file))
    else res.status(404).send("File does not exist")
})
server.get('/10-year-average/?', (req, res) => {
    res.status(200).sendFile(path.resolve(__dirname, '10-year-average', 'index.html'))
})

//todo: make this rather fetch data from the cache database
server.get('/fetch', async (req, res) => {
    const {year, week} = req.query
    const observation = await fetchWeek(year, week)
    if (observation)
        res.status(200).send(observation)
    else
        res.status(501).send("Cannot get statistic")
})

io.on('connection', (socket)=>{
    console.log("\x1b[36mNew connection started\x1b[0m")
    socket.on('fetch', async(params)=> {

        console.log("Emitting all datapoints", params)
        //todo: instead of this code looping through years, it should just call the sql like:
        // - select * from deaths where year > [startyear]  AND year < [endyear]
        // and then emit each result in full. Move the sleep function to here rather than DB
        for (let year = params["start_year"]; year <= params["end_year"]; year++) {
            //todo: make intervals the total in a 3 week interval, rather than every third week
            for (let week = 1; week <= 53; week += Number(params["week_intervals"])) {
                // const result = await fetchWeek(year, week, params.age_groups, params.sex)
                const result = await fetchDeathsFromDb(year, week, params.age_groups, params.sex)
                if (result) {
                    socket.emit('dataPoint', {year: year, week: week, value: result, ...params})
                    console.log('emitting', {year: year, week: week, value: result, ...params})
                } else {
                    console.log(`Reached the end of ${year} at week ${week}`)
                    break
                }
            }
        }
        socket.emit('finished', true)
    })

})


httpServer.listen(3000, () => console.log(`\x1b[32mListening on http://localhost:3000\x1b[0m`))

// update the database every 24 hours with the latest ONS data
setInterval(() => {
    console.time("Loading database")
    loadDatabase().then(() => console.timeEnd("Loading database"))
}, 1000 * 60 * 60 * 24)
