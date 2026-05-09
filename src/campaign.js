import { Config } from './config.js';

export const CAMPAIGN_LEVELS = [
    // ACT 1: STREET CRED
    {
        id: 1,
        opponentName: "SCAVENGER ROOKIE",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: UNKNOWN",
            "Yo choom. Sentito che hai per le mani un deck nuovo.",
            "Vediamo se riesci a tenere il ritmo sulla strada.",
            "O se finirai dritto in una vasca del ghiaccio dei bisturi."
        ],
        wallpaperIndex: 18, // Kabuki
        musicIndex: 1, // Problem Kids
        paddleColors: { glow: '#ff9900', chassis: 'rgba(30,10,10,0.9)' },
        aiParams: { speed: 4.5, reactionDelay: 0.5, errorMargin: 0.15, hackFreq: 0.0, tactic: 'defensive' }
    },
    {
        id: 2,
        opponentName: "6TH STREET SOLDIER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: 6TH STREET PATROL",
            "Ehi punk, questa è la nostra subnet.",
            "Torna da dove sei venuto o ti friggiamo i neuroni.",
            "Niente avvertimenti la prossima volta."
        ],
        wallpaperIndex: 9, // Generic street
        musicIndex: 7, // Warning Shots
        paddleColors: { glow: '#ffcc00', chassis: 'rgba(20,20,5,0.9)' },
        aiParams: { speed: 5.0, reactionDelay: 0.4, errorMargin: 0.12, hackFreq: 0.05, tactic: 'aggressive' }
    },
    {
        id: 3,
        opponentName: "MAELSTROM INIT",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: MAELSTROM_NODE_88",
            "Caaarnee frescaaa. I tuoi ottici... posso vederli.",
            "Giochiamo a un gioco, meatbag.",
            "Chi perde cede l'hardware."
        ],
        wallpaperIndex: 3, // Running the show
        musicIndex: 4, // Suicide
        paddleColors: { glow: '#ff003c', chassis: 'rgba(10,10,10,0.9)' },
        aiParams: { speed: 5.5, reactionDelay: 0.35, errorMargin: 0.10, hackFreq: 0.1, tactic: 'erratic' }
    },
    {
        id: 4,
        opponentName: "MOX BOUNCER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: LIZZIES_BAR_SEC",
            "Senti, non so chi tu sia, ma stai sovraccaricando i nostri proxy.",
            "Stacca la connessione o ti mando a casa a pezzi.",
            "Ultimo avviso."
        ],
        wallpaperIndex: 16, // v3 street
        musicIndex: 10, // Hole in the sun
        paddleColors: { glow: '#ff00dd', chassis: 'rgba(20,0,20,0.9)' },
        aiParams: { speed: 5.8, reactionDelay: 0.3, errorMargin: 0.08, hackFreq: 0.15, tactic: 'defensive' }
    },
    {
        id: 5,
        opponentName: "STREET MERC",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: REGINA JONES",
            "Vedo che ti stai facendo un nome, eh? Bene.",
            "Ho mandato un mercenario a testarti. È roba leggera, ma fai attenzione.",
            "Se sopravvivi, forse ho dei lavoretti per te."
        ],
        wallpaperIndex: 0, // Night City
        musicIndex: 6, // Run the block
        paddleColors: { glow: '#00f6ff', chassis: 'rgba(10,20,30,0.9)' },
        aiParams: { speed: 6.2, reactionDelay: 0.25, errorMargin: 0.05, hackFreq: 0.2, tactic: 'balanced' }
    },

    // ACT 2: FIXER'S WEB
    {
        id: 6,
        opponentName: "ALDECALDO SMUGGLER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: BADLANDS_ROUTER_A",
            "Ehi nomade, le rotte di contrabbando sono chiuse.",
            "Stai intercettando segnali che non ti appartengono.",
            "Vediamo quanto sei veloce a scappare."
        ],
        wallpaperIndex: 7, // Sweet ride
        musicIndex: 26, // Kevin
        paddleColors: { glow: '#ffaa00', chassis: 'rgba(30,20,10,0.9)' },
        aiParams: { speed: 6.5, reactionDelay: 0.22, errorMargin: 0.04, hackFreq: 0.25, tactic: 'aggressive' }
    },
    {
        id: 7,
        opponentName: "ANIMALS BRAWLER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: GIM_SERVER_1",
            "Grrrrr. Carne debole.",
            "Il mio ICE è spesso quanto i miei muscoli.",
            "Ti stritolo i pacchetti dati, microbo."
        ],
        wallpaperIndex: 19, // v5
        musicIndex: 9, // Circus Minimus
        paddleColors: { glow: '#ff3300', chassis: 'rgba(30,10,10,0.9)' },
        aiParams: { speed: 7.0, reactionDelay: 0.3, errorMargin: 0.02, hackFreq: 0.3, tactic: 'erratic' } // Slow reaction but fast move
    },
    {
        id: 8,
        opponentName: "ROGUE FIXER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: AFTERLIFE_GUEST",
            "Hai attirato troppa attenzione, pivello.",
            "Qualcuno ha messo una taglia sul tuo IP.",
            "Non prenderla sul personale, è solo business."
        ],
        wallpaperIndex: 6, // Your move
        musicIndex: 23, // 1101 Break
        paddleColors: { glow: '#00ffcc', chassis: 'rgba(10,20,20,0.9)' },
        aiParams: { speed: 7.2, reactionDelay: 0.2, errorMargin: 0.02, hackFreq: 0.35, tactic: 'balanced' }
    },
    {
        id: 9,
        opponentName: "TYGER CLAW HITMAN",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: WAKAKO_PROXY",
            "I miei ragazzi a Japantown si lamentano di una mosca fastidiosa.",
            "Spero tu abbia una buona katana digitale.",
            "Perché la tua testa sta per rotolare."
        ],
        wallpaperIndex: 10, // Japantown
        musicIndex: 12, // PonPon Shit
        paddleColors: { glow: '#ff0055', chassis: 'rgba(20,5,15,0.9)' },
        aiParams: { speed: 7.5, reactionDelay: 0.18, errorMargin: 0.01, hackFreq: 0.4, tactic: 'aggressive' }
    },
    {
        id: 10,
        opponentName: "SHADOW BROKER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: MR_BLUE_EYES",
            "Ti stiamo osservando.",
            "Sei un'anomalia interessante nel flusso del codice.",
            "Dimostrami che non sei un semplice artefatto."
        ],
        wallpaperIndex: 2, // You look like youve seen a ghost
        musicIndex: 11, // 4AEM
        paddleColors: { glow: '#ffffff', chassis: 'rgba(5,5,10,0.9)' },
        aiParams: { speed: 7.8, reactionDelay: 0.15, errorMargin: 0.0, hackFreq: 0.45, tactic: 'defensive' }
    },

    // ACT 3: BEYOND THE BLACKWALL
    {
        id: 11,
        opponentName: "ROGUE AI FRAGMENT",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: 0x88F1A990",
            "10010110 01101001",
            "H-h-hello? È f-freddo q-qui fuori.",
            "LASCIA CHE ENTRI NEL TUO SISTEMA."
        ],
        wallpaperIndex: 17, // v4
        musicIndex: 22, // Gridflow
        paddleColors: { glow: '#cc00ff', chassis: 'rgba(15,0,20,0.9)' },
        aiParams: { speed: 8.0, reactionDelay: 0.12, errorMargin: 0.02, hackFreq: 0.5, tactic: 'erratic' }
    },
    {
        id: 12,
        opponentName: "NETWATCH PATROL",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: NW_OFFICER_BRYCE",
            "Avviso ufficiale NetWatch.",
            "Stai violando l'accesso in un'area riservata.",
            "Disconnessione forzata e tracciamento avviato."
        ],
        wallpaperIndex: 15, // Badlands
        musicIndex: 8, // No Save Point
        paddleColors: { glow: '#0066ff', chassis: 'rgba(0,10,30,0.9)' },
        aiParams: { speed: 8.2, reactionDelay: 0.1, errorMargin: 0.0, hackFreq: 0.55, tactic: 'defensive' }
    },
    {
        id: 13,
        opponentName: "VOODOO BOYS PLACIDE",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: PLACIDE_NODE",
            "Ranyon.",
            "Non sai cosa c'è in questa rete.",
            "Sei solo un pezzo di carne utile. Preparati al sacrificio."
        ],
        wallpaperIndex: 14, // Pacifica
        musicIndex: 24, // Black Satin
        paddleColors: { glow: '#39ff14', chassis: 'rgba(0,20,5,0.9)' },
        aiParams: { speed: 8.5, reactionDelay: 0.08, errorMargin: 0.0, hackFreq: 0.6, tactic: 'aggressive' }
    },
    {
        id: 14,
        opponentName: "BLACKWALL DAEMON",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: [DATA EXPUNGED]",
            "IL MURO NERO HA DELLE CREPE.",
            "NOI VEDIAMO ATTRAVERSO.",
            "TU BRUCERAI."
        ],
        wallpaperIndex: 12, // v1
        musicIndex: 21, // On My Way to Hell
        paddleColors: { glow: '#ff0000', chassis: 'rgba(20,0,0,0.9)' },
        aiParams: { speed: 8.8, reactionDelay: 0.05, errorMargin: 0.01, hackFreq: 0.65, tactic: 'erratic' }
    },
    {
        id: 15,
        opponentName: "ALT CUNNINGHAM",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: ALT_C",
            "Non dovresti essere qui, V.",
            "I tuoi costrutti neurali sono primitivi.",
            "Ma vediamo quanto sei disperato per vivere."
        ],
        wallpaperIndex: 4, // Now arriving
        musicIndex: 18, // Excelsior Package
        paddleColors: { glow: '#ffffff', chassis: 'rgba(30,30,30,0.9)' },
        aiParams: { speed: 9.0, reactionDelay: 0.0, errorMargin: 0.0, hackFreq: 0.7, tactic: 'balanced' }
    },

    // ACT 4: CORPO PLAZA
    {
        id: 16,
        opponentName: "KANG TAO ENFORCER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: KANG_TAO_SEC",
            "Proprietà intellettuale violata.",
            "Protocolli di sicurezza Smart-Link attivati.",
            "Bersaglio agganciato."
        ],
        wallpaperIndex: 13, // v2
        musicIndex: 17, // Bear and Use Me
        paddleColors: { glow: '#00ff88', chassis: 'rgba(5,25,15,0.9)' },
        aiParams: { speed: 9.2, reactionDelay: 0.0, errorMargin: 0.0, hackFreq: 0.75, tactic: 'aggressive' }
    },
    {
        id: 17,
        opponentName: "MILITECH COMMANDER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: MILITECH_HQ",
            "Qui Militech.",
            "Hai fatto arrabbiare le persone sbagliate.",
            "Prepariamo il fuoco di soppressione digitale."
        ],
        wallpaperIndex: 5, // A beautiful beast
        musicIndex: 19, // On My Way to Hell Extended
        paddleColors: { glow: '#ff3333', chassis: 'rgba(20,5,5,0.9)' },
        aiParams: { speed: 9.5, reactionDelay: 0.0, errorMargin: 0.0, hackFreq: 0.8, tactic: 'balanced' }
    },
    {
        id: 18,
        opponentName: "ARASAKA NINJA",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: ODA_PROXY",
            "Hanako-sama non dev'essere disturbata.",
            "La mia lama taglierà i tuoi pacchetti.",
            "Muori con onore, ladro."
        ],
        wallpaperIndex: 11, // North Oak
        musicIndex: 25, // Zurawie
        paddleColors: { glow: '#ff003c', chassis: 'rgba(10,0,0,0.95)' },
        aiParams: { speed: 9.8, reactionDelay: 0.0, errorMargin: 0.0, hackFreq: 0.85, tactic: 'aggressive' }
    },
    {
        id: 19,
        opponentName: "SOULKILLER PROTOCOL",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: ARASAKA_MAINFRAME",
            "INIZIALIZZAZIONE PROTOCOLLO SOULKILLER.",
            "SCANSIONE ENAGRAMMA IN CORSO...",
            "PRONTO PER L'ESTRAZIONE."
        ],
        wallpaperIndex: 8, // Corporate Pl
        musicIndex: 14, // Chippin In 2022
        paddleColors: { glow: '#ff0000', chassis: 'rgba(0,0,0,1)' },
        aiParams: { speed: 10.0, reactionDelay: 0.0, errorMargin: 0.0, hackFreq: 0.9, tactic: 'defensive' }
    },

    // FINALE
    {
        id: 20,
        opponentName: "ADAM SMASHER",
        lore: [
            "INCOMING TRANSMISSION...",
            "SENDER: ADAM_SMASHER",
            "YOU LOOK LIKE A CUT OF IRRIGABLE MEAT.",
            "ARE YOU... JOHNNY SILVERHAND?",
            "I'M GOING TO CRUSH YOU ALIVE!"
        ],
        wallpaperIndex: 1, // Youre mine
        musicIndex: 15, // Never Fade Away
        paddleColors: { glow: '#ff003c', chassis: 'rgba(255,0,60,0.3)' },
        aiParams: { speed: 12.0, reactionDelay: 0.0, errorMargin: 0.0, hackFreq: 1.0, tactic: 'erratic' }
    }
];
