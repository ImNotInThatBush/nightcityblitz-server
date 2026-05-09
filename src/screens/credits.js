import { Config } from '../config.js';

export class CreditsScreen {
    constructor(changeStateCallback, audioManager) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.timeElapsed = 0;
        this.scrollSpeed = 30; // pixels per second
        this.yOffset = Config.BASE_HEIGHT;
        this.isFinished = false;

        this.loreText = [
            "=========================================",
            "             NIGHT CITY BLITZ            ",
            "=========================================",
            "",
            "SISTEMA COMPROMESSO. FIREWALL ABBATTUTI.",
            "HAI FATTO A PEZZI L'ICE PIU' DURO DELLA RETE.",
            "",
            "ADAM SMASHER È STATO SCOLLEGATO.",
            "IL SUO ENAGRAMMA ORA APPARTIENE AL VUOTO.",
            "",
            "LE CORPO CERCANO DI TRACCIARE IL TUO IP,",
            "MA SEI GIA' UN FANTASMA.",
            "SEI LEGGENDA NELLA RETE PROFONDA.",
            "",
            "NESSUN SISTEMA È SICURO.",
            "NESSUN DECK PUO' FERMARTI.",
            "",
            "",
            "=========================================",
            "             CREDITI / EPILOGO           ",
            "=========================================",
            "",
            "SVILUPPO & DESIGN",
            "Antigravity Agent",
            "",
            "CO-DIREZIONE CREATIVA",
            "Night City Runner",
            "",
            "GRAZIE PER AVER GIOCATO.",
            "CI VEDIAMO DALLA PARTE SBAGLIATA DEL BLACKWALL.",
            "",
            "",
            "[ CLICK TO JACK OUT ]"
        ];
    }

    update(input, dtSeconds) {
        this.timeElapsed += dtSeconds;
        this.yOffset -= this.scrollSpeed * dtSeconds;

        // End of credits when the last line is off screen
        const textHeight = this.loreText.length * 40;
        if (this.yOffset + textHeight < Config.BASE_HEIGHT / 2) {
            this.isFinished = true;
        }

        if (input.mouse.clicked || input.keyPressed) {
            if (this.isFinished || this.timeElapsed > 3.0) { // Allow skip after 3 seconds
                this.audioManager.playSfx('uiHover');
                
                // Reset campaign progress
                localStorage.setItem('ncb_campaign_level', 1);
                
                // Transition back to menu and trigger full app reset
                this.changeState('MENU', { resetCampaign: true });
            }
        }
    }

    draw(renderer) {
        renderer.drawHudBackground();
        renderer.drawCircuitOverlay(renderer.circuitPulse);
        
        const margin = 50;
        let y = this.yOffset;
        const lineHeight = 40;

        for (let i = 0; i < this.loreText.length; i++) {
            let color = Config.PALETTE.CYAN_UI;
            if (i < 3 || this.loreText[i].includes("ADAM SMASHER") || this.loreText[i].includes("BLACKWALL")) {
                color = Config.PALETTE.RED_ACCENT;
            } else if (this.loreText[i].includes("CREDITI") || this.loreText[i].includes("NIGHT CITY BLITZ")) {
                color = Config.PALETTE.YELLOW_MAIN;
            }

            // Only draw if within screen bounds to save performance
            if (y > -50 && y < Config.BASE_HEIGHT + 50) {
                renderer.drawText(this.loreText[i], Config.BASE_WIDTH / 2, y, { 
                    size: 24, 
                    color: color, 
                    align: 'center', 
                    flicker: Math.random() > 0.95 
                });
            }
            y += lineHeight;
        }

        if (this.isFinished) {
            renderer.drawText("[ CLICK TO JACK OUT ]", Config.BASE_WIDTH / 2, Config.BASE_HEIGHT - 80, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'center', flicker: true });
        }
    }
}
