import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { AuthRequest } from '../middleware/auth';

export const devicesRouter = Router();

const deviceSchema = z.object({
  name: z.string().min(1),
});

devicesRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { userId: req.userId! },
      include: {
        _count: { select: { locations: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(devices);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

devicesRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const { name } = deviceSchema.parse(req.body);
    const device = await prisma.device.create({
      data: { name, userId: req.userId! },
    });
    res.status(201).json(device);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: 'Erro interno' });
  }
});

devicesRouter.get('/:id', async (req: AuthRequest, res) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });
    res.json(device);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

devicesRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const device = await prisma.device.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });
    if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });

    await prisma.location.deleteMany({ where: { deviceId: device.id } });
    await prisma.device.delete({ where: { id: device.id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});
