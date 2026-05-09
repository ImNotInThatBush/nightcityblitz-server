import { Config } from '../config.js';

export class GameOverScreen {
    constructor(changeStateCallback, audioManager, result) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.resultText = result.playerWon ? "CONNECTION SECURED" : "CONNECTION LOST";
        this.button = { label: "DISCONNECT", isHovered: false };
    }

    update(input) {
        const bW = 300, bX = (Config.BASE_WIDTH - bW) / 2, bY = Config.BASE_HEIGHT - 200;
        this.button.isHovered = (input.mouse.x > bX && input.mouse.x < bX + bW && input.mouse.y > bY && input.mouse.y < bY + 50);
        if (this.button.isHovered && input.mouse.clicked) this.changeState('MENU');
    }

    draw(renderer) {
        renderer.drawOverlay();
        renderer.drawText(this.resultText, Config.BASE_WIDTH / 2, Config.BASE_HEIGHT / 2 - 50, { size: 70, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });
        renderer.drawHudButton('>>', this.button.label, (Config.BASE_WIDTH - 300) / 2, Config.BASE_HEIGHT - 200, 300, 50, this.button.isHovered);
    }
}
