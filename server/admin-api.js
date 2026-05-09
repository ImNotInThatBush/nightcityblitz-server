require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

// Middleware per proteggere le rotte admin
const requireAdmin = (req, res, next) => {
    const { nickname } = req.body; 
    if (!nickname || nickname.toLowerCase() !== 'imnotinthatbush') {
        return res.status(403).json({ error: "Accesso Negato: Privilegi Admin richiesti." });
    }
    next();
};

// Endpoint di Login (Passwordless)
app.post('/api/login', async (req, res) => {
    const { nickname, token } = req.body;
    if (!nickname || nickname.trim() === '') return res.status(400).json({ error: "Nickname non valido." });

    const cleanNick = nickname.trim();
    try {
        const userRes = await pool.query('SELECT * FROM ncb_users WHERE nickname = $1', [cleanNick]);
        
        if (userRes.rows.length === 0) {
            // Nuovo utente: genera token e salvalo
            const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await pool.query('INSERT INTO ncb_users (nickname, auth_token) VALUES ($1, $2)', [cleanNick, newToken]);
            
            // Crea record statistiche
            const newIdRes = await pool.query('SELECT id FROM ncb_users WHERE nickname = $1', [cleanNick]);
            await pool.query('INSERT INTO ncb_stats (user_id) VALUES ($1)', [newIdRes.rows[0].id]);
            
            return res.json({ success: true, nickname: cleanNick, token: newToken, isNew: true });
        } else {
            // Utente esistente: verifica token
            const user = userRes.rows[0];
            if (user.is_banned) return res.status(403).json({ error: "Account bannato dal sistema." });
            
            if (user.auth_token === token) {
                return res.json({ success: true, nickname: user.nickname, token: user.auth_token, isNew: false });
            } else {
                return res.status(403).json({ error: "Nickname già in uso. Se sei tu, ti manca il token di accesso." });
            }
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore del server durante il login." });
    }
});

// Endpoint per validare la sessione (usato per kickare chi viene bannato/eliminato)
app.post('/api/validate', async (req, res) => {
    const { nickname, token } = req.body;
    if (!nickname || !token) return res.status(401).json({ valid: false });

    try {
        const userRes = await pool.query('SELECT auth_token, is_banned FROM ncb_users WHERE nickname = $1', [nickname]);
        if (userRes.rows.length === 0) return res.json({ valid: false }); // Utente eliminato
        
        const user = userRes.rows[0];
        if (user.is_banned || user.auth_token !== token) return res.json({ valid: false }); // Bannato o token invalido
        
        res.json({ valid: true });
    } catch (err) {
        res.status(500).json({ valid: false });
    }
});

// Ottieni tutti i giocatori
app.post('/api/admin/players', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nickname, u.is_banned, u.created_at, s.wins, s.losses, s.ram_used
            FROM ncb_users u
            LEFT JOIN ncb_stats s ON u.id = s.user_id
            ORDER BY u.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore del server" });
    }
});

// Banna / S-banna giocatore
app.post('/api/admin/ban', requireAdmin, async (req, res) => {
    const { targetId, isBanned } = req.body;
    try {
        await pool.query(`UPDATE ncb_users SET is_banned = $1 WHERE id = $2`, [isBanned, targetId]);
        res.json({ success: true, isBanned });
    } catch (err) {
        res.status(500).json({ error: "Errore durante il ban" });
    }
});

// Resetta le statistiche di un giocatore
app.post('/api/admin/reset-stats', requireAdmin, async (req, res) => {
    const { targetId } = req.body;
    try {
        await client.query(`UPDATE ncb_stats SET wins = 0, losses = 0, ram_used = 0 WHERE user_id = $1`, [targetId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore durante il reset delle statistiche" });
    }
});

// Elimina definitivamente un giocatore
app.post('/api/admin/delete', requireAdmin, async (req, res) => {
    const { targetId } = req.body;
    try {
        await pool.query(`DELETE FROM ncb_users WHERE id = $1`, [targetId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore durante l'eliminazione del giocatore" });
    }
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Multiplayer Lobby Logic
const publicRooms = {}; // { roomId: { id, name, host, hostSocketId, players: 1, maxPlayers: 2, isStarted: false } }

function getPublicRoomsList() {
    return Object.values(publicRooms)
        .filter(r => !r.isStarted && r.players < r.maxPlayers)
        .map(r => ({ id: r.id, name: r.name, host: r.host, players: r.players }));
}

function broadcastRooms() {
    io.emit('rooms_list', getPublicRoomsList());
}

io.on('connection', (socket) => {
    console.log('Nuova connessione Socket.io:', socket.id);

    socket.on('get_rooms', () => {
        socket.emit('rooms_list', getPublicRoomsList());
    });

    socket.on('create_room', (data) => {
        socket.nickname = data.hostNickname;
        const roomId = `room_${socket.id}_${Date.now()}`;
        
        publicRooms[roomId] = {
            id: roomId,
            name: data.roomName,
            host: data.hostNickname,
            hostSocketId: socket.id,
            players: 1,
            maxPlayers: 2,
            isStarted: false
        };
        
        socket.join(roomId);
        socket.room = roomId;
        socket.isHost = true;
        socket.isReady = false;
        
        socket.emit('room_joined', { roomName: data.roomName, opponent: null, opponentReady: false, isHost: true });
        broadcastRooms();
    });

    socket.on('join_room', (roomId) => {
        const room = publicRooms[roomId];
        if (!room || room.isStarted || room.players >= room.maxPlayers) {
            socket.emit('room_error', "Stanza piena o non disponibile.");
            return;
        }

        socket.join(roomId);
        socket.room = roomId;
        socket.isHost = false;
        socket.isReady = false;
        room.players++;

        socket.emit('room_joined', { roomName: room.name, opponent: room.host, opponentReady: false, isHost: false }); // Wait, we don't know if host is ready. Host is usually waiting.
        socket.to(roomId).emit('opponent_joined', { nickname: socket.nickname || 'Challenger' });
        
        broadcastRooms();
    });

    socket.on('set_ready', () => {
        socket.isReady = true;
        if (socket.room) {
            io.to(socket.room).emit('player_ready', { nickname: socket.nickname });
            
            const roomSockets = io.sockets.adapter.rooms.get(socket.room);
            if (roomSockets) {
                let allReady = true;
                const socketsInRoom = [];
                for (const clientId of roomSockets) {
                    const clientSocket = io.sockets.sockets.get(clientId);
                    socketsInRoom.push(clientSocket);
                    if (!clientSocket.isReady) allReady = false;
                }
                
                if (allReady && socketsInRoom.length >= 2) {
                    const room = publicRooms[socket.room];
                    if (room) {
                        room.isStarted = true;
                        broadcastRooms();

                        let countdown = 3;
                        room.interval = setInterval(() => {
                            io.to(socket.room).emit('match_starting', { countdown, room: socket.room, role: 'TBD' });
                            if (countdown <= 0) {
                                clearInterval(room.interval);
                                const hostSocket = socketsInRoom.find(s => s.isHost) || socketsInRoom[0];
                                const guestSocket = socketsInRoom.find(s => !s.isHost) || socketsInRoom[1];
                                hostSocket.emit('match_starting', { countdown: 0, room: socket.room, role: 'host' });
                                guestSocket.emit('match_starting', { countdown: 0, room: socket.room, role: 'guest' });
                            }
                            countdown--;
                        }, 1000);
                    }
                }
            }
        }
    });

    socket.on('cancel_ready', () => {
        socket.isReady = false;
        if (socket.room) {
            io.to(socket.room).emit('player_unready', { nickname: socket.nickname });
            const room = publicRooms[socket.room];
            if (room && room.interval) {
                clearInterval(room.interval);
                room.interval = null;
                room.isStarted = false;
                io.to(socket.room).emit('match_cancelled');
                broadcastRooms();
            }
        }
    });

    const leaveRoom = () => {
        if (!socket.room) return;
        const roomId = socket.room;
        
        socket.leave(roomId);
        socket.to(roomId).emit('opponent_left');
        
        const room = publicRooms[roomId];
        if (room) {
            if (socket.isHost) {
                // Se l'host esce, la stanza muore
                delete publicRooms[roomId];
            } else {
                room.players--;
                room.isStarted = false; // Reset in caso fosse partita
            }
        }
        
        socket.room = null;
        socket.isHost = false;
        socket.isReady = false;
        broadcastRooms();
    };

    socket.on('leave_room', leaveRoom);
    socket.on('disconnect', () => {
        leaveRoom();
        console.log('Socket.io disconnesso:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server API e WebSocket in ascolto sulla porta ${PORT}`);
});
