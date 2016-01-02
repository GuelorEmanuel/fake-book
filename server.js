/*
  Authors: Tarek Karam 100886712
	         Guelor Emanuel 100884107

    Build the application Stack
*/

var http    = require ("http");
var url     = require ("url");

/*
	Prerequisites:

	1)You must have mongodb server running. It should have a database called "dbSongs" which contains a collection named "Songs".

	2)You must have installed the npm module: mongodb by executing
	the command:

	npm install mongodb
*/
var MongoClient = require('mongodb').MongoClient;
var Server = require('mongodb').Server;
var mongo = new MongoClient();

/*
    CreateServer is a function that http module offers
    -in:  request
    -out: respose
    returns an object: the object has a method named listen which takes in a
    numeric value which indicates the port number our HTTP is going to listen on
*/
function start(route, handle)
{
	function onRequest (request, response) {
		var pathname = url.parse(request.url).pathname;

		console.log("Request for " + pathname + " received.");
		route(handle, pathname, response, request);


	}
	http.createServer(onRequest).listen(3000);
	console.log('Server Running at http://127.0.0.1:3000  CRTL-C to quit');
}

exports.start = start;
