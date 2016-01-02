/*
  Authors: 	Guelor Emanuel 100884107
						Tarek Karam 100886712


	Since it wouldn't be a good thing to do something with request: because
	it wouldn't scale well once our application becomes more complex.
	We can create functions, where requests are handled.


	Node.js module, child_process allows us to make use of a very simple yet useful non-blocking operation: exec()
  :it executes a shell command from within Node.js, which we can use to get a list of files in the current
    directory("ls -lah") which allows us to display this list in the browser of a user requesting the /start URL.

*/

var exec        = require("child_process").exec;
var querystring = require("querystring");
var fs          = require("fs");
var formidable  = require("formidable");

var path        = require('path');
var ROOT_DIR = '/public'; //dir for static files



var mc = require('mongodb').MongoClient; //need to: npm install mongodb
var Set = require('./set.js');
var docs = {}; // Global object to store song object for function scope flexibility;


function serveStaticFile(res, path, contentType, responseCode){
	if(!responseCode) responseCode = 200;
	fs.readFile(__dirname + path, function(err, data)
	{
		if(err)
		{
			//for now use success code
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end('500 INTERNAL FILE ERROR' + '\n');
		}
		else
		{
			res.writeHead(responseCode , {'Content-Type': contentType});
			res.end(data);
		}
	});
}
/*
  Parse the songs from the database.
*/
function start()
{
  var fs = require('fs');
  var mc = require('mongodb').MongoClient; //need to: npm install mongodb
  var Set = require('./set.js');
  var set = new Set();

  var inputFilePath = "songs/1200iRealBookJazz_rev2.txt";
  var outputFilePath = "songs/output.txt";

  //parsing modes
  //input mode changes when an '=' is found in data file
  var MODES =
	{
		UNKNOWN : 0,
		TITLE: 1,   //parsing title of song
		COMPOSER: 2, //parsing composer of song
		STYLE: 3,  //parsing style of song
		KEY: 4,  //parsing musical key of song
		N: 5,     //place holder, no parsing
		SONGDATA: 6 //parsing song chord data
  };

  //NOTE: location and name of song data file is hard-coded.
  fs.readFile(inputFilePath , function(err, data)
	{
    if(err)
		{
        console.log('ERROR OPENING FILE: ' + inputFilePath);
        throw err;
    }

    console.log('PARSING FILE: ' + inputFilePath);

    var fileDataString = data.toString(); //all data from file

    var mode = MODES.UNKNOWN;  //current parsing mode
    var parseDataString = ""; //parse data for current mode
    var rawSongDataString = ""; //raw data for song kept for debugging for now
    var currentSong = {}; //current songs being constructed
    var currentBar = null; //current bar being constructed

    var songsArray = []; //array of parsed songs

    function isEmptyObject(anObject){
       //answer whether anObject is empty
       for(var item in anObject)
          if(anObject.hasOwnProperty(item)) return false;
       return true;
    }

    function setMode(newMode)
		{
        //now leaving mode
        if(mode === MODES.TITLE)
				{
             currentSong.title = parseDataString;
        }
        else if(mode === MODES.COMPOSER)
				{
             currentSong.composer = parseDataString;
        }
        else if(mode === MODES.STYLE)
				{
             currentSong.style = parseDataString;
        }
        else if(mode === MODES.KEY)
				{
             currentSong.key = parseDataString;
        }
        else if(mode === MODES.SONGDATA)
				{
             currentSong.songData = parseDataString;
						 currentSong.rawSongData = rawSongDataString;
        }

        //now entering mode
        if(newMode === MODES.SONGDATA)
				{
              currentSong.bars = []; //make bars array
        }

        else if(newMode === MODES.TITLE)
				{
              if(!isEmptyObject(currentSong))
                  songsArray.push(currentSong);
              currentSong = {}; //make new empty song;
        }

        mode = newMode;
        parseDataString = "";
				rawSongDataString = "";
    }

    function isBarLine(x)
		{
			if(x === "T") return true; //time signature
			if(x === "[") return true; //left double bar line
      if(x === "{") return true; //left repeat bar line
      if(x === "|") return true; //bar line
			if(x === "p") return true; //slashes
			if(x === "n") return true; // no chord
			if(x === "x") return true; //sing bar repeat
			if(x === "r") return true;//two bar repeat
      if(x === "}") return true; //right repeat bar line
      if(x === "]") return true; //right double bar line
      if(x === "Z") return true; //final bar line
      if(x === "Q") return true; //coda
      if(x === "S") return true; //del segno
      if(x === "N") return true; //first ending
      if(x === "*") return true; //Rehearsal letters
      if(x === "<" || x === ">") return true; //comments
     return false;
    }

    //parse the file data into song objects with bars.
    //each bar contains crude chord data including chords, time signatures
    //rehearsal letters etc.
    for(var i=0; i<fileDataString.length; i++)
		{
			if(fileDataString.charAt(i) == "=")
			{
				//change parsing mode
				if(mode === MODES.UNKNOWN) setMode(MODES.TITLE);
				else if(mode === MODES.TITLE) setMode(MODES.COMPOSER);
				else if(mode === MODES.COMPOSER) setMode(MODES.STYLE);
				else if(mode === MODES.STYLE) setMode(MODES.KEY);
				else if(mode === MODES.KEY) setMode(MODES.N);
				else if(mode === MODES.N) setMode(MODES.SONGDATA);
				else if(mode === MODES.SONGDATA) setMode(MODES.TITLE);
			}

			else if((mode === MODES.SONGDATA) && isBarLine(fileDataString.charAt(i)))
			{
				if(currentBar === null)
				{
					currentBar = {};
					if(fileDataString.charAt(i) === "[") currentBar.leftDoubleBarLine = "||";
					if(fileDataString.charAt(i) === "{") currentBar.leftRepeat = "|:";
				}
				else
				{
					currentBar.chords = parseDataString;
					currentSong.bars.push(currentBar);
					if(fileDataString.charAt(i) === "T")//*********
					{
						currentBar.timeSignature = fileDataString.charAt(i+1) + "/" + fileDataString.charAt(i+2);
						i+=2;
					}//*************
					if(fileDataString.charAt(i) === "|") currentBar.barLine = "|";
					if(fileDataString.charAt(i) === "p" && fileDataString.charAt(i+1) === "p") currentBar.slashes = "//";
					if(fileDataString.charAt(i) === "n") currentBar.noChord = "N.C";
					if(fileDataString.charAt(i) === "x") currentBar.singleBarRepeat = "%";
					if(fileDataString.charAt(i) === "r") currentBar.twoBarRepeat = "R|";
					if(fileDataString.charAt(i) === "]") currentBar.rightDoubleBarLine = "||";
					if(fileDataString.charAt(i) === "}") currentBar.rightRepeat = ":|";
					if(fileDataString.charAt(i) === "Z") currentBar.finalBarLine = "|]";
					if(fileDataString.charAt(i) === "Q") currentBar.coda = "@";
					if(fileDataString.charAt(i) === "S") currentBar.singleBarRepeat = "$";
					if((fileDataString.charAt(i) === ">") || (fileDataString.charAt(i) === "<")) currentBar.comment = "\"";
				  if(fileDataString.charAt(i) === "N")
					{
						if(fileDataString.charAt(i+1) === "1") {currentBar.firstEnding = "(1.";}
						else {currentBar.secondEnding = "(2.";}
					}
					if(fileDataString.charAt(i) === "*")
					{
					  if(fileDataString.charAt(i+1) === "i") {currentBar.rehearsal = "[intro]";}
						else {currentBar.rehearsal = "[" + fileDataString.charAt(i+1) + "]";}
						i+=1;
					}
					if(fileDataString.charAt(i) === "]") currentBar = null;
					else if(fileDataString.charAt(i) === "}") currentBar = null;
					else currentBar = {};
					parseDataString = "";
				}

				rawSongDataString = rawSongDataString + fileDataString.charAt(i);

			}

			else
			{
				//add data character to content for mode
				parseDataString = parseDataString + fileDataString.charAt(i);
				rawSongDataString = rawSongDataString + fileDataString.charAt(i);
			}

    } //end parse data file

    //account for last song which will not go back to TITLE mode
    if(!isEmptyObject(currentSong))
		{
			currentSong.rawSongData = rawSongDataString;
			currentSong.songData = parseDataString;
			songsArray.push(currentSong);
    }
    currentSong = {}; //make new empty song;
    currentBar = null; //clear current bar;

    //write parsed songs to console
    console.log('THE SET');
    console.log(set.toString());

    //write parsed songs to output file.
    //write the array as a stringified JSON object.
    var dataAsObject = {};
    dataAsObject.songs = songsArray;

    fs.writeFile(outputFilePath , JSON.stringify(dataAsObject, null, 2), function(err)
		{
      if(err) console.log(err);
      else console.log('file was saved to: ' + outputFilePath);
    });

    mc.connect('mongodb://localhost/iRealSongs', function(err, db)
		{
      if (err)
			{
				throw err;
      }
			var songsCollection = db.collection('songs');

			songsCollection.drop(function(err, count)
			{
				if (err)
				{
					console.log("No collection to drop.");
				}

			  else
			  {
          console.log("songs collection dropped.");
        }
        songsCollection.insert(songsArray, function(err, theSongs)
				{
          if (err)
					{
            throw err;
          }

          db.close();

        });
      });
    });
  });
}

/*
  Home Page
*/
function index(response, request)
{
/* *********************************************************************************************

Create a Drop Down Menu with Search Box in CSS3 and HTML

Links:
http://designmodo.com/create-drop-down-menu-search-box

********************************************************************************************* */
  console.log('/start');
	var body = '<html>' +
						 '<head>' +
						 '<title>iRealBook</title>' +
								'<link href="styles/flatnav.css" rel="stylesheet">' +
									 '<meta name="robots" content="noindex,follow" />' +
						 '</head>' +
						 '<body>' +
							 '<center>'+
								 '<ul class="nav">' +
									 '<li id="Settings">' +
											'<a href="#"><img src="images/settings.png" /></a>' +
									 '</li>' +
									 '<li>'  +
											'<a href="start">iRealBook Home</a>' +
									 '</li>' +
									 '<li>' +
											'<a href="#">Shuffle</a>' +
									 '</li>' +
									 '<li id="search song">' +
											'<form name="actionForm" action="/search" method="post">' +
													'<input type="text" name="search_text" id="search_text" placeholder="Search"/>' +
													'<input type="button" name="search_button" id="search_button" onClick="document.actionForm.submit()"></a>' +
											'</form>' +
									 '</li>' +
									 '<li id="options">' +
											'<a href="#">Options</a>' +
											'<ul class="subnav">' +
													'<li><a href="uploadPage">upload</a></li>' +
													'<li><a href="#">EditSong</a></li>' +
													'<li><a href="view">RecentUpload</a></li>' +
													'<li><a href="#">Options</a></li>' +
											'</ul>' +
									 '</li>' +
								 '</ul>'+
							 '</center>' +
							 '<script src="script/prefixfree-1.0.7.js" type="text/javascript"></script>' +
							 '<center><center><h1>Welcome to iRealBook</h1></center></center>'
						 '</body>' +
						 '</html>';
	response.writeHead(200, {'Content-Type': 'text/html'});
	response.write(body);
	response.end();
}

/*
  Upload page.
*/
function uploadPage(response, rquest)
{
  console.log('/uploadPage');
	var body =  '<html>' +
						  '<head>' +
						  '<title>iRealBook</title>' +
								'<link href="styles/flatnav.css" rel="stylesheet">' +
									'<meta name="robots" content="noindex,follow" />' +
						  '</head>' +
						  '<body>' +
							  '<center>'+
									'<ul class="nav">' +
										'<li id="Settings">' +
											'<a href="#"><img src="images/settings.png" /></a>' +
										'</li>' +
										'<li>'  +
											'<a href="start">iRealBook Home</a>' +
										'</li>' +
										'<li>' +
											'<a href="#">Shuffle</a>' +
										'</li>' +
										'<li id="search song">' +
											'<form name="actionForm" action="/search" method="post">' +
													'<input type="text" name="search_text" id="search_text" placeholder="Search"/>' +
													'<input type="button" name="search_button" id="search_button" onClick="document.actionForm.submit()"></a>' +
											'</form>' +
										'</li>' +
										'<li id="options">' +
											'<a href="#">Options</a>' +
											'<ul class="subnav">' +
													'<li><a href="uploadPage">Upload</a></li>' +
													'<li><a href="#">EditSong</a></li>' +
													'<li><a href="view">RecentUpload</a></li>' +
													'<li><a href="#">Options</a></li>' +
											'</ul>' +
										'</li>' +
									'</ul>' +
								'</center>'+
								'<form id="form1" enctype="multipart/form-data" method="post" action="/upload">' +
									'<center>' +
										'<div class="row">' +
											'<label for="upload">Select a File to Upload</label><br>' +
											'<input type="file" name="upload" id="upload" onchange="fileSelected();"/>' +
										'</div>' +
										'<div id="fileName"></div>'+
										'<div id="fileSize"></div>'+
										'<div id="fileType"></div>'+
										'<div class="row">'+
											'<input type="submit" onclick="uploadFile()" value="upload file" />'+
										'</div>'+
										'<div id="progressNumber"></div>'+
									'</center>' +
								'</form>'+
								'<script src="script/prefixfree-1.0.7.js" type="text/javascript"></script>' +
						 '</body>' +
						 '</html>';
	response.writeHead(200, {'Content-Type': 'text/html'});
	response.write(body);
	response.end();
}

/*
  Paths.
*/
function serve(response, request)
{
  console.log('/serve');
  var path = request.url.replace(/\/?(?:\?.*)$/,'').toLowerCase();
  contentType = 'text/html';

  if (path.indexOf('.css') != -1)
    contentType = 'text/css';

  else if (path.indexOf('.js') != -1)
    contentType = 'text/javascript';

  else if (path.indexOf('.png') != -1)
    contentType = 'image/png';

  else if (path.indexOf('.jpg') != -1)
    contentType = 'image/jpg';

  serveStaticFile(response,
                      ROOT_DIR + path,
                      contentType);
}

/*
  Upload and parse a song file into the database.
	Does not add new songs to the database if they are the same as already existing songs.
*/
function upload(response, request)
{
  console.log('/upload');
  var Set = require('./set.js');
  var set = new Set();
	var body = '<html>' +
						'<head>' +
						'<title>iRealBook</title>' +
								'<link href="styles/flatnav.css" rel="stylesheet">' +
									'<meta name="robots" content="noindex,follow" />' +
						'</head>' +
						'<body>' +
							'<center>'+
								'<ul class="nav">' +
									'<li id="Settings">' +
											'<a href="#"><img src="images/settings.png" /></a>' +
									'</li>' +
									'<li>'  +
											'<a href="start">iRealBook Home</a>' +
									'</li>' +
									'<li>' +
											'<a href="#">Shuffle</a>' +
									'</li>' +
									'<li id="search song">' +
											'<form name="actionForm" action="/search" method="post">' +
													'<input type="text" name="search_text" id="search_text" placeholder="Search"/>' +
													'<input type="button" name="search_button" id="search_button" onClick="document.actionForm.submit()"></a>' +
											'</form>' +
									'</li>' +
									'<li id="options">' +
											'<a href="#">Options</a>' +
											'<ul class="subnav">' +
													'<li><a href="uploadPage">upload</a></li>' +
													'<li><a href="#">EditSong</a></li>' +
													'<li><a href="view">RecentUpload</a></li>' +
													'<li><a href="#">Options</a></li>' +
											'</ul>' +
									'</li>' +
								'</ul>'+
							'</center>' +
							'<script src="script/prefixfree-1.0.7.js" type="text/javascript"></script>' +
							'<center><center><h1>File Has been Uploaded</h1></center></center>'
						'</body>' +
						'</html>';

  var form = new formidable.IncomingForm();
  console.log("Parsing...");

  form.parse(request, function(error, fields, files)
	{
		console.log("Parsing Done...");
		fs.rename(files.upload.path, "./test/test.text", function(error)
		{
			if(error)
			{
				fs.unlink("./test/test.text");
				fs.rename(files.upload.path, "./test/test.text");
			}
		});

    response.writeHead(200, {"Content-Type": "text/html"});
    response.write(body);
    response.end();
	});

  var inputFilePath = "test/test.text";

  //parsing modes
  //input mode changes when an '=' is found in data file
  var MODES =
	{
		UNKNOWN : 0,
		TITLE: 1,   //parsing title of song
		COMPOSER: 2, //parsing composer of song
		STYLE: 3,  //parsing style of song
		KEY: 4,  //parsing musical key of song
		N: 5,     //place holder, no parsing
		SONGDATA: 6 //parsing song chord data
  };

  //NOTE: location and name of song data file is hard-coded.
  fs.readFile(inputFilePath , function(err, data)
	{
    if(err)
		{
        console.log('ERROR OPENING FILE: ' + inputFilePath);
        throw err;
    }

    console.log('PARSING FILE: ' + inputFilePath);

    var fileDataString = data.toString(); //all data from file

    var mode = MODES.UNKNOWN;  //current parsing mode
    var parseDataString = ""; //parse data for current mode
    var rawSongDataString = ""; //raw data for song kept for debugging for now
    var currentSong = {}; //current songs being constructed
    var currentBar = null; //current bar being constructed

    var songsArray = []; //array of parsed songs

    function isEmptyObject(anObject)
		{
       //check whether anObject is empty
       for(var item in anObject)
          if(anObject.hasOwnProperty(item)) return false;
       return true;
    }

    function setMode(newMode)
		{
        //now leaving mode
        if(mode === MODES.TITLE)
				{
             currentSong.title = parseDataString;
        }
        else if(mode === MODES.COMPOSER)
				{
             currentSong.composer = parseDataString;
        }
        else if(mode === MODES.STYLE)
				{
             currentSong.style = parseDataString;
        }
        else if(mode === MODES.KEY)
				{
             currentSong.key = parseDataString;
        }
        else if(mode === MODES.SONGDATA)
				{
          currentSong.songData = parseDataString;
					currentSong.rawSongData = rawSongDataString;
        }

        //now entering mode
        if(newMode === MODES.SONGDATA) {
              currentSong.bars = []; //make bars array

        }

        else if(newMode === MODES.TITLE) {
              if(!isEmptyObject(currentSong))
                  songsArray.push(currentSong);
              currentSong = {}; //make new empty song;

        }

        mode = newMode;
        parseDataString = "";
				rawSongDataString = "";
    }

	function isBarLine(x)
	{
		if(x === "T") return true; //time signature
		if(x === "[") return true; //left double bar line
		if(x === "{") return true; //left repeat bar line
		if(x === "|") return true; //bar line
		if(x === "p") return true; //slashes
		if(x === "n") return true; // no chord
		if(x === "x") return true; //sing bar repeat
		if(x === "r") return true;//two bar repeat
		if(x === "}") return true; //right repeat bar line
		if(x === "]") return true; //right double bar line
		if(x === "Z") return true; //final bar line
		if(x === "Q") return true; //coda
		if(x === "S") return true; //del segno
		if(x === "N") return true; //first ending
		if(x === "*") return true; //Rehearsal letters
		if(x === "<" || x === ">") return true; //comments
	 return false;
	}

	//parse the file data into song objects with bars.
	//each bar contains crude chord data including chords, time signatures
	//rehearsal letters etc.
	for(var i=0; i<fileDataString.length; i++)
	{
		if(fileDataString.charAt(i) == "=")
		{
			//change parsing mode
			if(mode === MODES.UNKNOWN) setMode(MODES.TITLE);
			else if(mode === MODES.TITLE) setMode(MODES.COMPOSER);
			else if(mode === MODES.COMPOSER) setMode(MODES.STYLE);
			else if(mode === MODES.STYLE) setMode(MODES.KEY);
			else if(mode === MODES.KEY) setMode(MODES.N);
			else if(mode === MODES.N) setMode(MODES.SONGDATA);
			else if(mode === MODES.SONGDATA) setMode(MODES.TITLE);
		}

		else if((mode === MODES.SONGDATA) && isBarLine(fileDataString.charAt(i)))
		{
			if(currentBar === null)
			{
				currentBar = {};
				if(fileDataString.charAt(i) === "[") currentBar.leftDoubleBarLine = "||";
				if(fileDataString.charAt(i) === "{") currentBar.leftRepeat = "|:";
			}
			else
			{
				currentBar.chords = parseDataString;
				currentSong.bars.push(currentBar);
				if(fileDataString.charAt(i) === "T")//*********
				{
					currentBar.timeSignature = fileDataString.charAt(i+1) + "/" + fileDataString.charAt(i+2);
					i+=2;
				}//*************
				if(fileDataString.charAt(i) === "|") currentBar.barLine = "|";
				if(fileDataString.charAt(i) === "p" && fileDataString.charAt(i+1) === "p") currentBar.slashes = "//";
				if(fileDataString.charAt(i) === "n") currentBar.noChord = "N.C";
				if(fileDataString.charAt(i) === "x") currentBar.singleBarRepeat = "%";
				if(fileDataString.charAt(i) === "r") currentBar.twoBarRepeat = "R|";
				if(fileDataString.charAt(i) === "]") currentBar.rightDoubleBarLine = "||";
				if(fileDataString.charAt(i) === "}") currentBar.rightRepeat = ":|";
				if(fileDataString.charAt(i) === "Z") currentBar.finalBarLine = "|]";
				if(fileDataString.charAt(i) === "Q") currentBar.coda = "@";
				if(fileDataString.charAt(i) === "S") currentBar.singleBarRepeat = "$";
				if((fileDataString.charAt(i) === ">") || (fileDataString.charAt(i) === "<")) currentBar.comment = "\"";
				if(fileDataString.charAt(i) === "N")
				{
					if(fileDataString.charAt(i+1) === "1") {currentBar.firstEnding = "(1.";}
					else {currentBar.secondEnding = "(2.";}
				}
				if(fileDataString.charAt(i) === "*")
				{
					if(fileDataString.charAt(i+1) === "i") {currentBar.rehearsal = "[intro]";}
					else {currentBar.rehearsal = "[" + fileDataString.charAt(i+1) + "]";}
					i+=1;
				}
				if(fileDataString.charAt(i) === "]") currentBar = null;
				else if(fileDataString.charAt(i) === "}") currentBar = null;
				else currentBar = {};
				parseDataString = "";
			}

			rawSongDataString = rawSongDataString + fileDataString.charAt(i);

      }
			else
			{
				//add data character to content for mode
				parseDataString = parseDataString + fileDataString.charAt(i);
				rawSongDataString = rawSongDataString + fileDataString.charAt(i);
			}

    } //end parse data file

    //account for last song which will not go back to TITLE mode
    if(!isEmptyObject(currentSong))
		{
       currentSong.rawSongData = rawSongDataString;
       currentSong.songData = parseDataString;
       songsArray.push(currentSong);
     }
    currentSong = {}; //make new empty song;
    currentBar = null; //clear current bar;

    //write parsed songs to console
    //console.log(songsArray);
    console.log('THE SET');
    console.log(set.toString());

    //write parsed songs to output file.
    //write the array as a stringified JSON object.
    var dataAsObject = {};
    dataAsObject.songs = songsArray;

    mc.connect('mongodb://localhost/iRealSongs', function(err, db)
		{
			if(err) console.log('FAILED TO CONNECT TO DATABASE');
			else
			{
				var myDB = db.db("iRealSongs");
				console.log('CONNECTED TO DATABASE');
				myDB.collection("songs", function(err, collection)
				{
					collection.insert(songsArray, function(err, object)
					{
						var cursor = collection.find();
						console.log("Uploading...");
						cursor.each(function(err,document)
						{
								if(document == null) myDB.close();
					  });
						console.log("Upload...Complete");
					});
				});
			}
		});
  });
}

/*
  Show the song data that has been uploaded.
*/
function show(response)
{
  console.log('/show');
  fs.readFile("./test/test.text", "binary", function(error, file) {
    if (error) {
      response.writeHead(500, {"Content-Type": "text/plain"});
      response.write(error + "\n");
      response.end();
    } else {
      response.writeHead(200, {"Content-Type": "text/plain"});
      response.write(file, "binary");
      response.end();
    }
  });
}

/*
  Search for songs and display the results.
*/
function search(response, request)
{
	console.log('/search');
  var requestBody = "";
	var displaySong = "";

  request.on('data',function (data)
	{
    requestBody += data;
  });

  request.on('end', function (data)
	{
	  docs = {};
    var postData = querystring.parse(requestBody);
    var searchTerm = postData.search_text;
		var subsST = searchTerm.split(" ");
		var arr = new Array();
		for(var j=0;j<subsST.length; j++)
		{
		 arr[j] = {title: new RegExp(subsST[j], 'i')};
		}
		var count = 0;
		var count2 = 0;

    mc.connect("mongodb://localhost:27017/", function(err, db)
		{
      if(err) console.log('FAILED TO CONNECT TO DATABASE');
      else
			{
				var myDB = db.db("iRealSongs");
				console.log('CONNECTED TO DATABASE');
				myDB.collection("songs", function(err, collection)
				{
					var cursor = collection.find({$and: arr});
					cursor.each(function(err,document)
					{
						if(document != null)
						{
							displaySong = document;
							docs[displaySong.title] = displaySong;
						}
						else
						{
							var body =  '<html>' +
													'<head>' +
													'<script>' +
													 'function setTitle(ti){document.getElementById("cL").value = ti; document.linkForm.submit();}' +
													'</script>'+
													'<title>iRealBook</title>' +
														'<link href="styles/flatnav.css" rel="stylesheet">' +
															 '<meta name="robots" content="noindex,follow" />' +
													'</head>' +
													'<body>' +
													 '<center>'+
														 '<ul class="nav">' +
																'<li id="Settings">' +
																	'<a href="#"><img src="images/settings.png" /></a>' +
																'</li>' +
																'<li>'  +
																	'<a href="start">iRealBook Home</a>' +
																'</li>' +
																'<li>' +
																	'<a href="#">Shuffle</a>' +
																'</li>' +
																'<li id="search song">' +
																	'<form name="actionForm" action="/search" method="post">' +
																			'<input type="text" name="search_text" id="search_text" placeholder="Search"/>' +
																			'<input type="button" name="search_button" id="search_button" onClick="document.actionForm.submit()"></a>' +
																	'</form>' +
																'</li>' +
																'<li id="options">' +
																	'<a href="#">Options</a>' +
																	'<ul class="subnav">' +
																			'<li><a href="uploadPage">upload</a></li>' +
																			'<li><a href="#">EditSong</a></li>' +
																			'<li><a href="view">RecentUpload</a></li>' +
																			'<li><a href="#">Options</a></li>' +
																	'</ul>' +
															 '</li>' +
															'</ul>' +
														'</center>'+
													  '<form name="linkForm" action="/songInfo" method="post">'+
															'<input type="hidden" id="cL" name="cL" value="">'+
															'<center><br><table>';
															for(var k in docs)
															{
																if(count2 >= 12){break;}
																body+= '<tr><td><a href="javascript:setTitle(\''+docs[k].title+'\');">'+docs[k].title+'</a></td></tr>'
																count2++;
															}
															body+= '</table>'+
															'</center>' +
													'</form>' +
													'<script src="script/prefixfree-1.0.7.js" type="text/javascript"></script>' +
												'</body>' +
												'</html>';
							response.writeHead(200, {'Content-Type': 'text/html'});
							response.write(body);
							response.end();
						}
					});
				});
			}
    });
  });
}

/*
  Display the selected songs parsed data.
*/
function songInfo(response, request)
{
	console.log('/songInfo');
	var requestBody = "";

	request.on('data',function (data)
	{
		requestBody += data;
	});

	request.on('end', function (data)
	{
		var postData = querystring.parse(requestBody);
		var clickTerm = postData.cL;
		var count = 0;
		var body =  '<html>' +
							  '<head>' +
							  '<title>iRealBook</title>' +
									'<link href="styles/flatnav.css" rel="stylesheet">' +
										 '<meta name="robots" content="noindex,follow" />' +
							  '</head>' +
							  '<body>' +
									'<center>'+
										'<ul class="nav">' +
											'<li id="Settings">' +
												'<a href="#"><img src="images/settings.png" /></a>' +
											'</li>' +
											'<li>'  +
												'<a href="start">iRealBook Home</a>' +
											'</li>' +
											'<li>' +
												'<a href="#">Shuffle</a>' +
											'</li>' +
											'<li id="search song">' +
												'<form name="actionForm" action="/search" method="post">' +
														'<input type="text" name="search_text" id="search_text" placeholder="Search"/>' +
														'<input type="button" name="search_button" id="search_button" onClick="document.actionForm.submit()"></a>' +
												'</form>' +
											'</li>' +
											'<li id="options">' +
												'<a href="#">Options</a>' +
												'<ul class="subnav">' +
													'<li><a href="uploadPage">upload</a></li>' +
													'<li><a href="#">EditSong</a></li>' +
													'<li><a href="view">RecentUpload</a></li>' +
													'<li><a href="#">Options</a></li>' +
												'</ul>' +
											'</li>' +
										'</ul>' +
									'</center>';
									if(docs[clickTerm])
									{
										body += '<center><br><h2>'+docs[clickTerm].title+'</h2><br>' +
										'<table><tr><td>Style: ' + docs[clickTerm].style + '</td><td>&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp</td><td> Composer: ' + docs[clickTerm].composer + '</td></tr></table><table><tr>';
										for(var key in docs[clickTerm].bars)
										{
											if((docs[clickTerm].bars).hasOwnProperty(key))
											{
												if(count >= 4)
												{
													body += '</tr><tr>';
													count = 0;
												}
											  body+= '<td>';
												if(docs[clickTerm].bars[key].timeSignature)
												{
													body += docs[clickTerm].bars[key].timeSignature;
												}
												if(docs[clickTerm].bars[key].rehearsal)
												{
													body += docs[clickTerm].bars[key].rehearsal;
												}
											  if(docs[clickTerm].bars[key].leftDoubleBarLine)
												{
													body += docs[clickTerm].bars[key].leftDoubleBarLine;
												}
												if(docs[clickTerm].bars[key].leftRepeat)
												{
													body += docs[clickTerm].bars[key].leftRepeat;
												}
												if(docs[clickTerm].bars[key].slashes)
												{
													body += docs[clickTerm].bars[key].slashes;
												}
												if(docs[clickTerm].bars[key].coda)
												{
													body += docs[clickTerm].bars[key].coda;
												}
												if(docs[clickTerm].bars[key].delSegno)
												{
													body += docs[clickTerm].bars[key].delSegno;
												}
												if(docs[clickTerm].bars[key].noChord)
												{
													body += docs[clickTerm].bars[key].noChord;
												}
												if(docs[clickTerm].bars[key].singleBarRepeat)
												{
													body += docs[clickTerm].bars[key].singleBarRepeat + '</td><td>';
												}
												if(docs[clickTerm].bars[key].twoBarRepeat)
												{
													body += docs[clickTerm].bars[key].twoBarRepeat + '</td><td>';
												}
												if(docs[clickTerm].bars[key].chords)
												{
												 body += docs[clickTerm].bars[key].chords;
												}
												if(docs[clickTerm].bars[key].barLine)
												{
													body += docs[clickTerm].bars[key].barLine;
												}
												if(docs[clickTerm].bars[key].comment)
												{
													body += docs[clickTerm].bars[key].comment;
												}
												if(docs[clickTerm].bars[key].rightRepeat)
												{
													body += docs[clickTerm].bars[key].rightRepeat;
												}
												if(docs[clickTerm].bars[key].rightDoubleBarLine)
												{
													body += docs[clickTerm].bars[key].rightDoubleBarLine;
												}
												if(docs[clickTerm].bars[key].firstEnding)
												{
													body += docs[clickTerm].bars[key].firstEnding;
												}
												if(docs[clickTerm].bars[key].secondEnding)
												{
													body += docs[clickTerm].bars[key].secondEnding;
												}
												if(docs[clickTerm].bars[key].finalBarLine)
												{
													body += docs[clickTerm].bars[key].finalBarLine;
												}
										    count++;
												body+='</td>';
											}
										}
										if((count < 4) && (count > 0)) body+= '</tr>';
								  }
								  body += '</table></center><script src="script/prefixfree-1.0.7.js" type="text/javascript"></script>' +
								'</body>' +
								'</html>';
		response.writeHead(200, {'Content-Type': 'text/html'});
		response.write(body);
		response.end();
		docs = {};
	});
}

/*
	Send the request handlers to the router, and give
	the router something to route to.
*/
exports.index      = index;
exports.start      = start;
exports.upload     = upload;
exports.show       = show;
exports.serve      = serve;
exports.uploadPage = uploadPage;
exports.search     = search;
exports.songInfo   = songInfo;
