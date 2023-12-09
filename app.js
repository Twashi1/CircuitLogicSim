const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

app.use(express.static("client"));
app.use(express.urlencoded());
// https://stackoverflow.com/questions/45032412/sending-data-from-javascript-html-page-to-express-nodejs-server
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.post('/saveCircuit', (req, resp) => {
  let fileName = req.body["name"];
  let fileData = req.body["data"];

  // TODO: seems like a great way to destroy my machine
  fs.writeFileSync(`${fileName}.json`, JSON.stringify(fileData));
});

app.get("/circuit", (req, resp) => {
  // https://blog.logrocket.com/reading-writing-json-files-node-js-complete-tutorial/
  const data = fs.readFileSync("./circuit.json");
  
  resp.send(data);
});

const port = 8090;

app.listen(port, () => {
    console.log(`Started on port ${port}`)
})