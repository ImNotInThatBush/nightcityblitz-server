import { Config } from './config.js';

export class Input {
    constructor(canvas) {
        this.canvas = canvas;
        this.mouse = {
            x: 0, y: 0, prevY: 0, vy: 0,
            moved: false, clicked: false, isDown: false,
            rightClicked: false, doubleClicked: false,
            lastClickTime: 0, isHolding: false, holdStartTime: 0,
        };
        this.keyPressed = false;
        this.lastKey = '';
        this.lastKeyCode = null;

        document.body.addEventListener('mousemove', e => this._onMouseMove(e));
        document.body.addEventListener('mousedown', e => this._onMouseDown(e));
        document.body.addEventListener('mouseup',   e => this._onMouseUp(e));
        document.addEventListener('keydown', (e) => { 
            this.keyPressed = true; 
            this.lastKey = e.key;
            this.lastKeyCode = e.keyCode;
        });
        this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    _onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const prevY = this.mouse.y;
        this.mouse.x = (e.clientX - rect.left) * (Config.BASE_WIDTH  / rect.width);
        this.mouse.y = (e.clientY - rect.top)  * (Config.BASE_HEIGHT / rect.height);
        this.mouse.vy = this.mouse.moved ? this.mouse.y - prevY : 0;
        this.mouse.moved = true;
    }

    _onMouseDown(e) {
        if (e.button === 0) {
            this.mouse.isDown = true;
            this.mouse.clicked = true;
            this.mouse.holdStartTime = performance.now();
            const now = performance.now();
            if (now - this.mouse.lastClickTime < Config.GAMEPLAY.QUICKHACKS.DOUBLE_CLICK_THRESHOLD) {
                this.mouse.doubleClicked = true;
                this.mouse.lastClickTime = 0;
            } else {
                this.mouse.lastClickTime = now;
            }
        }
        if (e.button === 2) this.mouse.rightClicked = true;
    }

    _onMouseUp(e) {
        if (e.button === 0) {
            this.mouse.isDown = false;
            this.mouse.isHolding = false;
            this.mouse.holdStartTime = 0;
        }
    }

    update() {
        if (this.mouse.isDown && !this.mouse.isHolding && performance.now() - this.mouse.holdStartTime > 150) {
            this.mouse.isHolding = true;
        }
    }

    reset() {
        this.mouse.moved = false;
        this.mouse.clicked = false;
        this.keyPressed = false;
        this.mouse.rightClicked = false;
        this.mouse.doubleClicked = false;
        this.mouse.vy = 0;
    }
}
