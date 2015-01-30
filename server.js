var connect = require('connect');
var serveStatic = require('serve-static');
connect().use(serveStatic('./data')).listen(80);