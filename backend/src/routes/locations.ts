import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';
import { io } from '../index';

export const locationsRouter = Router();

const locationSchema = z.object({
  deviceId: z.string().uuid(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
  altitude: z.number().optional(),
  timestamp: z.string().datetime().optional(),
});

const batchSchema = z.object({
  locations: z.array(locationSchema).min(1).max(500),
});

locationsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const data = locationSchema.parse(req.body);
    const device = await prisma.device.findFirst({
      where: { id: data.deviceId, userId: req.userId! },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });

    const location = await prisma.location.create({
      data: {
        deviceId: data.deviceId,
        lat: data.lat,
        lng: data.lng,
        accuracy: data.accuracy ?? null,
        speed: data.speed ?? null,
        altitude: data.altitude ?? null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });

    io.to(`device:${data.deviceId}`).emit('location', location);
    res.status(201).json(location);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erro interno' });
  }
});

locationsRouter.post('/batch', async (req: AuthRequest, res) => {
  try {
    const { locations } = batchSchema.parse(req.body);

    const device = await prisma.device.findFirst({
      where: { id: locations[0].deviceId, userId: req.userId! },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });

    const created = await prisma.location.createMany({
      data: locations.map((loc) => ({
        deviceId: loc.deviceId,
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy ?? null,
        speed: loc.speed ?? null,
        altitude: loc.altitude ?? null,
        timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date(),
      })),
      skipDuplicates: true,
    });

    io.to(`device:${locations[0].deviceId}`).emit('locations-batch', { count: created.count });
    res.status(201).json({ inserted: created.count });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erro interno' });
  }
});

locationsRouter.get('/:deviceId', async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;
    const { start, end, limit } = req.query;

    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.userId! },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });

    const where: any = { deviceId };
    if (start || end) {
      where.timestamp = {};
      if (start) where.timestamp.gte = new Date(start as string);
      if (end) where.timestamp.lte = new Date(end as string);
    }

    const locations = await prisma.location.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit ? Number(limit) : 1000,
    });

    res.json(locations);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

locationsRouter.get('/latest/:deviceId', async (req: AuthRequest, res) => {
  try {
    const { deviceId } = req.params;
    const device = await prisma.device.findFirst({
      where: { id: deviceId, userId: req.userId! },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });

    const location = await prisma.location.findFirst({
      where: { deviceId },
      orderBy: { timestamp: 'desc' },
    });

    res.json(location);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});
