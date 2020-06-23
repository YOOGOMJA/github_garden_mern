var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// 로드하고 자동으로 실행됨
import db from "./db/db";

var app = express();

// 로그인 관련
import passport from "passport";
import passportConfig from "./db/passport";
import config from "./db/config.json";
import session from "express-session";
import mongoStore from "connect-mongo";

// 세션을 mongodb에 저장
const cookieStore = mongoStore(session);
app.use(
    session({ 
        secret: config.secret, 
        resave: true, 
        saveUninitialized: false,
        store : new cookieStore({ mongooseConnection: db })
    })
);

app.use(passport.initialize());
app.use(passport.session());
passportConfig(passport);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));


import cors from "cors";

import usersRouter from "./routes/users";
import analysisRouter from "./routes/analysis";
import challengesRouter from "./routes/challenges";
import reposRouter from "./routes/repos";
import authRouter from './routes/auth';
import eventRouter from './routes/events';
import adminRouter from './routes/admin';

app.use(cors());
app.use("/api/users", usersRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/repos", reposRouter);
app.use("/api/events", eventRouter);
app.use("/api/admin", adminRouter);
app.use("/auth" , authRouter);

import api_404_router from "./routes/api.404";
// api 경로에서 생기는항목들은 404 처리
app.use("/api", api_404_router);

// 이제 모든 주소는 리액트로 보냄
import { getClient } from './lib/clientConnector';
// app.use(express.static(path.resolve(__dirname, "client")));
// app.get("*", (req, res)=>{  
//     res.sendFile(path.resolve(__dirname, "client", "index.html"));
// })
const clientPath = getClient((env)=>{
    if(env === "production"){
        // 리액트 파일을 static 경로로 추가
        app.use(express.static(path.resolve(__dirname, "client")));
    }
});
console.log(clientPath.toString());
app.use("*", clientPath);
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
import * as Scheduler from "./lib/scheduler";
Scheduler.init();

module.exports = app;
