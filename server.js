// server.js
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()
const documentRoutes = require('./routes/documentRoute')

// Initialize app
const app = express()

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}))
app.use(express.json())

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1) // Exit if DB connection fails
  })

// Routes
app.use('/api/documents', documentRoutes)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
})
