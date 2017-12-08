var http = require('http');
var url = require('url');
var fs = require('fs');

var mime = {
    '.js': 'text/javascript; charset=UTF-8',
    '.css': 'text/css',
    '.txt': 'text/plain; charset=UTF-8',
    '.html': 'text/html; charset=UTF-8',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.json': 'application/json'
}

http.createServer(function(req, res) {

    var purl = url.parse(req.url, true);

    fs.exists(__dirname + purl.pathname, function(exists) {
        if (exists && purl.pathname  != '/') {
            var extention = purl.pathname.slice(purl.pathname.lastIndexOf('.'))
            console.log(extention)
            res.writeHead(200, {'Content-Type': mime[extention]});
            fs.readFile(__dirname + purl.pathname, function(err, data) {
                if (err) throw err;
                res.end(data);
            });

        } else {
            fs.readFile(__dirname + '/index.html', function(err, data) {
                if (err) throw err;
                res.writeHead(200, {'Content-Type': mime['.html']});
                res.end(data);
            });
        }
    });

}).listen(1337);