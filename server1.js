const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { MemoryStore } = require("express-session");
const app = express();
const mongoUri = "mongodb+srv://coleraffell:LiverpoolFc13@cluster0.xe1mxga.mongodb.net/?retryWrites=true&w=majority";
const mongoDBSession = require("connect-mongodb-session")(session);
const userModel = require("./models/user");
const userPosts = require("./models/post");
var rsa = require("node-rsa");
var path = require('path');


console.log("\n--------------------------");

mongoose.set('strictQuery', true);

async function connect() {
    try {
        await mongoose.connect(mongoUri);
        console.log("\nConnected to MongoDB");
    } catch (error) {
        console.log(error);
    }
}


connect();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json()) // for parsing application/json
app.use(express.static(path.join(__dirname, 'stylesheets')));

const store = new mongoDBSession({
    uri: mongoUri,
    collection: 'mySessions',
});

app.use(session({
    secret: 'Key that signs cookie',
    resave: false, 
    saveUninitialized: true, // if true: gives cookie upon visiting site and then authenticates it after whereas false waits
    store: store,
}));

const isAuthenticated = (req, res, next) => {

    if (req.session.isAuth) {
        next();
    } else {
        res.redirect('/login');
    }
};

function generateKeys() {

    const key = new rsa({ b: 1024 });

    var publicKey = key.exportKey('public');
    var privateKey = key.exportKey('private');

    return { publicKey, privateKey };
};

// Public key has to be constant 
app.get("/", (req, res) => {

    //res.render("landing");
    res.redirect("\login");
    console.log("\nSession ID: " + req.session.id);    
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
        console.log("\nUser not found");
        return res.redirect('/login');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        console.log("\nWrong password")
        return res.redirect('/login');
    }

    console.log("\nUsername: " + user.username + " logged in");
    req.session.email = email;
    req.session.username = user.username;
    //req.session.isAuth = true;

    // ----------- KEYS -----------

    // Generate Keys is a must when joining server
    let keys = generateKeys();
    let pubKey = keys.publicKey,
        privKey = keys.privateKey;

    req.session.publicKey = pubKey;
    req.session.privateKey = privKey;

    let key_private = new rsa(req.session.privateKey);
    req.session.encryptedSession = key_private.encryptPrivate(req.session.id);

    //console.log("\n" + privKey);

    res.redirect('home');
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => { 
    const { username, email, password } = req.body;
    let user = await userModel.findOne({ email });

    if (user) {
        return res.redirect('/register');
    } else { 
        const hashedPassword = await bcrypt.hash(password, 12);

        /*
        let keys = generateKeys();
        let pubKey = keys.publicKey,
            privKey = keys.privateKey;
        */
        
        user = new userModel({
            username,
            email,
            password: hashedPassword,
            //publicKey: pubKey,
            //privateKey: privKey,
        });

        await user.save();
        console.log("\nNew user created: " + username);
        res.redirect("/login");
    }
});

app.get("/keys", (req, res) => {

    res.render('keys');
    console.log("\nPrivate Key: " + req.session.privateKey);
    console.log("\nEncrypted cookie: " + req.session.encryptedSession);
});

app.post("/keys", async (req, res) => {

    const { sessionToken, privateKey } = req.body;

    var authenticated = false;
    
    let key_public = new rsa(req.session.publicKey);

    try {
        //let key_private = new rsa(req.session.privateKey);
        let key_private = new rsa(privateKey);
        req.session.encryptedSession = key_private.encryptPrivate(req.session.id);
        authenticated = true;
    } catch (err) {
        console.log("Error with your private key");
        authenticated = false;
    }

    if (authenticated) {
        req.session.decryptedSession = key_public.decryptPublic(req.session.encryptedSession);
        console.log("\nDecrypted successfully: " + req.session.decryptedSession);
        req.session.isAuth = true;
        req.session.enterKey = true;
        res.redirect('home');
    } else {
        console.log("\nYou are not the owner of this session cookie..")
        // Error upon any wrong cookie decryption is sign out
        req.session.isAuth = false;
        res.redirect('login');
    }
});

app.get("/home", isAuthenticated, (req, res) => {

    userPosts.find({}, function (err, posts) {
        res.render('home', {
            username: req.session.username,
            postList: posts
        });
    }).sort({ _id: -1 });

    /*
    if (req.session.enterKey) {
        userPosts.find({}, function (err, posts) {
            res.render('home', {
                username: req.session.username,
                postList: posts
            });
        }).sort({ _id: -1 });
    } else {
        res.redirect('keys');
    } 
    req.session.enterKey = false;
    */
});

app.post("/home", async (req, res) => {

    const { name, post } = req.body;

    userPost = new userPosts({
        name: req.session.username,
        post,
    });

    await userPost.save();
    console.log("\nNew post created: \n\n" + name + "\n" + post);
    res.redirect("/home");
});


app.get("/dashboard", isAuthenticated, (req, res) => {

    res.redirect('keys');
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect("/");
    })
});

app.listen(8080, console.log("\nServer running on localhost:8080"));