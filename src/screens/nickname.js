import { Config } from '../config.js';
import { Auth } from '../auth.js';

export class NicknameScreen {
    constructor(changeStateCallback, audioManager) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.title = "// NETRUNNER IDENTIFICATION PROTOCOL //";
        this.prompt = "Input your Handle & Password, choomba:";
        this.nickname = "";
        this.password = "";
        this.maxLength = 16;
        this.errorMessage = "";
        this.isLoading = false;
        this.confirmButton = { label: "REGISTER ID", isHovered: false };

        this.animationProgress = 0;
        this.animationDuration = 2.0;
        this.fragments = [];
        this.modalRect = { w: 750, h: 450, x: 585, y: 315 };
        this.pulseOffset = Math.random() * Math.PI * 2;

        this.inputElement = document.createElement('input');
        this.inputElement.type = 'text';
        this.inputElement.maxLength = this.maxLength;
        this.inputElement.placeholder = "HANDLE";
        
        this.passwordElement = document.createElement('input');
        this.passwordElement.type = 'password';
        this.passwordElement.maxLength = 32;
        this.passwordElement.placeholder = "PASSWORD";

        const inputStyle = {
            position: 'absolute', opacity: '0', pointerEvents: 'none',
            transition: 'opacity 0.3s ease-in-out, border-color 0.2s ease',
            width: '20.83vw', height: '4.62vh', left: '39.58vw',
            backgroundColor: 'rgba(5,10,15,0.8)',
            border: `2px solid ${Config.PALETTE.CYAN_UI}`,
            color: Config.PALETTE.TEXT_PRIMARY,
            fontFamily: "'Russo One', sans-serif",
            fontSize: '2.2vh', padding: '1vh',
            boxSizing: 'border-box', textAlign: 'center',
            caretColor: Config.PALETTE.TERMINAL_GREEN, outline: 'none',
        };

        Object.assign(this.inputElement.style, inputStyle);
        this.inputElement.style.top = '44.75vh'; // spostato più in alto
        
        Object.assign(this.passwordElement.style, inputStyle);
        this.passwordElement.style.top = '51.75vh'; // sotto al nickname

        this.inputElement.addEventListener('input', e => {
            e.target.value = e.target.value.replace(/[^a-z0-9_]/gi, '');
            this.nickname = e.target.value;
            this.errorMessage = "";
        });
        this.passwordElement.addEventListener('input', e => {
            this.password = e.target.value;
            this.errorMessage = "";
        });

        this.inputElement.addEventListener('keydown', e => {
            if (e.key === 'Enter') this.passwordElement.focus();
        });
        this.passwordElement.addEventListener('keydown', e => {
            if (e.key === 'Enter' && this.animationProgress >= this.animationDuration) this.handleConfirm();
        });

        this.inputElement.addEventListener('focus', () => { this.inputElement.style.borderColor = Config.PALETTE.YELLOW_MAIN; });
        this.inputElement.addEventListener('blur',  () => { this.inputElement.style.borderColor = Config.PALETTE.CYAN_UI; });
        this.passwordElement.addEventListener('focus', () => { this.passwordElement.style.borderColor = Config.PALETTE.YELLOW_MAIN; });
        this.passwordElement.addEventListener('blur',  () => { this.passwordElement.style.borderColor = Config.PALETTE.CYAN_UI; });
    }

    easeOutQuad(t) { return t * (2 - t); }

    generateFragments() {
        this.fragments = [];
        const { x, y, w, h } = this.modalRect;
        const cx = Config.BASE_WIDTH / 2, cy = Config.BASE_HEIGHT / 2;
        const segs = [
            {x1:x,y1:y,x2:x+w/2,y2:y},{x1:x+w/2,y1:y,x2:x+w,y2:y},
            {x1:x,y1:y+h,x2:x+w/2,y2:y+h},{x1:x+w/2,y1:y+h,x2:x+w,y2:y+h},
            {x1:x,y1:y,x2:x,y2:y+h/2},{x1:x,y1:y+h/2,x2:x,y2:y+h},
            {x1:x+w,y1:y,x2:x+w,y2:y+h/2},{x1:x+w,y1:y+h/2,x2:x+w,y2:y+h},
        ];
        for (let i = 0; i < 50; i++) {
            const seg = segs[i % segs.length];
            const t = Math.random();
            const endX = seg.x1 + (seg.x2 - seg.x1) * t;
            const endY = seg.y1 + (seg.y2 - seg.y1) * t;
            const angle = Math.random() * Math.PI * 2;
            const radius = 200 + Math.random() * 250;
            this.fragments.push({
                startX: cx + Math.cos(angle) * radius, startY: cy + Math.sin(angle) * radius,
                endX, endY, currentX: cx + Math.cos(angle) * radius, currentY: cy + Math.sin(angle) * radius,
                len: 15 + Math.random() * 20, angle: Math.random() * Math.PI * 2,
                targetAngle: Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1),
                delay: Math.random() * 0.5, duration: 0.8 + Math.random() * 0.7,
                progress: 0, settled: false,
            });
        }
    }

    enter() {
        this.generateFragments();
        document.body.appendChild(this.inputElement);
        document.body.appendChild(this.passwordElement);
        this.inputElement.value = "";
        this.passwordElement.value = "";
        this.inputElement.style.opacity = '0';
        this.passwordElement.style.opacity = '0';
        this.inputElement.style.pointerEvents = 'none';
        this.passwordElement.style.pointerEvents = 'none';
        this.nickname = ""; this.password = ""; this.errorMessage = ""; this.isLoading = false;
        this.animationProgress = 0; this.inputFocused = false;
    }

    exit() {
        if (this.inputElement.parentNode === document.body) {
            this.inputElement.style.opacity = '0';
            this.passwordElement.style.opacity = '0';
            this.inputElement.style.pointerEvents = 'none';
            this.passwordElement.style.pointerEvents = 'none';
            setTimeout(() => { 
                if (this.inputElement.parentNode === document.body) document.body.removeChild(this.inputElement); 
                if (this.passwordElement.parentNode === document.body) document.body.removeChild(this.passwordElement); 
            }, 300);
        }
    }

    updateAnimation(dtSeconds) {
        if (this.animationProgress >= this.animationDuration + 0.5) return;
        this.animationProgress += dtSeconds;
        this.fragments.forEach(f => {
            if (this.animationProgress >= f.delay && !f.settled) {
                const elapsed = this.animationProgress - f.delay;
                f.progress = Math.min(1, elapsed / f.duration);
                const ep = this.easeOutQuad(f.progress);
                f.currentX = f.startX + (f.endX - f.startX) * ep;
                f.currentY = f.startY + (f.endY - f.startY) * ep;
                const angleDiff = (f.targetAngle - f.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
                f.angle += angleDiff * ep * 0.1;
                if (f.progress >= 1) { f.settled = true; f.currentX = f.endX; f.currentY = f.endY; f.angle = f.targetAngle; }
            }
        });

        const inputStart = this.animationDuration * 0.7;
        const inputFadeDur = this.animationDuration * 0.3;
        if (this.animationProgress > inputStart) {
            const fp = Math.min(1, (this.animationProgress - inputStart) / inputFadeDur);
            this.inputElement.style.opacity = String(fp);
            this.passwordElement.style.opacity = String(fp);
            if (fp >= 1) {
                this.inputElement.style.pointerEvents = 'auto';
                this.passwordElement.style.pointerEvents = 'auto';
                if (!this.inputFocused) {
                    setTimeout(() => { if (document.body.contains(this.inputElement)) this.inputElement.focus(); }, 100);
                    this.inputFocused = true;
                }
            }
        }
        if (this.animationProgress / this.animationDuration < 1) this.inputFocused = false;
    }

    async handleConfirm() {
        if (this.isLoading || this.nickname.length === 0 || this.password.length === 0 || this.animationProgress < this.animationDuration) return;
        const nick = this.nickname.trim();
        const pass = this.password.trim();
        if (!nick.match(/^[a-z0-9_]{3,16}$/i)) {
            this.errorMessage = "// Invalid Handle (3-16 Alphanumeric/Underscore) //";
            return;
        }
        
        this.isLoading = true;
        this.confirmButton.label = "CONNECTING...";
        
        const loginResult = await Auth.login(nick, pass);
        
        this.isLoading = false;
        this.confirmButton.label = "REGISTER ID";

        if (loginResult.success) {
            this.audioManager.playUiHover();
            this.changeState('MENU');
        } else {
            this.errorMessage = `// ERROR: ${loginResult.error} //`;
        }
    }

    update(input, dtSeconds) {
        this.updateAnimation(dtSeconds);
        if (this.animationProgress >= this.animationDuration) {
            const bW = 300, bH = 50, bX = 810, bY = 655;
            this.confirmButton.isHovered = !this.isLoading && (input.mouse.x > bX && input.mouse.x < bX + bW && input.mouse.y > bY && input.mouse.y < bY + bH);
            if (this.confirmButton.isHovered && input.mouse.clicked) this.handleConfirm();
        } else {
            this.confirmButton.isHovered = false;
        }
    }

    draw(renderer) {
        const p = this.animationProgress;
        const ctx = renderer.context;
        const { x, y, w, h } = this.modalRect;

        const overlayAlpha = this.easeOutQuad(Math.min(1, p / 0.5)) * 0.85;
        ctx.fillStyle = `rgba(5,10,15,${overlayAlpha})`;
        ctx.fillRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);

        // Fragment animation
        ctx.save(); ctx.strokeStyle = Config.PALETTE.CYAN_UI; ctx.lineWidth = 1.5;
        renderer.applyGlow(Config.PALETTE.CYAN_UI, 6);
        this.fragments.forEach(f => {
            if (p >= f.delay && !f.settled) {
                const elapsed = p - f.delay;
                const fadeIn = Math.min(1, elapsed / 0.2);
                const fadeOut = 1 - this.easeOutQuad(f.progress);
                ctx.globalAlpha = fadeIn * fadeOut * 0.7;
                const dx = Math.cos(f.angle) * f.len / 2;
                const dy = Math.sin(f.angle) * f.len / 2;
                ctx.beginPath(); ctx.moveTo(f.currentX - dx, f.currentY - dy); ctx.lineTo(f.currentX + dx, f.currentY + dy); ctx.stroke();
            }
        });
        ctx.restore();

        // Background panel
        const bgP = Math.max(0, Math.min(1, (p - 0.5) / 0.7));
        if (bgP > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(5,10,15,${this.easeOutQuad(bgP) * 0.95})`;
            ctx.fillRect(x, y, w, h);
            ctx.globalAlpha = this.easeOutQuad(bgP) * 0.05;
            ctx.strokeStyle = Config.PALETTE.CYAN_UI; ctx.lineWidth = 0.5;
            const hexSize = 20, hexW = Math.sqrt(3) * hexSize;
            for (let row = -1; row < (h / (hexSize * 1.5)) + 2; row++) {
                for (let col = -1; col < (w / hexW) + 2; col++) {
                    let hx = x + col * hexW; const hy = y + row * hexSize * 1.5;
                    if (row % 2 !== 0) hx += hexW / 2;
                    ctx.beginPath();
                    for (let j = 0; j < 7; j++) { const a = (Math.PI / 180) * (60 * j); ctx.lineTo(hx + hexSize * Math.cos(a), hy + hexSize * Math.sin(a)); }
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        // Border
        const bP = Math.max(0, Math.min(1, (p - 0.3) / 1.0));
        if (bP > 0) {
            ctx.save(); ctx.globalAlpha = this.easeOutQuad(bP);
            const pulse = 0.8 + Math.sin(Date.now() * 0.005 + this.pulseOffset) * 0.2;
            ctx.strokeStyle = Config.PALETTE.YELLOW_MAIN; ctx.lineWidth = 4;
            renderer.applyGlow(Config.PALETTE.YELLOW_MAIN, 15 * pulse); ctx.strokeRect(x, y, w, h);
            const inset = 6;
            ctx.strokeStyle = Config.PALETTE.CYAN_UI; ctx.lineWidth = 1.5;
            renderer.applyGlow(Config.PALETTE.CYAN_UI, 5); ctx.strokeRect(x + inset, y + inset, w - inset * 2, h - inset * 2);
            const cL = 20, cG = 3;
            const x1 = x + inset, y1 = y + inset, x2 = x + w - inset, y2 = y + h - inset;
            ctx.lineWidth = 1; renderer.applyGlow(Config.PALETTE.CYAN_UI, 3);
            const corners = [[x1,y1,cL,0,0,cL,cG,cG,cL+cG,cG,cG,cL+cG],[x2,y1,-cL,0,0,cL,-cG,cG,-cL-cG,cG,-cG,cL+cG],[x1,y2,cL,0,0,-cL,cG,-cG,cL+cG,-cG,cG,-cL-cG],[x2,y2,-cL,0,0,-cL,-cG,-cG,-cL-cG,-cG,-cG,-cL-cG]];
            corners.forEach(([cx0,cy0,dx1,dy0,dx0,dy1,o1x,o1y,o2x,o1y2,o2x2,o2y2]) => {
                ctx.beginPath(); ctx.moveTo(cx0,cy0+dy1); ctx.lineTo(cx0,cy0); ctx.lineTo(cx0+dx1,cy0); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(cx0+o1x,cy0+o2y2); ctx.lineTo(cx0+o1x,cy0+o1y); ctx.lineTo(cx0+o2x,cy0+o1y); ctx.stroke();
            });
            ctx.restore();
        }

        // Title
        const titleP = Math.max(0, Math.min(1, (p - 0.6) / 0.8));
        if (titleP > 0) {
            const chars = Math.floor(this.title.length * titleP);
            let titleText = this.title.substring(0, chars);
            if (chars < this.title.length && Math.floor(p * 10) % 2 === 0) titleText += "█";
            renderer.drawText(titleText, 960, 385, { size: 28, color: Config.PALETTE.YELLOW_MAIN, align: 'center', glowColor: Config.PALETTE.YELLOW_MAIN, glowBlur: 10, chromatic: p > 1.2, textGlitch: p > 1.0 && Math.random() > 0.7 });
        }

        // Prompt
        const promptP = Math.max(0, Math.min(1, (p - 0.9) / 0.5));
        if (promptP > 0) renderer.drawText(this.prompt, 960, 455, { size: 22, color: `rgba(225,245,254,${this.easeOutQuad(promptP)})`, align: 'center' });

        // Counter
        const inputVis = parseFloat(this.inputElement.style.opacity);
        if (inputVis > 0) renderer.drawText(`[${this.nickname.length}/${this.maxLength}]`, 1175, 530, { size: 18, color: `rgba(0,246,255,${inputVis})`, align: 'left' });

        // Button
        const btnP = Math.max(0, Math.min(1, (p - 1.3) / 0.7));
        if (btnP > 0) {
            ctx.save(); ctx.globalAlpha = this.easeOutQuad(btnP);
            renderer.drawHudButton('>>', this.confirmButton.label, 810, 655, 300, 50, this.confirmButton.isHovered || this.isLoading);
            ctx.restore();
        }

        // Error
        if (this.errorMessage && p >= this.animationDuration) {
            renderer.drawText(this.errorMessage, 960, 595, { size: 20, color: Config.PALETTE.RED_ALERT, align: 'center' });
        }

        // Internal scanlines
        if (bgP > 0) {
            ctx.save(); ctx.globalAlpha = this.easeOutQuad(bgP) * 0.03; ctx.fillStyle = Config.PALETTE.CYAN_UI;
            ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
            for (let i = 0; i < Config.BASE_HEIGHT; i += 3) ctx.fillRect(0, y + i, Config.BASE_WIDTH, 1);
            ctx.restore();
        }
    }
}
