import mongoose from 'mongoose';

const LogFetchGithubAPIScheme = mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    } | 'ALL',
    created_at : Date,
});

const LogFetchGithubAPI = mongoose.model('Log_FetchGithubAPI' , LogFetchGithubAPIScheme);

export { LogFetchGithubAPI, LogFetchGithubAPIScheme };