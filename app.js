//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const pLM = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
//const encrypt = require("mongoose-encryption");
//const md5 = require('md5');
//const bcrypt = require("bcrypt");
//const saltrounds = 10;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: 'our little secret',
  resave: false,
  saveUninitialized: true,
  //cookie: { secure: true }
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewurlParser: true
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId:String,
  secret:String
});
   userSchema.plugin(pLM);
   userSchema.plugin(findOrCreate);
//userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields: ["password"] });
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

module.exports = mongoose.model('User', userSchema);

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, username: user.username });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
   callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/", function(req, res) {
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
      res.render('submit');
  }else{
       res.redirect('/login');
  }
})
app.get('/secrets',function(req,res){
    User.find({"secret":{$ne:null}},function(err,foundUsers){
         if(err){
            console.log(err);
         }else{
               if(foundUsers){
                   res.render("secrets",{userWithSecrets:foundUsers});
               }
         }
    })
});
app.get('/logout',function(req,res){
    req.logout(function(err){
      if(err) {console.log(err);}
      else res.redirect("/");
    })

});
app.post("/register", function(req, res) {
     User.register(
       {username:req.body.username},
        req.body.password, function(err,user){
       if(err){
         console.log(err);
         res.redirect('/register');
       } else{
         passport.authenticate("local")(req, res,function(){
            res.redirect('/secrets');
         });
       }
     });
//  bcrypt.hash(req.body.password, saltrounds, function(err, hash) {
    // Store hash in your password DB.
  //  const newuser = new User({
  //    email: req.body.username,
  //    password: hash /*md5(req.body.password)*/
  //  });
  //  newuser.save(function(err) {
  //    if (!err)
  //      res.render("secrets");
  //  });

//  });
});
app.post("/login", function(req, res){
     const user = new User ({
         username:req.body.username,
         password:req.body.password
     });
     req.login(user,function(err){
         if(err) console.log(err);
         else{
           passport.authenticate('local')(req,res,function(){
              res.redirect('/secrets');
           });
     }
   })
  //const user = req.body.username;
  //const password = req.body.password ;/*md5(req.body.password);*/
  //User.findOne({
//    email: user
//  }, function(err, founduser) {
  //  if (err)
  //    console.log(err);
  //  else if (founduser) {
    //  bcrypt.compare(password, founduser.password, function(err, result) {
        // result == true
    //    if (result === true) {
    //      res.render("secrets");
    //    }
    //  });
  //  }
//  });
});
app.post("/submit",function(req,res){
   const secretofuser = req.body.secret;
   User.findById(req.user.id,function(err,foundUser){
     if(err) console.log(err);
     else{
          if(foundUser){
            foundUser.secret = secretofuser;
            foundUser.save(function(){
                 res.redirect("/secrets");
            });
          }
     }
   });
})



app.listen(3000, function() {
  console.log("server started on port 3000");
})
