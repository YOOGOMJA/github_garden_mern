import mongoose from 'mongoose';

const RepositoryScheme = mongoose.Schema({
    id : String,
    name : String,
    description: String,
    contributor : [{
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }],
    languages: [
        { name : String, rate : Number }
    ],
    created_at : Date,
    stargazers_count : Number,
    watchers_count : Number,
    forks_count : Number,
    homepage : String,
    license : String,
});

const Repository = mongoose.model("Repository", RepositoryScheme);

export { Repository, RepositoryScheme };