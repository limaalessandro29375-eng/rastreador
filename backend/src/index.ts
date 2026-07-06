import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { authRouter } from './routes/auth';
import { locationsRouter } from './routes/locations';
import { devicesRouter } from './routes/devices';
import { authenticateToken } from './middleware/auth';

export const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.use('/auth', authRouter);
app.use('/locations', authenticateToken, locationsRouter);
app.use('/devices', authenticateToken, devicesRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

io.on('connection', (socket) => {
  socket.on('join-device', (deviceId: string) => {
    socket.join(`device:${deviceId}`);
  });
});

export { io };

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend rodando na porta ${PORT}`);
});
