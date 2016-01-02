/*
  Authors: Guelor Emanuel 100884107
            Tarek Karam 100886712


    - makes different HTTP request point to different parts of our code
    - We need to be able to feed URL and possible GET and POST parameters into our router
    - We need to enable our request handler to speak with the browser: like the onRequest fubction does
*/

function route(handle, pathname, response, request)
{
  console.log("Routing a request for" + pathname);

  if (typeof handle[pathname] === 'function')
	{
    return handle[pathname](response, request);
  }
  else
	{
    return handle["/serve"](response, request);
  }
}

exports.route = route;
