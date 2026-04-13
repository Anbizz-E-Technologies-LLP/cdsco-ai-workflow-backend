const express = require('express')
const http = require('http')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const { initSocket } = require('./socket')
const documentRoutes = require('./routes/documentRoute')
const authRoutes = require('./routes/addUserRoute')

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err))

app.get('/', (req, res) => res.send('Welcome to the Document Management API'))
app.use('/api/documents', documentRoutes)
app.use('/api/users', authRoutes)

 const httpServer = http.createServer(app)

initSocket(httpServer)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})