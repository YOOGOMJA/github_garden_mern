import mongoose from 'mongoose';

const authTokenScheme = mongoose.Schema({
    value : {
        type: String,
        unique : true,
    },
    used_by : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        default : null
    },
    expired_at : Date,
    created_at : {
        type : Date,
        default : new Date(),
    },
    updated_at : {
        type : Date,
        default : new Date(),
    },
    created_by : {
        type: mongoose.Schema.Types.ObjectId,
        ref : "User",
        default : null,
    },
    updated_by : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        default: null,
    }
});

const AuthToken = mongoose.model("AuthToken", authTokenScheme);

export { AuthToken, authTokenScheme };