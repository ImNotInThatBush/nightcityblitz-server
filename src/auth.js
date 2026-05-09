import { Config } from './config.js';

export const Auth = {
    nickname: null,
    token: null,
    isAdmin: false,

    init() {
        this.nickname = localStorage.getItem('ncb_nickname');
        this.token = localStorage.getItem('ncb_token');
        if (this.nickname) {
            this.isAdmin = (this.nickname.toLowerCase() === 'imnotinthatbush');
        }
    },

    async login(nicknameStr, passwordStr) {
        try {
            const res = await fetch(`${Config.API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: nicknameStr, password: passwordStr, token: this.token })
            });
            const data = await res.json();
            
            if (data.success) {
                this.nickname = data.nickname;
                this.token = data.token;
                this.isAdmin = (this.nickname.toLowerCase() === 'imnotinthatbush');
                localStorage.setItem('ncb_nickname', this.nickname);
                localStorage.setItem('ncb_token', this.token);
                return { success: true };
            } else {
                return { success: false, error: data.error };
            }
        } catch (e) {
            console.error("Login failed:", e);
            return { success: false, error: "Impossibile connettersi al server." };
        }
    },

    async validateSession() {
        if (!this.nickname || !this.token) return false;
        try {
            const res = await fetch(`${Config.API_URL}/api/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: this.nickname, token: this.token })
            });
            const data = await res.json();
            return data.valid;
        } catch (e) {
            return false; // If server is unreachable, we could optionally allow local play, but for strict auth let's return false or handle it gracefully. Let's return true if server offline for now to not break local testing, wait, actually let's return true so we don't kick them just because of a network hiccup, ONLY kick them if server explicitly says valid=false.
        }
    },

    async enforceSessionValidation(onInvalidCallback) {
        if (!this.nickname || !this.token) {
            onInvalidCallback();
            return;
        }
        try {
            const res = await fetch(`${Config.API_URL}/api/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: this.nickname, token: this.token })
            });
            const data = await res.json();
            if (!data.valid) onInvalidCallback();
        } catch (e) {
            // Network error, ignore to allow offline play
        }
    },

    logout() {
        this.nickname = null;
        this.token = null;
        this.isAdmin = false;
        localStorage.removeItem('ncb_nickname');
        localStorage.removeItem('ncb_token');
    }
};

export const AdminPanel = {
    async fetchPlayers() {
        try {
            const res = await fetch(`${Config.API_URL}/api/admin/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: Auth.nickname, token: Auth.token })
            });
            if (res.ok) {
                return await res.json();
            }
            return [];
        } catch (e) {
            console.error("Fetch players error:", e);
            return [];
        }
    },

    async toggleBan(targetId, isBanned) {
        await fetch(`${Config.API_URL}/api/admin/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: Auth.nickname, token: Auth.token, targetId, isBanned })
        });
    },

    async resetStats(targetId) {
        await fetch(`${Config.API_URL}/api/admin/reset-stats`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: Auth.nickname, token: Auth.token, targetId })
        });
    },

    async deletePlayer(targetId) {
        if (confirm("Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo utente?")) {
            await fetch(`${Config.API_URL}/api/admin/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: Auth.nickname, token: Auth.token, targetId })
            });
        }
    },

    initAdminUI() {
        const overlay = document.getElementById('admin-overlay');
        const refreshBtn = document.getElementById('admin-refresh-btn');
        const closeBtn = document.getElementById('admin-close-btn');
        const listBody = document.getElementById('admin-players-list');

        const renderList = async () => {
            listBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Caricamento...</td></tr>';
            const players = await this.fetchPlayers();
            listBody.innerHTML = '';
            players.forEach(p => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #ff003c';
                tr.innerHTML = `
                    <td style="padding: 10px;">${p.id}</td>
                    <td style="padding: 10px; color: #00f6ff;">${p.nickname}</td>
                    <td style="padding: 10px;">${p.wins} / ${p.losses}</td>
                    <td style="padding: 10px; color: ${p.is_banned ? '#ff003c' : '#fcee0a'};">${p.is_banned ? 'BANNATO' : 'ATTIVO'}</td>
                    <td style="padding: 10px; display: flex; gap: 5px;">
                        <button onclick="window.AdminPanel.toggleBan(${p.id}, ${!p.is_banned})" style="background: ${p.is_banned ? '#00f6ff' : '#ff003c'}; color: #000; border: none; cursor: pointer; padding: 5px 10px;">${p.is_banned ? 'S-BANNA' : 'BANNA'}</button>
                        <button onclick="window.AdminPanel.resetStats(${p.id})" style="background: #fcee0a; color: #000; border: none; cursor: pointer; padding: 5px 10px;">RESET STATS</button>
                        <button onclick="window.AdminPanel.deletePlayer(${p.id})" style="background: #000; border: 1px solid #ff003c; color: #ff003c; cursor: pointer; padding: 5px 10px;">ELIMINA</button>
                    </td>
                `;
                listBody.appendChild(tr);
            });
        };

        refreshBtn.onclick = renderList;
        closeBtn.onclick = () => { overlay.style.display = 'none'; };

        // Expose to window for inline onclick handlers
        window.AdminPanel = {
            toggleBan: async (id, status) => { await this.toggleBan(id, status); renderList(); },
            resetStats: async (id) => { await this.resetStats(id); renderList(); },
            deletePlayer: async (id) => { await this.deletePlayer(id); renderList(); },
            openAndRefresh: () => { overlay.style.display = 'block'; renderList(); }
        };
    }
};
