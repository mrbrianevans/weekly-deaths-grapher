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
    //todo: allow the user to pick sex and age_group
    // sex should be a tick box, whether or not to separate by male and female, or combine them
    // age_group should be a tick box whether to show a stacked area chart by age group
    socket.emit('fetch', {
        sex: 'all', age_groups: 'all',
        start_year: Number(getSelection('start-year')),
        end_year: Number(getSelection('end-year')),
        week_intervals: Number(getSelection('week-intervals'))
    })
    const startTime = Date.now()
    const timer = setInterval(() => {
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
                duration: 100,
                easing: 'linear'
            },
            curveType: 'function'
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
    const drawer = setInterval(() => {
        // console.log("Drawing graph")
        chartWrapper.draw()
    }, 150)
    const recieveDataPoint = (data) => {
        // console.log("Received", data.value, 'week', data.week)
        datatable.addRow([new Date(data.year, 0, (1 + (data.week - 1) * 7)), data.value])
        // chartWrapper.draw()
    }
    socket.on('dataPoint', recieveDataPoint)
    const stopDrawingInterval = socket.on('finished', () => {
        // console.log("Finished!")
        //todo: Cannot remove listeners???
        socket.removeListener('datapoint', recieveDataPoint) //stop listening after the graph is drawn
        socket.removeListener('finished', stopDrawingInterval)
        chartWrapper.draw()
        clearInterval(drawer) // stop drawing the graph
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
    if (googleHasLoaded) {
        console.log("Google loaded first")
        enableDrawButton()
    } else (google.charts.setOnLoadCallback(() => {
        console.log("Socket connected first")
        enableDrawButton()
    }))
})

socket.on('disconnect', () => {
    setConnected(false)
})

socket.on('finished', () => {
      socket.removeAllListeners('datapoint')
      console.log("Finished drawing graph")
      drawButton.disabled = false
      time.dispatchEvent(FinishedEvent)
  }
)
