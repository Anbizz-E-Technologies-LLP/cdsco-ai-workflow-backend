const { Server } = require('socket.io')

let io

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log('🔌 Socket connected:', socket.id)

    socket.on('register', (userId) => {
      // ✅ null/undefined check
      if (!userId) {
        console.warn('⚠️ register event received but userId is null/undefined')
        return
      }
      socket.join(userId.toString())
      console.log(`✅ User ${userId} joined room`)
    })

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected:', socket.id)
    })
  })

  return io
}

const getIO = () => {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}

module.exports = { initSocket, getIO }