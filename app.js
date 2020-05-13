var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

import usersRouter from './routes/users';
import analysisRouter from './routes/analysis';
import challengesRouter from './routes/challenges';

// 로드하고 자동으로 실행됨
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

import cors from 'cors';

app.use(cors());
app.use('/api/users', usersRouter);
app.use('/api/analysis' , analysisRouter);
app.use("/api/challenges", challengesRouter);

// 추후 삭제해야 
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
import {Crawler, Loggers, Analytics} from './db/compute';
import info from './secure/info.json';
// s | m | h | d | week | month
// cron.schedule("* *  * * *", async ()=>{
//   console.log("[SCHEDULER] 데이터 불러오기 시작 ");
//   try{
//     Loggers.Crawler("스케줄러 실행 시작",info.secret);
//     const crawler_result = await Crawler.fetchEvents(info.secret);
//     const analytics_result = await Analytics.computeEvents();
//     const analytics_result_2 = await Analytics.computeRepos();
//     Loggers.Crawler("스케줄러 실행 종료",info.secret);
//     console.log("[SCHEDULER] 데이터 불러오기 성공");
//   }
//   catch(e){
//     Loggers.Error(e);
//   }
// });

module.exports = app;
