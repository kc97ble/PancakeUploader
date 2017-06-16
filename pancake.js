"use strict"
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const nedb = require('nedb');

const app = express();
const upload = multer({ dest: __dirname + '/files/' });

const db = new nedb({ 
    filename: __dirname + '/pancake.db', 
    autoload: true,
});

app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/static/default.htm');
});

// filename, originalname, datecreated, size

app.post('/upload', upload.single('file'), function (req, res) {
    let doc = {
        filename: req.file.filename,
        originalname: req.file.originalname,
        datecreated: new Date(),
        size: req.file.size,
    };
    db.insert(doc);
    //db.find({}, function (err, docs){ console.log(docs); } );
    res.end("localhost:8081/file/" + doc.filename);
});

app.get('/file/:filename', function (req, res) {
    db.find({ filename: req.params.filename }, function (err, docs){
        if (docs.length==0)
            res.status(404).end();
        else
            res.download(__dirname + '/files/' + req.params.filename,
                docs[0].originalname);
    });
});

const server = app.listen(8081, function () {
   const host = server.address().address
   const port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
});
