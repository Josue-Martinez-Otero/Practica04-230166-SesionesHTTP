import express from 'express';
import mongoose from './db.js';
import Session from './models/Session.js';
import session from 'express-session';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import moment from 'moment-timezone';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: 'P4-JMO#Pioneros-SesionesHTTP-VariablesDeSesion',
        resave: false,
        saveUninitialized: true,
        rolling: true,
        cookie: { maxAge: 30 * 60 * 1000 },
    })
);

const getLocalIP = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return { ip: iface.address, mac: iface.mac };
            }
        }
    }
    return { ip: null, mac: null };
};

app.get('/welcome', (req, res) => {
    return res.status(200).json({
        message: 'Bienvenid@ al API de control de sesiones',
        author: 'Josue Atlai Martinez Otero',
    });
});

app.post('/login', async (req, res) => {
    try {
        const { email, nickname, macAddress } = req.body;
        if (!email || !nickname || !macAddress) {
            return res.status(400).json({ message: 'Se esperan campos requeridos' });
        }
        const sessionID = uuidv4();
        const networkInfo = getLocalIP();
        const newSession = new Session({
            sessionID,
            email,
            nickname,
            macAddress,
            ip: networkInfo.ip,
            serverMac: networkInfo.mac,
            createdAt: new Date(),
            lastAccessed: new Date(),
        });
        await newSession.save();
        res.status(200).json({
            message: 'Se ha logeado de manera exitosa',
            sessionID,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al iniciar sesión', error });
    }
});

app.post('/logout', async (req, res) => {
    try {
        const { sessionID } = req.body;
        if (!sessionID) {
            return res.status(400).json({ message: 'SessionID requerido' });
        }
        const deletedSession = await Session.findOneAndDelete({ sessionID });
        if (!deletedSession) {
            return res.status(404).json({ message: 'Sesión no encontrada' });
        }
        res.status(200).json({ message: 'Logout exitoso' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cerrar sesión', error });
    }
});

app.put('/update', async (req, res) => {
    try {
        const { sessionID } = req.body;
        const session = await Session.findOneAndUpdate(
            { sessionID },
            { lastAccessed: new Date() },
            { new: true }
        );
        if (!session) {
            return res.status(404).json({ message: 'No se ha encontrado una sesión activa' });
        }
        res.status(200).json({
            message: 'Sesión actualizada correctamente.',
            session,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar la sesión', error });
    }
});

app.post('/status', async (req, res) => {
    try {
        const { sessionID } = req.body;
        const session = await Session.findOne({ sessionID });
        if (!session) {
            return res.status(404).json({ message: 'No hay sesiones activas' });
        }
        const now = new Date();
        const inactivitySeconds = Math.floor((now - session.lastAccessed) / 1000);
        const hours = Math.floor(inactivitySeconds / 3600);
        const minutes = Math.floor((inactivitySeconds % 3600) / 60);
        const seconds = inactivitySeconds % 60;
        const lastAccessedAtFormatted = moment(session.lastAccessed)
            .tz('America/Mexico_City')
            .format('YYYY-MM-DD HH:mm:ss');
        res.status(200).json({
            message: 'Sesión activa',
            session,
            lastAccessedAt: lastAccessedAtFormatted,
            inactivityTime: `${hours} horas, ${minutes} minutos, ${seconds} segundos`,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener el estado de la sesión', error });
    }
});

// Eliminación automática de sesiones inactivas
setInterval(async () => {
    try {
        const now = new Date();
        const result = await Session.deleteMany({
            lastAccessed: { $lt: new Date(now - 120 * 1000) },
        });
        if (result.deletedCount > 0) {
            console.log(`Sesiones expiradas eliminadas: ${result.deletedCount}`);
        }
    } catch (error) {
        console.error('Error al eliminar sesiones expiradas:', error);
    }
}, 60000);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});