import { Config } from '../config.js';
import { Auth } from '../auth.js';

export class MainMenu {
    constructor(changeStateCallback, audioManager, userNickname = null) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.userNickname = userNickname;
        this.title = "NIGHT CITY BLITZ";
        this.hoverOption = -1;
        this.lastHoverOption = -1;
        this.showCampaignModal = false;
        this.modalHoverOption = -1;
    }

    get options() {
        const opts = ['ENTER CAMPAIGN', 'SPARRING MODE', 'MULTIPLAYER MATCH', 'SYSTEM SETTINGS'];
        if (Auth.isAdmin) opts.push('ADMIN OVERRIDE');
        return opts;
    }

    handleClick() {
        if (this.hoverOption !== -1) {
            this.audioManager.playUiHover();
            const selectedOpt = this.options[this.hoverOption];
            switch (selectedOpt) {
                case 'ENTER CAMPAIGN': 
                    if (this.currentCampaignLevel > 1) {
                        this.showCampaignModal = true;
                    } else {
                        this.changeState('CAMPAIGN_TERMINAL'); 
                    }
                    break;
                case 'SPARRING MODE': this.changeState('PLAYING', { mode: 'SPARRING' }); break;
                case 'MULTIPLAYER MATCH': this.changeState('LOBBY'); break;
                case 'SYSTEM SETTINGS': this.changeState('OPTIONS'); break;
                case 'ADMIN OVERRIDE': 
                    if (window.AdminPanel) window.AdminPanel.openAndRefresh();
                    break;
            }
        }
    }

    update(input) {
        if (this.showCampaignModal) {
            const cx = Config.BASE_WIDTH / 2;
            const cy = Config.BASE_HEIGHT / 2;
            const mx = input.mouse.x;
            const my = input.mouse.y;

            this.modalHoverOption = -1;
            // Option 0: CONTINUE
            if (mx > cx - 200 && mx < cx + 200 && my > cy && my < cy + 50) this.modalHoverOption = 0;
            // Option 1: RESET
            if (mx > cx - 200 && mx < cx + 200 && my > cy + 70 && my < cy + 120) this.modalHoverOption = 1;
            // Cancel area (click outside)
            
            if (input.mouse.clicked) {
                if (this.modalHoverOption === 0) {
                    this.audioManager.playUiHover();
                    this.showCampaignModal = false;
                    this.changeState('CAMPAIGN_TERMINAL');
                } else if (this.modalHoverOption === 1) {
                    this.audioManager.playUiHover();
                    this.showCampaignModal = false;
                    this.changeState('MENU', { resetCampaign: true });
                    setTimeout(() => { this.changeState('CAMPAIGN_TERMINAL'); }, 50); // Small delay to let game.js reset
                } else if (mx < cx - 250 || mx > cx + 250 || my < cy - 150 || my > cy + 150) {
                    // Click outside to cancel
                    this.showCampaignModal = false;
                }
            }
            return;
        }

        const buttonHeightDrawn = 40;
        const buttonOffsetY = 50;
        const fY = Config.BASE_HEIGHT - 320;
        const oW = 350;
        const oX = Config.BASE_WIDTH * 0.05;

        let foundHover = false;
        for (let i = 0; i < this.options.length; i++) {
            const oY = fY + i * buttonOffsetY;
            if (input.mouse.x > oX && input.mouse.x < oX + oW && input.mouse.y > oY && input.mouse.y < oY + buttonHeightDrawn) {
                this.hoverOption = i;
                foundHover = true;
                if (this.hoverOption !== this.lastHoverOption) {
                    this.audioManager.playUiHover();
                    this.lastHoverOption = this.hoverOption;
                }
                break;
            }
        }
        if (!foundHover) { this.hoverOption = -1; this.lastHoverOption = -1; }
        if (input.mouse.clicked) this.handleClick();
    }

    draw(renderer, input, userNickname = null) {
        renderer.drawHudBackground();
        renderer.drawCircuitOverlay(renderer.circuitPulse);
        const margin = 40;
        renderer.drawText(`> ID: ${this.title}`, margin, 50, {
            size: 48, color: Config.PALETTE.YELLOW_MAIN, align: 'left',
            glowColor: Config.PALETTE.YELLOW_MAIN, glowBlur: 20,
            flicker: true, chromatic: Math.random() > 0.7, textGlitch: Math.random() > 0.95
        });
        renderer.drawText(`// ${Config.GAME_VERSION}`, margin + 5, 80, { size: 16, color: Config.PALETTE.CYAN_UI, align: 'left', flicker: true });

        const idText = userNickname ? `[ID: ${userNickname}]` : `[ID: OFFLINE]`;
        renderer.drawHudElement(idText, margin, Config.BASE_HEIGHT - 40, 'left');
        renderer.drawHudElement(`[SYS: ONLINE]`, Config.BASE_WIDTH - margin, Config.BASE_HEIGHT - 40, 'right');

        const buttonHeightDrawn = 40;
        const buttonOffsetY = 50;
        const fY = Config.BASE_HEIGHT - 320;
        const oW = 350;
        const oX = margin;

        this.options.forEach((opt, i) => {
            renderer.drawHudButton(`0${i + 1}`, opt, oX, fY + i * buttonOffsetY, oW, buttonHeightDrawn, this.hoverOption === i);
        });

        if (this.showCampaignModal) {
            renderer.drawOverlay(); // dark background
            const cx = Config.BASE_WIDTH / 2;
            const cy = Config.BASE_HEIGHT / 2;
            
            renderer.context.fillStyle = 'rgba(0, 0, 0, 0.9)';
            renderer.context.strokeStyle = Config.PALETTE.CYAN_UI;
            renderer.context.lineWidth = 2;
            renderer.context.fillRect(cx - 250, cy - 100, 500, 250);
            renderer.context.strokeRect(cx - 250, cy - 100, 500, 250);

            renderer.drawText("CAMPAIGN IN PROGRESS", cx, cy - 50, { size: 32, color: Config.PALETTE.YELLOW_MAIN, align: 'center', flicker: true });
            
            renderer.drawHudButton("01", `CONTINUE (LEVEL ${this.currentCampaignLevel})`, cx - 200, cy, 400, 50, this.modalHoverOption === 0);
            renderer.drawHudButton("02", "NEW CAMPAIGN (RESET)", cx - 200, cy + 70, 400, 50, this.modalHoverOption === 1);
        }
    }
}
