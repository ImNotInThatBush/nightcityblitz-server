import { Config } from '../config.js';
import { CAMPAIGN_LEVELS } from '../campaign.js';

export class CampaignTerminalScreen {
    constructor(changeStateCallback, audioManager, currentLevel) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.setLevel(currentLevel);
    }

    setLevel(level) {
        this.levelData = CAMPAIGN_LEVELS.find(l => l.id === level) || CAMPAIGN_LEVELS[CAMPAIGN_LEVELS.length - 1];
        this.textLines = this.levelData.lore;
        this.currentLineIndex = 0;
        this.currentCharIndex = 0;
        this.timeSinceLastChar = 0;
        this.isTyping = true;
        this.typingSpeed = 0.03; // seconds per char
    }

    update(input, dtSeconds) {
        if (input.mouse.clicked || input.keyPressed) {
            if (this.isTyping) {
                // Skip typing
                this.isTyping = false;
                this.currentLineIndex = this.textLines.length - 1;
                this.currentCharIndex = this.textLines[this.currentLineIndex].length;
                this.audioManager.playUiHover();
            } else {
                // Start game
                this.audioManager.playUiHover();
                this.changeState('PLAYING', { mode: 'CAMPAIGN' });
            }
        }

        if (this.isTyping) {
            this.timeSinceLastChar += dtSeconds;
            if (this.timeSinceLastChar >= this.typingSpeed) {
                this.timeSinceLastChar = 0;
                this.currentCharIndex++;
                
                // Beep sound
                if (this.currentCharIndex % 3 === 0) {
                    this.audioManager.playSfx('paddleHit'); // Reusing click sound, make sure it's short
                }

                if (this.currentCharIndex > this.textLines[this.currentLineIndex].length) {
                    this.currentCharIndex = 0;
                    this.currentLineIndex++;
                    if (this.currentLineIndex >= this.textLines.length) {
                        this.isTyping = false;
                        this.currentLineIndex = this.textLines.length - 1;
                        this.currentCharIndex = this.textLines[this.currentLineIndex].length;
                    }
                }
            }
        }
    }

    draw(renderer) {
        renderer.drawHudBackground();
        renderer.drawCircuitOverlay(renderer.circuitPulse);
        
        const margin = 50;
        renderer.drawText(`LEVEL ${this.levelData.id}: ${this.levelData.opponentName}`, margin, 80, { size: 32, color: Config.PALETTE.RED_ACCENT, align: 'left', flicker: true });
        
        // Draw terminal box
        const boxY = 150;
        renderer.context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        renderer.context.strokeStyle = Config.PALETTE.CYAN_UI;
        renderer.context.lineWidth = 2;
        renderer.context.fillRect(margin, boxY, Config.BASE_WIDTH - margin * 2, 400);
        renderer.context.strokeRect(margin, boxY, Config.BASE_WIDTH - margin * 2, 400);

        // Draw lines
        const lineHeight = 40;
        let y = boxY + 50;
        for (let i = 0; i <= this.currentLineIndex; i++) {
            if (i >= this.textLines.length) break;
            
            let textToShow = this.textLines[i];
            if (i === this.currentLineIndex && this.isTyping) {
                textToShow = textToShow.substring(0, this.currentCharIndex) + "█";
            }
            
            let color = Config.PALETTE.CYAN_UI;
            if (i === 0 || i === 1) color = Config.PALETTE.YELLOW_MAIN; // Header lines
            
            renderer.drawText(textToShow, margin + 30, y, { size: 24, color: color, align: 'left' });
            y += lineHeight;
        }

        if (!this.isTyping) {
            renderer.drawText("[ CLICK TO ACCEPT CONTRACT ]", Config.BASE_WIDTH / 2, boxY + 350, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'center', flicker: true });
        } else {
            renderer.drawText("[ CLICK TO SKIP ]", Config.BASE_WIDTH / 2, boxY + 350, { size: 16, color: '#aaaaaa', align: 'center' });
        }
    }
}
