import mongoose from 'mongoose';

const JoinRequestScheme = mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    },
    challenge : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Challenge"
    },
    is_accepted : {
        type : Boolean,
        default : false
    },
    is_expired : {
        type : Boolean,
        default : false
    },
    created_at : Date,
    updated_at : Date,
    updated_by : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    }
});

const JoinRequest = mongoose.model("JoinRequest", JoinRequestScheme);

export { JoinRequest, JoinRequestScheme };