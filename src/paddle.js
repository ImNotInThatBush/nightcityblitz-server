import { Config } from './config.js';

export class Paddle {
    constructor(x, isPlayer = false, difficultyKey = 'CORPO SENTRY') {
        this.width  = Config.GAMEPLAY.PADDLE_WIDTH;
        this.height = Config.GAMEPLAY.PADDLE_HEIGHT;
        this.x = x;
        this.y = (Config.BASE_HEIGHT - this.height) / 2;
        this.isPlayer = isPlayer;

        if (!isPlayer) {
            this.difficulty   = Config.GAMEPLAY.DIFFICULTY_LEVELS[difficultyKey];
            this.aiController = null;
        }

        this.ghostingTimer = 0;
        this.isCharging    = false;
        this.prevY = this.y;
    }

    setAIController(controller) {
        if (!this.isPlayer) this.aiController = controller;
    }

    update(input, ball, dtSeconds, otherPaddle) {
        this.prevY = this.y;
        if (this.isPlayer) {
            this.y = input.mouse.y - this.height / 2;
        } else if (this.aiController) {
            this.aiController.update(ball, otherPaddle, dtSeconds);
        }
        const m = Config.GAMEPLAY.ARENA_MARGIN;
        this.y = Math.max(m, Math.min(Config.BASE_HEIGHT - this.height - m, this.y));
    }

    draw(renderer, input) {
        renderer.drawPaddle(this.x, this.y, this.width, this.height, this.isPlayer, input, 1, this.ghostingTimer, this.isCharging);
    }
}
