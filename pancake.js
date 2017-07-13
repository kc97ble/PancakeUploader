"use strict"
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const nedb = require("nedb");

const app = express();
const upload = multer({ dest: __dirname + "/files/" });

app.set("views", __dirname + "/views");
app.set('view engine', 'pug');
app.use(express.static(__dirname + "/static/"))

const db = new nedb({ 
    filename: __dirname + "/pancake.db", 
    autoload: true,
});

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", function (req, res) {
    res.render("default");
});

const baseShortNameList = ["sheep", "cat", "dog", "camel", "bear",
    "cow", "horse", "pig", "giraffe", "goose", "cock", "hen", "fox",
    "wolf", "elk", "mouse", "frog", "ant", "owl", "deer", "turtle",
    "bee", "worm", "monkey", "rabbit", "hippo", "fly"];

function randrange(n) {
    return Math.floor(Math.random() * n);
}

function getShortName() {
    
    function db_count(obj) {
        let result = 0;
        db.count(obj, function (err, count) {
            if (err) throw err;
            result = count;
        });
        return result;
    }
    
    let avg = Math.floor(db_count({}) / baseShortNameList.length);
    for (;;) {
        let x = baseShortNameList[randrange(baseShortNameList.length)];
        let y = (randrange((avg+1)*100)).toString();
        if (db_count({ shortname: x+y }) == 0)
            return x+y;
    }
}

// filename, originalname, datecreated, size

app.post("/upload", upload.array("file"), function (req, res) {
    const shortname = getShortName();
    const datecreated = new Date();
    
    for (const file of req.files) {
        db.insert({
            filename: file.filename,
            shortname: shortname,
            originalname: file.originalname,
            datecreated: datecreated,
            size: file.size,
        });
    }
    
    db.find({}, function(err, docs) {
        console.log(docs);
    });
    
    let baselink = req.protocol + "://" + req.get("host");
    res.render("upload", {
        //link: baselink + "/file/" + doc.filename,
        shortlink: baselink + "/" + shortname,
    });
    res.end( );
});

app.get("/file/:filename", function (req, res) {
    db.find({ filename: req.params.filename }, function (err, docs){
        if (docs.length==0)
            res.status(404).end();
        else
            res.download(__dirname + "/files/" + docs[0].filename,
                docs[0].originalname);
    });
});

app.get("/:shortname", function (req, res) {
    db.find({ shortname: req.params.shortname }, function (err, docs){
        if (docs.length==0)
            res.status(404).end();
        else
            res.render("download", {files: docs});
    });
});

const server = app.listen(8081, function () {
   const host = server.address().address
   const port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});
