import { Config } from '../config.js';

export class PauseScreen {
    constructor(changeStateCallback, audioManager) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.options = ['RESUME LINK', 'SYSTEM SETTINGS', 'JACK OUT'];
        this.hoverOption = -1;
        this.mode = 'CAMPAIGN'; // Set by game.js
        this.showJackoutModal = false;
        this.modalHoverOption = -1;
    }

    handleClick() {
        if (this.hoverOption === 0) this.changeState('PLAYING');
        if (this.hoverOption === 1) this.changeState('OPTIONS', { previousState: 'PAUSED' });
        if (this.hoverOption === 2) {
            if (this.mode === 'MULTIPLAYER') {
                this.showJackoutModal = true;
            } else {
                this.changeState('MENU');
            }
        }
    }

    update(input) {
        if (this.showJackoutModal) {
            const cx = Config.BASE_WIDTH / 2;
            const cy = Config.BASE_HEIGHT / 2;
            const mx = input.mouse.x;
            const my = input.mouse.y;

            this.modalHoverOption = -1;
            // Option 0: YES
            if (mx > cx - 200 && mx < cx - 10 && my > cy + 20 && my < cy + 70) this.modalHoverOption = 0;
            // Option 1: NO
            if (mx > cx + 10 && mx < cx + 200 && my > cy + 20 && my < cy + 70) this.modalHoverOption = 1;
            
            if (input.mouse.clicked) {
                if (this.modalHoverOption === 0) {
                    this.audioManager.playUiHover();
                    this.showJackoutModal = false;
                    this.changeState('MENU');
                } else if (this.modalHoverOption === 1 || input.mouse.rightClicked) {
                    this.audioManager.playUiHover();
                    this.showJackoutModal = false;
                }
            }
            return;
        }

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

        if (this.showJackoutModal) {
            renderer.drawOverlay(); // dark background again
            const cx = Config.BASE_WIDTH / 2;
            const cy = Config.BASE_HEIGHT / 2;
            
            renderer.context.fillStyle = 'rgba(0, 0, 0, 0.95)';
            renderer.context.strokeStyle = Config.PALETTE.RED_ACCENT;
            renderer.context.lineWidth = 2;
            renderer.context.fillRect(cx - 300, cy - 100, 600, 200);
            renderer.context.strokeRect(cx - 300, cy - 100, 600, 200);

            renderer.drawText("WARNING: DISCONNECTING WILL ABANDON THE MATCH.", cx, cy - 40, { size: 20, color: Config.PALETTE.RED_ACCENT, align: 'center', flicker: true });
            renderer.drawText("PROCEED?", cx, cy - 10, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });
            
            renderer.drawHudButton("Y", "YES (JACK OUT)", cx - 200, cy + 20, 190, 50, this.modalHoverOption === 0);
            renderer.drawHudButton("N", "NO (RESUME)", cx + 10, cy + 20, 190, 50, this.modalHoverOption === 1);
        }
    }
}
