import github from './strategies/github';
import * as Models from '../models';

export default _passport=>{
    _passport.use(github);
    
    _passport.serializeUser(Models.User.serializeUser());
    _passport.deserializeUser(Models.User.deserializeUser());
    return _passport;
}