import express from 'express';
import session from 'express-session';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import moment from 'moment-timezone';

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
app.get('/welcome', (req, res) => {
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
                return { ip: iface.address, mac: iface.mac };
            }
        }
    }
    return { ip: null, mac: null }; // Retorna null si no se encuentra una IP válida
};

// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    const { email, nickname, macAddress } = req.body;

    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: 'Se esperan campos requeridos' });
    }

    const sessionID = uuidv4();
    const now = new Date();
    const networkInfo = getLocalIP();

    const sessionData = {
        sessionID,
        email,
        nickname,
        macAddress,
        ip: networkInfo.ip,
        serverMac: networkInfo.mac,
        createdAt: now,
        lastAccessed: now,
    };

    // Guardar en memoria
    sessions[sessionID] = sessionData;

    // Guardar en req.session
    req.session.sessionID = sessionID; // Guardar solo el ID
    req.session.user = sessionData; // Guardar toda la sesión

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
app.post('/status', (req, res) => {
    if (!req.session.sessionID || !sessions[req.session.sessionID]) {
        return res.status(404).json({ message: 'No hay sesiones activas' });
    }

    const session = sessions[req.session.sessionID]; // Obtener sesión de memoria
    const now = new Date();
    const inactivitySeconds = Math.floor((now - session.lastAccessed) / 1000);

    const hours = Math.floor(inactivitySeconds / 3600);
    const minutes = Math.floor((inactivitySeconds % 3600) / 60);
    const seconds = inactivitySeconds % 60;

    const lastAccessedAtFormatted = moment(session.lastAccessed)
        .tz('America/Mexico_City')
        .format('YYYY-MM-DD HH:mm:ss');

    res.status(200).json({
        message: "Sesión activa",
        session: {
            sessionID: session.sessionID,
            email: session.email,
            nickname: session.nickname,
            ip: session.ip,
            macAddress: session.macAddress,
            serverMac: session.serverMac
        },
        lastAccessedAt: lastAccessedAtFormatted,
        inactivityTime: `${hours} horas, ${minutes} minutos, ${seconds} segundos`,
    });
});


// Destrucción automática después de 2 minutos de inactividad
setInterval(() => {
    const now = new Date();
    Object.keys(sessions).forEach((sessionID) => {
        const session = sessions[sessionID];
        const inactivity = (now - session.lastAccessed) / 1000;
        if (inactivity > 120) { // 2 minutos
            delete sessions[sessionID];
            console.log(`Sesión expirada: ${sessionID}`);
        }
    });
}, 60000); // Verificación cada minuto

// Ruta para listar todas las sesiones activas
app.get('/listCurrentSessions', (req, res) => {
    if (Object.keys(sessions).length === 0) {
        return res.status(404).json({ message: 'No hay sesiones activas' });
    }

    res.status(200).json({
        message: 'Sesiones activas',
        activeSessions: Object.values(sessions), // Devuelve todas las sesiones en memoria
    });
});

