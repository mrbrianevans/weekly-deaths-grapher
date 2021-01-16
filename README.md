 # Weekly deaths grapher
 
This package runs a server which serves clients files for a single webpage. 

The client is a simple graphing interface.

The client is connected to the server via a socket, which it uses to request data to graph.

The graph is drawn in realtime as the data comes in from the ONS API.



The data source is https://api.beta.ons.gov.uk/v1/datasets/weekly-deaths-age-sex


## Run this server
To run the project, download the repository and `npm ci && npm start` in the directory.

It usually takes about 38 seconds to draw the graph, but depends on the speed of the Office for National Statistics API.

# Example

![Sample](example.gif "Example of the client")

