import { Config } from '../config.js';
import { hslToRgb, rgbToHsl } from '../utils.js';

export class OptionsScreen {
    constructor(changeStateCallback, audioManager) {
        this.changeState = changeStateCallback;
        this.audioManager = audioManager;
        this.title = "SYSTEM INTERFACE";
        this.backButton = { label: "APPLY & REBOOT", isHovered: false };
        this.draggingSlider = null;
        this.previousState = 'MENU';

        this.tabs = ['AUDIO', 'DECK'];
        this.activeTab = 'AUDIO';

        this.sliders = [
            { label: "MASTER", valueRef: 'masterVolume' },
            { label: "MUSIC", valueRef: 'musicVolume' },
            { label: "EFFECTS", valueRef: 'effectsVolume' }
        ];

        this.deckCategories = ['PALETTE', 'CUSTOM GLOW', 'CUSTOM CHASSIS', 'CORE', 'SYMBOL', 'PATTERN', 'PARTICLES'];
        this.selectedDeckCategory = 'PALETTE';

        this.colorPicker = {
            glow: rgbToHsl(Config.SETTINGS.playerPaddleColor),
            chassis: rgbToHsl(Config.SETTINGS.playerPaddleChassis),
            dragging: null
        };
    }

    update(input) {
        const tabWidth = 200, tabHeight = 50;
        const tabStartY = 100;
        const tabStartX = (Config.BASE_WIDTH - (tabWidth * this.tabs.length)) / 2;
        this.tabs.forEach((tab, i) => {
            const tabX = tabStartX + i * tabWidth;
            if (input.mouse.clicked && input.mouse.x > tabX && input.mouse.x < tabX + tabWidth && input.mouse.y > tabStartY && input.mouse.y < tabStartY + tabHeight) {
                this.activeTab = tab;
                this.audioManager.playUiHover();
            }
        });

        if (this.activeTab === 'AUDIO') {
            this.updateAudioTab(input);
        } else {
            this.updateDeckTab(input);
        }

        const bW = 300, bY = Config.BASE_HEIGHT - 80;
        const bX = (Config.BASE_WIDTH - bW) / 2;
        this.backButton.isHovered = (input.mouse.x > bX && input.mouse.x < bX + bW && input.mouse.y > bY && input.mouse.y < bY + 40);
        if (this.backButton.isHovered && input.mouse.clicked) {
            this._saveSettings();
            this.changeState(this.previousState || 'MENU');
            this.audioManager.playUiHover();
        }
    }

    _saveSettings() {
        try {
            localStorage.setItem('ncb_settings', JSON.stringify(Config.SETTINGS));
        } catch (e) {
            console.warn('Could not save settings to localStorage:', e);
        }
    }

    updateAudioTab(input) {
        const sW = 700, sliderStartY = 250;
        if (input.mouse.isDown && this.draggingSlider === null) {
            this.sliders.forEach((s, i) => {
                const sX = (Config.BASE_WIDTH - sW) / 2, sY = sliderStartY + i * 80;
                if (input.mouse.x > sX && input.mouse.x < sX + sW && input.mouse.y > sY - 10 && input.mouse.y < sY + 30) {
                    this.draggingSlider = s;
                }
            });
        }
        if (this.draggingSlider) {
            const sX = (Config.BASE_WIDTH - sW) / 2;
            Config.SETTINGS[this.draggingSlider.valueRef] = Math.max(0, Math.min(1, (input.mouse.x - sX) / sW));
            this.audioManager.updateMusicVolume();
        }
        if (!input.mouse.isDown) this.draggingSlider = null;
    }

    updateDeckTab(input) {
        const catStartY = 220;
        const catWidth = 300, catHeight = 45;
        const catStartX = Config.BASE_WIDTH * 0.1;
        const controlsStartX = Config.BASE_WIDTH * 0.35;

        this.deckCategories.forEach((cat, i) => {
            const catY = catStartY + i * (catHeight + 10);
            if (input.mouse.clicked && input.mouse.x > catStartX && input.mouse.x < catStartX + catWidth && input.mouse.y > catY && input.mouse.y < catY + catHeight) {
                this.selectedDeckCategory = cat;
                this.audioManager.playUiHover();
            }
        });

        const btnW = 300, btnH = 50;
        let options;
        switch (this.selectedDeckCategory) {
            case 'PALETTE':
                options = Config.DECK_CUSTOMIZATION.PALETTE_OPTIONS;
                options.forEach((opt, i) => {
                    const btnY = catStartY + i * (btnH + 10);
                    if (input.mouse.clicked && input.mouse.x > controlsStartX && input.mouse.x < controlsStartX + btnW && input.mouse.y > btnY && input.mouse.y < btnY + btnH) {
                        Config.SETTINGS.playerPaddleColor = opt.value.glow;
                        Config.SETTINGS.playerPaddleChassis = opt.value.chassis;
                        this.colorPicker.glow = rgbToHsl(opt.value.glow);
                        this.colorPicker.chassis = rgbToHsl(opt.value.chassis);
                        this.audioManager.playUiHover();
                    }
                });
                break;
            case 'CUSTOM GLOW':
            case 'CUSTOM CHASSIS':
                this.updateColorPicker(input, controlsStartX, catStartY);
                break;
            case 'CORE':
                options = Config.DECK_CUSTOMIZATION.CORE_OPTIONS;
                options.forEach((opt, i) => {
                    const btnY = catStartY + i * (btnH + 10);
                    if (input.mouse.clicked && input.mouse.x > controlsStartX && input.mouse.x < controlsStartX + btnW && input.mouse.y > btnY && input.mouse.y < btnY + btnH) {
                        Config.SETTINGS.playerPaddleCore = opt.value;
                        this.audioManager.playUiHover();
                    }
                });
                break;
            case 'SYMBOL':
                options = Config.DECK_CUSTOMIZATION.SYMBOL_OPTIONS;
                options.forEach((opt, i) => {
                    const btnY = catStartY + i * (btnH + 10);
                    if (input.mouse.clicked && input.mouse.x > controlsStartX && input.mouse.x < controlsStartX + btnW && input.mouse.y > btnY && input.mouse.y < btnY + btnH) {
                        Config.SETTINGS.playerPaddleSymbol = opt.value;
                        this.audioManager.playUiHover();
                    }
                });
                break;
            case 'PATTERN':
                options = Config.DECK_CUSTOMIZATION.PATTERN_OPTIONS;
                options.forEach((opt, i) => {
                    const btnY = catStartY + i * (btnH + 10);
                    if (input.mouse.clicked && input.mouse.x > controlsStartX && input.mouse.x < controlsStartX + btnW && input.mouse.y > btnY && input.mouse.y < btnY + btnH) {
                        Config.SETTINGS.playerPaddlePattern = opt.value;
                        this.audioManager.playUiHover();
                    }
                });
                break;
            case 'PARTICLES': {
                options = Config.DECK_CUSTOMIZATION.PARTICLE_OPTIONS;
                const swatchSize = 50;
                options.forEach((color, i) => {
                    const btnX = controlsStartX + i * (swatchSize + 15);
                    if (input.mouse.clicked && input.mouse.x > btnX && input.mouse.x < btnX + swatchSize && input.mouse.y > catStartY && input.mouse.y < catStartY + swatchSize) {
                        Config.SETTINGS.playerParticleColor = color;
                        this.audioManager.playUiHover();
                    }
                });
                break;
            }
        }
    }

    updateColorPicker(input, x, y) {
        const svBoxSize = 250, hueBarW = 30, hueBarH = 250, alphaBarW = 250, alphaBarH = 30;
        const hueBarX = x + svBoxSize + 20, alphaBarY = y + svBoxSize + 20;
        const key = this.selectedDeckCategory === 'CUSTOM GLOW' ? 'glow' : 'chassis';
        const colorState = this.colorPicker[key];

        if (input.mouse.isDown) {
            if (this.colorPicker.dragging === null) {
                if (input.mouse.x > x && input.mouse.x < x + svBoxSize && input.mouse.y > y && input.mouse.y < y + svBoxSize) this.colorPicker.dragging = 'sv';
                else if (input.mouse.x > hueBarX && input.mouse.x < hueBarX + hueBarW && input.mouse.y > y && input.mouse.y < y + hueBarH) this.colorPicker.dragging = 'hue';
                else if (input.mouse.x > x && input.mouse.x < x + alphaBarW && input.mouse.y > alphaBarY && input.mouse.y < alphaBarY + alphaBarH) this.colorPicker.dragging = 'alpha';
            }
            if (this.colorPicker.dragging === 'sv') {
                colorState.s = Math.max(0, Math.min(1, (input.mouse.x - x) / svBoxSize));
                colorState.l = 1 - Math.max(0, Math.min(1, (input.mouse.y - y) / svBoxSize));
            } else if (this.colorPicker.dragging === 'hue') {
                colorState.h = Math.max(0, Math.min(1, (input.mouse.y - y) / hueBarH));
            } else if (this.colorPicker.dragging === 'alpha') {
                colorState.a = Math.max(0, Math.min(1, (input.mouse.x - x) / alphaBarW));
            }
            const settingKey = key === 'glow' ? 'playerPaddleColor' : 'playerPaddleChassis';
            Config.SETTINGS[settingKey] = hslToRgb(colorState.h, colorState.s, colorState.l, colorState.a);
        } else {
            this.colorPicker.dragging = null;
        }
    }

    draw(renderer) {
        renderer.drawHudBackground();
        renderer.drawText(this.title, Config.BASE_WIDTH / 2, 60, { size: 50, color: Config.PALETTE.YELLOW_MAIN, align: 'center' });

        const tabWidth = 200, tabHeight = 50;
        const tabStartY = 100;
        const tabStartX = (Config.BASE_WIDTH - (tabWidth * this.tabs.length)) / 2;
        this.tabs.forEach((tab, i) => {
            renderer.drawTab(tab, tabStartX + i * tabWidth, tabStartY, tabWidth, tabHeight, this.activeTab === tab);
        });

        if (this.activeTab === 'AUDIO') {
            this.drawAudioTab(renderer);
        } else {
            this.drawDeckTab(renderer);
        }

        const bW = 300, bY = Config.BASE_HEIGHT - 80;
        renderer.drawHudButton('<<', this.backButton.label, (Config.BASE_WIDTH - bW) / 2, bY, bW, 40, this.backButton.isHovered);
    }

    drawAudioTab(renderer) {
        const sW = 700, sliderStartY = 250;
        this.sliders.forEach((s, i) => {
            renderer.drawSlider(s.label, (Config.BASE_WIDTH - sW) / 2, sliderStartY + i * 80, sW, Config.SETTINGS[s.valueRef]);
        });
    }

    drawDeckTab(renderer) {
        const catStartY = 220;
        const catHeight = 45;
        const catWidth = 300;
        const catStartX = Config.BASE_WIDTH * 0.1;
        const controlsStartX = Config.BASE_WIDTH * 0.35;
        const previewStartX = Config.BASE_WIDTH * 0.75;

        this.deckCategories.forEach((cat, i) => {
            renderer.drawOptionButton(cat, catStartX, catStartY + i * (catHeight + 10), catWidth, catHeight, false, this.selectedDeckCategory === cat);
        });

        const btnW = 300, btnH = 50;
        let options;
        switch (this.selectedDeckCategory) {
            case 'PALETTE':
                options = Config.DECK_CUSTOMIZATION.PALETTE_OPTIONS;
                options.forEach((opt, i) => {
                    const isSelected = Config.SETTINGS.playerPaddleColor === opt.value.glow && Config.SETTINGS.playerPaddleChassis === opt.value.chassis;
                    renderer.drawPaletteButton(opt.label, controlsStartX, catStartY + i * (btnH + 10), btnW, btnH, false, isSelected, opt.value);
                });
                break;
            case 'CUSTOM GLOW':
                renderer.drawColorPicker(controlsStartX, catStartY, 250, 30, this.colorPicker.glow);
                break;
            case 'CUSTOM CHASSIS':
                renderer.drawColorPicker(controlsStartX, catStartY, 250, 30, this.colorPicker.chassis);
                break;
            case 'CORE':
                options = Config.DECK_CUSTOMIZATION.CORE_OPTIONS;
                options.forEach((opt, i) => {
                    renderer.drawOptionButton(opt.label, controlsStartX, catStartY + i * (btnH + 10), btnW, btnH, false, Config.SETTINGS.playerPaddleCore === opt.value);
                });
                break;
            case 'SYMBOL':
                options = Config.DECK_CUSTOMIZATION.SYMBOL_OPTIONS;
                options.forEach((opt, i) => {
                    renderer.drawOptionButton(opt.label, controlsStartX, catStartY + i * (btnH + 10), btnW, btnH, false, Config.SETTINGS.playerPaddleSymbol === opt.value);
                });
                break;
            case 'PATTERN':
                options = Config.DECK_CUSTOMIZATION.PATTERN_OPTIONS;
                options.forEach((opt, i) => {
                    renderer.drawOptionButton(opt.label, controlsStartX, catStartY + i * (btnH + 10), btnW, btnH, false, Config.SETTINGS.playerPaddlePattern === opt.value);
                });
                break;
            case 'PARTICLES': {
                options = Config.DECK_CUSTOMIZATION.PARTICLE_OPTIONS;
                const swatchSize = 50;
                options.forEach((color, i) => {
                    renderer.drawColorSwatch(controlsStartX + i * (swatchSize + 15), catStartY, swatchSize, color, Config.SETTINGS.playerParticleColor === color);
                });
                break;
            }
        }

        renderer.drawPaddlePreview(previewStartX, catStartY, 3.5);
    }
}
