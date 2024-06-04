import express from "express";
import bodyParser from "body-parser";
import { dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import env from "dotenv";
import passport from "passport";
import Strategy from "passport-local";
import session from "express-session";
import GoogleStrategy from "passport-google-oauth2";


const __dirname = dirname(fileURLToPath(import.meta.url));

const app=express();
var auth=false;
env.config();

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set('view engine', 'ejs');
app.set('views', './views');
const db=new pg.Client(
    {
        user:"postgres",
        password:"Manoj@3645",
        host:"localhost",
        database:"postgres",
        port:5432,
    }
);
db.connect();

async function checkUserExists(username,password){
    console.log("Checking checkUserExists()");
    var flag=false;
    var query_prep={text:'select count(1)count from "Users" where username=$1 and password=$2',values:[username,password]};
    console.log(query_prep);
    const res=await db.query(query_prep);
    flag=res.rows[0]["count"] >0 ?true :false;
    console.log(flag);
    return flag;
}

async function authenticateUser(req,res,next){
    console.log("inside middlware");
   
    var username=req.body['username'];
    var password=req.body['password'];
    auth=await checkUserExists(username,password);
    console.log("inside middlware -value");
    console.log(auth);
    next();
};



app.get("/",(req,res)=>{
    console.log("/ end point");
    // const failedLogin = req.query.failed === 'true';
    // console.log(failedLogin);
    res.render('login');
});

app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
      successRedirect: "/auth/google/dashboard",
        failureRedirect: "/login",
    })
);  

app.get("/auth/google/dashboard",(req,res)=>{
    res.render('dashboard');
});

app.post("/login",authenticateUser,(req,res)=>{
    console.log("/login end point");
    console.log(auth);
    if (auth === true){
        res.redirect('/auth/google/dashboard');
    }
    else{
        res.redirect('/');
    }
});

app.post(
    "/login",
    passport.authenticate("google", {
      successRedirect: "/secrets",
      failureRedirect: "/login",
    })
  );
  
app.post("/register",(req,res)=>{
    console.log("Inside /register");
});

app.get("/register",(req,res)=>{
    res.render('register');
});

passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          console.log(profile);
          const result = await db.query('SELECT * FROM "Users" WHERE username = $1', [
            profile.email,
          ]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              'INSERT INTO "Users" (username, password) VALUES ($1, $2)',
              [profile.email, "google"]
            );
            return cb(null, newUser.rows[0]);
          } else {
            return cb(null, result.rows[0]);
          }
        } catch (err) {
          return cb(err);
        }
      }
    )
  );

app.get("/healthcheck",(req,res)=>{
    console.log("App is running..!");
    res.sendStatus(200);
});

passport.serializeUser((user, cb) => {
    cb(null, user);
});
  
passport.deserializeUser((user, cb) => {
    cb(null, user);
});

app.listen(3000,()=>{
console.log("App is running on port 3000");
});
