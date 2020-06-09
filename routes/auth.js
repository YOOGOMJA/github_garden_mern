import express from 'express';
import passport from 'passport';
import * as Models from '../db/models';
const router = express.Router();

router.get("/" , passport.authenticate("github" , {
    scope : [ "user:email" ]
}));

router.get("/callback" , passport.authenticate("github", {
    failureRedirect : './fail'
}), 
    (req, res)=>{
        res.redirect("/");
    }
);

router.get("/logout" , (req, res)=>{
    if(req.isAuthenticated()){
        req.logout();
        res.redirect("/");
    }
    else{
        res.redirect("/");
    }
});

export default router;
