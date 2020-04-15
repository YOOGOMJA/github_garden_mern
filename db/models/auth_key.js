import mongoose from 'mongoose';

const AuthKeyScheme = mongoose.Schema({
    key: {
        type: String,
        unique: true
    },
    owner:{
        name: String,
        mail: String,
    },
    created_at: Date,
});

const AuthKey = mongoose.model("AuthKey", AuthKeyScheme);

export { AuthKey, AuthKeyScheme };
