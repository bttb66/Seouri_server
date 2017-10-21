var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var index = require('./routes/index');
var users = require('./routes/users');
var community = require('./routes/community');
var member = require('./routes/member');
var home = require('./routes/home');

var config = require('./config/secretKey');
var app = express();
var jwt = require('jsonwebtoken');
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('jwt-secret', config.secret);var jwt = require('jsonwebtoken');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use( function(req, res, next){
  var token = req.headers.token;

  let url = req.url;
  let ret = url.match('/member');
  console.log('app.js req 확인: ', ret);
  if(ret){
    console.log('넘어감');
    next();
  } else{
    if(!token) {
      console.log('no token');
      res.status(400).send({message: 'no token'});
      return;
    }
    jwt.verify(token, req.app.get('jwt-secret'), (err, decoded) => {
      if(err){
        res.status(401).send({message: err.message });
        return;
      }
      else{
        req.userId = decoded.userId;
        console.log('decoded userId : ',req.userId);
        next();
      }
    });
  }
});

app.use('/', index);
app.use('/users', users);
app.use('/community', community);
app.use('/member', member);
app.use('/home',home);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
