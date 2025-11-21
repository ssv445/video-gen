const express = require('express');
const cors = require('cors');
const path = require('path');
const generateRouter = require('./routes/generate');
const youtubeRouter = require('./routes/youtube');

const app = express();
const PORT = process.env.PORT || 3032;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', generateRouter);
app.use('/api/youtube', youtubeRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Parody Song Generator API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend API server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
});
