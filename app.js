var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

import usersRouter from "./routes/users";
import analysisRouter from "./routes/analysis";
import challengesRouter from "./routes/challenges";
import reposRouter from "./routes/repos";

// 로드하고 자동으로 실행됨
import db from "./db/db";

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// 리액트 파일을 static 경로로 추가
app.use(express.static(path.resolve(__dirname, "./client")));

import cors from "cors";

app.use(cors());
app.use("/api/users", usersRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/repos", reposRouter);

// 추후 삭제해야
const crawlingRouter = require("./routes/crawling").router;
app.use("/api/crawl", crawlingRouter);

import api_404_router from "./routes/api.404";
// api 경로에서 생기는항목들은 404 처리
app.use("/api", api_404_router);

// 이제 모든 주소는 리액트로 보냄
app.get("*", function (request, response) {
    response.sendFile(path.resolve(__dirname, "./client", "index.html"));
});

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

// 스케줄러 설정
// const cron = require("node-cron");
import * as Scheduler from './lib/scheduler';
Scheduler.init();

// 로그인 관련
import passport from 'passport';
import passportConfig from './db/passport';
app.use(passport.initialize());
passportConfig();

module.exports = app;
