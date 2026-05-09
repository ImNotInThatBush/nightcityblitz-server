import { Config } from './config.js';
import { GamePRNG } from './utils.js';

export class Ball {
    constructor() {
        this.trail = [];
        this.isOverdrive = false;
        this.isDaemonTrace = false;
        this.prevX = 0;
        this.prevY = 0;
        this.daemonTrace = {
            phase: 'converging',
            progress: 0,
            startX: 0,
            originY: 0,
            targetDirection: 'center',
            direction: 1,
        };
        this.reset();
    }

    reset(servingPlayer = 'random') {
        this.x = Config.BASE_WIDTH  / 2;
        this.y = Config.BASE_HEIGHT / 2;
        this.radius = Config.GAMEPLAY.BALL_RADIUS;
        this.isOverdrive = false;
        this.isDaemonTrace = false;

        let direction;
        if (servingPlayer === 'random') direction = GamePRNG.nextFloat() > 0.5 ? 1 : -1;
        else direction = servingPlayer === 'player' ? 1 : -1;

        this.dx = direction * Config.GAMEPLAY.BALL_BASE_SPEED;
        this.dy = 0;
        this.trail = [];
    }

    activateDaemonTrace(impactX, impactY, targetDirection, direction = 1) {
        this.isDaemonTrace = true;
        this.isOverdrive = false;

        const m = Config.GAMEPLAY.ARENA_MARGIN + 50;
        let targetY;
        if (targetDirection === 'up') {
            targetY = m + GamePRNG.nextFloat() * (Config.BASE_HEIGHT / 2 - m);
        } else if (targetDirection === 'down') {
            targetY = Config.BASE_HEIGHT / 2 + GamePRNG.nextFloat() * (Config.BASE_HEIGHT / 2 - m);
        } else {
            targetY = m + GamePRNG.nextFloat() * (Config.BASE_HEIGHT - m * 2);
        }

        this.daemonTrace = {
            phase: 'converging',
            progress: 0,
            startX: impactX,
            originY: impactY,
            direction: direction,
            targetY: targetY,
            amplitude: 100 + GamePRNG.nextFloat() * 200, // Chaotic amplitude
            frequency: 2 + GamePRNG.nextFloat() * 3,     // Chaotic frequency
            phaseOffset: GamePRNG.nextFloat() * Math.PI * 2
        };
        this.dx = Config.GAMEPLAY.BALL_MAX_SPEED * direction;
        this.dy = 0;
        this.trail = [];
    }

    updatePhysics(gameScreen, dtSeconds) {
        if (this.isDaemonTrace) {
            this._updateDaemonTrace(dtSeconds);
        } else {
            this._updateNormalPhysics(gameScreen, dtSeconds);
        }
    }

    updateTrail(dtSeconds) {
        this._updateTrail(dtSeconds);
    }

    update(gameScreen, dtSeconds) {
        this.prevX = this.x;
        this.prevY = this.y;
        this.updatePhysics(gameScreen, dtSeconds);
        this.updateTrail(dtSeconds);
    }

    _updateTrail(dtSeconds) {
        this.trail.push({ x: this.x, y: this.y, alpha: 1.0, speed: this.currentSpeed, isOverdrive: this.isOverdrive || this.isDaemonTrace });
        if (this.trail.length > 30) this.trail.shift();
        const fadeSpeed = 2.4;
        this.trail.forEach(p => { p.alpha -= fadeSpeed * dtSeconds; });
        this.trail = this.trail.filter(p => p.alpha > 0);
    }

    _updateNormalPhysics(gameScreen, dtSeconds) {
        this.x += this.dx * dtSeconds;
        this.y += this.dy * dtSeconds;

        const m = Config.GAMEPLAY.ARENA_MARGIN;
        if (this.y - this.radius < m && this.dy < 0) {
            const penetration = m - (this.y - this.radius);
            this.y += penetration * 2;
            this.dy *= -1;
            if (gameScreen && typeof gameScreen.addWallImpact === 'function') {
                gameScreen.addWallImpact(this.x, 'top');
            }
        } else if (this.y + this.radius > Config.BASE_HEIGHT - m && this.dy > 0) {
            const penetration = (this.y + this.radius) - (Config.BASE_HEIGHT - m);
            this.y -= penetration * 2;
            this.dy *= -1;
            if (gameScreen && typeof gameScreen.addWallImpact === 'function') {
                gameScreen.addWallImpact(this.x, 'bottom');
            }
        }
    }

    _updateDaemonTrace(dtSeconds) {
        const traceDuration = 0.7;
        this.daemonTrace.progress += dtSeconds / traceDuration;
        if (this.daemonTrace.progress >= 1) { this.isDaemonTrace = false; return; }

        const centerX = Config.BASE_WIDTH  / 2;
        const centerY = Config.BASE_HEIGHT / 2;
        const dir = this.daemonTrace.direction;

        if (this.daemonTrace.phase === 'converging') {
            const p = Math.min(1, this.daemonTrace.progress * 2);
            this.x = this.daemonTrace.startX  + (centerX - this.daemonTrace.startX)  * p;
            this.y = this.daemonTrace.originY + (centerY - this.daemonTrace.originY) * p;
            if (this.daemonTrace.progress >= 0.5) this.daemonTrace.phase = 'snaking';
        }

        if (this.daemonTrace.phase === 'snaking') {
            const sp = (this.daemonTrace.progress - 0.5) * 2;
            const endX = dir === 1
                ? Config.BASE_WIDTH  - Config.GAMEPLAY.ARENA_MARGIN - 50
                : Config.GAMEPLAY.ARENA_MARGIN + 50;
            this.x = centerX + (endX - centerX) * sp;

            // Chaotic sine wave that dampens towards the end to cleanly hit the target Y
            const dampening = 1 - Math.pow(sp, 3); // Dampens heavily at the very end
            const yOffset = Math.sin(sp * Math.PI * this.daemonTrace.frequency + this.daemonTrace.phaseOffset) * this.daemonTrace.amplitude * dampening;
            
            // Linearly interpolate the base Y from center to the randomized targetY
            const baseY = centerY + (this.daemonTrace.targetY - centerY) * sp;
            
            this.y = baseY + yOffset;
            this.dx = Config.GAMEPLAY.BALL_MAX_SPEED * dir;
            
            // Set dy so that when it exits the trace, it has some residual vertical momentum based on where it's going
            this.dy = (this.daemonTrace.targetY - centerY) * 1.5; 
        }
    }

    get currentSpeed() {
        if (this.isDaemonTrace) return Config.GAMEPLAY.BALL_MAX_SPEED;
        return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    }

    draw(renderer) { renderer.drawBall(this); }
}
