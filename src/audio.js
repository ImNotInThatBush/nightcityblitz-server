import { Config } from './config.js';

export class AudioManager {
    constructor() {
        this.audioContext = null;
        this.typingSoundBaseVolume = 0.1;
        this.uiHoverSoundBaseVolume = 0.2;
        this.menuMusicElement = document.getElementById('menu-music');
        this.gameMusicElement = document.getElementById('game-music');
        this.isUnlocked = false;
        this.menuFadeInterval = null;
        this.gameFadeInterval = null;
        this.cyberpsychosisEffect = { beatTimer: null, intensity: 0 };
        this.chargeSound = null;
        this.gameMusicElement.addEventListener('ended', () => this.playGameplayMusic(false));
    }

    unlockMedia() {
        if (this.isUnlocked) return;
        this.isUnlocked = true;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(e => console.error("AudioContext resume failed:", e));
        }
        [this.menuMusicElement, this.gameMusicElement].forEach(el => {
            if (el && el.paused) {
                el.volume = 0;
                const p = el.play();
                if (p !== undefined) p.then(() => el.pause()).catch(e => { if (e.name !== 'AbortError') console.error("Music unlock failed:", e); });
            }
        });
        const video = document.getElementById('video-bg');
        if (video && video.paused) video.play().catch(() => {});
    }

    updateMusicVolume() {
        if (this.menuMusicElement) this.menuMusicElement.volume = this.menuMusicElement.paused ? 0 : Config.SETTINGS.musicVolume * Config.SETTINGS.masterVolume;
        if (this.gameMusicElement)  this.gameMusicElement.volume  = this.gameMusicElement.paused  ? 0 : Config.SETTINGS.musicVolume * Config.SETTINGS.masterVolume;
    }

    _fade(element, end, duration, intervalName, onComplete) {
        clearInterval(this[intervalName]);
        const start = element.volume;
        let current = start;
        const step = (end - start) / (duration * 100);
        if (Math.abs(end - start) < 0.01) { element.volume = end; if (onComplete) onComplete(); return; }
        this[intervalName] = setInterval(() => {
            current += step;
            element.volume = Math.max(0, Math.min(1, current));
            if ((step > 0 && current >= end) || (step < 0 && current <= end)) {
                clearInterval(this[intervalName]);
                element.volume = end;
                if (onComplete) onComplete();
            }
        }, 10);
    }

    playMenuMusic() {
        if (!this.isUnlocked || !this.menuMusicElement) return;
        this.stopGameplayMusic();
        this.menuMusicElement.play().catch(e => console.error("Music playback failed", e));
        this._fade(this.menuMusicElement, Config.SETTINGS.musicVolume * Config.SETTINGS.masterVolume, 0.5, 'menuFadeInterval');
    }

    stopMenuMusic() {
        if (this.menuMusicElement) this._fade(this.menuMusicElement, 0, 0.5, 'menuFadeInterval', () => this.menuMusicElement.pause());
    }

    playGameplayMusic(isFirstPlay = true, forcedMusicIndex = null) {
        if (!this.isUnlocked || !this.gameMusicElement) return;
        if (isFirstPlay) {
            const playlist = Config.GAMEPLAY.GAME_MUSIC_PLAYLIST;
            if (forcedMusicIndex !== null && playlist[forcedMusicIndex]) {
                this.gameMusicElement.src = playlist[forcedMusicIndex];
            } else {
                this.gameMusicElement.src = playlist[Math.floor(Math.random() * playlist.length)];
            }
        }
        this.gameMusicElement.play().catch(e => console.error("Gameplay music failed", e));
        this._fade(this.gameMusicElement, Config.SETTINGS.musicVolume * Config.SETTINGS.masterVolume, 1.0, 'gameFadeInterval');
    }

    stopGameplayMusic() {
        if (this.gameMusicElement) {
            this._fade(this.gameMusicElement, 0, 1.0, 'gameFadeInterval', () => {
                this.gameMusicElement.pause();
                this.gameMusicElement.currentTime = 0;
            });
        }
    }

    playSfx(type, options = {}) {
        if (!this.isUnlocked || Config.SETTINGS.masterVolume === 0) return;
        const sfxVolume = Config.SETTINGS.effectsVolume * Config.SETTINGS.masterVolume;
        let freq = 100, duration = 0.1, wave = 'sine';

        switch (type) {
            case 'hit':       freq = 440 + (options.pitch || 0); duration = 0.05; wave = 'square'; break;
            case 'hit-swipe': freq = 220;  duration = 0.1;  wave = 'sine';     break;
            case 'hit-cut':   freq = 1200; duration = 0.04; wave = 'triangle'; break;
            case 'iceWallSpawn': freq = 800; duration = 0.15; wave = 'sine';     break;
            case 'iceWallBreak': freq = 300; duration = 0.3;  wave = 'sawtooth'; break;
            case 'overdriveFire': {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(1500, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
                gain.gain.setValueAtTime(0.4 * sfxVolume, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.3);
                osc.connect(gain); gain.connect(this.audioContext.destination);
                osc.start(); osc.stop(this.audioContext.currentTime + 0.3);
                return;
            }
            case 'ramCellRecharged': freq = 1500; duration = 0.05; wave = 'triangle'; break;
            case 'score': {
                const t = this.audioContext.currentTime;
                const alarm = this.audioContext.createOscillator();
                const alarmGain = this.audioContext.createGain();
                alarm.type = 'sawtooth';
                alarm.frequency.setValueAtTime(2000, t);
                alarm.frequency.exponentialRampToValueAtTime(1000, t + 0.2);
                alarmGain.gain.setValueAtTime(0.3 * sfxVolume, t);
                alarmGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
                alarm.connect(alarmGain); alarmGain.connect(this.audioContext.destination);
                alarm.start(); alarm.stop(t + 0.2);
                const boom = this.audioContext.createOscillator();
                const boomGain = this.audioContext.createGain();
                boom.type = 'sine';
                boom.frequency.setValueAtTime(120, t);
                boom.frequency.exponentialRampToValueAtTime(40, t + 0.4);
                boomGain.gain.setValueAtTime(0.5 * sfxVolume, t);
                boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
                boom.connect(boomGain); boomGain.connect(this.audioContext.destination);
                boom.start(); boom.stop(t + 0.4);
                return;
            }
        }

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        gain.gain.setValueAtTime(this.uiHoverSoundBaseVolume * sfxVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + duration);
        osc.connect(gain); gain.connect(this.audioContext.destination);
        osc.start(); osc.stop(this.audioContext.currentTime + duration);
    }

    playUiHover() {
        if (!this.isUnlocked || Config.SETTINGS.masterVolume === 0) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
        gain.gain.setValueAtTime(this.uiHoverSoundBaseVolume * Config.SETTINGS.effectsVolume * Config.SETTINGS.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.audioContext.destination);
        osc.start(); osc.stop(this.audioContext.currentTime + 0.1);
    }

    playTypingSound() {
        if (!this.isUnlocked || Config.SETTINGS.masterVolume === 0) return;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(900, this.audioContext.currentTime);
        gain.gain.setValueAtTime(this.typingSoundBaseVolume * Config.SETTINGS.effectsVolume * Config.SETTINGS.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 0.05);
        osc.connect(gain); gain.connect(this.audioContext.destination);
        osc.start(); osc.stop(this.audioContext.currentTime + 0.05);
    }

    startChargeSound() {
        if (this.chargeSound || !this.isUnlocked) return;
        const sfxVolume = Config.SETTINGS.effectsVolume * Config.SETTINGS.masterVolume;
        this.chargeSound = {
            osc: this.audioContext.createOscillator(),
            gain: this.audioContext.createGain(),
        };
        this.chargeSound.osc.type = 'sawtooth';
        this.chargeSound.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        this.chargeSound.gain.gain.linearRampToValueAtTime(0.2 * sfxVolume, this.audioContext.currentTime + 0.5);
        this.chargeSound.osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        this.chargeSound.osc.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.7);
        this.chargeSound.osc.connect(this.chargeSound.gain);
        this.chargeSound.gain.connect(this.audioContext.destination);
        this.chargeSound.osc.start();
    }

    stopChargeSound() {
        if (!this.chargeSound) return;
        this.chargeSound.gain.gain.cancelScheduledValues(this.audioContext.currentTime);
        this.chargeSound.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.1);
        this.chargeSound.osc.stop(this.audioContext.currentTime + 0.1);
        this.chargeSound = null;
    }

    startCyberpsychosisSfx() {
        if (!this.isUnlocked || this.cyberpsychosisEffect.beatTimer) return;
        this.updateCyberpsychosisSfx(this.cyberpsychosisEffect.intensity);
    }

    updateCyberpsychosisSfx(intensity) {
        this.cyberpsychosisEffect.intensity = intensity;
        if (!this.cyberpsychosisEffect.beatTimer && intensity > 0.1) {
            const beatLoop = () => {
                const cur = this.cyberpsychosisEffect.intensity;
                if (cur <= 0.1) { this.stopCyberpsychosisSfx(); return; }
                const bpm = 60 + (150 - 60) * cur;
                const sfxVol = cur * 0.2 * Config.SETTINGS.effectsVolume * Config.SETTINGS.masterVolume;
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(80, this.audioContext.currentTime);
                osc.frequency.exponentialRampToValueAtTime(40, this.audioContext.currentTime + 0.1);
                gain.gain.setValueAtTime(sfxVol, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);
                osc.connect(gain); gain.connect(this.audioContext.destination);
                osc.start(); osc.stop(this.audioContext.currentTime + 0.2);
                this.cyberpsychosisEffect.beatTimer = setTimeout(beatLoop, (60 / bpm) * 1000);
            };
            beatLoop();
        }
    }

    stopCyberpsychosisSfx() {
        if (this.cyberpsychosisEffect.beatTimer) {
            clearTimeout(this.cyberpsychosisEffect.beatTimer);
            this.cyberpsychosisEffect.beatTimer = null;
        }
        this.cyberpsychosisEffect.intensity = 0;
    }
}
