require('dotenv').config()
var fs = require('fs');

// Console Color
[
  ['warn', '\x1b[35m'],
  ['error', '\x1b[31m'],
  ['log', '\x1b[2m']
].forEach(function (pair) {
  var method = pair[0], reset = '\x1b[0m', color = '\x1b[36m' + pair[1];
  console[method] = console[method].bind(console, color, method.toUpperCase(), reset);
});


const express = require("express");
const bodyParser = require("body-parser");
var http = require('http');
var https = require('https');
var crypto = require('crypto');
const axios = require("axios");
const path = require("path");

var store = require("./store");
const app = express();
app.use(express.static("front"));
var token = [];
var tdate = [];

app.use(bodyParser.json({ limit: "10mb" }));
app.use(function (error, req, res, next) {
  if (error) {
    res.sendStatus(500).send("Something broke!");
    res.end();
  } else {
    next();
  }
});
app.use(
  bodyParser.urlencoded({
    limit: "10mb",
    extended: true,
  })
);

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  next();
});

app.post('/login', function (req, res) {
  console.log('/login');
  if (req.body.pswrd.toString() == process.env.PSWRD.toString()) {
    var nt = crypto.randomBytes(16).toString('hex');
    token.push(nt);
    tdate.push(Date.now());
    console.log('Auth succes. nb: ' + token.length + ' token:' + nt);
    res.send({ 'token': nt });
    if (!process.env.MAX_TOKEN) {
      return;
    }
    if (token.length > process.env.MAX_TOKEN) {
      console.warn('Max token, rm older');
      token.shift();
      tdate.shift();
    }
    return;
  }

  console.log('Auth fail');
  res.send({ 'error': 'Refused' });
});


function verify(tok) {
  var i = token.indexOf(tok);
  if (i > -1) {
    if (!process.env.TOKEN_TIMEOUT) {
      return true;
    }
    if (tdate[i] + process.env.TOKEN_TIMEOUT > Date.now()) {
      return true;
    } else {
      console.warn('expired token, rm');
      token.splice(i, 1)
      tdate.splice(i, 1);
    }
  }
  return false;
}


app.post('/getall', function (req, res) {
  console.log('/getall');
  if (!verify(req.body.token)) {
    res.send({ 'error': 'Refused' });
    return;
  }
  res.json(store);
});


// HTTP / HTTPS
var server = http.createServer(app);
if (process.env.HTTPS == 'true') {
  var options = {
    key: fs.readFileSync(''),
    cert: fs.readFileSync(''),
    ca: fs.readFileSync('')
  };
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
  console.warn('Empty https config');
}

server.listen(process.env.PORT, function () {
  console.log('Listening on port ' + process.env.PORT + ' !');
});
