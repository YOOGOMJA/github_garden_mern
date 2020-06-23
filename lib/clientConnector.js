import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const env = process.env.NODE_ENV || "development";

const getClient = (callback)=>{
    if(env === "production") {
        callback(env);
        return (req, res)=>{  
            res.sendFile(path.resolve(__dirname, "client", "index.html"));
        }
    }
    else{
        callback(env);
        return createProxyMiddleware({
            target : "http://localhost:3000",
            changeOrigin : true,
            ws : true,
        })
    }
}

export { getClient } ;
