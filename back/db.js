const { MongoClient } = require('mongodb');

const url = 'mongodb://0.0.0.0:27017/';
const client = new MongoClient(url);

const dbName = 'mms';

let db;

async function main() {
  // Use connect method to connect to the server
    await client.connect();
    console.log('Connected successfully to server');
    db = client.db(dbName);

}

main()
  .then()
  .catch(console.error);

function getDb() {
    return db;
}

module.exports = getDb;