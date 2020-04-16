import mongoose from 'mongoose';

const EventScheme = mongoose.Schema({
    id: {
        type: String,
        unique: true,
    },
    type: String,
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    repo: {
        id: String,
        name: String,
    },
    payload: {
        push_id: Number,
        size: Number,
        distinct_size: Number,
        ref: String,
        commits: [{
            sha: String,
            author: {
                email: String,
                name: String,
            },
            message: String,
            distinct: Boolean,
        }]
    },
    public: Boolean,
    created_at: Date,
});

const Event = mongoose.model("Event" , EventScheme);

export { Event, EventScheme };