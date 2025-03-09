const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');

dotenv.config();
const app = express();

const port = process.env.PORT || 3000;
const DB_URI = process.env.MONGO_URI;

try {
 mongoose.connect(DB_URI);
 console.log('Connected to the database');
}
catch (error){
    console.log(error);
}

app.listen(port, () => {
  console.log(`Course selling app listening on port ${port}`)
})