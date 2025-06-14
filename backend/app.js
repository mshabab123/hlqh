// app.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./routes/users');
const schoolRoutes = require('./routes/schools');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/schools', schoolRoutes);

app.get('/', (req, res) => {
  res.send('School API is running');
});

module.exports = app;
