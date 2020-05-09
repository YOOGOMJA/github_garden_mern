import mongoose from 'mongoose';

const RepositoryScheme = mongoose.Schema({
    id : String,
    name : String,
    contributor : [{
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }],
    languages: [
        { name : String, rate : Number }
    ]
});

const Repository = mongoose.model("Repository", RepositoryScheme);

export { Repository, RepositoryScheme };