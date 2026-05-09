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
const requireAdmin = async (req, res, next) => {
    const { nickname, token } = req.body; 
    if (!nickname || nickname.toLowerCase() !== 'imnotinthatbush') {
        return res.status(403).json({ error: "Accesso Negato: Privilegi Admin richiesti." });
    }
    
    try {
        const userRes = await pool.query('SELECT auth_token FROM ncb_users WHERE nickname ILIKE $1', [nickname]);
        if (userRes.rows.length === 0 || userRes.rows[0].auth_token !== token) {
            return res.status(403).json({ error: "Accesso Negato: Token Admin non valido o assente." });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: "Errore di validazione Admin." });
    }
};

// Endpoint di Login
app.post('/api/login', async (req, res) => {
    const { nickname, password } = req.body;
    if (!nickname || nickname.trim() === '') return res.status(400).json({ error: "Nickname non valido." });
    if (!password || password.trim() === '') return res.status(400).json({ error: "Password mancante." });

    const cleanNick = nickname.trim();
    const cleanPass = password.trim();
    
    try {
        const userRes = await pool.query('SELECT * FROM ncb_users WHERE nickname ILIKE $1', [cleanNick]);
        
        if (userRes.rows.length === 0) {
            // Nuovo utente: genera token e salva password
            const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await pool.query('INSERT INTO ncb_users (nickname, auth_token, password_hash) VALUES ($1, $2, $3)', [cleanNick, newToken, cleanPass]);
            
            // Crea record statistiche
            const newIdRes = await pool.query('SELECT id FROM ncb_users WHERE nickname ILIKE $1', [cleanNick]);
            await pool.query('INSERT INTO ncb_stats (user_id) VALUES ($1)', [newIdRes.rows[0].id]);
            
            return res.json({ success: true, nickname: cleanNick, token: newToken, isNew: true });
        } else {
            // Utente esistente
            const user = userRes.rows[0];
            if (user.is_banned) return res.status(403).json({ error: "Account bannato dal sistema." });
            
            // Backward compatibility: se password è NULL, impostala ora
            if (user.password_hash === null || user.password_hash === '') {
                const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                await pool.query('UPDATE ncb_users SET password_hash = $1, auth_token = $2 WHERE id = $3', [cleanPass, newToken, user.id]);
                return res.json({ success: true, nickname: user.nickname, token: newToken, isNew: false });
            }

            if (user.password_hash === cleanPass) {
                // Genera sempre un nuovo token per questa sessione e aggiornalo per disconnettere altre tab se necessario (o mantieni quello vecchio)
                // Per comodità manteniamo quello vecchio o ne generiamo uno nuovo se preferiamo.
                const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                await pool.query('UPDATE ncb_users SET auth_token = $1 WHERE id = $2', [newToken, user.id]);
                return res.json({ success: true, nickname: user.nickname, token: newToken, isNew: false });
            } else {
                return res.status(403).json({ error: "Password non valida." });
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
        const userRes = await pool.query('SELECT auth_token, is_banned FROM ncb_users WHERE nickname ILIKE $1', [nickname]);
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
        await pool.query(`UPDATE ncb_stats SET wins = 0, losses = 0, ram_used = 0 WHERE user_id = $1`, [targetId]);
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

const PHYSICS = {
    FPS: 60,
    STEP: 1 / 60,
    BASE_WIDTH: 1920,
    BASE_HEIGHT: 1080,
    PADDLE_WIDTH: 20,
    PADDLE_HEIGHT: 120,
    BALL_RADIUS: 12,
    BALL_BASE_SPEED: 800,
    BALL_MAX_SPEED: 4000,
    ARENA_MARGIN: 50
};

function resetBall(room) {
    const s = room.gameState;
    s.ball.x = PHYSICS.BASE_WIDTH / 2;
    s.ball.y = PHYSICS.BASE_HEIGHT / 2;
    s.ball.dx = 0;
    s.ball.dy = 0;
    s.pauseTimer = 2.0; // Wait 2 seconds before moving
}

function startGameLoop(roomId) {
    const room = publicRooms[roomId];
    if (!room) return;
    
    room.gameState = {
        ball: { x: PHYSICS.BASE_WIDTH/2, y: PHYSICS.BASE_HEIGHT/2, dx: 0, dy: 0 },
        p1y: (PHYSICS.BASE_HEIGHT - PHYSICS.PADDLE_HEIGHT)/2,
        p2y: (PHYSICS.BASE_HEIGHT - PHYSICS.PADDLE_HEIGHT)/2,
        score: [0, 0],
        rounds: [0, 0],
        pauseTimer: 0
    };
    resetBall(room);
    
    const margin = PHYSICS.ARENA_MARGIN;
    const ph = PHYSICS.PADDLE_HEIGHT;
    const pw = PHYSICS.PADDLE_WIDTH;
    const p1x = margin + 10;
    const p2x = PHYSICS.BASE_WIDTH - margin - pw - 10;
    const br = PHYSICS.BALL_RADIUS;
    
    room.gameInterval = setInterval(async () => {
        const s = room.gameState;
        const dt = PHYSICS.STEP;
        
        if (s.pauseTimer > 0) {
            s.pauseTimer -= dt;
            if (s.pauseTimer <= 0) {
                s.ball.dx = (Math.random() > 0.5 ? 1 : -1) * PHYSICS.BALL_BASE_SPEED;
                s.ball.dy = (Math.random() > 0.5 ? 1 : -1) * (PHYSICS.BALL_BASE_SPEED / 2);
            }
            // Keep emitting state during pause so clients see ball centered
            io.to(roomId).emit('game_state_update', {
                ball: {x: s.ball.x, y: s.ball.y, dx: s.ball.dx},
                p1y: s.p1y, p2y: s.p2y, score: s.score
            });
            return;
        }
        
        s.ball.x += s.ball.dx * dt;
        s.ball.y += s.ball.dy * dt;
        
        if (s.ball.y - br < margin) {
            s.ball.y = margin + br;
            s.ball.dy *= -1;
        } else if (s.ball.y + br > PHYSICS.BASE_HEIGHT - margin) {
            s.ball.y = PHYSICS.BASE_HEIGHT - margin - br;
            s.ball.dy *= -1;
        }
        
        if (s.ball.dx < 0 && s.ball.x - br < p1x + pw && s.ball.x + br > p1x) {
            if (s.ball.y + br > s.p1y && s.ball.y - br < s.p1y + ph) {
                s.ball.x = p1x + pw + br;
                s.ball.dx *= -1;
                s.ball.dx += 100;
                let hitPoint = (s.ball.y - (s.p1y + ph / 2)) / (ph / 2);
                s.ball.dy += hitPoint * 400;
            }
        }
        
        if (s.ball.dx > 0 && s.ball.x + br > p2x && s.ball.x - br < p2x + pw) {
            if (s.ball.y + br > s.p2y && s.ball.y - br < s.p2y + ph) {
                s.ball.x = p2x - br;
                s.ball.dx *= -1;
                s.ball.dx -= 100;
                let hitPoint = (s.ball.y - (s.p2y + ph / 2)) / (ph / 2);
                s.ball.dy += hitPoint * 400;
            }
        }
        
        if (s.ball.dx > PHYSICS.BALL_MAX_SPEED) s.ball.dx = PHYSICS.BALL_MAX_SPEED;
        if (s.ball.dx < -PHYSICS.BALL_MAX_SPEED) s.ball.dx = -PHYSICS.BALL_MAX_SPEED;
        
        let goalScored = false;
        if (s.ball.x < 0) {
            s.score[1]++;
            io.to(roomId).emit('goal_scored', { scorer: 'p2', score: s.score });
            goalScored = true;
        } else if (s.ball.x > PHYSICS.BASE_WIDTH) {
            s.score[0]++;
            io.to(roomId).emit('goal_scored', { scorer: 'p1', score: s.score });
            goalScored = true;
        }
        
        if (goalScored) {
            resetBall(room);
            
            // Check for round / match end
            if (s.score[0] >= 3 || s.score[1] >= 3) {
                const winnerIndex = s.score[0] >= 3 ? 0 : 1;
                s.rounds[winnerIndex]++;
                
                if (s.rounds[winnerIndex] >= 3) {
                    io.to(roomId).emit('match_ended', { winner: winnerIndex === 0 ? 'p1' : 'p2' });
                    clearInterval(room.gameInterval);
                    room.gameInterval = null;
                    room.isStarted = false;
                    
                    // Unready players for rematch
                    const sockets = await io.in(roomId).fetchSockets();
                    sockets.forEach(sock => sock.isReady = false);
                    broadcastRooms();
                    return;
                } else {
                    io.to(roomId).emit('round_ended', { rounds: s.rounds });
                    s.score = [0, 0];
                }
            }
        }
        
        io.to(roomId).emit('game_state_update', {
            ball: {x: s.ball.x, y: s.ball.y, dx: s.ball.dx},
            p1y: s.p1y,
            p2y: s.p2y,
            score: s.score
        });
        
    }, 1000 * PHYSICS.STEP);
}

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

    const leaveRoom = () => {
        if (!socket.room) return;
        const roomId = socket.room;
        
        socket.leave(roomId);
        socket.to(roomId).emit('opponent_left');
        
        const room = publicRooms[roomId];
        if (room) {
            if (room.gameInterval) clearInterval(room.gameInterval);
            if (socket.isHost) {
                delete publicRooms[roomId];
            } else {
                room.players--;
                room.isStarted = false;
            }
        }
        
        socket.room = null;
        socket.isHost = false;
        socket.isReady = false;
        broadcastRooms();
    };

    socket.on('get_rooms', () => {
        socket.emit('rooms_list', getPublicRoomsList());
    });

    socket.on('create_room', (data) => {
        leaveRoom(); // Prevent phantom rooms
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
        leaveRoom(); // Prevent phantom rooms
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

        socket.emit('room_joined', { roomName: room.name, opponent: room.host, opponentReady: false, isHost: false });
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
                                startGameLoop(socket.room);
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

    socket.on('player_move', (data) => {
        if (!socket.room) return;
        const room = publicRooms[socket.room];
        if (room && room.isStarted && room.gameState) {
            if (socket.isHost) {
                room.gameState.p1y = data.y;
            } else {
                room.gameState.p2y = data.y;
            }
        }
    });

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
