import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

const app = express();
const PORT = 3000;

// Configuración del servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sesiones almacenadas en memoria RAM
const sessions = {};
app.use(
    session({
        secret: 'P4-JMO#Pioneros-SesionesHTTP-VariablesDeSesion', // Secreto para firmar la cookie de sesión
        resave: false, // No guardar la sesión si no ha sido modificada
        saveUninitialized: true, // Guardar la sesión aunque no haya sido inicializada
        rolling: true, // Renueva la cookie en cada solicitud
        cookie: { maxAge: 30 * 60 * 1000 }, // Duración máxima de la sesión (30 minutos)
    })
);

// Ruta principal
app.get('/', (req, res) => {
    return res.status(200).json({
        message: 'Bienvenid@ al API de control de sesiones',
        author: 'Josue Atlai Martinez Otero',
    });
});

// Función de utilidad para obtener la IP local
const getLocalIP = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            // IPv4 y no interna (no localhost)
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null; // Retorna null si no se encuentra una IP válida
};

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: 'Se esperan campos requeridos' });
    }
    const sessionID = uuidv4();
    const now = new Date();
    sessions[sessionID] = {
        sessionID,
        email,
        nickname,
        macAddress,
        ip: getLocalIP(),
        createdAt: now,
        lastAccessed: now,
    };
    console.log(`Nueva sesión creada: ${sessionID}`);
    res.status(200).json({
        message: 'Se ha logeado de manera exitosa',
        sessionID,
    });
});

// Ruta para cerrar sesión
app.post('/logout', (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: 'No se ha encontrado una sesión activa' });
    }

    delete sessions[sessionID];
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error al cerrar sesión');
        }
        res.status(200).json({ message: 'Logout exitoso' });
    });
});

// Ruta para actualizar la sesión
app.put('/update', (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: 'No se ha encontrado una sesión activa' });
    }

    sessions[sessionID].lastAccessed = new Date();
    console.log(`Sesión actualizada: ${sessionID}`);
    res.status(200).json({
        message: 'Sesión actualizada correctamente.',
        session: sessions[sessionID],
    });
});

// Ruta para consultar el estado de la sesión
app.get('/status', (req, res) => {
    const sessionID = req.query.sessionID;

    if (!sessionID || !sessions[sessionID]) {
        return res.status(404).json({ message: 'No hay sesiones activas' });
    }

    res.status(200).json({
        message: 'Sesión activa',
        session: sessions[sessionID],
    });
});
