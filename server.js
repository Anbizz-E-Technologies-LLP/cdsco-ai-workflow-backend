// server.js
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()
const documentRoutes = require('./routes/documentRoute')

const app = express()

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  const timestamp = new Date().toISOString()

  console.log(`\n📨 [${timestamp}] ${req.method} ${req.originalUrl}`)
  console.log(`   Origin  : ${req.headers.origin || '(no origin)'}`)
  console.log(`   IP      : ${req.ip}`)
  if (req.method === 'POST' || req.method === 'PUT') {
    console.log(`   Content : ${req.headers['content-type'] || '(none)'}`)
  }

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start
    const emoji = res.statusCode < 300 ? '✅' : res.statusCode < 500 ? '⚠️' : '❌'
    console.log(`   ${emoji} Response: ${res.statusCode} — ${duration}ms`)
  })

  next()
})

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://green-cliff-031808a1e2.azurestaticapps.net',
  process.env.CLIENT_URL,
].filter(Boolean)

console.log('\n🌐 Allowed CORS origins:')
allowedOrigins.forEach(o => console.log(`   • ${o}`))

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      // Postman / curl / server-to-server — allow
      return callback(null, true)
    }
    if (allowedOrigins.includes(origin)) {
      console.log(`   ✅ CORS allowed: ${origin}`)
      return callback(null, true)
    }
    console.warn(`   🚫 CORS blocked: ${origin}`)
    return callback(new Error(`CORS blocked for origin: ${origin}`))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ⚠️ Must be after cors() — handles preflight for file uploads
app.options('/{*path}', cors())

app.use(express.json())

// ─── MongoDB ──────────────────────────────────────────────────────────────────
console.log('\n🔌 Connecting to MongoDB...')
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message)
    process.exit(1)
  })

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'))
mongoose.connection.on('reconnected', () => console.log('🔄 MongoDB reconnected'))

app.get('/', (req, res) => {
  console.log('   🚀 Root endpoint hit')
  res.send('Welcome to the Document Management API')
})
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/documents', documentRoutes)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env: process.env.NODE_ENV || 'development',
    allowedOrigins,
  })
})

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.warn(`   ⚠️  404 — Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` })
})

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`\n❌ Unhandled error on ${req.method} ${req.originalUrl}`)
  console.error(`   Message : ${err.message}`)
  console.error(`   Stack   : ${err.stack}`)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`)
  console.log(`   Health : http://localhost:${PORT}/api/health`)
  console.log(`   Env    : ${process.env.NODE_ENV || 'development'}\n`)
})