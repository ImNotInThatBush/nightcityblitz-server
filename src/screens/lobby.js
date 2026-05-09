import { Config } from '../config.js';

export class LobbyScreen {
    constructor(changeStateCallback, audioManager, socketManager, userNickname) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.socket = socketManager.socket;
        this.userNickname = userNickname;
        
        this.state = 'DIRECTORY'; // DIRECTORY | CREATING | MATCH_ROOM
        this.rooms = [];
        this.roomInput = "";
        
        // Match Room state
        this.currentRoom = null;
        this.opponentName = null;
        this.isReady = false;
        this.opponentReady = false;
        this.countdown = null;

        // UI
        this.hoveredRoomIndex = -1;
        this.createBtn = { label: "CREATE MATCH", isHovered: false };
        this.backBtn = { label: "BACK TO MENU", isHovered: false };
        
        this.confirmCreateBtn = { label: "CREATE", isHovered: false };
        this.cancelCreateBtn = { label: "CANCEL", isHovered: false };
        
        this.readyBtn = { label: "PRONTO", isHovered: false };
        this.leaveBtn = { label: "LEAVE ROOM", isHovered: false };

        this.setupSocketListeners();
    }

    setupSocketListeners() {
        if (!this.socket) return;
        
        this.socket.on('rooms_list', (rooms) => {
            this.rooms = rooms;
        });

        this.socket.on('room_joined', (data) => {
            this.state = 'MATCH_ROOM';
            this.currentRoom = data.roomName;
            this.opponentName = data.opponent || null;
            this.isReady = false;
            this.opponentReady = data.opponentReady || false;
            this.countdown = null;
        });

        this.socket.on('room_error', (msg) => {
            console.error(msg);
            this.state = 'DIRECTORY';
        });

        this.socket.on('opponent_joined', (data) => {
            if (this.state === 'MATCH_ROOM') {
                this.opponentName = data.nickname;
                this.opponentReady = false;
                this.audioManager.playSfx('ramCellRecharged');
            }
        });

        this.socket.on('opponent_left', () => {
            if (this.state === 'MATCH_ROOM') {
                this.opponentName = null;
                this.opponentReady = false;
                this.isReady = false;
                this.countdown = null;
            }
        });

        this.socket.on('player_ready', (data) => {
            if (this.state === 'MATCH_ROOM' && data.nickname === this.opponentName) {
                this.opponentReady = true;
                this.audioManager.playSfx('ramCellRecharged');
            }
        });

        this.socket.on('match_starting', (data) => {
            if (this.state === 'MATCH_ROOM') {
                this.countdown = data.countdown;
                this.audioManager.playUiHover();
                if (this.countdown <= 0) {
                    this.changeState('PLAYING', { mode: 'MULTIPLAYER', room: this.currentRoom, role: data.role, opponent: this.opponentName });
                }
            }
        });
    }

    enter() {
        this.state = 'DIRECTORY';
        this.roomInput = "";
        this.currentRoom = null;
        if (this.socket) {
            this.socket.emit('get_rooms');
        }
    }

    exit() {
        if (this.socket && this.state === 'MATCH_ROOM' && this.countdown === null) {
            this.socket.emit('leave_room');
        }
    }

    update(input) {
        if (this.countdown !== null) return;

        const mx = input.mouse.x;
        const my = input.mouse.y;
        const cx = Config.BASE_WIDTH/2;
        const cy = Config.BASE_HEIGHT/2;

        if (this.state === 'DIRECTORY') {
            this.hoveredRoomIndex = -1;
            const startY = cy - 150;
            for (let i = 0; i < this.rooms.length; i++) {
                const y = startY + i * 50;
                if (mx > cx - 500 && mx < cx + 500 && my > y - 25 && my < y + 25) {
                    this.hoveredRoomIndex = i;
                }
            }

            this.createBtn.isHovered = (mx > cx + 50 && mx < cx + 350 && my > cy + 200 && my < cy + 250);
            this.backBtn.isHovered = (mx > cx - 350 && mx < cx - 50 && my > cy + 200 && my < cy + 250);

            if (input.mouse.clicked) {
                if (this.hoveredRoomIndex !== -1 && this.socket) {
                    this.audioManager.playUiHover();
                    this.socket.emit('join_room', this.rooms[this.hoveredRoomIndex].id);
                }
                if (this.createBtn.isHovered) {
                    this.audioManager.playUiHover();
                    this.state = 'CREATING';
                    this.roomInput = `${this.userNickname}'s Game`;
                }
                if (this.backBtn.isHovered) {
                    this.audioManager.playUiHover();
                    this.changeState('MENU');
                }
            }
        } else if (this.state === 'CREATING') {
            if (input.keyPressed) {
                if (input.lastKeyCode === 8 && this.roomInput.length > 0) { // Backspace
                    this.roomInput = this.roomInput.slice(0, -1);
                } else if (input.lastKey && input.lastKey.length === 1 && this.roomInput.length < 20) {
                    this.roomInput += input.lastKey;
                }
            }

            this.confirmCreateBtn.isHovered = (mx > cx + 50 && mx < cx + 350 && my > cy + 200 && my < cy + 250);
            this.cancelCreateBtn.isHovered = (mx > cx - 350 && mx < cx - 50 && my > cy + 200 && my < cy + 250);

            if (input.mouse.clicked) {
                if (this.confirmCreateBtn.isHovered && this.roomInput.length > 0 && this.socket) {
                    this.audioManager.playUiHover();
                    this.socket.emit('create_room', { roomName: this.roomInput, hostNickname: this.userNickname });
                }
                if (this.cancelCreateBtn.isHovered) {
                    this.audioManager.playUiHover();
                    this.state = 'DIRECTORY';
                }
            }
        } else if (this.state === 'MATCH_ROOM') {
            const readyBtnX = this.isHost ? (cx - 350) : (cx + 50);
            
            this.readyBtn.isHovered = (this.opponentName && !this.isReady && mx > readyBtnX && mx < readyBtnX + 300 && my > cy + 220 && my < cy + 270);
            
            // leaveBtn is always at cx - 350 if not host, or we can put it elsewhere. Let's put leave btn opposite to ready btn
            const leaveBtnX = this.isHost ? (cx + 50) : (cx - 350);
            this.leaveBtn.isHovered = (mx > leaveBtnX && mx < leaveBtnX + 300 && my > cy + 220 && my < cy + 270);

            if (input.mouse.clicked) {
                if (this.readyBtn.isHovered) {
                    this.isReady = true;
                    this.audioManager.playUiHover();
                    if (this.socket) this.socket.emit('set_ready');
                }
                if (this.leaveBtn.isHovered) {
                    this.audioManager.playUiHover();
                    if (this.socket) this.socket.emit('leave_room');
                    this.state = 'DIRECTORY';
                    if (this.socket) this.socket.emit('get_rooms');
                }
            }
        }
    }

    draw(renderer) {
        renderer.drawHudBackground();
        renderer.drawCircuitOverlay(renderer.circuitPulse);

        const cx = Config.BASE_WIDTH/2;
        const cy = Config.BASE_HEIGHT/2;

        renderer.drawText("// NETRUNNER LOBBY //", cx, cy - 360, {
            size: 50, color: Config.PALETTE.CYAN_UI, align: 'center', glowColor: Config.PALETTE.CYAN_UI, glowBlur: 15
        });

        renderer.context.strokeStyle = Config.PALETTE.CYAN_UI;
        renderer.context.lineWidth = 2;
        renderer.context.fillStyle = 'rgba(0, 20, 30, 0.6)';
        renderer.context.fillRect(cx - 600, cy - 300, 1200, 600);
        renderer.context.strokeRect(cx - 600, cy - 300, 1200, 600);

        if (this.state === 'DIRECTORY') {
            renderer.drawText("> AVAILABLE MATCHES", cx - 580, cy - 250, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'left' });
            renderer.context.beginPath();
            renderer.context.moveTo(cx - 580, cy - 230);
            renderer.context.lineTo(cx + 580, cy - 230);
            renderer.context.strokeStyle = 'rgba(0, 255, 255, 0.3)';
            renderer.context.stroke();

            if (this.rooms.length === 0) {
                renderer.drawText("NO MATCHES FOUND. INITIATE NEW CONNECTION.", cx, cy - 50, { size: 22, color: '#888', align: 'center' });
            } else {
                for (let i = 0; i < this.rooms.length; i++) {
                    const room = this.rooms[i];
                    const y = cy - 150 + i * 50;
                    const isHovered = i === this.hoveredRoomIndex;
                    
                    if (isHovered) {
                        renderer.context.fillStyle = 'rgba(0, 255, 255, 0.15)';
                        renderer.context.fillRect(cx - 580, y - 25, 1160, 50);
                    }
                    
                    const color = isHovered ? Config.PALETTE.CYAN_UI : '#e1f5fe';
                    renderer.drawText(`[ ${room.name} ]`, cx - 550, y, { size: 22, color: color, align: 'left' });
                    renderer.drawText(`Host: ${room.host}`, cx, y, { size: 20, color: '#aaa', align: 'center' });
                    renderer.drawText(`Players: ${room.players}/2`, cx + 550, y, { size: 20, color: color, align: 'right' });
                }
            }

            renderer.drawHudButton('<<', this.backBtn.label, cx - 350, cy + 200, 300, 50, this.backBtn.isHovered);
            renderer.drawHudButton('>>', this.createBtn.label, cx + 50, cy + 200, 300, 50, this.createBtn.isHovered);
        
        } else if (this.state === 'CREATING') {
            renderer.drawText("> INITIALIZE NEW MATCH", cx - 580, cy - 250, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'left' });
            
            renderer.drawText("ENTER MATCH NAME:", cx, cy - 60, { size: 28, color: Config.PALETTE.CYAN_UI, align: 'center' });
            
            renderer.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
            renderer.context.strokeStyle = Config.PALETTE.CYAN_UI;
            renderer.context.lineWidth = 2;
            renderer.context.fillRect(cx - 250, cy - 10, 500, 60);
            renderer.context.strokeRect(cx - 250, cy - 10, 500, 60);
            
            renderer.drawText(this.roomInput + (Date.now() % 1000 < 500 ? '_' : ''), cx, cy + 25, { size: 28, color: '#FFF', align: 'center' });

            renderer.drawHudButton('<<', this.cancelCreateBtn.label, cx - 350, cy + 200, 300, 50, this.cancelCreateBtn.isHovered);
            renderer.drawHudButton('>>', this.confirmCreateBtn.label, cx + 50, cy + 200, 300, 50, this.confirmCreateBtn.isHovered);

        } else if (this.state === 'MATCH_ROOM') {
            renderer.drawText(`> ROOM: ${this.currentRoom}`, cx - 580, cy - 250, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'left' });
            
            const p1Name = this.isHost ? this.userNickname : this.opponentName;
            const p1Ready = this.isHost ? this.isReady : this.opponentReady;
            const p1IsLocal = this.isHost;

            const p2Name = this.isHost ? this.opponentName : this.userNickname;
            const p2Ready = this.isHost ? this.opponentReady : this.isReady;
            const p2IsLocal = !this.isHost;

            // P1 Box (Left)
            renderer.context.fillStyle = 'rgba(0, 50, 50, 0.5)';
            renderer.context.strokeStyle = p1Ready ? Config.PALETTE.GREEN_TERMINAL : Config.PALETTE.CYAN_UI;
            renderer.context.fillRect(cx - 450, cy - 100, 350, 250);
            renderer.context.strokeRect(cx - 450, cy - 100, 350, 250);
            renderer.drawText(p1IsLocal ? "LOCAL NETRUNNER" : "HOST", cx - 275, cy - 60, { size: 20, color: '#aaa', align: 'center' });
            
            if (p1Name) {
                renderer.drawText(p1Name, cx - 275, cy + 10, { size: 36, color: '#fff', align: 'center' });
                renderer.drawText(p1Ready ? "STATUS: READY" : "STATUS: STANDBY", cx - 275, cy + 100, { size: 22, color: p1Ready ? Config.PALETTE.GREEN_TERMINAL : Config.PALETTE.YELLOW_MAIN, align: 'center' });
            } else {
                renderer.drawText("WAITING...", cx - 275, cy + 10, { size: 28, color: '#666', align: 'center' });
            }

            // Draw VS Text
            renderer.drawText("VS", cx, cy + 25, { size: 50, color: Config.PALETTE.RED_ALERT, align: 'center' });

            // P2 Box (Right)
            renderer.context.fillStyle = 'rgba(50, 0, 0, 0.3)';
            renderer.context.strokeStyle = p2Ready ? Config.PALETTE.GREEN_TERMINAL : Config.PALETTE.RED_ALERT;
            renderer.context.fillRect(cx + 100, cy - 100, 350, 250);
            renderer.context.strokeRect(cx + 100, cy - 100, 350, 250);
            renderer.drawText(p2IsLocal ? "LOCAL NETRUNNER" : "CHALLENGER", cx + 275, cy - 60, { size: 20, color: '#aaa', align: 'center' });
            
            if (p2Name) {
                renderer.drawText(p2Name, cx + 275, cy + 10, { size: 36, color: '#fff', align: 'center' });
                renderer.drawText(p2Ready ? "STATUS: READY" : "STATUS: STANDBY", cx + 275, cy + 100, { size: 22, color: p2Ready ? Config.PALETTE.GREEN_TERMINAL : Config.PALETTE.YELLOW_MAIN, align: 'center' });
            } else {
                renderer.drawText("WAITING...", cx + 275, cy + 10, { size: 28, color: '#666', align: 'center' });
            }

            if (this.countdown !== null) {
                renderer.drawText(`ENGAGE IN: ${this.countdown}`, cx, cy + 245, {
                    size: 60, color: Config.PALETTE.RED_ALERT, align: 'center', glowColor: Config.PALETTE.RED_ALERT, glowBlur: 20
                });
            } else {
                const leaveBtnX = this.isHost ? (cx + 50) : (cx - 350);
                renderer.drawHudButton(this.isHost ? '>>' : '<<', this.leaveBtn.label, leaveBtnX, cy + 220, 300, 50, this.leaveBtn.isHovered);
                
                const readyBtnX = this.isHost ? (cx - 350) : (cx + 50);
                if (this.opponentName && !this.isReady) {
                    renderer.drawHudButton(this.isHost ? '<<' : '>>', this.readyBtn.label, readyBtnX, cy + 220, 300, 50, this.readyBtn.isHovered);
                } else if (this.isReady && !this.opponentReady) {
                    const textX = this.isHost ? (cx - 200) : (cx + 200);
                    renderer.drawText("WAITING FOR OPPONENT...", textX, cy + 245, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });
                }
            }
        }
    }
}
