/*
 * Authors: Guelor Emanuel 100884107, Tarek Karam 100886712
 *
 * index.js: in charge of starting our HTTP.
 */

//Let acquire all the module we exported
var server = require("./server");
var router = require("./router");
var requestHandlers = require ("./requestHandlers");

var handle = {}

//used for passing a list of requestHandlers as an object in order to achieve loose
//coupling, since we want to inject this object into the route
requestHandlers.start();
handle["/"]             = requestHandlers.index;
handle["/start"]        = requestHandlers.index;
handle["/upload"]       = requestHandlers.upload;
handle["/show"]         = requestHandlers.show;
handle["/serve"]        = requestHandlers.serve;
handle["/uploadPage"]   = requestHandlers.uploadPage;
handle["/search"]       = requestHandlers.search;
handle["/songInfo"]		  = requestHandlers.songInfo;

server.start(router.route, handle);
