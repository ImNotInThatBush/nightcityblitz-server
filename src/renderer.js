import { Config } from './config.js';
import { hslToRgb } from './utils.js';

export class Renderer {
    constructor(canvas, context, offscreenCanvas) {
        this.canvas = canvas;
        this.context = context;
        this.offscreenCanvas = offscreenCanvas;
        this.offscreenContext = offscreenCanvas.getContext('2d');
        this.circuitPulse = 0;
        this.time = 0;
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.offscreenContext.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }

    saveGameFrame(sourceCanvas) {
        if (!this.savedGameCanvas) {
            this.savedGameCanvas = document.createElement('canvas');
            this.savedGameCanvas.width = Config.BASE_WIDTH;
            this.savedGameCanvas.height = Config.BASE_HEIGHT;
            this.savedGameContext = this.savedGameCanvas.getContext('2d');
        }
        this.savedGameContext.clearRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
        this.savedGameContext.drawImage(sourceCanvas, 0, 0);
    }

    drawSavedGameFrame() {
        if (this.savedGameCanvas) {
            this.context.drawImage(this.savedGameCanvas, 0, 0);
        }
    }

    drawHudBackground() {
        this.context.fillStyle = Config.PALETTE.BACKGROUND_TINT;
        this.context.fillRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
    }

    drawGameArena(wallImpacts, psychoIntensity = 0) {
        const ctx = this.context;
        const m = Config.GAMEPLAY.ARENA_MARGIN;
        const x = m, y = m;
        const w = Config.BASE_WIDTH  - m * 2;
        const h = Config.BASE_HEIGHT - m * 2;

        const p1 = 0.5 + Math.sin(this.circuitPulse * Math.PI * 2) * 0.4;
        const p2 = 0.5 + Math.sin(this.circuitPulse * Math.PI * 2 + Math.PI / 2) * 0.4;
        const wave = Math.sin(this.time * 15) * 18 * psychoIntensity;
        const flicker = psychoIntensity > 0 && Math.random() > (1 - psychoIntensity * 0.6) ? Math.random() : 0;

        ctx.save();
        this.applyGlow(Config.PALETTE.RED_ALERT, 25 + flicker * 50);
        ctx.lineWidth = 3 + flicker * 6;
        ctx.strokeStyle = `rgba(255,0,60,${Math.min(1, p1 + flicker)})`;
        ctx.strokeRect(x - 10 + wave, y - 10 - wave, w + 20, h + 20);
        this.applyGlow(Config.PALETTE.CYAN_UI, 20);
        ctx.lineWidth = 3;
        ctx.strokeStyle = `rgba(0,246,255,${Math.min(1, p2 + flicker * 0.5)})`;
        ctx.strokeRect(x - 5 - wave, y - 5 + wave, w + 10, h + 10);
        this.applyGlow(Config.PALETTE.YELLOW_MAIN, 15 + flicker * 30);
        ctx.lineWidth = 2 + flicker * 4;
        ctx.strokeStyle = flicker > 0.6 ? Config.PALETTE.WHITE_HOT : Config.PALETTE.YELLOW_MAIN;
        ctx.strokeRect(x, y, w, h);
        ctx.restore();

        // Corner sparks during psychosis
        if (psychoIntensity > 0.2) {
            [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([cx, cy]) => {
                if (Math.random() < psychoIntensity * 0.5) {
                    ctx.save();
                    this.applyGlow(Config.PALETTE.WHITE_HOT, 30 * psychoIntensity);
                    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * psychoIntensity})`;
                    ctx.lineWidth = 1.5;
                    for (let i = 0; i < 4; i++) {
                        const ang = Math.random() * Math.PI * 2;
                        const len = 8 + Math.random() * 40 * psychoIntensity;
                        ctx.beginPath(); ctx.moveTo(cx, cy);
                        ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len); ctx.stroke();
                    }
                    ctx.restore();
                }
            });
        }

        wallImpacts.forEach(imp => {
            ctx.save();
            const gx = (Math.random() - 0.5) * 60 * imp.alpha;
            const gy = (Math.random() - 0.5) * 60 * imp.alpha;
            ctx.strokeStyle = `rgba(252,238,10,${imp.alpha})`;
            ctx.lineWidth = 6 * imp.alpha;
            this.applyGlow(`rgba(252,238,10,${imp.alpha})`, 30 * imp.alpha);
            ctx.strokeRect(x + gx, y + gy, w, h);
            ctx.restore();
        });

        ctx.save();
        ctx.setLineDash([15, 15]);
        ctx.lineDashOffset = -this.circuitPulse * 80;
        ctx.beginPath();
        ctx.moveTo(Config.BASE_WIDTH / 2 + wave, y);
        ctx.lineTo(Config.BASE_WIDTH / 2 - wave, y + h);
        this.applyGlow(Config.PALETTE.CYAN_UI, 12 + psychoIntensity * 20);
        ctx.lineWidth = 1 + psychoIntensity * 2;
        ctx.strokeStyle = Config.PALETTE.CYAN_UI;
        ctx.stroke();
        ctx.restore();
    }

    drawPaddle(x, y, w, h, isPlayerLook, input, scale = 1, ghostingTimer = 0, isCharging = false) {
        const ctx = this.context;
        let drawX = x, drawW = w;
        if (isCharging) {
            const ca = (Math.sin(this.time * 20) + 1) * 2;
            drawX += ca / 2; drawW -= ca;
        }

        const color   = isPlayerLook ? Config.SETTINGS.playerPaddleColor   : Config.PALETTE.CYAN_UI;
        const chassis  = isPlayerLook ? Config.SETTINGS.playerPaddleChassis  : 'rgba(10,25,30,0.8)';
        const coreStyle = isPlayerLook ? Config.SETTINGS.playerPaddleCore    : 'segmented';
        const symbol   = isPlayerLook ? Config.SETTINGS.playerPaddleSymbol   : 'triangle';
        const pattern  = isPlayerLook ? Config.SETTINGS.playerPaddlePattern  : 'solid';
        const cut = 10 * scale;
        const swipeIntensity = (input && input.mouse && isPlayerLook) ? Math.min(1, Math.abs(input.mouse.vy) / 10) : 0;

        const isLeft = x < Config.BASE_WIDTH / 2;
        const definePath = (px, pw) => {
            ctx.beginPath();
            if (isLeft) {
                ctx.moveTo(px, y); ctx.lineTo(px + pw - cut, y); ctx.lineTo(px + pw, y + cut);
                ctx.lineTo(px + pw, y + h - cut); ctx.lineTo(px + pw - cut, y + h); ctx.lineTo(px, y + h);
            } else {
                ctx.moveTo(px + pw, y); ctx.lineTo(px + cut, y); ctx.lineTo(px, y + cut);
                ctx.lineTo(px, y + h - cut); ctx.lineTo(px + cut, y + h); ctx.lineTo(px + pw, y + h);
            }
            ctx.closePath();
        };

        ctx.save(); definePath(drawX, drawW); ctx.clip(); ctx.fillStyle = chassis; ctx.fill();
        if (isPlayerLook && pattern !== 'solid') {
            ctx.globalAlpha = 0.1; ctx.strokeStyle = color; ctx.lineWidth = 1 * scale;
            if (pattern === 'carbon') {
                for (let i = -h; i < drawW + h; i += 10 * scale) {
                    ctx.beginPath(); ctx.moveTo(drawX + i, y); ctx.lineTo(drawX + i - h, y + h); ctx.stroke();
                }
            } else if (pattern === 'hex') {
                const sz = 15 * scale, hw = Math.sqrt(3) * sz;
                for (let row = 0; row < (h / (sz * 1.5)) + 2; row++) {
                    for (let col = 0; col < (drawW / hw) + 2; col++) {
                        let hx = drawX + col * hw - hw / 2;
                        const hy = y + row * sz * 1.5 - sz;
                        if (row % 2 !== 0) hx += hw / 2;
                        ctx.beginPath();
                        for (let j = 0; j < 6; j++) {
                            const a = (Math.PI / 180) * (60 * j);
                            const method = j === 0 ? 'moveTo' : 'lineTo';
                            ctx[method](hx + sz * Math.cos(a), hy + sz * Math.sin(a));
                        }
                        ctx.closePath(); ctx.stroke();
                    }
                }
            }
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        const coreX = isLeft ? drawX + drawW - 8 * scale : drawX + 4 * scale;
        const coreW = 4 * scale, coreM = 5 * scale;
        ctx.save(); ctx.fillStyle = Config.PALETTE.WHITE_HOT;
        this.applyGlow(color, (15 + (isCharging ? 15 : 0)) * scale);
        if (coreStyle === 'segmented') {
            for (let i = 0; i < 3; i++) {
                const p = 0.6 + Math.sin(this.circuitPulse * Math.PI * (6 + i) + (isLeft ? 0 : Math.PI)) * 0.4;
                ctx.globalAlpha = p;
                const segH = h / 5;
                ctx.fillRect(coreX, y + segH * (i + 1), coreW, segH);
            }
        } else {
            ctx.globalAlpha = 0.7 + Math.sin(this.circuitPulse * Math.PI * 4 + (isLeft ? 0 : Math.PI)) * 0.3;
            ctx.fillRect(coreX, y + coreM, coreW, h - coreM * 2);
        }
        ctx.restore();

        if (symbol !== 'none') {
            ctx.save(); ctx.globalAlpha = 0.8; ctx.fillStyle = color; this.applyGlow(color, 8 * scale);
            const detailX = isLeft ? drawX + 8 * scale : drawX + drawW - 8 * scale;
            if (symbol === 'triangle') {
                const ty = y + 15 * scale;
                ctx.beginPath(); ctx.moveTo(detailX, ty - 5 * scale); ctx.lineTo(detailX - 4 * scale, ty + 3 * scale); ctx.lineTo(detailX + 4 * scale, ty + 3 * scale); ctx.closePath(); ctx.fill();
            } else if (symbol === 'circle') {
                ctx.beginPath(); ctx.arc(detailX, y + 15 * scale, 5 * scale, 0, Math.PI * 2); ctx.fill();
            } else if (symbol === 'ncb') {
                ctx.font = `${8 * scale}px 'Russo One', sans-serif`; ctx.textAlign = 'center';
                ctx.fillText("NCB", detailX, y + h - 15 * scale);
            }
            ctx.restore();
        }

        ctx.save(); definePath(drawX, drawW);
        ctx.strokeStyle = color; ctx.lineWidth = 2.5 * scale;
        this.applyGlow(color, (10 + (isCharging ? 10 : 0)) * scale); ctx.stroke(); ctx.restore();

        if (ghostingTimer > 0.01) {
            const intensity = Math.min(1, ghostingTimer / 0.2);
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const offset = 5 * intensity * (isLeft ? -1 : 1);
            ctx.globalAlpha = 0.6 * intensity;
            ctx.translate(offset, 0); definePath(drawX, drawW); ctx.strokeStyle = Config.PALETTE.RED_ALERT; ctx.lineWidth = 2 * scale; ctx.stroke();
            ctx.translate(-offset * 2, 0); ctx.strokeStyle = Config.PALETTE.CYAN_UI; ctx.stroke();
            ctx.restore();
        }

        if (swipeIntensity > 0.2) {
            const si = (swipeIntensity - 0.2) / 0.8;
            ctx.save();
            // chromatic split of the paddle silhouette
            ctx.globalCompositeOperation = 'lighter';
            const chromOff = si * 8 * scale;
            ctx.globalAlpha = 0.55 * si;
            definePath(drawX - chromOff, drawW);
            ctx.strokeStyle = Config.PALETTE.RED_ALERT; ctx.lineWidth = 2 * scale; ctx.stroke();
            definePath(drawX + chromOff, drawW);
            ctx.strokeStyle = Config.PALETTE.CYAN_UI; ctx.stroke();
            // horizontal scan-line tears through the paddle body
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 0.5 * si;
            for (let i = 0; i < 4; i++) {
                const tearY = y + Math.random() * h;
                const tearW = drawW * (0.3 + Math.random() * 0.7) * scale;
                const tearX = drawX + Math.random() * (drawW - tearW / scale) * scale;
                ctx.fillStyle = Math.random() < 0.5 ? Config.PALETTE.RED_ALERT : Config.PALETTE.CYAN_UI;
                ctx.fillRect(tearX, tearY, tearW, 1 + Math.random() * 2);
            }
            ctx.restore();
        }
    }

    drawBall(ball) {
        const ctx = this.context;
        if (ball.trail && ball.trail.length > 0) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            ball.trail.forEach(p => {
                const sr = Math.min(1, p.speed / Config.GAMEPLAY.BALL_MAX_SPEED);
                const tc = (p.isOverdrive || p.isDaemonTrace) ? Config.PALETTE.WHITE_HOT : (sr > 0.7 ? Config.PALETTE.RED_ALERT : Config.PALETTE.YELLOW_MAIN);
                ctx.beginPath();
                if (p.isOverdrive || p.isDaemonTrace) {
                    ctx.fillStyle = tc; ctx.globalAlpha = p.alpha;
                    this.applyGlow(tc, 25 * p.alpha);
                    ctx.fillRect(p.x - ball.radius * 2, p.y - ball.radius * 0.5, ball.radius * 4, ball.radius);
                } else {
                    ctx.arc(p.x, p.y, ball.radius * p.alpha * (1 + sr), 0, Math.PI * 2);
                    ctx.fillStyle = tc; ctx.globalAlpha = p.alpha * 0.3 * sr;
                    this.applyGlow(tc, 15 * p.alpha); ctx.fill();
                }
            });
            ctx.restore();
        }

        const sr = Math.min(1, (ball.currentSpeed - Config.GAMEPLAY.BALL_BASE_SPEED) / (Config.GAMEPLAY.BALL_MAX_SPEED - Config.GAMEPLAY.BALL_BASE_SPEED));
        const r = Math.floor(252 + (255 - 252) * sr);
        const g = Math.floor(238 + (255 - 238) * sr);
        const b = Math.floor(10  + (255 - 10)  * sr);
        const ballColor = `rgb(${r},${g},${b})`;

        ctx.save();
        this.applyGlow(ballColor, 25);
        if (sr > 0.1 && !(ball.isOverdrive || ball.isDaemonTrace)) {
            const corruption = Math.min(1, (sr - 0.1) / 0.6);
            const size = ball.radius * 2;
            const pixelation = Math.max(2, Math.floor(8 * (1 - corruption)));
            const off = this.offscreenContext;
            off.clearRect(0, 0, ball.radius * 2, ball.radius * 2);
            off.fillStyle = ballColor; off.beginPath(); off.arc(ball.radius, ball.radius, ball.radius, 0, Math.PI * 2); off.fill();
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(this.offscreenCanvas, 0, 0, pixelation, pixelation, ball.x - ball.radius, ball.y - ball.radius, size, size);
            ctx.imageSmoothingEnabled = true;
            if (Math.random() < corruption * 0.5) {
                ctx.fillStyle = Math.random() < 0.5 ? Config.PALETTE.RED_ALERT : Config.PALETTE.CYAN_UI;
                ctx.fillRect(ball.x - ball.radius + Math.random() * size, ball.y - ball.radius + Math.random() * size, 5, 5);
            }
        } else {
            ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = (ball.isOverdrive || ball.isDaemonTrace) ? Config.PALETTE.WHITE_HOT : ballColor;
            ctx.fill();
        }
        ctx.restore();
    }

    drawParticle(p) {
        const ctx = this.context;
        const color = p.color || Config.PALETTE.YELLOW_MAIN;
        ctx.save();
        if (p.type === 'shrapnel') {
            const glitchChars = "░▒▓█▄▀■□▪▫#%&?";
            const char = glitchChars[Math.floor(Math.random() * glitchChars.length)];
            ctx.font = `${10 + Math.random() * 8}px 'Russo One', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = color;
            this.applyGlow(color, 8);
            ctx.fillText(char, p.x, p.y);
        } else {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x - p.dx * 0.05, p.y - p.dy * 0.05);
            ctx.strokeStyle = `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},${p.alpha})`;
            ctx.lineWidth = 2;
            this.applyGlow(ctx.strokeStyle, 10);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawShockwave(sw) {
        const ctx = this.context;
        ctx.save();
        ctx.strokeStyle = `rgba(255,238,10,${sw.alpha * 0.8})`;
        ctx.lineWidth = 3 * sw.alpha;
        this.applyGlow(`rgba(252,238,10,${sw.alpha})`, 20 * sw.alpha);
        ctx.beginPath(); ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }

    drawGoalFlash(flash) {
        const ctx = this.context;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(${flash.color === Config.PALETTE.RED_ALERT ? '255,0,60' : '252,238,10'},${flash.alpha * 0.6})`;
        ctx.fillRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
        ctx.restore();
    }

    drawBreachEffect(b) {
        const ctx = this.context;
        ctx.save();
        const m = Config.GAMEPLAY.ARENA_MARGIN;
        const startX = b.side === 'left' ? m : Config.BASE_WIDTH - m;
        const h = Config.BASE_HEIGHT - m * 2;
        ctx.strokeStyle = `rgba(255,0,60,${b.alpha * 0.8})`;
        ctx.lineWidth = 1 + b.alpha * 2;
        this.applyGlow(`rgba(255,0,60,${b.alpha})`, 20 * b.alpha);
        for (let i = 0; i < 15; i++) {
            const y1 = m + Math.random() * h, y2 = m + Math.random() * h;
            const xOffset = (1 - b.alpha) * 300 * (b.side === 'left' ? -1 : 1);
            ctx.beginPath();
            ctx.moveTo(startX + xOffset, y1);
            ctx.lineTo(startX + (Math.random() - 0.5) * 200 * (1 - b.alpha), y2);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawRelicArtifacts(intensity) {
        const ctx = this.context;
        ctx.save();
        ctx.fillStyle = `rgba(0,100,255,${intensity * 0.1 * Math.random()})`;
        if (Math.random() < intensity * 0.3) ctx.fillRect(Math.random() * Config.BASE_WIDTH, Math.random() * Config.BASE_HEIGHT, 50 + Math.random() * 200, 2 + Math.random() * 8);
        if (Math.random() < intensity * 0.3) ctx.fillRect(Math.random() * Config.BASE_WIDTH, Math.random() * Config.BASE_HEIGHT, 2 + Math.random() * 8, 50 + Math.random() * 200);
        ctx.restore();
    }

    drawBreachMessage(timer) {
        const alpha = Math.sin((timer / 0.25) * Math.PI);
        this.drawText('//BREACH DETECTED//', Config.BASE_WIDTH / 2, Config.BASE_HEIGHT / 2, {
            size: 100, color: `rgba(255,0,60,${alpha * 0.9})`, align: 'center', chromatic: true, textGlitch: true,
        });
    }

    drawIceWall(wall) {
        const ctx = this.context;
        ctx.save(); ctx.globalAlpha = wall.alpha;
        this.applyGlow(`rgba(0,246,255,${wall.alpha})`, 20);
        if (wall.isHit) {
            for (let i = 0; i < 30; i++) {
                ctx.fillStyle = Math.random() < 0.8 ? Config.PALETTE.CYAN_UI : Config.PALETTE.WHITE_HOT;
                ctx.fillRect(wall.x + Math.random() * wall.width - (1 - wall.alpha) * 50, wall.y + Math.random() * wall.height + (Math.random() - 0.5) * (1 - wall.alpha) * 100, Math.random() * 8, Math.random() * 8);
            }
        } else {
            ctx.fillStyle = 'rgba(0,40,50,0.6)';
            ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
            ctx.strokeStyle = Config.PALETTE.CYAN_UI; ctx.lineWidth = 2;
            ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
            ctx.strokeStyle = 'rgba(0,246,255,0.4)'; ctx.lineWidth = 1;
            const sz = 20, hw = Math.sqrt(3) * sz;
            for (let row = -1; row < (wall.height / (sz * 1.5)) + 2; row++) {
                for (let col = -1; col < (wall.width / hw) + 2; col++) {
                    let hx = wall.x + col * hw; const hy = wall.y + row * sz * 1.5;
                    if (row % 2 !== 0) hx += hw / 2;
                    ctx.beginPath();
                    for (let j = 0; j < 7; j++) { const a = (Math.PI / 180) * (60 * j); ctx.lineTo(hx + sz * Math.cos(a), hy + sz * Math.sin(a)); }
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    drawRoundIndicator(x, y, filled) {
        const ctx = this.context;
        ctx.fillStyle = filled ? Config.PALETTE.YELLOW_MAIN : 'rgba(252,238,10,0.2)';
        ctx.strokeStyle = Config.PALETTE.YELLOW_MAIN; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.rect(x - 7.5, y - 4, 15, 8); ctx.fill();
        if (!filled) ctx.stroke();
    }

    drawRamBar(current, max, x, y, align) {
        if (current === null || current < 0) return;
        const ctx = this.context;
        const segW = 45, segH = 20, segSpacing = 5, textSpacing = 15;
        const totalBarW = max * segW + (max - 1) * segSpacing;
        let barColor = Config.PALETTE.RED_ALERT;
        if (current >= max - 0.001) barColor = Config.PALETTE.CYAN_UI;
        else if (current >= 2 - 0.001) barColor = Config.PALETTE.YELLOW_MAIN;
        if (current < 0) current = 0;

        ctx.font = `16px 'Russo One', sans-serif`;
        const ramText = "RAM";
        const textW = ctx.measureText(ramText).width;
        let barStartX, textX, textAlign;
        if (align === 'left') {
            textAlign = 'left'; textX = x; barStartX = x + textW + textSpacing;
        } else {
            textAlign = 'right'; textX = x; barStartX = x - textW - textSpacing - totalBarW;
        }

        this.drawText(ramText, textX, y, { size: 16, color: barColor, align: textAlign, glowColor: barColor, glowBlur: 10 });
        for (let i = 0; i < max; i++) {
            const segX = barStartX + i * (segW + segSpacing);
            const fill = Math.min(1, Math.max(0, current - i));
            ctx.save();
            if (fill >= 1) {
                this.applyGlow(barColor, 15); ctx.fillStyle = barColor;
                ctx.fillRect(segX, y - segH / 2, segW, segH);
            } else if (fill > 0.01) {
                this.applyGlow(barColor, 10 * fill);
                const m2 = barColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                const [r2, g2, b2] = m2 ? [m2[1], m2[2], m2[3]] : [255, 255, 255];
                ctx.fillStyle = `rgba(${r2},${g2},${b2},${0.2 + fill * 0.8})`;
                ctx.fillRect(segX, y - segH / 2, segW * fill, segH);
            }
            ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
            ctx.strokeRect(segX, y - segH / 2, segW, segH);
            ctx.restore();
        }
    }

    drawScore(p1Score, p2Score, p1Rounds, p2Rounds, animation, psychoIntensity = 0, p1RAM = null, p2RAM = null, p1Name = "PLAYER 1", p2Name = "PLAYER 2") {
        const yPos = Config.GAMEPLAY.ARENA_MARGIN / 2;
        const scoreSize = 32, labelSize = 16, animBonus = 10, gap = 20;
        const totalRounds = Config.GAMEPLAY.ROUNDS_TO_WIN_MATCH;
        const p1Size = scoreSize + (animation.player * animBonus);
        const p2Size = scoreSize + (animation.ai    * animBonus);
        const glowOpts = { flicker: true, chromatic: psychoIntensity > 0.2, textGlitch: psychoIntensity > 0.4, glowColor: Config.PALETTE.YELLOW_MAIN, glowBlur: 15 };

        this.context.font = `${labelSize}px 'Russo One', sans-serif`;
        const p1NameW = this.context.measureText(p1Name.toUpperCase()).width;
        const p2NameW = this.context.measureText(p2Name.toUpperCase()).width;

        let cx1 = Config.BASE_WIDTH * 0.05;
        if (p1RAM !== null && p1RAM >= 0) {
            this.drawRamBar(p1RAM, Config.GAMEPLAY.QUICKHACKS.RAM_MAX, cx1, yPos, 'left');
            const rw = this.context.measureText("RAM").width;
            cx1 += (Config.GAMEPLAY.QUICKHACKS.RAM_MAX * 45) + ((Config.GAMEPLAY.QUICKHACKS.RAM_MAX - 1) * 5) + rw + 15 + gap;
        }
        this.context.font = `${p1Size}px 'Russo One', sans-serif`;
        this.drawText(String(p1Score).padStart(2, '0'), cx1, yPos, { ...glowOpts, size: p1Size, align: 'left' });
        cx1 += this.context.measureText(String(p1Score).padStart(2, '0')).width + gap;
        this.drawText(p1Name.toUpperCase(), cx1, yPos, { size: labelSize, color: Config.PALETTE.YELLOW_MAIN, align: 'left', flicker: true, textGlitch: psychoIntensity > 0.6 });
        cx1 += p1NameW + gap;
        for (let i = 0; i < totalRounds; i++) this.drawRoundIndicator(cx1 + i * 20, yPos, i < p1Rounds);

        let cx2 = Config.BASE_WIDTH * 0.95;
        if (p2RAM !== null && p2RAM >= 0) {
            const rw = this.context.measureText("RAM").width;
            const barW = (Config.GAMEPLAY.QUICKHACKS.RAM_MAX * 45) + ((Config.GAMEPLAY.QUICKHACKS.RAM_MAX - 1) * 5) + rw + 15;
            this.drawRamBar(p2RAM, Config.GAMEPLAY.QUICKHACKS.RAM_MAX, cx2, yPos, 'right');
            cx2 -= (barW + gap);
        }
        this.context.font = `${p2Size}px 'Russo One', sans-serif`;
        this.drawText(String(p2Score).padStart(2, '0'), cx2, yPos, { ...glowOpts, size: p2Size, align: 'right' });
        cx2 -= this.context.measureText(String(p2Score).padStart(2, '0')).width + gap;
        this.drawText(p2Name.toUpperCase(), cx2, yPos, { size: labelSize, color: Config.PALETTE.YELLOW_MAIN, align: 'right', flicker: true, textGlitch: psychoIntensity > 0.6 });
        cx2 -= p2NameW + gap;
        for (let i = 0; i < totalRounds; i++) this.drawRoundIndicator(cx2 - i * 20, yPos, i < p2Rounds);
    }

    applyGlitch(intensity) {
        if (intensity <= 0.01) return;
        const ctx = this.context;
        this.offscreenContext.clearRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
        this.offscreenContext.drawImage(this.canvas, 0, 0);
        ctx.save();

        // Horizontal tears — random slices shifted sideways
        const tearCount = Math.floor(2 + intensity * 10);
        for (let i = 0; i < tearCount; i++) {
            const sy   = Math.random() * Config.BASE_HEIGHT;
            const sh   = 1 + Math.random() * 30 * intensity;
            const sx   = (Math.random() - 0.5) * 120 * intensity;
            ctx.drawImage(this.offscreenCanvas, 0, sy, Config.BASE_WIDTH, sh, sx, sy, Config.BASE_WIDTH, sh);
        }

        // Full-canvas chromatic aberration split
        ctx.globalCompositeOperation = 'lighter';
        const xOff = (Math.random() - 0.5) * 60 * intensity;
        const yOff = (Math.random() - 0.5) * 15 * intensity;
        ctx.globalAlpha = Math.min(0.6, 0.3 * intensity);
        ctx.drawImage(this.offscreenCanvas,  xOff,  yOff);
        ctx.drawImage(this.offscreenCanvas, -xOff, -yOff);

        ctx.restore();
    }

    applyGlow(color, blur) {
        this.context.shadowColor = color;
        this.context.shadowBlur  = blur > 0 ? blur : 0;
    }

    drawScanlines() {
        const ctx = this.context;
        ctx.fillStyle = 'rgba(100,220,255,0.05)';
        for (let i = 0; i < Config.BASE_HEIGHT; i += 4) ctx.fillRect(0, i, Config.BASE_WIDTH, 1);
    }

    drawFade(alpha) {
        this.context.fillStyle = `rgba(0,0,0,${alpha})`;
        this.context.fillRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
    }

    drawOverlay() {
        this.context.fillStyle = 'rgba(5,10,15,0.85)';
        this.context.fillRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
    }

    drawHudElement(text, x, y, align) {
        this.drawText(text, x, y, { size: 18, color: Config.PALETTE.CYAN_UI, align });
    }

    drawText(text, x, y, options = {}) {
        const { size = 20, color = Config.PALETTE.TEXT_PRIMARY, align = 'left', font = "'Russo One', sans-serif", flicker = false, chromatic = false, textGlitch = false, glowColor, glowBlur = 0 } = options;
        const ctx = this.context;
        let str = String(text);
        if (textGlitch && Math.random() > 0.9) {
            const glitchChars = "█▓▒░#?/$%&<>";
            str = Array.from({ length: str.length }, () => glitchChars[Math.floor(Math.random() * glitchChars.length)]).join('');
        }
        ctx.font = `${size}px ${font}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'middle';
        const xPos = x + (flicker && Math.random() > 0.9 ? (Math.random() - 0.5) * 6 : 0);
        ctx.save();
        if (glowColor && glowBlur > 0) this.applyGlow(glowColor, glowBlur); else this.applyGlow('transparent', 0);
        if (chromatic && Math.random() > 0.8) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter';
            const off = 1 + Math.random() * 3;
            ctx.fillStyle = 'rgba(255,0,60,0.7)';   ctx.fillText(str, xPos - off, y);
            ctx.fillStyle = 'rgba(0,246,255,0.7)';  ctx.fillText(str, xPos + off, y);
            ctx.restore();
        }
        ctx.fillStyle = color;
        ctx.fillText(str, xPos, y);
        ctx.restore();
    }

    drawHudButton(prefix, text, x, y, w, h, isHovered) {
        const ctx = this.context;
        const color = isHovered ? Config.PALETTE.YELLOW_MAIN : Config.PALETTE.CYAN_UI;
        const cut = h / 2;
        ctx.save();
        ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = 'bevel';
        this.applyGlow(isHovered ? Config.PALETTE.YELLOW_MAIN : 'transparent', isHovered ? 15 : 0);
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + w - cut, y); ctx.lineTo(x + w, y + cut);
        ctx.lineTo(x + w - cut, y + h); ctx.lineTo(x, y + h); ctx.closePath(); ctx.stroke();
        if (isHovered) { ctx.fillStyle = 'rgba(252,238,10,0.1)'; ctx.fillRect(x, y, w, h); }
        ctx.restore();
        const to = { size: 22, color, align: 'left', glowColor: isHovered ? color : null, glowBlur: 10, chromatic: isHovered };
        this.drawText(text, x + 80, y + h / 2, to);
        this.drawText(prefix, x + 30, y + h / 2, { ...to, align: 'center' });
    }

    drawOptionButton(text, x, y, w, h, isHovered, isSelected) {
        const ctx = this.context;
        const color = isSelected ? Config.PALETTE.YELLOW_MAIN : Config.PALETTE.CYAN_UI;
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = isSelected ? 3 : 2;
        if (isSelected || isHovered) this.applyGlow(isSelected ? color : Config.PALETTE.WHITE_HOT, 15); else this.applyGlow('transparent', 0);
        ctx.strokeRect(x, y, w, h); ctx.restore();
        if (isHovered) { ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(x, y, w, h); }
        this.drawText(text, x + w / 2, y + h / 2, { size: 18, color, align: 'center', glowColor: isSelected ? color : null, glowBlur: 10, chromatic: isSelected && Math.random() > 0.6 });
    }

    drawSlider(label, x, y, w, val) {
        const ctx = this.context;
        const bH = 4, hW = 10, hH = 25;
        const color = Config.PALETTE.CYAN_UI;
        this.drawText(label, x, y - 15, { size: 22, color: Config.PALETTE.TEXT_PRIMARY, align: 'left' });
        this.drawText(`${Math.round(val * 100)}%`, x + w, y - 15, { size: 22, color: Config.PALETTE.YELLOW_MAIN, align: 'right' });
        ctx.fillStyle = 'rgba(0,246,255,0.2)'; ctx.fillRect(x, y, w, bH);
        ctx.save(); this.applyGlow(color, 10); ctx.fillStyle = color; ctx.fillRect(x, y, w * val, bH); ctx.restore();
        ctx.save(); this.applyGlow(Config.PALETTE.YELLOW_MAIN, 15); ctx.fillStyle = Config.PALETTE.YELLOW_MAIN;
        ctx.fillRect(x + w * val - hW / 2, y + bH / 2 - hH / 2, hW, hH); ctx.restore();
        ctx.strokeStyle = Config.PALETTE.UI_OPAQUE_BACKGROUND; ctx.lineWidth = 2;
        ctx.strokeRect(x + w * val - hW / 2, y + bH / 2 - hH / 2, hW, hH);
    }

    drawBootScreen(fullText, cursorVisible) {
        this.drawText(fullText, 40, 40, { size: 24, color: Config.PALETTE.TERMINAL_GREEN, align: 'left' });
        if (cursorVisible) {
            this.context.font = `24px 'Russo One', sans-serif`;
            const textW = this.context.measureText(fullText).width;
            this.drawText("_", 40 + (fullText.length > 0 ? textW + 5 : 0), 40, { size: 24, color: Config.PALETTE.TERMINAL_GREEN, align: 'left' });
        }
    }

    drawCustomCursor(x, y) {
        const ctx = this.context;
        ctx.strokeStyle = Config.PALETTE.RED_ALERT; ctx.lineWidth = 2;
        this.applyGlow('transparent', 0);
        ctx.beginPath();
        ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8);
        ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y);
        ctx.stroke();
    }

    drawTab(text, x, y, w, h, isActive) {
        const ctx = this.context;
        const color = isActive ? Config.PALETTE.YELLOW_MAIN : Config.PALETTE.CYAN_UI;
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = isActive ? 3 : 1.5;
        if (isActive) this.applyGlow(color, 15); else this.applyGlow('transparent', 0);
        ctx.strokeRect(x, y, w, h);
        this.drawText(text, x + w / 2, y + h / 2, { size: 24, color, align: 'center' });
        ctx.restore();
    }

    drawPaletteButton(text, x, y, w, h, isHovered, isSelected, palette) {
        this.drawOptionButton(text, x, y, w, h, isHovered, isSelected);
        const ctx = this.context;
        ctx.fillStyle = palette.glow;    ctx.fillRect(x + w - 60, y + 10, 20, 30);
        ctx.fillStyle = palette.chassis; ctx.fillRect(x + w - 35, y + 10, 20, 30);
    }

    drawColorSwatch(x, y, size, color, isSelected) {
        const ctx = this.context;
        ctx.fillStyle = color; ctx.fillRect(x, y, size, size);
        if (isSelected) {
            ctx.save(); ctx.strokeStyle = Config.PALETTE.YELLOW_MAIN; ctx.lineWidth = 4;
            this.applyGlow(Config.PALETTE.YELLOW_MAIN, 15);
            ctx.strokeRect(x - 2, y - 2, size + 4, size + 4); ctx.restore();
        }
    }

    drawPaddlePreview(x, y, scale) {
        const w = Config.GAMEPLAY.PADDLE_WIDTH  * scale;
        const h = Config.GAMEPLAY.PADDLE_HEIGHT * scale;
        this.drawText("PREVIEW DECK", x, y + 20, { size: 24, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });
        const hoverY = y + 100 + Math.sin(this.time) * 20;
        this.drawPaddle(x - w / 2, hoverY, w, h, true, { mouse: { vy: 0 } }, scale);
    }

    drawCircuitOverlay(circuitPulse) {
        const ctx = this.context;
        const pulse = 0.5 + Math.sin(circuitPulse * Math.PI * 2) * 0.3;
        ctx.save();
        ctx.lineWidth = 1;

        const spacing = 100;
        const offset = (circuitPulse * spacing) % spacing;

        // Vertical traces
        for (let x = -offset; x < Config.BASE_WIDTH + spacing; x += spacing) {
            const a = Math.max(0, (0.05 + Math.sin((x / Config.BASE_WIDTH + circuitPulse) * Math.PI * 6) * 0.03) * pulse);
            ctx.strokeStyle = `rgba(0,246,255,${a})`;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, Config.BASE_HEIGHT); ctx.stroke();
        }

        // Horizontal traces (phase-shifted)
        const offset2 = ((circuitPulse + 0.5) * spacing) % spacing;
        for (let y = -offset2; y < Config.BASE_HEIGHT + spacing; y += spacing) {
            const a = Math.max(0, (0.04 + Math.sin((y / Config.BASE_HEIGHT + circuitPulse * 0.7) * Math.PI * 5) * 0.025) * pulse);
            ctx.strokeStyle = `rgba(0,246,255,${a})`;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Config.BASE_WIDTH, y); ctx.stroke();
        }

        // Nodes at intersections
        ctx.fillStyle = `rgba(0,246,255,${0.18 * pulse})`;
        for (let x = -offset; x < Config.BASE_WIDTH + spacing; x += spacing) {
            for (let y = -offset2; y < Config.BASE_HEIGHT + spacing; y += spacing) {
                ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
            }
        }

        // Moving yellow "active signal" traces
        for (let i = 0; i < 5; i++) {
            const progress = (circuitPulse * 0.6 + i / 5) % 1;
            const gy = Math.round((i * 2 + 1) * Config.BASE_HEIGHT / 10 / spacing) * spacing;
            const tx = progress * (Config.BASE_WIDTH + 200) - 100;
            ctx.strokeStyle = `rgba(252,238,10,${0.35 * pulse})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(tx - 80, gy); ctx.lineTo(tx, gy); ctx.stroke();
            ctx.fillStyle = `rgba(252,238,10,${0.6 * pulse})`;
            ctx.beginPath(); ctx.arc(tx, gy, 3, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
    }

    drawColorPicker(x, y, svBoxSize, hueBarW, colorState) {
        const ctx = this.context;
        const hueBarH = svBoxSize, alphaBarW = svBoxSize, alphaBarH = hueBarW;
        const hueBarX = x + svBoxSize + 20;
        const alphaBarY = y + svBoxSize + 20;

        this.applyGlow('transparent', 0);
        ctx.fillStyle = hslToRgb(colorState.h, 1, 0.5); ctx.fillRect(x, y, svBoxSize, svBoxSize);
        const wGrad = ctx.createLinearGradient(x, y, x + svBoxSize, y);
        wGrad.addColorStop(0, 'rgba(255,255,255,1)'); wGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = wGrad; ctx.fillRect(x, y, svBoxSize, svBoxSize);
        const bGrad = ctx.createLinearGradient(x, y, x, y + svBoxSize);
        bGrad.addColorStop(0, 'rgba(0,0,0,0)'); bGrad.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = bGrad; ctx.fillRect(x, y, svBoxSize, svBoxSize);

        const hGrad = ctx.createLinearGradient(hueBarX, y, hueBarX, y + hueBarH);
        for (let i = 0; i <= 1; i += 0.1) hGrad.addColorStop(i, `hsl(${i * 360},100%,50%)`);
        ctx.fillStyle = hGrad; ctx.fillRect(hueBarX, y, hueBarW, hueBarH);

        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.strokeRect(x, alphaBarY, alphaBarW, alphaBarH);
        const aGrad = ctx.createLinearGradient(x, alphaBarY, x + alphaBarW, alphaBarY);
        aGrad.addColorStop(0, hslToRgb(colorState.h, colorState.s, colorState.l, 0));
        aGrad.addColorStop(1, hslToRgb(colorState.h, colorState.s, colorState.l, 1));
        ctx.fillStyle = aGrad; ctx.fillRect(x, alphaBarY, alphaBarW, alphaBarH);

        ctx.strokeStyle = 'white'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x + colorState.s * svBoxSize, y + (1 - colorState.l) * svBoxSize, 5, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeRect(hueBarX - 5, y + colorState.h * hueBarH - 2, hueBarW + 10, 4);
        ctx.strokeRect(x + colorState.a * alphaBarW - 2, alphaBarY - 5, 4, alphaBarH + 10);
    }
}
