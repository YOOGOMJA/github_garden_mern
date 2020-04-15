import mongoose from 'mongoose';

mongoose.connect("mongodb://localhost:27017/test" , {
    useNewUrlParser: true,
    useFindAndModify: false,
});

const db = mongoose.connection;

const fn = {
    open : () =>{
        console.log("connected to db");        
    },
    error : err=>{
        console.log("ERROR OCCURRED ! ${err}" , err);
    }
}
db.once("open" , fn.open);
db.on("error" , fn.error);