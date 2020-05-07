import mongoose from 'mongoose';

const CommitScheme = mongoose.Schema({
    sha : String,
    author : {
        email: String,
        name : String,
    },
    message : String,
    commit_date : Date,
    committer : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    },
    repo : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Repository"
    },
});

const Commit = mongoose.model("Commit", CommitScheme);

export { Commit, CommitScheme };