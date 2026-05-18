// Dòng này PHẢI NẰM ĐẦU TIÊN (trước cả khi import db, app hay routes)
require('dotenv').config(); 

const express = require('express');
const connectDB = require('./config/db'); // Nếu file db.js gọi MONGODB_URI thì dotenv phải load trước nó

const app = express();
connectDB(); // Lúc này Mongoose mới nhận được chuỗi URI