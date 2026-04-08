const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
require('dotenv').config()

const documentRoutes = require('./routes/documentRoute')
const authRoutes = require('./routes/addUserRoute')

const app = express()

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ MongoDB OK'))

app.get('/', (req, res) => res.send('Welcome to the Document Management API'))
app.use('/api/documents', documentRoutes)
app.use('/api/users', authRoutes)

app.listen(5000, () => console.log('🚀 Server: http://localhost:5000'))