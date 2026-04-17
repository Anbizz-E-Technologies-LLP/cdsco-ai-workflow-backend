const { getIO } = require('../socket')

 exports.sendNotification = (userId, payload) => {
  try {
    const io = getIO()
    io.to(userId.toString()).emit('notification', payload)
   } catch (err) {
    
  }
}