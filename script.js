// ========== CONFIG ==========
const ALIEN_W = 26;
const ALIEN_H = 20;
const PLAYER_W = 36;
const PLAYER_H = 28;
const BULLET_W = 3;
const BULLET_H = 12;
const CONTROL_H = 100; // altura de la zona de botones

// ========== ESTADO ==========
let canvas, ctx;
let width, height;
let player;
let bullets = [];
let enemyBullets = [];
let aliens = [];
let divers = [];
let alienDir = 1;
let lastFire = 0;
let lastAlienMove = 0;
let lastDive = 0;
let alienMoveInterval = 600;
let fireRate = 260;
let diveInterval = 1800;
let score = 0;
let lives = 3;
let highScore = 0;
let gameRunning = false;
let keys = { left: false, right: false };
let stars = [];
let dificultad = "normal";
let cols = 10;
let rows = 5;
let invulnerable = 0;

// ========== AUDIO ==========
let audioCtx = null;
let musicaActiva = true;
let musicaNodes = null;
let muteado = false;

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log("Audio no disponible");
    }
}

function tocarTono(freq, duracion, tipo = "square", volumen = 0.08) {
    if (!audioCtx || muteado) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volumen, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duracion);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duracion);
}

function sonidoDisparo() {
    tocarTono(880, 0.08, "square", 0.06);
    tocarTono(440, 0.06, "square", 0.04);
}

function sonidoExplosion() {
    tocarTono(150, 0.15, "sawtooth", 0.1);
    setTimeout(() => tocarTono(80, 0.2, "sawtooth", 0.08), 40);
}

function sonidoGolpe() {
    tocarTono(200, 0.25, "sawtooth", 0.12);
    tocarTono(100, 0.3, "triangle", 0.1);
}

function sonidoNuevoRecord() {
    const notas = [523, 659, 784, 1047];
    notas.forEach((f, i) => {
        setTimeout(() => tocarTono(f, 0.2, "square", 0.1), i * 120);
    });
}

function iniciarMusica() {
    if (!audioCtx || muteado || musicaNodes) return;

    const tempo = 140;
    const beat = 60 / tempo;
    const notas = [
        220, 261, 329, 392,
        220, 261, 329, 392,
        196, 246, 293, 349,
        196, 246, 293, 349,
        174, 220, 261, 329,
        174, 220, 261, 329,
        196, 246, 293, 349,
        220, 261, 329, 440
    ];

    let paso = 0;
    const gainMusica = audioCtx.createGain();
    gainMusica.gain.value = 0.045;
    gainMusica.connect(audioCtx.destination);

    function tocarNota() {
        if (!musicaActiva || muteado || !gameRunning) return;

        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = "square";
        osc.frequency.value = notas[paso % notas.length];
        g.gain.setValueAtTime(0.12, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + beat * 0.7);
        osc.connect(g);
        g.connect(gainMusica);
        osc.start();
        osc.stop(audioCtx.currentTime + beat * 0.8);

        paso++;
        musicaNodes = setTimeout(tocarNota, beat * 1000);
    }

    tocarNota();
}

function pararMusica() {
    musicaActiva = false;
    if (musicaNodes) {
        clearTimeout(musicaNodes);
        musicaNodes = null;
    }
}

function reanudarMusica() {
    if (muteado || !gameRunning) return;
    musicaActiva = true;
    if (!musicaNodes) iniciarMusica();
}

// ========== DOM ==========
const pantallaInicio = document.getElementById("pantalla-inicio");
const pantallaDificultad = document.getElementById("pantalla-dificultad");
const pantallaJuego = document.getElementById("pantalla-juego");
const btnEmpezar = document.getElementById("btn-empezar");
const btnFacil = document.getElementById("btn-facil");
const btnNormal = document.getElementById("btn-normal");
const btnDificil = document.getElementById("btn-dificil");
const btnVolver = document.getElementById("btn-volver");
const btnReiniciar = document.getElementById("btn-reiniciar");
const btnMenu = document.getElementById("btn-menu");
const btnMute = document.getElementById("btn-mute");
const btnIzq = document.getElementById("btn-izq");
const btnDer = document.getElementById("btn-der");
const puntosEl = document.getElementById("puntos");
const vidasEl = document.getElementById("vidas");
const recordEl = document.getElementById("record");
const recordInicioEl = document.getElementById("record-inicio");
const mensajeEl = document.getElementById("mensaje-juego");
const overlayFin = document.getElementById("overlay-fin");

function init() {
    highScore = parseInt(localStorage.getItem("invasores-record") || "0", 10);
    recordInicioEl.textContent = highScore;
    recordEl.textContent = highScore;

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    resize();

    for (let i = 0; i < 70; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            s: Math.random() * 1.6 + 0.4,
            speed: Math.random() * 0.4 + 0.1
        });
    }

    window.addEventListener("resize", resize);
    setupControls();
}

function resize() {
    width = Math.min(window.innerWidth, 480);
    height = window.innerHeight - CONTROL_H;
    canvas.width = width;
    canvas.height = height;
    if (player) {
        player.x = Math.min(player.x, width - PLAYER_W - 8);
        player.y = height - PLAYER_H - 55;   // más arriba
    }
}

function setupControls() {
    window.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    });
    window.addEventListener("keyup", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    });

    const activar = (lado, activo) => {
        if (lado === "izq") keys.left = activo;
        if (lado === "der") keys.right = activo;
    };

    const bindBoton = (btn, lado) => {
        const down = (e) => {
            e.preventDefault();
            btn.classList.add("pulsado");
            activar(lado, true);
        };
        const up = (e) => {
            e.preventDefault();
            btn.classList.remove("pulsado");
            activar(lado, false);
        };

        btn.addEventListener("touchstart", down, { passive: false });
        btn.addEventListener("touchend", up, { passive: false });
        btn.addEventListener("touchcancel", up, { passive: false });
        btn.addEventListener("mousedown", down);
        btn.addEventListener("mouseup", up);
        btn.addEventListener("mouseleave", up);
    };

    bindBoton(btnIzq, "izq");
    bindBoton(btnDer, "der");
}

// ========== NAVEGACIÓN ==========
btnEmpezar.addEventListener("click", () => {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    pantallaInicio.classList.add("oculta");
    pantallaDificultad.classList.remove("oculta");
});

btnVolver.addEventListener("click", () => {
    pantallaDificultad.classList.add("oculta");
    pantallaInicio.classList.remove("oculta");
});

btnFacil.addEventListener("click", () => iniciarConDificultad("facil"));
btnNormal.addEventListener("click", () => iniciarConDificultad("normal"));
btnDificil.addEventListener("click", () => iniciarConDificultad("dificil"));

btnReiniciar.addEventListener("click", (e) => {
    e.stopPropagation();
    iniciarConDificultad(dificultad);
});

btnMenu.addEventListener("click", (e) => {
    e.stopPropagation();
    gameRunning = false;
    pararMusica();
    overlayFin.classList.add("oculta");
    pantallaJuego.classList.add("oculta");
    pantallaInicio.classList.remove("oculta");
    highScore = parseInt(localStorage.getItem("invasores-record") || "0", 10);
    recordInicioEl.textContent = highScore;
});

btnMute.addEventListener("click", () => {
    muteado = !muteado;
    btnMute.textContent = muteado ? "🔇" : "🔊";
    if (muteado) {
        pararMusica();
    } else if (gameRunning) {
        reanudarMusica();
    }
});

function iniciarConDificultad(dif) {
    dificultad = dif;
    if (dif === "facil") {
        cols = 8; rows = 4;
        alienMoveInterval = 750;
        fireRate = 300;
        diveInterval = 2400;
        lives = 5;
    } else if (dif === "normal") {
        cols = 10; rows = 5;
        alienMoveInterval = 580;
        fireRate = 260;
        diveInterval = 1600;
        lives = 3;
    } else {
        cols = 11; rows = 5;
        alienMoveInterval = 420;
        fireRate = 220;
        diveInterval = 1100;
        lives = 3;
    }
    empezarJuego();
}

function empezarJuego() {
    pantallaDificultad.classList.add("oculta");
    pantallaInicio.classList.add("oculta");
    pantallaJuego.classList.remove("oculta");
    overlayFin.classList.add("oculta");

    score = 0;
    gameRunning = true;
    bullets = [];
    enemyBullets = [];
    divers = [];
    alienDir = 1;
    lastFire = 0;
    lastAlienMove = 0;
    lastDive = 0;
    invulnerable = 0;
    keys.left = keys.right = false;

    // Nave más arriba (zona marcada en la foto)
    player = {
        x: width / 2 - PLAYER_W / 2,
        y: height - PLAYER_H - 55,
        w: PLAYER_W,
        h: PLAYER_H
    };

    crearFormacion();
    actualizarHUD();

    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    pararMusica();
    musicaActiva = true;
    if (!muteado) iniciarMusica();

    requestAnimationFrame(loop);
}

function crearFormacion() {
    aliens = [];
    const gapX = 8;
    const gapY = 14;
    const totalW = cols * ALIEN_W + (cols - 1) * gapX;
    const startX = (width - totalW) / 2;
    const startY = 48;

    for (let r = 0; r < rows; r++) {
        const offset = Math.floor((rows - 1 - r) * 0.6);
        const cStart = offset;
        const cEnd = cols - offset;
        for (let c = cStart; c < cEnd; c++) {
            let tipo;
            if (r === 0) tipo = 0;
            else if (r <= 2) tipo = 1;
            else tipo = 2;

            aliens.push({
                x: startX + c * (ALIEN_W + gapX),
                y: startY + r * (ALIEN_H + gapY),
                homeX: startX + c * (ALIEN_W + gapX),
                homeY: startY + r * (ALIEN_H + gapY),
                w: ALIEN_W,
                h: ALIEN_H,
                tipo: tipo,
                vivo: true,
                diving: false
            });
        }
    }
}

function actualizarHUD() {
    puntosEl.textContent = score;
    vidasEl.textContent = Math.max(0, lives);
    recordEl.textContent = highScore;
}

// ========== LOOP ==========
function loop(ts) {
    if (!gameRunning) return;

    stars.forEach(s => {
        s.y += s.speed;
        if (s.y > height) { s.y = 0; s.x = Math.random() * width; }
    });

    const speed = dificultad === "dificil" ? 6.2 : 5.2;
    if (keys.left) player.x -= speed;
    if (keys.right) player.x += speed;
    player.x = Math.max(6, Math.min(width - PLAYER_W - 6, player.x));

    if (ts - lastFire > fireRate) {
        bullets.push({
            x: player.x + PLAYER_W / 2 - BULLET_W / 2,
            y: player.y - 2,
            w: BULLET_W, h: BULLET_H, vy: -10
        });
        lastFire = ts;
        sonidoDisparo();
    }

    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y + b.h > 0);

    enemyBullets.forEach(b => b.y += b.vy);
    enemyBullets = enemyBullets.filter(b => b.y < height);

    if (ts - lastAlienMove > alienMoveInterval) {
        moverFormacion();
        lastAlienMove = ts;
    }

    if (ts - lastDive > diveInterval) {
        lanzarDive();
        lastDive = ts;
    }

    actualizarDivers();

    bullets.forEach(b => {
        aliens.forEach(a => {
            if (!a.vivo || a.diving) return;
            if (colision(b, a)) {
                a.vivo = false;
                b.y = -200;
                score += a.tipo === 0 ? 40 : a.tipo === 1 ? 25 : 15;
                actualizarHUD();
                sonidoExplosion();
            }
        });
        divers.forEach(d => {
            if (!d.vivo) return;
            if (colision(b, d)) {
                d.vivo = false;
                b.y = -200;
                score += d.tipo === 0 ? 60 : d.tipo === 1 ? 40 : 25;
                actualizarHUD();
                sonidoExplosion();
            }
        });
    });
    bullets = bullets.filter(b => b.y > -50);

    if (invulnerable <= 0) {
        enemyBullets.forEach(b => {
            if (colision(b, player)) {
                b.y = height + 10;
                perderVida();
            }
        });
        divers.forEach(d => {
            if (d.vivo && colision(d, player)) {
                d.vivo = false;
                perderVida();
            }
        });
    }
    if (invulnerable > 0) invulnerable--;

    const vivosFormacion = aliens.filter(a => a.vivo).length;
    const vivosDive = divers.filter(d => d.vivo).length;
    if (vivosFormacion === 0 && vivosDive === 0) {
        alienMoveInterval = Math.max(280, alienMoveInterval - 40);
        diveInterval = Math.max(700, diveInterval - 80);
        crearFormacion();
    }

    dibujar();
    requestAnimationFrame(loop);
}

function moverFormacion() {
    let borde = false;
    aliens.forEach(a => {
        if (!a.vivo || a.diving) return;
        a.x += 7 * alienDir;
        a.homeX += 7 * alienDir;
        if (a.x < 8 || a.x + a.w > width - 8) borde = true;
    });
    if (borde) {
        alienDir *= -1;
        aliens.forEach(a => {
            if (a.vivo && !a.diving) {
                a.y += 10;
                a.homeY += 10;
            }
        });
    }
}

function lanzarDive() {
    const candidatos = aliens.filter(a => a.vivo && !a.diving);
    if (candidatos.length === 0) return;

    const num = Math.min(
        dificultad === "dificil" ? 3 : dificultad === "normal" ? 2 : 1,
        candidatos.length
    );

    for (let i = candidatos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
    }

    for (let i = 0; i < num; i++) {
        const a = candidatos[i];
        a.diving = true;
        divers.push({
            x: a.x,
            y: a.y,
            w: a.w,
            h: a.h,
            tipo: a.tipo,
            vivo: true,
            phase: 0,
            tx: player.x + (Math.random() - 0.5) * 80,
            angle: 0,
            speed: 2.2 + Math.random() * 1.2 + (dificultad === "dificil" ? 0.8 : 0),
            side: Math.random() < 0.5 ? -1 : 1,
            shootCooldown: 40 + Math.random() * 60
        });
        a.vivo = false;
    }
}

function actualizarDivers() {
    divers.forEach(d => {
        if (!d.vivo) return;

        d.phase++;
        d.x += Math.sin(d.phase * 0.08) * 3.5 * d.side + (d.tx - d.x) * 0.015;
        d.y += d.speed;

        d.shootCooldown--;
        if (d.shootCooldown <= 0 && d.y < height * 0.7) {
            enemyBullets.push({
                x: d.x + d.w / 2 - 2,
                y: d.y + d.h,
                w: 4, h: 8,
                vy: 4.5 + Math.random()
            });
            d.shootCooldown = 50 + Math.random() * 70;
        }

        if (d.y > height + 20) d.vivo = false;
    });
    divers = divers.filter(d => d.vivo);
}

function perderVida() {
    if (!gameRunning || invulnerable > 0) return;
    lives--;
    actualizarHUD();
    invulnerable = 90;
    sonidoGolpe();

    if (lives <= 0) {
        lives = 0;
        actualizarHUD();
        finJuego();
        return;
    }
    player.x = width / 2 - PLAYER_W / 2;
}

function finJuego() {
    gameRunning = false;
    pararMusica();
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("invasores-record", highScore);
        recordEl.textContent = highScore;
        recordInicioEl.textContent = highScore;
        mensajeEl.textContent = "¡NUEVO RÉCORD! " + score;
        sonidoNuevoRecord();
    } else {
        mensajeEl.textContent = "GAME OVER · " + score;
    }
    overlayFin.classList.remove("oculta");
}

function colision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ========== DIBUJO ==========
function dibujar() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#fff";
    stars.forEach(s => {
        ctx.globalAlpha = 0.4 + (s.s / 2) * 0.4;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    aliens.forEach(a => {
        if (a.vivo && !a.diving) dibujarAlien(a);
    });

    divers.forEach(d => {
        if (d.vivo) dibujarAlien(d, true);
    });

    ctx.fillStyle = "#0f0";
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = 6;
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    ctx.shadowBlur = 0;

    ctx.fillStyle = "#f44";
    enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

    if (player && (invulnerable <= 0 || Math.floor(invulnerable / 6) % 2 === 0)) {
        dibujarNave(player);
    }
}

function dibujarNave(p) {
    ctx.fillStyle = "#4cf";
    ctx.fillRect(p.x + 10, p.y + 12, p.w - 20, 10);
    ctx.fillStyle = "#f33";
    ctx.fillRect(p.x + 13, p.y + 4, p.w - 26, 10);
    ctx.fillStyle = "#e00";
    ctx.fillRect(p.x, p.y + 16, 12, 8);
    ctx.fillRect(p.x + p.w - 12, p.y + 16, 12, 8);
    ctx.fillStyle = "#8cf";
    ctx.fillRect(p.x + 4, p.y + 10, 5, 8);
    ctx.fillRect(p.x + p.w - 9, p.y + 10, 5, 8);
    ctx.fillRect(p.x + p.w / 2 - 2, p.y, 4, 14);
}

function dibujarAlien(a, diving = false) {
    const colores = [
        ["#f0a", "#c0f"],
        ["#a0f", "#80f"],
        ["#0d0", "#0a0"]
    ];
    const [c1, c2] = colores[a.tipo] || colores[2];

    ctx.fillStyle = c1;
    ctx.fillRect(a.x + 3, a.y + 5, a.w - 6, a.h - 8);
    ctx.fillStyle = c2;
    ctx.fillRect(a.x + 1, a.y + 1, a.w - 2, 9);
    ctx.fillStyle = "#ff0";
    ctx.fillRect(a.x + 5, a.y + 3, 5, 5);
    ctx.fillRect(a.x + a.w - 10, a.y + 3, 5, 5);
    ctx.fillStyle = c1;
    ctx.fillRect(a.x + 2, a.y, 3, 5);
    ctx.fillRect(a.x + a.w - 5, a.y, 3, 5);
    ctx.fillRect(a.x + 5, a.y + a.h - 5, 4, 5);
    ctx.fillRect(a.x + a.w - 9, a.y + a.h - 5, 4, 5);

    if (diving) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.strokeRect(a.x, a.y, a.w, a.h);
    }
}

document.addEventListener("touchmove", e => {
    if (gameRunning) e.preventDefault();
}, { passive: false });

init();
