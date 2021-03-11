let googleHasLoaded = false
const drawGraph = () => {
  if (!googleHasLoaded) return
  const options = {
    height: document.getElementById('graph').clientHeight,
    legend: {position: 'none'},
    title: 'Weekly deaths in England and Wales',
    colors: ['steelblue', "forestgreen"],
    intervals: {style: 'area', pointSize: 10},
    curveType: 'function',
    tooltip: {isHtml: true},
    focusTarget: 'category'
  }
  fetch('/covid-vs-average').then(r => r.json()).then(data => {
    const datatable = new google.visualization.arrayToDataTable(data)
    const chartWrapper = new google.visualization.ChartWrapper({
      chartType: 'LineChart',
      dataTable: datatable,
      options: options,
      containerId: 'graph'
    })
    chartWrapper.draw()
  })
}

google.charts.load('current', {'packages': ['corechart']});
google.charts.setOnLoadCallback(() => {
  googleHasLoaded = true
  drawGraph()
});
