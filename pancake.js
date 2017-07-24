"use strict";

// Pancake Uploader
//
// URLs:
// "/": home page
// "/:shortname": show a folder
// "/download/:filename": download a file
// "upload": upload files

const Promise = require("bluebird");
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const nedb = require("nedb");
const app = express();
const upload = multer({ dest: __dirname + "/uploaded/" });

app.set("views", __dirname + "/views");
//app.set("views", __dirname + "/views_minimal");
app.set("view engine", "pug");

app.use((req, res, next) =>{
    if (req.socket.localPort == 8082)
        app.set("views", __dirname + "/views_minimal");
    else
        app.set("views", __dirname + "/views");
    next();
});

app.use(express.static(__dirname + "/static/"));

const db = Promise.promisifyAll(new nedb({
    filename: __dirname + "/pancake.db",
    autoload: true,
}));

app.use(bodyParser.urlencoded({ extended: false }));

/// IMPLEMENTATION ///

const prefixList = ["sheep", "cat", "dog", "camel", "bear",
    "cow", "horse", "pig", "giraffe", "goose", "cock", "hen", "fox",
    "wolf", "elk", "mouse", "frog", "ant", "owl", "deer", "turtle",
    "bee", "worm", "monkey", "rabbit", "hippo", "fly"];

function baselink(req) {
    return req.protocol + "://" + req.get("host");
}

function randrange(n) {
    return Math.floor(Math.random() * n);
}

function choice(arr) {
    return arr[randrange(arr.length)];
}

function encodedoc(fn, sn, on, dc, sz) {
    return {
        filename: fn,
        shortname: sn,
        originalname: on,
        datecreated: dc,
        size: sz,
    };
}

function getShortName(next) {
    db.count({}, function (err, count) {
        if (err) { next(err, null); return; }
        let avg = Math.floor(count / prefixList.length);
        let result;
        
        function attempt(err, count) {
            if (err) { next(err, null); return; }
            if (!count) { next(null, result); return; }
            result = choice(prefixList) + randrange((avg+1)*100);
            db.count({ shortname: result }, attempt);
        }
        attempt(null, -1);
    });
}

const getShortNameAsync = Promise.promisify(getShortName);

app.get("/", (req, res) => res.render("home"));

app.post("/upload", upload.array("file"), (req, res) => {
    let shortname;
    getShortNameAsync()
    .then((_shortname) => {
        shortname = _shortname;
        const datecreated = new Date();
        const promises = [];
        for (const file of req.files) {
            const doc = encodedoc(file.filename, shortname,
                file.originalname, datecreated, file.size);
            const promise = db.insertAsync(doc);
            promises.push(promise);
        }
        return Promise.all(promises);
    })
//    .then(() => db.findAsync({}))
//    .then(docs => console.log(docs))
    .then(() => res.render("upload", 
        { shortlink: baselink(req) + "/" + shortname }))
    .catch((err) => console.error(err));
});

app.get("/download/:filename", function (req, res) {
    db.findAsync({ filename: req.params.filename })
    .then((docs) => {
        if (docs.length==0)
            return res.status(404).sendfile(__dirname + "/static/not_found.htm");
        res.download(__dirname + "/uploaded/" + docs[0].filename, 
            docs[0].originalname);
    });
});

app.get("/:shortname", function (req, res) {
    db.findAsync({ shortname: req.params.shortname })
    .then((docs) => {
        if (docs.length==0)
            return res.status(404).sendFile(__dirname + "/static/not_found.htm");
        res.render("open", {files: docs});
    });
});

const server = app.listen(8081, () => {
    const host = server.address().address;
    const port = server.address().port;
    console.log("Pancake Uploader is listening at " + 
        "http://%s:%s", host, port);
});

const server8082 = app.listen(8082, () => {
    const host = server8082.address().address;
    const port = server8082.address().port;
    console.log("Pancake Uploader is also listening at " + 
        "http://%s:%s", host, port);
});
