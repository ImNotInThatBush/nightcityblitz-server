import { Config } from '../config.js';

export class PauseScreen {
    constructor(changeStateCallback, audioManager) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.options = ['RESUME LINK', 'SYSTEM SETTINGS', 'JACK OUT'];
        this.hoverOption = -1;
    }

    handleClick() {
        if (this.hoverOption === 0) this.changeState('PLAYING');
        if (this.hoverOption === 1) this.changeState('OPTIONS', { previousState: 'PAUSED' });
        if (this.hoverOption === 2) this.changeState('MENU');
    }

    update(input) {
        const oW = 300, oH = 50;
        this.hoverOption = -1;
        this.options.forEach((opt, i) => {
            const x = (Config.BASE_WIDTH - oW) / 2, y = 250 + i * (oH + 20);
            if (input.mouse.x > x && input.mouse.x < x + oW && input.mouse.y > y && input.mouse.y < y + oH) {
                this.hoverOption = i;
                if (input.mouse.clicked) this.handleClick();
            }
        });
        if (input.mouse.rightClicked) this.changeState('PLAYING');
    }

    draw(renderer) {
        renderer.drawOverlay();
        renderer.drawText("PAUSED", Config.BASE_WIDTH / 2, 150, { size: 80, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });
        this.options.forEach((opt, i) => {
            renderer.drawHudButton(`0${i + 1}`, opt, (Config.BASE_WIDTH - 300) / 2, 250 + i * 70, 300, 50, this.hoverOption === i);
        });
    }
}
