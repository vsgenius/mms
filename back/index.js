const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('node:path'); 

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const getDb = require('./db');

app.use(cors());
app.use(bodyParser.json());
app.use('/audio',express.static('audio'));

let usersOnline = new Set();
const usersTyping = new Set();

function checkToken(token) {}
function getUserByToken(token) {}


app.post('/register', async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;
  if (!login || !password) {
    res.json({ error: 'no correct login or password' });
    return;
  }
  const db = getDb();
  const users = await db.collection('user').find({ login: login }).toArray();
  if (users.length) {
    res.json({ status: 'user with login already exist' });
    return;
  }
  const result = await db
    .collection('user')
    .insertOne({ login: login, password: password });
  res.json({
    _id: result.insertedId,
  });
});
app.post('/login', async (req, res) => {
  const login = req.body.login;
  const password = req.body.password;
  const db = getDb();
  const user = await db.collection('user').find({ login }).toArray();
  if (!user.length) {
    res.json({ error: 'login not correct' });
    return;
  }
  if (user[0].password !== password) {
    res.json({ error: 'password not correct' });
    return;
  }
  const token = uuidv4();
  const result = await db
    .collection('token')
    .insertOne({ user_id: user[0]._id, token });
  if (!result.insertedId) {
    res.json({ error: 'error create token' });
    return;
  }
  res.json({ token, user: user[0] });
});
app.post('/chats', async (req, res) => {
  const token = req.body.token;

  const db = getDb();
  const result = await db.collection('token').find({ token }).toArray();
  if (!result.length) {
    res.json({ error: 'token not correct' });
    return;
  }
  const chats = await db.collection('chat').find({}).toArray();
  res.json(chats);
});
app.post('/newchat', async (req, res) => {
  const token = req.body.token;
  const name = req.body.name;
  const db = getDb();
  const result = await db.collection('token').find({ token }).toArray();
  if (!result.length) {
    res.json({ error: 'token not correct' });
    return;
  }
  const response = await db.collection('chat').insertOne({ name });
  res.json(response);
});

wss.on('connection', async function connection(ws) {
  ws.on('error', console.error);
  let user_id, chat_id, login;
  ws.on('message', async function message(data, isBinary) {
    const db = getDb()
    if (isBinary && user_id && chat_id) {
      const fileId = uuidv4() + '.webm';
      const filename = path.join(process.cwd(),'audio',fileId);
      const fileUrl = '/audio/' + fileId;
      fs.writeFile(filename, Buffer.from(data),()=>{
      });
      const date = Date.now();
      const response = await db.collection('message').insertOne({type:'audio',message:{
        chat_id:chat_id,
        user_id:user_id,
        login,
        date,
        text:'audio',
        audio:fileUrl}});
      for (const client of wss.clients) {
        client.send(JSON.stringify({type:'audio',message:{
          chat_id:chat_id,
          user_id:user_id,
          login,
          date,
          text:'audio',
          audio:fileUrl}}));
      }
      user_id = undefined;
      chat_id = undefined;
      login = undefined;
      return;
    }
    else if (isBinary) {
      console.log('only binary')
      return;
    }
    if (!data.toString()) {
      ws.send(JSON.stringify({ error: 'message not correct' }));
      return;
    }
    const message = JSON.parse(data.toString());

    const user = await db
      .collection('token')
      .find({ token: message.token })
      .toArray();
    if (!user.length) {
      ws.send(JSON.stringify({ error: 'token not correct' }));
      ws.close();
      return;
    }
    if (message.type === 'audio') {
      user_id = message.message.user_id;
      chat_id = message.message.chat_id;
      login = message.message.login;
      return;
    }
    if (message.type === 'chats') {
      const chats = await db.collection('chat').find({}).toArray();
      ws.send(JSON.stringify({ type: 'chats', message: chats }));
      return;
    }
    if (message.type === 'chat-messages') {
      const messages = await db
        .collection('message')
        .find({ 'message.chat_id': message.message.chat_id })
        .toArray();
      ws.send(JSON.stringify({ type: 'chat-messages', message: messages }));
      return;
    }
    if (message.type === 'message') {
      // console.log(message);
      db.collection('message').insertOne(message);
      for (const client of wss.clients) {
        // console.log('clients')
        client.send(JSON.stringify(message));
      }
      return;
    }
    if (message.type === 'typing') {
      if (message.message.text === 'start-typing') {
        usersTyping.add(message.message.user_id);
      } else {
        usersTyping.delete(message.message.user_id);
      }
      for (const client of wss.clients) {
        // console.log(message)
        client.send(
          JSON.stringify({
            type: 'typing',
            message: {
              typing: Array.from(usersTyping),
              chat_id: message.message.chat_id,
            },
          })
        );
      }
      return;
    }
  });
});



server.listen(3000, () => {
  console.log('server ok');
});
