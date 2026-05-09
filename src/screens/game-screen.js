import { Config } from '../config.js';
import { Paddle } from '../paddle.js';
import { Ball } from '../ball.js';
import { GamePRNG } from '../utils.js';

export class GameScreen {
    constructor(changeStateCallback, audioManager, gameData) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.data = gameData;

        const difficultyKey = gameData.difficulty || 'CORPO SENTRY';
        this.difficultyLabel = difficultyKey;
        this.playerNickname = gameData.nickname || 'NETRUNNER';

        this.player = new Paddle(Config.GAMEPLAY.ARENA_MARGIN + 30, true);
        this.ai = new Paddle(Config.BASE_WIDTH - Config.GAMEPLAY.ARENA_MARGIN - 30 - Config.GAMEPLAY.PADDLE_WIDTH, false, difficultyKey);
        this.ball = new Ball();
        this.playerScore = 0; this.aiScore = 0;
        this.playerRounds = 0; this.aiRounds = 0;
        this.rallyHits = 0;
        this.playerRAM = 0;
        this.aiRAM = 0;
        this.activeIceWall = null;
        this.aiActiveIceWall = null;
        this.isChargingOverdrive = false;
        this.goalFlash = { alpha: 0, color: '' };
        this.scoreAnimation = { player: 0, ai: 0 };
        this.particles = [];
        this.wallImpacts = [];
        this.shockwaves = [];
        this.breachEffects = [];
        this.breachMessageTimer = 0;
        this.glitchEffect = { intensity: 0 };
        this.screenShake = { intensity: 0, duration: 0, timer: 0 };
        this.cyberpsychosisIntensity = 0;

        this.isMultiplayer = gameData.mode === 'MULTIPLAYER';
        this.role = gameData.role || 'host';
        this.socket = gameData.socket || null;
        this.serverState = null;
        this.lastDx = null;

        if (this.isMultiplayer && this.socket) {
            this.socket.on('game_state_update', (state) => {
                this.serverState = state;
            });
            this.socket.on('opponent_left', () => {
                this.changeState('LOBBY');
            });
            this.socket.on('match_cancelled', () => {
                this.changeState('LOBBY');
            });
        }
    }

    triggerScreenShake(intensity, duration) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
        this.screenShake.duration = Math.max(this.screenShake.duration, duration);
        this.screenShake.timer = this.screenShake.duration;
    }

    addWallImpact(x, wall) {
        this.wallImpacts.push({ x, wall, alpha: 1.0 });
        this.triggerScreenShake(3, 0.1);
        this.glitchEffect.intensity = Math.max(this.glitchEffect.intensity, 0.2);
    }

    _isCircleIntersectingRect(circle, rect) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        const distanceX = circle.x - closestX;
        const distanceY = circle.y - closestY;
        return (distanceX * distanceX + distanceY * distanceY) <= (circle.radius * circle.radius);
    }

    checkCollision(input) {
        if (this.ball.isDaemonTrace) return;

        const circle = { x: this.ball.x, y: this.ball.y, radius: this.ball.radius };

        if (this.ball.dx < 0) {
            const playerRect = { x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height };
            if (this._isCircleIntersectingRect(circle, playerRect)) {
                this.handlePaddleCollision(this.player, true, input);
            } else if (this.activeIceWall) {
                const iceWallRect = { x: this.activeIceWall.x, y: this.activeIceWall.y, width: this.activeIceWall.width, height: this.activeIceWall.height };
                if (this._isCircleIntersectingRect(circle, iceWallRect)) {
                    this.ball.isOverdrive = false;
                    this.ball.dx *= -1;
                    this.ball.x = this.activeIceWall.x + this.activeIceWall.width + this.ball.radius;
                    this.activeIceWall.isHit = true;
                    this.audioManager.playSfx('iceWallBreak');
                    this.triggerScreenShake(10, 0.2);
                }
            }
        }

        if (this.ball.dx > 0) {
            const aiRect = { x: this.ai.x, y: this.ai.y, width: this.ai.width, height: this.ai.height };
            if (this._isCircleIntersectingRect(circle, aiRect)) {
                this.handlePaddleCollision(this.ai, false, input);
            } else if (this.aiActiveIceWall) {
                const aiIceWallRect = { x: this.aiActiveIceWall.x, y: this.aiActiveIceWall.y, width: this.aiActiveIceWall.width, height: this.aiActiveIceWall.height };
                if (this._isCircleIntersectingRect(circle, aiIceWallRect)) {
                    this.ball.isOverdrive = false;
                    this.ball.dx *= -1;
                    this.ball.x = this.aiActiveIceWall.x - this.ball.radius;
                    this.aiActiveIceWall.isHit = true;
                    this.audioManager.playSfx('iceWallBreak');
                    this.triggerScreenShake(10, 0.2);
                }
            }
        }
    }

    handlePaddleCollision(paddle, isPlayer, input) {
        let hitSound = 'hit';
        let isCutShot = false;

        const impactPoint = (this.ball.y - paddle.y) / paddle.height;
        const cornerSize = Config.GAMEPLAY.PADDLE_CORNER_RATIO;

        if (isPlayer && this.isChargingOverdrive) {
            let targetDirection = 'center';
            if (impactPoint < cornerSize) targetDirection = 'down';
            else if (impactPoint > 1 - cornerSize) targetDirection = 'up';

            this.ball.activateDaemonTrace(this.ball.x, this.ball.y, targetDirection, 1);
            this.isChargingOverdrive = false;
            this.player.isCharging = false;
            this.audioManager.stopChargeSound();
            this.audioManager.playSfx('overdriveFire');
            this.triggerScreenShake(15, 0.4);
            return;
        }

        if (this.ball.isOverdrive) this.ball.isOverdrive = false;

        this.rallyHits++;
        
        const currentSpeedBeforeSpin = this.ball.currentSpeed;
        const newSpeed = Math.min(Config.GAMEPLAY.BALL_MAX_SPEED, currentSpeedBeforeSpin + Config.GAMEPLAY.BALL_ACCELERATION_PER_HIT);

        const ratio = newSpeed / (currentSpeedBeforeSpin || 1);
        this.ball.dx *= -ratio;
        this.ball.dy *= ratio;
        this.ball.x = isPlayer ? paddle.x + paddle.width + this.ball.radius : paddle.x - this.ball.radius;

        if (isPlayer) {
            if (impactPoint < cornerSize || impactPoint > 1 - cornerSize) {
                const spinDirection = impactPoint < cornerSize ? -1 : 1;
                this.ball.dy += spinDirection * Config.GAMEPLAY.PADDLE_CORNER_BOOST;
                hitSound = 'hit-cut';
                isCutShot = true;
            }
            if (Math.abs(input.mouse.vy) > 2) {
                this.ball.dy += input.mouse.vy * Config.GAMEPLAY.PADDLE_SWIPE_BOOST;
                paddle.ghostingTimer = 0.2;
                if (hitSound === 'hit') hitSound = 'hit-swipe';
            }
        } else {
            let aiAction = false;
            if (paddle.aiController && paddle.aiController.onBallCollision) {
                aiAction = paddle.aiController.onBallCollision(this.ball, this.player);
            }
            if (aiAction === 'USE_DAEMON_TRACE') {
                this.aiRAM -= Config.GAMEPLAY.QUICKHACKS.OVERDRIVE_COST;
                const targetDirection = this.player.y > Config.BASE_HEIGHT / 2 ? 'up' : 'down';
                this.ball.activateDaemonTrace(this.ai.x, this.ai.y, targetDirection, -1);
                this.audioManager.playSfx('overdriveFire');
                return;
            } else if (aiAction === true) {
                this.ball.dy += (GamePRNG.nextFloat() > 0.5 ? 1 : -1) * Config.GAMEPLAY.PADDLE_CORNER_BOOST;
                const ramGained = Config.GAMEPLAY.QUICKHACKS.RAM_SKILL_BONUS;
                const oldRam = this.aiRAM;
                this.aiRAM = Math.min(Config.GAMEPLAY.QUICKHACKS.RAM_MAX, oldRam + ramGained);
            }
        }

        if (isPlayer && isCutShot) {
            const ramGained = Config.GAMEPLAY.QUICKHACKS.RAM_SKILL_BONUS;
            const oldRam = this.playerRAM;
            this.playerRAM = Math.min(Config.GAMEPLAY.QUICKHACKS.RAM_MAX, oldRam + ramGained);
            if (Math.floor(this.playerRAM) > Math.floor(oldRam)) {
                this.audioManager.playSfx('ramCellRecharged');
            }
        }

        const speedRatio = this.ball.currentSpeed / Config.GAMEPLAY.BALL_MAX_SPEED;
        this.audioManager.playSfx(hitSound, { pitch: speedRatio * 100 });

        paddle.ghostingTimer = 0.2;
        this.shockwaves.push({ x: this.ball.x, y: this.ball.y, radius: Config.GAMEPLAY.BALL_RADIUS, alpha: 1.0 });

        const particleColor = isPlayer ? Config.SETTINGS.playerParticleColor : Config.PALETTE.CYAN_UI;
        const particleCount = 60 + Math.floor(100 * speedRatio);
        for (let i = 0; i < particleCount; i++) {
            this.particles.push({ type: 'line', x: this.ball.x, y: this.ball.y, dx: (isPlayer ? 1 : -1) * Math.random() * 200 + (Math.random() - 0.5) * 800 * speedRatio, dy: (Math.random() - 0.5) * 800, alpha: 1, life: 0.4 + Math.random() * 0.5, color: particleColor });
        }
        if (speedRatio > 0.2) {
            const shrapnelCount = Math.floor(speedRatio * 25);
            for (let i = 0; i < shrapnelCount; i++) {
                this.particles.push({ type: 'shrapnel', x: this.ball.x, y: this.ball.y, dx: (Math.random() - 0.5) * 600, dy: (Math.random() - 0.5) * 600, alpha: 1, life: 0.2 + Math.random() * 0.3, color: particleColor });
            }
        }

        if (this.rallyHits > 2) {
            this.cyberpsychosisIntensity = Math.min(1, this.cyberpsychosisIntensity + 0.3);
            this.audioManager.startCyberpsychosisSfx();
        }
        this.triggerScreenShake(12 * speedRatio, 0.25);
        this.glitchEffect.intensity = Math.max(this.glitchEffect.intensity, 2.5 * speedRatio);
        if (speedRatio > 0.6) this.shockwaves.push({ x: this.ball.x, y: this.ball.y, radius: Config.GAMEPLAY.BALL_RADIUS * 2, alpha: 0.7 });
    }

    scorePoint(winner, isSync = false) {
        const breachSide = winner === 'player' ? 'right' : 'left';
        this.breachEffects.push({ side: breachSide, alpha: 1.0 });
        this.breachMessageTimer = 0.25;

        if (winner === 'player') {
            if (!isSync) this.playerScore++;
            this.goalFlash = { alpha: 1.0, color: Config.PALETTE.RED_ALERT };
            this.scoreAnimation.player = 1.0;
        } else {
            if (!isSync) this.aiScore++;
            this.goalFlash = { alpha: 1.0, color: Config.PALETTE.YELLOW_MAIN };
            this.scoreAnimation.ai = 1.0;
        }

        this.rallyHits = 0;
        this.cyberpsychosisIntensity = 0;
        this.audioManager.stopCyberpsychosisSfx();
        if (!isSync) this.ball.reset(winner === 'player' ? 'ai' : 'player');
        this.audioManager.playSfx('score');
        this.glitchEffect.intensity = 5.0;
        this.triggerScreenShake(35, 0.8);
        this.breachEffects.push({ side: breachSide, alpha: 1.0 });
    }

    update(input, dtSeconds) {
        if (this.isMultiplayer) {
            if (this.socket) {
                this.socket.emit('player_move', { y: input.mouse.y - this.player.height / 2 });
            }

            if (this.serverState) {
                const s = this.serverState;
                this.ball.prevX = this.ball.x;
                this.ball.prevY = this.ball.y;
                this.ball.x = s.ball.x;
                this.ball.y = s.ball.y;
                
                this.player.prevY = this.player.y;
                this.ai.prevY = this.ai.y;
                this.player.y = s.p1y;
                this.ai.y = s.p2y;
                
                if (this.lastDx !== null && s.ball.dx !== 0 && Math.sign(s.ball.dx) !== Math.sign(this.lastDx)) {
                    this.audioManager.playSfx('hit');
                    this.shockwaves.push({ x: this.ball.x, y: this.ball.y, radius: Config.GAMEPLAY.BALL_RADIUS, alpha: 1.0 });
                }
                this.lastDx = s.ball.dx;

                if (this.playerScore !== s.score[0] || this.aiScore !== s.score[1]) {
                    if (s.score[0] > this.playerScore) this.scorePoint('player', true);
                    else if (s.score[1] > this.aiScore) this.scorePoint('ai', true);
                    this.playerScore = s.score[0];
                    this.aiScore = s.score[1];
                }
            }
            this.ball.updateTrail(dtSeconds);
        } else {
            this.player.update(input, this.ball, dtSeconds, this.ai);
            this.ai.update(input, this.ball, dtSeconds, this.player);

            // CCD: sub-step ball so displacement per step ≤ 80% of ball radius (optimized for Circle-vs-AABB)
            this.ball.prevX = this.ball.x;
            this.ball.prevY = this.ball.y;
            const subSteps = Math.max(1, Math.ceil(this.ball.currentSpeed * dtSeconds / (this.ball.radius * 0.8)));
            const subDt = dtSeconds / subSteps;
            
            const playerFinalY = this.player.y;
            const aiFinalY = this.ai.y;

            for (let s = 0; s < subSteps; s++) {
                const t = subSteps > 1 ? (s + 1) / subSteps : 1;
                this.player.y = this.player.prevY + (playerFinalY - this.player.prevY) * t;
                this.ai.y = this.ai.prevY + (aiFinalY - this.ai.prevY) * t;

                this.ball.updatePhysics(this, subDt);
                this.checkCollision(input);
            }
            
            this.player.y = playerFinalY;
            this.ai.y = aiFinalY;
            this.ball.updateTrail(dtSeconds);

            const tolerance = 0.001;

            if (input.mouse.isHolding && !this.isChargingOverdrive && this.playerRAM >= Config.GAMEPLAY.QUICKHACKS.OVERDRIVE_COST - tolerance) {
                this.isChargingOverdrive = true;
                this.player.isCharging = true;
                this.playerRAM -= Config.GAMEPLAY.QUICKHACKS.OVERDRIVE_COST;
                this.audioManager.startChargeSound();
            } else if (!input.mouse.isHolding && this.isChargingOverdrive) {
                this.isChargingOverdrive = false;
                this.player.isCharging = false;
                this.playerRAM += Config.GAMEPLAY.QUICKHACKS.OVERDRIVE_COST;
                this.audioManager.stopChargeSound();
            }

            if (input.mouse.doubleClicked && !this.activeIceWall && this.playerRAM >= Config.GAMEPLAY.QUICKHACKS.ICE_WALL_COST - tolerance) {
                this.playerRAM -= Config.GAMEPLAY.QUICKHACKS.ICE_WALL_COST;
                this.activeIceWall = { x: this.player.x + this.player.width + 15, y: Config.GAMEPLAY.ARENA_MARGIN, width: 10, height: Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN * 2, alpha: 1.0, isHit: false };
                this.audioManager.playSfx('iceWallSpawn');
            }

            if (this.ai.aiController && this.ai.aiController.decideQuickhack) {
                const decision = this.ai.aiController.decideQuickhack(this.ball, this.aiRAM, this.player);
                if (decision === 'ICE_WALL' && !this.aiActiveIceWall) {
                    this.aiRAM -= Config.GAMEPLAY.QUICKHACKS.ICE_WALL_COST;
                    this.aiActiveIceWall = { x: this.ai.x - 15 - 10, y: Config.GAMEPLAY.ARENA_MARGIN, width: 10, height: Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN * 2, alpha: 1.0, isHit: false };
                    this.audioManager.playSfx('iceWallSpawn');
                }
            }
        } // End of local specific logic

        if (this.activeIceWall) {
            if (this.activeIceWall.isHit) this.activeIceWall.alpha -= dtSeconds * 3;
            if (this.activeIceWall.alpha <= 0) this.activeIceWall = null;
        }
        if (this.aiActiveIceWall) {
            if (this.aiActiveIceWall.isHit) this.aiActiveIceWall.alpha -= dtSeconds * 3;
            if (this.aiActiveIceWall.alpha <= 0) this.aiActiveIceWall = null;
        }

        if (this.cyberpsychosisIntensity > 0) {
            this.cyberpsychosisIntensity -= dtSeconds * 0.04;
            this.audioManager.updateCyberpsychosisSfx(this.cyberpsychosisIntensity);
        } else {
            this.audioManager.stopCyberpsychosisSfx();
        }

        if (this.breachMessageTimer > 0) this.breachMessageTimer -= dtSeconds;
        if (this.goalFlash.alpha > 0) this.goalFlash.alpha -= 1.8 * dtSeconds;
        if (this.glitchEffect.intensity > 0) this.glitchEffect.intensity -= 2.4 * dtSeconds;
        if (this.scoreAnimation.player > 0) this.scoreAnimation.player -= 3.0 * dtSeconds;
        if (this.scoreAnimation.ai > 0) this.scoreAnimation.ai -= 3.0 * dtSeconds;
        if (this.player.ghostingTimer > 0) this.player.ghostingTimer -= dtSeconds;
        if (this.ai.ghostingTimer > 0) this.ai.ghostingTimer -= dtSeconds;
        if (this.screenShake.timer > 0) { this.screenShake.timer -= dtSeconds; if (this.screenShake.timer <= 0) this.screenShake.intensity = 0; }

        this.particles = this.particles.filter(p => { p.x += p.dx * dtSeconds; p.y += p.dy * dtSeconds; p.alpha -= (1 / p.life) * dtSeconds; return p.alpha > 0; });
        this.wallImpacts = this.wallImpacts.filter(imp => { imp.alpha -= 2.4 * dtSeconds; return imp.alpha > 0; });
        this.shockwaves = this.shockwaves.filter(sw => { sw.radius += 600 * dtSeconds; sw.alpha -= 3.0 * dtSeconds; return sw.alpha > 0; });
        this.breachEffects = this.breachEffects.filter(b => { b.alpha -= 1.5 * dtSeconds; return b.alpha > 0; });

        if (input.mouse.rightClicked) this.changeState('PAUSED');

        if (this.ball.x < 0) { this.scorePoint('ai'); }
        else if (this.ball.x > Config.BASE_WIDTH) { this.scorePoint('player'); }

        let roundOver = false;
        if (this.playerScore >= Config.GAMEPLAY.ROUND_WINNING_SCORE) { this.playerRounds++; roundOver = true; }
        else if (this.aiScore >= Config.GAMEPLAY.ROUND_WINNING_SCORE) { this.aiRounds++; roundOver = true; }

        if (roundOver) {
            if (this.playerRounds >= Config.GAMEPLAY.ROUNDS_TO_WIN_MATCH || this.aiRounds >= Config.GAMEPLAY.ROUNDS_TO_WIN_MATCH) {
                this.audioManager.stopCyberpsychosisSfx();
                this.cyberpsychosisIntensity = 0;
                this.glitchEffect.intensity = 0;
                this.screenShake.intensity = 0;
                this.goalFlash.alpha = 0;
                this.particles = [];
                this.shockwaves = [];
                this.breachEffects = [];
                this.changeState('GAME_OVER', { playerWon: this.playerRounds > this.aiRounds });
            } else {
                this.playerScore = 0;
                this.aiScore = 0;
                // RAM non viene più resettata tra i round (Hardcore mode)
            }
        }
    }

    draw(renderer, input, alpha = 1) {
        renderer.drawGameArena(this.wallImpacts, this.cyberpsychosisIntensity);
        this.breachEffects.forEach(b => renderer.drawBreachEffect(b));
        renderer.drawScore(this.playerScore, this.aiScore, this.playerRounds, this.aiRounds, this.scoreAnimation, this.cyberpsychosisIntensity, this.playerRAM, this.aiRAM, this.playerNickname, this.difficultyLabel);
        if (this.activeIceWall) renderer.drawIceWall(this.activeIceWall);
        if (this.aiActiveIceWall) renderer.drawIceWall(this.aiActiveIceWall);

        const lp = (a, b) => a + (b - a) * alpha;
        renderer.drawPaddle(this.player.x, lp(this.player.prevY, this.player.y), this.player.width, this.player.height, true,  input, 1, this.player.ghostingTimer, this.isChargingOverdrive);
        renderer.drawPaddle(this.ai.x,     lp(this.ai.prevY,     this.ai.y),     this.ai.width,     this.ai.height,     false, input, 1, this.ai.ghostingTimer,     false);

        const savedX = this.ball.x, savedY = this.ball.y;
        this.ball.x = lp(this.ball.prevX, this.ball.x);
        this.ball.y = lp(this.ball.prevY, this.ball.y);
        this.ball.draw(renderer);
        this.ball.x = savedX; this.ball.y = savedY;

        this.particles.forEach(p => renderer.drawParticle(p));
        this.shockwaves.forEach(sw => renderer.drawShockwave(sw));
        if (this.goalFlash.alpha > 0) renderer.drawGoalFlash(this.goalFlash);
        if (this.cyberpsychosisIntensity > 0) renderer.drawRelicArtifacts(this.cyberpsychosisIntensity);
        if (this.breachMessageTimer > 0) renderer.drawBreachMessage(this.breachMessageTimer);
    }
}
