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
                case 'ENTER CAMPAIGN': this.changeState('CAMPAIGN_TERMINAL'); break;
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
    }
}
