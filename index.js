import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import express from 'express';
import { MongoClient } from 'mongodb';
import os from 'os';
import { publicIpv4 } from 'public-ip';

/* ------------------ __dirname fix for ESM ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ------------------ MongoDB ------------------ */
const mongoUrl = 'mongodb://mongo:27017/mydatabase';
const client = new MongoClient(mongoUrl);

let collection;

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log('Connected to MongoDB server');

    const db = client.db('mydatabase');
    collection = db.collection('mycollection');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connectToMongoDB();

/* ------------------ Express App ------------------ */
const app = express();
const PORT = process.env.PORT || 5000;

/* Middleware */
app.use(express.json());
app.use(express.static(__dirname)); // serve index.html & static assets

/* Home route */
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

/* Insert data */
app.post('/insertData', async (req, res) => {
  try {
    const data = req.body;

    const existingData = await collection.findOne({ email: data.email });
    if (existingData) {
      return res.status(400).send('Email already exists');
    }

    await collection.insertOne(data);
    res.status(200).send('Added successfully');
  } catch (error) {
    res.status(500).send('Insert error');
  }
});

/* Fetch data */
app.get('/fetchData', async (req, res) => {
  const data = await collection
    .find({})
    .limit(12)
    .sort({ _id: -1 })
    .toArray();

  res.json(data);
});

/* Host info */
app.get('/hostinfo', async (req, res) => {
  const hostname = os.hostname();
  const interfaces = os.networkInterfaces();

  let privateIp = '';
  for (const iface of Object.values(interfaces)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) {
        privateIp = net.address;
        break;
      }
    }
    if (privateIp) break;
  }

  const publicIpAddress = await publicIpv4();

  res.json({
    hostname,
    privateIp,
    publicIpAddress
  });
});

/* Start server */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
