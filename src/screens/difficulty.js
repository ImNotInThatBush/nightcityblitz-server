import { Config } from '../config.js';

export class DifficultyScreen {
    constructor(changeStateCallback, audioManager) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.title = "// SELECT THREAT LEVEL //";
        this.options = Object.values(Config.GAMEPLAY.DIFFICULTY_LEVELS);
        this.backButton = { label: "JACK OUT", key: 'back' };
        this.hoverOption = null;
        this.lastHoverOption = null;
    }

    handleClick() {
        if (this.hoverOption) {
            this.audioManager.playUiHover();
            if (this.hoverOption.key === 'back') {
                this.changeState('MENU');
            } else {
                this.changeState('PLAYING', { difficulty: this.hoverOption.label });
            }
        }
    }

    update(input) {
        const oH = 50, oW = 400;
        const startY = (Config.BASE_HEIGHT - (this.options.length * (oH + 20))) / 2;
        const oX = (Config.BASE_WIDTH - oW) / 2;
        let foundHover = false;

        this.options.forEach((opt, i) => {
            const oY = startY + i * (oH + 20);
            if (input.mouse.x > oX && input.mouse.x < oX + oW && input.mouse.y > oY && input.mouse.y < oY + oH) {
                this.hoverOption = opt;
                foundHover = true;
            }
        });

        const bY = Config.BASE_HEIGHT - 120;
        if (input.mouse.x > oX && input.mouse.x < oX + oW && input.mouse.y > bY && input.mouse.y < bY + oH) {
            this.hoverOption = this.backButton;
            foundHover = true;
        }

        if (foundHover && this.hoverOption !== this.lastHoverOption) {
            this.audioManager.playUiHover();
            this.lastHoverOption = this.hoverOption;
        }
        if (!foundHover) { this.hoverOption = null; this.lastHoverOption = null; }
        if (input.mouse.clicked) this.handleClick();
    }

    draw(renderer) {
        renderer.drawHudBackground();
        renderer.drawScanlines();
        renderer.drawOverlay();
        renderer.drawText(this.title, Config.BASE_WIDTH / 2, 200, { size: 48, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });

        const oH = 50, oW = 400;
        const startY = (Config.BASE_HEIGHT - (this.options.length * (oH + 20))) / 2;
        const oX = (Config.BASE_WIDTH - oW) / 2;

        this.options.forEach((opt, i) => {
            const oY = startY + i * (oH + 20);
            renderer.drawHudButton(`0${i + 1}`, opt.label, oX, oY, oW, oH, this.hoverOption === opt);
        });

        const bY = Config.BASE_HEIGHT - 120;
        renderer.drawHudButton('<<', this.backButton.label, oX, bY, oW, oH, this.hoverOption === this.backButton);
    }
}
