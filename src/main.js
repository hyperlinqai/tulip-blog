const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { prisma } = require('./db');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const categoriesRoutes = require('./routes/categories');
const tagsRoutes = require('./routes/tags');

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({
    message: 'Blog CMS API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1',
      auth: '/api/v1/auth',
      posts: '/api/v1/posts',
      categories: '/api/v1/categories',
      tags: '/api/v1/tags'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Blog CMS API is running' });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postsRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/tags', tagsRoutes);

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`API Server is running on http://localhost:${PORT}`);
});

module.exports = { app };