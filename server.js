const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const documentRoutes = require('./routes/documentRoute')

const app = express()

app.use((req, res, next) => {
  const blockedPaths = ['.env', '.git', 'wp-admin', 'phpmyadmin']

  if (blockedPaths.some(p => req.url.includes(p))) {
    console.warn(`🚫 Blocked: ${req.method} ${req.url}`)
    return res.status(403).send('Forbidden')
  }

  next()
})

app.use((req, res, next) => {
  const start = Date.now()

  if (req.url.includes('.env')) return next()

  console.log(`\n📨 ${req.method} ${req.originalUrl}`)
  console.log(`   Origin: ${req.headers.origin || 'N/A'}`)

  res.on('finish', () => {
    const time = Date.now() - start
    console.log(`   ✅ ${res.statusCode} — ${time}ms`)
  })

  next()
})

const allowedOrigins = [
  'http://localhost:5173',
  'https://cdsco-ai-workflow.anbizz.com',
  process.env.CLIENT_URL,
].filter(Boolean)

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true) 

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    } else {
      console.warn(`🚫 CORS blocked: ${origin}`)
      return callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.options('*', cors())
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Error:', err.message)
    process.exit(1)
  })

app.get('/', (req, res) => {
  res.send('API is running...')
})

app.use('/api/documents', documentRoutes)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  })
})

app.use((req, res) => {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  })
})

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message)
  res.status(500).json({
    error: err.message || 'Internal Server Error',
  })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`)
})