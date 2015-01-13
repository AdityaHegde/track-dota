var 
express      = require("express"),
io           = require("socket.io"),
bodyParser   = require("body-parser"),
cookieParser = require("cookie-parser"),
session      = require("express-session"),
mongoose     = require('mongoose'),
flash        = require('connect-flash'),
morgan       = require('morgan'),

dataHandler          = require("./app/lib/data_handler"),
mongodb_data_adaptor = require("./app/lib/mongodb_data_adaptor"),
passport             = require("passport"),
authentication       = require("./app/authentication"),
utils                = require("./app/lib/utils"),
sockets              = require("./app/sockets"),

config = require("./app/config/config"),
app = express();

mongodb_data_adaptor.init({
  profile : require("./app/models/profile"),
  heros   : require("./app/models/hero"),
});

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({ secret : "Dota2!" }));
app.use(passport.initialize());
app.use(passport.session());
//app.use(flash());

require('./app/routes.js')(app, passport);

var socketIO = io.listen(app.listen(config.server.port, config.server.ip));

sockets(socketIO);
