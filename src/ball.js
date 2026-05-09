import { Config } from './config.js';
import { GamePRNG } from './utils.js';

export class Ball {
    constructor() {
        this.trail = [];
        this.isOverdrive = false;
        this.isDaemonTrace = false;
        this.prevX = 0;
        this.prevY = 0;
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

        this.dx = Config.GAMEPLAY.BALL_MAX_SPEED * direction;
        
        let spin = 0;
        if (targetDirection === 'up') spin = -Config.GAMEPLAY.PADDLE_CORNER_BOOST * 1.5;
        else if (targetDirection === 'down') spin = Config.GAMEPLAY.PADDLE_CORNER_BOOST * 1.5;
        
        this.dy += spin;
        this.trail = [];
    }

    updatePhysics(gameScreen, dtSeconds) {
        this._updateNormalPhysics(gameScreen, dtSeconds);
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



    get currentSpeed() {
        if (this.isDaemonTrace) return Config.GAMEPLAY.BALL_MAX_SPEED;
        return Math.sqrt(this.dx * this.dx + this.dy * this.dy);
    }

    draw(renderer) { renderer.drawBall(this); }
}
