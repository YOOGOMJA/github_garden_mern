import mongoose, { models } from 'mongoose';
import config from './config.json';
import * as Models from './models';

const host = config.host[process.env.NODE_ENV];

mongoose.connect(host , {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
});
mongoose.set('useCreateIndex', true);

const db = mongoose.connection;

const fn = {
    open : () =>{
        console.log("connected to db");

        if(!Models.User.exists()){ Models.User.init(); console.log('[DB] "User" Model initialized'); }
        if(!Models.Repository.exists()){ Models.Repository.init(); console.log('[DB] "Repository" Model initialized'); }
        if(!Models.LogFetchGithubAPI.exists()){ Models.LogFetchGithubAPI.init(); console.log('[DB] "LogFetchGithubAPI" Model initialized'); }
        if(!Models.Event.exists()){ Models.Event.init(); console.log('[DB] "Event" Model initialized'); }
        if(!Models.Commit.exists()){ Models.Commit.init(); console.log('[DB] "Commit" Model initialized'); }
        if(!Models.Challenge.exists()){ Models.Challenge.init(); console.log('[DB] "Challenge" Model initialized'); }
    },
    error : err=>{
        console.log("ERROR OCCURRED ! ${err}" , err);
    }
}

db.once("open" , fn.open);
db.on("error" , fn.error);

export default db;