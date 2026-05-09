import { Config } from './config.js';
import { enterFullscreen } from './utils.js';
import { AudioManager } from './audio.js';
import { Input } from './input.js';
import { Renderer } from './renderer.js';
import { DynamicCampaignAI, SparringAI } from './ai.js';
import { CAMPAIGN_LEVELS } from './campaign.js';
import { MainMenu } from './screens/menu.js';
import { DifficultyScreen } from './screens/difficulty.js';
import { NicknameScreen } from './screens/nickname.js';
import { GameScreen } from './screens/game-screen.js';
import { PauseScreen } from './screens/pause.js';
import { GameOverScreen } from './screens/game-over.js';
import { OptionsScreen } from './screens/options.js';
import { CampaignTerminalScreen } from './screens/campaign-terminal.js';
import { LobbyScreen } from './screens/lobby.js';
import { Auth, AdminPanel } from './auth.js';

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');

        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = Config.BASE_WIDTH;
        this.offscreenCanvas.height = Config.BASE_HEIGHT;
        
        this.currentCampaignLevel = parseInt(localStorage.getItem('ncb_campaign_level')) || 1;

        Auth.init();
        AdminPanel.initAdminUI();
        this.userNickname = Auth.nickname;

        this.socketManager = { socket: window.io ? window.io(Config.API_URL) : null };

        this.audioManager = new AudioManager();
        this.renderer = new Renderer(this.canvas, this.context, this.offscreenCanvas, this.offscreenCanvas.getContext('2d'));
        this.input = new Input(this.canvas);

        const cb = (newState, data) => this.changeState(newState, data);

        this.mainMenu = new MainMenu(cb, this.audioManager, this.userNickname);
        this.optionsScreen = new OptionsScreen(cb, this.audioManager);
        this.difficultyScreen = new DifficultyScreen(cb, this.audioManager);
        this.nicknameScreen = new NicknameScreen(cb, this.audioManager);
        this.pauseScreen = new PauseScreen(cb, this.audioManager);
        this.campaignTerminalScreen = new CampaignTerminalScreen(cb, this.audioManager, this.currentCampaignLevel);
        this.lobbyScreen = new LobbyScreen(cb, this.audioManager, this.socketManager, this.userNickname);
        this.gameScreen = null;
        this.gameOverScreen = null;

        // If no nickname, force NicknameScreen on boot
        if (!this.userNickname) {
            this.gameState = 'NICKNAME';
            this.nicknameScreen.enter();
        } else {
            this.gameState = 'AWAITING_INTERACTION';
        }

        if (this.socketManager.socket) {
            this.socketManager.socket.on('opponent_left', () => {
                if (this.gameState === 'PLAYING' && this.gameScreen && this.gameScreen.data && this.gameScreen.data.mode === 'MULTIPLAYER') {
                    alert('L\'avversario si è disconnesso dalla partita.');
                    this.changeState('LOBBY');
                }
            });
        }

        this.fadeAlpha = 0;
        this.fadeTimer = 0;
        this.fadeDuration = Config.TRANSITION.FADE_DURATION;
        this.bootTextIndex = 0;
        this.bootTimer = 0;
        this.bootCursorVisible = true;
        this.bootCursorBlinkTimer = 0;

        this.lastTime = 0;
        this.accumulator = 0;
        this.gameLoop = this.gameLoop.bind(this);

        this.videoBg = document.getElementById('video-bg');
        this.wallpaperBg = document.getElementById('wallpaper-bg');
    }

    _loadLocalData() {
        try {
            const nick = localStorage.getItem('ncb_nickname');
            if (nick) this.userNickname = nick;

            const savedSettings = localStorage.getItem('ncb_settings');
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                Object.keys(Config.SETTINGS).forEach(key => {
                    if (Object.prototype.hasOwnProperty.call(parsed, key)) {
                        Config.SETTINGS[key] = parsed[key];
                    }
                });
                this.audioManager.updateMusicVolume();
            }
        } catch (e) {
            console.warn('Could not load local data:', e);
        }
    }

    changeState(newState, data = {}) {
        const oldState = this.gameState;

        if (oldState === 'NICKNAME') this.nicknameScreen.exit();

        const wasPlaying = oldState === 'PLAYING';
        const isStoppingPlay = newState === 'PAUSED' || newState === 'MENU' || newState === 'GAME_OVER';
        if (wasPlaying && isStoppingPlay) {
            this.audioManager.stopCyberpsychosisSfx();
            this.audioManager.stopChargeSound();
            if (newState !== 'PAUSED') {
                this.audioManager.stopGameplayMusic();
                if (this.gameScreen) {
                    this.gameScreen.cyberpsychosisIntensity = 0;
                    this.gameScreen.glitchEffect.intensity = 0;
                    this.gameScreen.screenShake.intensity = 0;
                }
            }
        }

        if (newState === 'MENU' && oldState !== 'BOOTING' && oldState !== 'FADING_OUT' && oldState !== 'AWAITING_INTERACTION') {
            if (oldState === 'PAUSED') this.audioManager.stopGameplayMusic();
            this.audioManager.playMenuMusic();
            if (this.socketManager && this.socketManager.socket) {
                this.socketManager.socket.emit('leave_room');
            }
        }

        if (newState === 'MENU') {
            this.userNickname = Auth.nickname;
        }

        this.gameState = newState;

        const kickPlayer = () => {
            Auth.logout();
            this.userNickname = null;
            this.changeState('NICKNAME');
        };

        if (newState === 'MENU' || newState === 'CAMPAIGN_TERMINAL' || newState === 'PLAYING') {
            Auth.enforceSessionValidation(kickPlayer);
        }

        if (newState === 'GAME_OVER') {
            if (this.gameScreen && this.gameScreen.data && this.gameScreen.data.mode === 'CAMPAIGN' && data.playerWon) {
                this.currentCampaignLevel++;
                if (this.currentCampaignLevel > 20) this.currentCampaignLevel = 20; // Or win screen
                localStorage.setItem('ncb_campaign_level', this.currentCampaignLevel);
            }
            this.gameOverScreen = new GameOverScreen(this.changeState.bind(this), this.audioManager, data);
        }

        if (newState === 'NICKNAME') {
            this.nicknameScreen.enter();
            this.wallpaperBg.style.opacity = '0';
            this.videoBg.style.opacity = '0.3';
        }

        if (newState === 'LOBBY') {
            this.lobbyScreen.enter(data);
            this.wallpaperBg.style.opacity = '0.5';
            this.videoBg.style.opacity = '0.5';
        }

        if (newState === 'PLAYING') {
            if (oldState !== 'PAUSED') {
                this.audioManager.stopMenuMusic();
                this.wallpaperBg.style.opacity = '1';
                this.videoBg.style.opacity = '0';
                this.gameScreen = new GameScreen(this.changeState.bind(this), this.audioManager, { 
                    ...data, 
                    nickname: this.userNickname,
                    socket: data.mode === 'MULTIPLAYER' ? this.socketManager.socket : null
                });

                let aiController;
                let forcedMusicIndex = null;
                
                if (data.mode === 'SPARRING') {
                    aiController = new SparringAI(this.gameScreen.ai);
                    const wallpaper = Config.GAMEPLAY.WALLPAPER_PLAYLIST[Math.floor(Math.random() * Config.GAMEPLAY.WALLPAPER_PLAYLIST.length)];
                    this.wallpaperBg.src = wallpaper;
                } else if (data.mode === 'MULTIPLAYER') {
                    // Multiplayer initialization (no AI needed, socket handles inputs)
                    aiController = null; // We'll disable AI processing in gameScreen if null
                    const wallpaper = Config.GAMEPLAY.WALLPAPER_PLAYLIST[Math.floor(Math.random() * Config.GAMEPLAY.WALLPAPER_PLAYLIST.length)];
                    this.wallpaperBg.src = wallpaper;
                } else {
                    const levelData = CAMPAIGN_LEVELS.find(l => l.id === this.currentCampaignLevel) || CAMPAIGN_LEVELS[0];
                    aiController = new DynamicCampaignAI(this.gameScreen.ai, levelData.aiParams);
                    const wallpaper = Config.GAMEPLAY.WALLPAPER_PLAYLIST[levelData.wallpaperIndex];
                    this.wallpaperBg.src = wallpaper;
                    forcedMusicIndex = levelData.musicIndex;
                }
                
                this.gameScreen.ai.setAIController(aiController);
                this.audioManager.playGameplayMusic(true, forcedMusicIndex);
            } else {
                if (!this.audioManager.gameMusicElement || this.audioManager.gameMusicElement.paused) {
                    this.audioManager.playGameplayMusic(false);
                }
            }
        }

        if (newState === 'PAUSED') {
            if (oldState === 'PLAYING') {
                this.renderer.saveGameFrame(this.canvas);
            }
        }

        if (newState === 'CAMPAIGN_TERMINAL') {
            this.audioManager.stopGameplayMusic();
            this.audioManager.playMenuMusic();
            this.wallpaperBg.style.opacity = '0';
            this.videoBg.style.opacity = '1';
            this.campaignTerminalScreen.setLevel(this.currentCampaignLevel);
        }

        if (newState === 'OPTIONS') {
            this.optionsScreen.previousState = data.previousState || 'MENU';
        }

        if (newState === 'MENU') {
            const fromValidState = oldState !== 'BOOTING' && oldState !== 'FADING_OUT' && oldState !== 'AWAITING_INTERACTION';
            if (fromValidState) {
                this.audioManager.stopGameplayMusic();
                if (!this.audioManager.menuMusicElement || this.audioManager.menuMusicElement.paused) {
                    this.audioManager.playMenuMusic();
                }
                this.wallpaperBg.style.opacity = '0';
                this.videoBg.style.opacity = '1';
                this._loadLocalData();
                this.userNickname = Auth.nickname; // Aggiorna da Auth
                if (this.lobbyScreen) this.lobbyScreen.userNickname = this.userNickname;
                this.mainMenu.userNickname = this.userNickname;
            }
        }
    }

    start() {
        this.videoBg.play().catch(() => console.warn('Video autoplay blocked.'));
        requestAnimationFrame(this.gameLoop);
    }

    update(dtSeconds) {
        if (this.gameState === 'AWAITING_INTERACTION' && (this.input.mouse.clicked || this.input.keyPressed)) {
            this.audioManager.unlockMedia();
            this.gameState = 'BOOTING';
        }

        switch (this.gameState) {
            case 'BOOTING':              this.updateBootSequence(dtSeconds); break;
            case 'AWAITING_INTERACTION': this.updateBootCursor(dtSeconds); break;
            case 'FADING_OUT':           this.updateFade(dtSeconds); break;
            case 'NICKNAME':             this.nicknameScreen.update(this.input, dtSeconds); break;
            case 'MENU':                 this.mainMenu.update(this.input); break;
            case 'LOBBY':                this.lobbyScreen.update(this.input); break;
            case 'SELECT_DIFFICULTY':    this.difficultyScreen.update(this.input); break;
            case 'OPTIONS':              this.optionsScreen.update(this.input); break;
            case 'PLAYING':              if (this.gameScreen) this.gameScreen.update(this.input, dtSeconds); break;
            case 'PAUSED':               this.pauseScreen.update(this.input); break;
            case 'GAME_OVER':            if (this.gameOverScreen) this.gameOverScreen.update(this.input); break;
            case 'CAMPAIGN_TERMINAL':    this.campaignTerminalScreen.update(this.input, dtSeconds); break;
        }
    }

    updateBootCursor(dtSeconds) {
        this.bootCursorBlinkTimer += dtSeconds;
        if (this.bootCursorBlinkTimer > Config.BOOT_SEQUENCE.CURSOR_BLINK_RATE) {
            this.bootCursorVisible = !this.bootCursorVisible;
            this.bootCursorBlinkTimer = 0;
        }
    }

    updateBootSequence(dtSeconds) {
        this.updateBootCursor(dtSeconds);
        if (this.bootTextIndex < Config.BOOT_SEQUENCE.TEXT.length) {
            this.bootTimer += dtSeconds;
            if (this.bootTimer > 1 / Config.BOOT_SEQUENCE.TYPING_SPEED) {
                this.bootTextIndex++;
                this.bootTimer = 0;
                this.audioManager.playTypingSound();
            }
        } else {
            this.bootTimer += dtSeconds;
            if (this.bootTimer > Config.BOOT_SEQUENCE.POST_BOOT_DELAY) {
                this.gameState = 'FADING_OUT';
                this.fadeTimer = 0;
                try { enterFullscreen(document.documentElement); } catch (e) { console.warn('Fullscreen request failed:', e); }
            }
        }
    }

    updateFade(dtSeconds) {
        this.fadeTimer += dtSeconds;
        this.fadeAlpha = Math.min(1, this.fadeTimer / this.fadeDuration);

            if (this.fadeAlpha >= 1) {
                this._loadLocalData();
                this.userNickname = Auth.nickname; // Aggiorna il nickname da Auth
                if (this.lobbyScreen) this.lobbyScreen.userNickname = this.userNickname; // Propaga alla Lobby

                if (this.userNickname) {
                    this.mainMenu.userNickname = this.userNickname;
                    this.changeState('MENU');
                    this.audioManager.playMenuMusic();
                } else {
                    this.changeState('NICKNAME');
                }
                this.fadeTimer = 0;
            this.fadeAlpha = 0;
        }
    }

    draw(alpha = 1) {
        this.renderer.clear();
        this.context.save();

        const isActiveGame = this.gameState === 'PLAYING';
        const shakeIntensity = isActiveGame ? (this.gameScreen?.screenShake?.intensity || 0) : 0;
        const baseNoise = isActiveGame && Math.random() > 0.96 ? Math.random() * 0.5 : 0;
        const glitchIntensity = isActiveGame ? ((this.gameScreen?.glitchEffect?.intensity || 0) + (this.gameScreen?.cyberpsychosisIntensity || 0) * 0.7 + baseNoise) : 0;

        if (shakeIntensity > 0) {
            this.context.translate((Math.random() - 0.5) * shakeIntensity, (Math.random() - 0.5) * shakeIntensity);
        }

        switch (this.gameState) {
            case 'MENU':             this.mainMenu.draw(this.renderer, this.input, this.userNickname); break;
            case 'LOBBY':            this.lobbyScreen.draw(this.renderer); break;
            case 'SELECT_DIFFICULTY': this.mainMenu.draw(this.renderer, this.input, this.userNickname); this.difficultyScreen.draw(this.renderer); break;
            case 'OPTIONS':          this.optionsScreen.draw(this.renderer); break;
            case 'NICKNAME':         this.nicknameScreen.draw(this.renderer); break;
            case 'CAMPAIGN_TERMINAL': this.campaignTerminalScreen.draw(this.renderer); break;
            case 'PLAYING':          if (this.gameScreen) this.gameScreen.draw(this.renderer, this.input, alpha); break;
            case 'PAUSED':           
                if (this.renderer.savedGameCanvas) {
                    this.renderer.drawSavedGameFrame();
                } else if (this.gameScreen) {
                    this.gameScreen.draw(this.renderer, this.input, alpha); 
                }
                this.pauseScreen.draw(this.renderer); 
                break;
            case 'GAME_OVER':        if (this.gameScreen) this.gameScreen.draw(this.renderer, this.input, alpha); if (this.gameOverScreen) this.gameOverScreen.draw(this.renderer); break;
        }

        if (['AWAITING_INTERACTION', 'BOOTING', 'FADING_OUT'].includes(this.gameState)) {
            this.context.fillStyle = 'black';
            this.context.fillRect(0, 0, Config.BASE_WIDTH, Config.BASE_HEIGHT);
            const textToShow = (this.gameState === 'BOOTING' || this.gameState === 'FADING_OUT')
                ? Config.BOOT_SEQUENCE.TEXT.substring(0, this.bootTextIndex)
                : '[ CLICK TO INITIALIZE ]';
            this.renderer.drawBootScreen(textToShow, this.bootCursorVisible && this.gameState !== 'FADING_OUT');
        }

        if (this.fadeAlpha > 0 && !['AWAITING_INTERACTION', 'BOOTING'].includes(this.gameState)) {
            this.renderer.drawFade(this.fadeAlpha);
        }

        if (glitchIntensity > 0) this.renderer.applyGlitch(glitchIntensity);

        this.context.restore();

        const showCursor = ['MENU', 'OPTIONS', 'PAUSED', 'GAME_OVER', 'SELECT_DIFFICULTY', 'NICKNAME', 'CAMPAIGN_TERMINAL', 'LOBBY'].includes(this.gameState)
            && !(this.gameState === 'NICKNAME' && this.nicknameScreen.animationProgress < this.nicknameScreen.animationDuration)
            && !['AWAITING_INTERACTION', 'BOOTING', 'FADING_OUT'].includes(this.gameState);

        if (showCursor) {
            if (['MENU', 'OPTIONS', 'SELECT_DIFFICULTY', 'CAMPAIGN_TERMINAL', 'LOBBY'].includes(this.gameState)) this.renderer.drawScanlines();
            this.renderer.drawCustomCursor(this.input.mouse.x, this.input.mouse.y);
        }
    }

    gameLoop(timestamp) {
        const frameTime = Math.min(timestamp - this.lastTime, 250);
        this.lastTime = timestamp;

        if (this.gameState !== 'PAUSED') {
            this.renderer.circuitPulse = (this.renderer.circuitPulse + (frameTime / 1000) * 1.5) % 1;
            this.renderer.time += frameTime / 1000;
        }
        this.input.update();

        this.accumulator += frameTime;
        while (this.accumulator >= Game.FIXED_STEP_MS) {
            this.update(Game.FIXED_STEP_MS / 1000);
            this.accumulator -= Game.FIXED_STEP_MS;
        }

        this.input.reset();

        this.draw(this.accumulator / Game.FIXED_STEP_MS);
        requestAnimationFrame(this.gameLoop);
    }
}

Game.FIXED_STEP_MS = 1000 / 120; // 120 physics ticks/s — ~8.33ms per step

const canvas = document.getElementById('gameCanvas');
canvas.width = Config.BASE_WIDTH;
canvas.height = Config.BASE_HEIGHT;
const game = new Game(canvas);
game.start();
