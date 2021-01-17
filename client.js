const socket = io()
const FinishedEvent = new CustomEvent('finished', {time: Date.now()})
const time = document.getElementById('time')

const getSelection = (id_of_select) => {
    const ele = document.getElementById(id_of_select)
    const options = ele.children
    for(let i = 0; i < ele.childElementCount; i++)
        if(options[i].selected) return (options[i].value)
}

const drawGraph = () => {
    console.log("Drawing graph, fetching data")
        socket.emit('fetch', {
            sex: 'all', age_groups: 'all',
            start_year: getSelection('start-year'),
            end_year: getSelection('end-year'),
            week_intervals: getSelection('week-intervals')
        })
        const startTime = Date.now()
        const timer = setInterval(()=>{
            time.innerText = Date.now() - startTime + 'ms'
        }, 100)
        time.addEventListener('finished', ()=>{
            clearInterval(timer)
        })

        // DRAW GRAPH
        const options = {
            height: document.getElementById('graph').clientHeight,
            legend: {position: 'none'},
            title: 'Weekly deaths in England and Wales',
            vAxis: {minValue: 0, maxValue: 25000},
            colors: ['#dc3545'],
            backgroundColor: {
                fill: '#fff0f0',
                stroke: '#dc3545'
            },
            animation: {
                duration: 8,
                easing: 'in'
            }
        }

        const datatable = new google.visualization.DataTable()
        datatable.addColumn('date', 'Week')
        datatable.addColumn('number', 'Deaths')
        const chartWrapper = new google.visualization.ChartWrapper({
            chartType: 'LineChart',
            dataTable: datatable,
            options: options,
            containerId: 'graph'
        })
        chartWrapper.draw()
        socket.on('dataPoint', (data)=>{
            datatable.addRow([new Date(data.year, 0, (1 + (data.week - 1) * 7)), data.value])
            chartWrapper.draw()
        })
}

const drawButton = document.getElementById('drawButton')
    drawButton.onclick = () => {
        drawButton.disabled = true
        drawGraph()
    }
const enableDrawButton = () => {
    drawButton.disabled = false
}
let googleHasLoaded = false

google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(() => {
    googleHasLoaded = true
});
const setConnected = (isConnected) => {
const status = document.getElementById('status')
    if(isConnected) {
        status.innerText = 'Connected'
        status.className = 'connected'
    }else{
        status.innerText = 'Disconnected'
        status.className = 'disconnected'
    }
}
socket.on('connect', ()=>{
    setConnected(true)
    socket.on('disconnect', ()=> {
        setConnected(false)
    })
    if(googleHasLoaded) {
        console.log("Google loaded first")
        enableDrawButton()
    }
    else(google.charts.setOnLoadCallback(()=>{
        console.log("Socket connected first")
        enableDrawButton()
    }))
    socket.on('finished', ()=>{
        console.log("Finished drawing graph")
        drawButton.disabled = false
        time.dispatchEvent(FinishedEvent)
    }
    )
})

