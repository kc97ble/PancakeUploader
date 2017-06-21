"use strict"
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const nedb = require("nedb");

const app = express();
const upload = multer({ dest: __dirname + "/files/" });

app.set("views", __dirname + "/views");
app.set('view engine', 'pug');

const db = new nedb({ 
    filename: __dirname + "/pancake.db", 
    autoload: true,
});

app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", function (req, res) {
    res.render("default");
});

function getShortName() { // FIXME
    let x = Math.floor(Math.random()*100000000);
    return ("00000000" + x).slice(-8);
}

// filename, originalname, datecreated, size

app.post("/upload", upload.single("file"), function (req, res) {
    let doc = {
        filename: req.file.filename,
        shortname: getShortName(),
        originalname: req.file.originalname,
        datecreated: new Date(),
        size: req.file.size,
    };
    db.insert(doc);
    //db.find({}, function (err, docs){ console.log(docs); } );
    let baselink = req.protocol + "://" + req.get("host");
    res.render("upload", {
        link: baselink + "/file/" + doc.filename,
        shortlink: baselink + "/" + doc.shortname,
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
            res.download(__dirname + "/files/" + docs[0].filename,
                docs[0].originalname);
    });
});

const server = app.listen(8081, function () {
   const host = server.address().address
   const port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});
