var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

import analysisRouter from './routes/analysis';
import registerRouter from './routes/register';

import db from "./db/db";

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 리액트 파일을 static 경로로 추가
app.use(express.static(path.resolve(__dirname, './client')));

// app.use('/', indexRouter);
app.use('/api/users', usersRouter.default);

app.use('/api/analysis' , analysisRouter);
app.use("/api/register", registerRouter);

const crawlingRouter = require("./routes/crawling").router;
app.use("/crawl" , crawlingRouter);

// 이제 모든 주소는 리액트로 보냄
app.get('*', function(request, response) {
  response.sendFile(path.resolve(__dirname, './client', 'index.html'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
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

// 스케줄러 설정
const cron = require('node-cron');
// s | m | h | d | week | month
cron.schedule("10 * * * * *", ()=>{
  console.log("[gomja] run in 10 seconds");
});

module.exports = app;
