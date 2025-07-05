const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Test API is running without database' });
});

app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

app.listen(PORT, () => {
  console.log(`Test API Server is running on http://localhost:${PORT}`);
  console.log(`Try accessing: http://localhost:${PORT}/health`);
});