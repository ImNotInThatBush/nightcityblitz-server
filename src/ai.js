import { Config } from './config.js';
import { GamePRNG } from './utils.js';

export class SparringAI {
    constructor(paddle) { 
        this.paddle = paddle; 
    }

    update(ball, playerPaddle, dtSeconds) {
        // Perfect tracking, always matches ball.y
        this.paddle.y = ball.y - this.paddle.height / 2;
        
        // Bounds checking
        if (this.paddle.y < Config.GAMEPLAY.ARENA_MARGIN) this.paddle.y = Config.GAMEPLAY.ARENA_MARGIN;
        if (this.paddle.y + this.paddle.height > Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN) {
            this.paddle.y = Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN - this.paddle.height;
        }
    }

    decideQuickhack() { return null; }
    onBallCollision() { return false; }
}

export class DynamicCampaignAI {
    constructor(paddle, params) {
        this.paddle = paddle;
        this.params = params || { speed: 5, reactionDelay: 0.2, errorMargin: 0.1, hackFreq: 0.2, tactic: 'balanced' };
        this.patrolDirection = 1;
        this.decisionCooldown = 0;
        this.reactionTimer = 0;
        this.targetY = paddle.y;
        this.armedQuickhack = null;
    }

    update(ball, playerPaddle, dtSeconds) {
        if (this.decisionCooldown > 0) this.decisionCooldown -= dtSeconds;

        // If ball is moving away or far away, patrol and reset reaction timer
        if (ball.dx < 0 || Math.abs(ball.x - this.paddle.x) > Config.BASE_WIDTH * 0.6) {
            this.paddle.y += this.patrolDirection * 150 * dtSeconds;
            if (this.paddle.y <= Config.GAMEPLAY.ARENA_MARGIN) this.patrolDirection = 1;
            else if (this.paddle.y + this.paddle.height >= Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN) this.patrolDirection = -1;
            this.reactionTimer = this.params.reactionDelay;
            return;
        }

        // Delay reaction to simulate human reflexes or processing lag
        if (this.reactionTimer > 0) {
            this.reactionTimer -= dtSeconds;
            return;
        }

        // Calculate target with error margin
        let targetOffset = 0;
        if (this.params.errorMargin > 0) {
            targetOffset = Math.sin(Date.now() * 0.003) * (this.paddle.height * this.params.errorMargin);
        }

        // Se la pallina è in Daemon Trace, i sensori dell'IA impazziscono
        let currentSpeed = this.params.speed;
        if (ball.isDaemonTrace) {
            targetOffset += (GamePRNG.nextFloat() - 0.5) * Config.BASE_HEIGHT * 0.6; 
            currentSpeed *= 0.4; // Reazione rallentata per via dell'interferenza
        }

        this.targetY = (ball.y - this.paddle.height / 2) + targetOffset;

        const diff = this.targetY - this.paddle.y;
        
        // Speed modifier based on distance and tactic
        if (!ball.isDaemonTrace && Math.abs(ball.x - this.paddle.x) < Config.BASE_WIDTH * 0.3 && this.params.tactic !== 'defensive') {
            currentSpeed *= 1.8; // Panic speed boost when ball is close
        }

        this.paddle.y += diff * currentSpeed * dtSeconds;
        
        // Bounds checking
        if (this.paddle.y < Config.GAMEPLAY.ARENA_MARGIN) this.paddle.y = Config.GAMEPLAY.ARENA_MARGIN;
        if (this.paddle.y + this.paddle.height > Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN) {
            this.paddle.y = Config.BASE_HEIGHT - Config.GAMEPLAY.ARENA_MARGIN - this.paddle.height;
        }
    }

    decideQuickhack(ball, currentRam, playerPaddle) {
        if (this.decisionCooldown > 0) return null;
        if (this.params.hackFreq <= 0) return null;

        // Ice Wall logic: defend if ball is fast and approaching
        if (currentRam >= Config.GAMEPLAY.QUICKHACKS.ICE_WALL_COST - 0.001) {
            if (ball.dx > 0 && ball.currentSpeed / Config.GAMEPLAY.BALL_MAX_SPEED > 0.65) {
                if (GamePRNG.nextFloat() < this.params.hackFreq * 0.4) {
                    this.decisionCooldown = 2.0;
                    return 'ICE_WALL';
                }
            }
        }

        // Daemon Trace (Overdrive) logic
        if (currentRam >= Config.GAMEPLAY.QUICKHACKS.OVERDRIVE_COST - 0.001) {
            let chance = this.params.hackFreq * 0.02; // Per-frame probability
            if (this.params.tactic === 'aggressive' || this.params.tactic === 'erratic') chance *= 1.5;
            
            if (GamePRNG.nextFloat() < chance) {
                this.decisionCooldown = 1.5;
                this.armedQuickhack = 'DAEMON_TRACE';
                return 'DAEMON_TRACE';
            }
        }

        return null;
    }

    onBallCollision(ball, playerPaddle) {
        if (this.armedQuickhack === 'DAEMON_TRACE') {
            this.armedQuickhack = null;
            return 'USE_DAEMON_TRACE';
        }

        let returnTrue = false;
        
        // Tactic dictates corner boost usage
        if (this.params.tactic === 'erratic') {
            if (GamePRNG.nextFloat() < 0.6) {
                ball.dy += (GamePRNG.nextFloat() > 0.5 ? 1 : -1) * Config.GAMEPLAY.PADDLE_CORNER_BOOST;
                returnTrue = true;
            }
        } else if (this.params.tactic === 'aggressive') {
            if (GamePRNG.nextFloat() < 0.5) {
                // Try to shoot away from player's current vertical position
                ball.dy += (playerPaddle.y < Config.BASE_HEIGHT / 2 ? 1 : -1) * Config.GAMEPLAY.PADDLE_CORNER_BOOST;
                returnTrue = true;
            }
        } else if (this.params.tactic === 'balanced') {
            if (GamePRNG.nextFloat() < 0.25) {
                ball.dy += (GamePRNG.nextFloat() > 0.5 ? 1 : -1) * Config.GAMEPLAY.PADDLE_CORNER_BOOST;
                returnTrue = true;
            }
        }
        // Defensive tries to block center, no intentional corner boosts
        
        return returnTrue;
    }
}
