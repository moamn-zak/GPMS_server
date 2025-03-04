let io;

module.exports = {
  init: httpServer => {

    io = require('socket.io')(httpServer);

    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // الانضمام إلى غرفة المحادثة الخاصة بالمشروع
      socket.on('joinProject', (data) => {

        socket.join(JSON.stringify(data.projectId));
        // socket.emit('joinProject', JSON.stringify(data.projectId));
        console.log(`User joined project room: ${JSON.stringify(data.projectId)}`);
      });

      // مغادرة الغرفة عند قطع الاتصال
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};
