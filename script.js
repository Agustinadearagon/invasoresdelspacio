// ========== CONFIG BASE ==========
const ALIEN_W = 28;
const ALIEN_H = 22;
const PLAYER_W = 40;
const PLAYER_H = 28;
const BULLET_W = 4;
const BULLET_H = 12;

// ========== ESTADO ==========
let canvas, ctx;
let width, height;
let player;
let bullets = [];
let aliens = [];
let alienDir = 1;
let alienSpeed = 0.6;
let lastFire = 0;
let lastAlienMove = 0;
let alienMoveInterval = 700;
let fireRate = 280;
let score = 0;
let lives = 3;
let highScore = 0;
let gameRunning = false;
let keys = { left: false, right: false };
let touchSide = 0;
let stars = [];
let dificultad = "normal"; // facil | normal | dificil
let cols = 11;
let rows = 5;

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
const puntosEl = document.getElementById("puntos");
const vidasEl = document.getElementById("vidas");
const recordEl = document.getElementById("record");
const recordInicioEl = document.getElementById("record-inicio");
const mensajeEl = document.getElementById("mensaje-juego");
const overlayFin = document.getElementById("overlay-fin");

// ========== INICIO ==========
function init() {
    highScore = parseInt(localStorage.getItem("invasores-record") || "0", 10);
    recordInicioEl.textContent = highScore;
    recordEl.textContent = highScore;

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    resize();

    for (let i = 0; i < 60; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            s: Math.random() * 1.5 + 0.5
        });
    }

    window.addEventListener("resize", resize);
    setupControls();
}

function resize() {
    width = Math.min(window.innerWidth, 480);
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    if (player) {
        player.x = Math.min(player.x, width - PLAYER_W - 10);
    }
}

// ========== CONTROLES ==========
function setupControls() {
    window.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    });
    window.addEventListener("keyup", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    });

    const handleTouch = (e) => {
        if (!gameRunning) return;
        e.preventDefault();
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        touchSide = touch.clientX < window.innerWidth / 2 ? -1 : 1;
    };

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchend", () => { touchSide = 0; });
    canvas.addEventListener("touchcancel", () => { touchSide = 0; });
}

// ========== NAVEGACIÓN ==========
btnEmpezar.addEventListener("click", () => {
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
    overlayFin.classList.add("oculta");
    pantallaJuego.classList.add("oculta");
    pantallaInicio.classList.remove("oculta");
    highScore = parseInt(localStorage.getItem("invasores-record") || "0", 10);
    recordInicioEl.textContent = highScore;
});

function iniciarConDificultad(dif) {
    dificultad = dif;

    if (dif === "facil") {
        cols = 9;
        rows = 4;
        alienMoveInterval = 900;
        fireRate = 320;
        lives = 5;
        alienSpeed = 0.45;
    } else if (dif === "normal") {
        cols = 11;
        rows = 5;
        alienMoveInterval = 650;
        fireRate = 280;
        lives = 3;
        alienSpeed = 0.6;
    } else {
        cols = 12;
        rows = 5;
        alienMoveInterval = 480;
        fireRate = 240;
        lives = 3;
        alienSpeed = 0.85;
    }

    empezarJuego();
}

// ========== JUEGO ==========
function empezarJuego() {
    pantallaDificultad.classList.add("oculta");
    pantallaInicio.classList.add("oculta");
    pantallaJuego.classList.remove("oculta");
    overlayFin.classList.add("oculta");

    score = 0;
    gameRunning = true;
    bullets = [];
    alienDir = 1;
    lastFire = 0;
    lastAlienMove = 0;
    keys.left = false;
    keys.right = false;
    touchSide = 0;

    player = {
        x: width / 2 - PLAYER_W / 2,
        y: height - PLAYER_H - 30,
        w: PLAYER_W,
        h: PLAYER_H
    };

    crearAliens();
    actualizarHUD();
    requestAnimationFrame(loop);
}

function crearAliens() {
    aliens = [];
    const gapX = 10 + Math.random() * 6;
    const gapY = 12 + Math.random() * 6;
    const totalW = cols * ALIEN_W + (cols - 1) * gapX;
    let startX = (width - totalW) / 2;
    // Pequeño offset aleatorio
    startX += (Math.random() - 0.5) * 30;
    const startY = 45 + Math.random() * 20;

    for (let r = 0; r < rows; r++) {
        // Cada fila puede tener un desplazamiento horizontal aleatorio
        const offsetFila = (Math.random() - 0.5) * 40;
        for (let c = 0; c < cols; c++) {
            // A veces saltamos una posición para romper la simetría
            if (Math.random() < 0.08) continue;

            const tipo = Math.floor(Math.random() * 3); // aleatorio, no por fila
            aliens.push({
                x: startX + offsetFila + c * (ALIEN_W + gapX) + (Math.random() - 0.5) * 8,
                y: startY + r * (ALIEN_H + gapY) + (Math.random() - 0.5) * 6,
                w: ALIEN_W,
                h: ALIEN_H,
                tipo: tipo,
                vivo: true,
                // velocidad individual ligera para más caos
                drift: (Math.random() - 0.5) * 0.4
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
function loop(timestamp) {
    if (!gameRunning) return;

    const speed = dificultad === "dificil" ? 6 : 5;
    if (keys.left || touchSide === -1) player.x -= speed;
    if (keys.right || touchSide === 1) player.x += speed;
    player.x = Math.max(8, Math.min(width - PLAYER_W - 8, player.x));

    // Disparo automático
    if (timestamp - lastFire > fireRate) {
        bullets.push({
            x: player.x + PLAYER_W / 2 - BULLET_W / 2,
            y: player.y - 4,
            w: BULLET_W,
            h: BULLET_H,
            vy: -9
        });
        lastFire = timestamp;
    }

    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y + b.h > 0);

    if (timestamp - lastAlienMove > alienMoveInterval) {
        moverAliens();
        lastAlienMove = timestamp;
    }

    // Drift individual (más caos visual)
    aliens.forEach(a => {
        if (a.vivo) a.x += a.drift * 0.3;
    });

    // Colisiones bala → alien
    bullets.forEach(b => {
        aliens.forEach(a => {
            if (!a.vivo) return;
            if (colision(b, a)) {
                a.vivo = false;
                b.y = -100;
                const puntos = a.tipo === 0 ? 30 : a.tipo === 1 ? 20 : 10;
                score += puntos;
                actualizarHUD();
            }
        });
    });
    bullets = bullets.filter(b => b.y > -50);

    // Oleada siguiente
    if (aliens.length > 0 && aliens.every(a => !a.vivo)) {
        alienMoveInterval = Math.max(250, alienMoveInterval - 50);
        crearAliens();
    }

    // Colisión aliens con jugador o suelo
    let hit = false;
    aliens.forEach(a => {
        if (!a.vivo) return;
        if (a.y + a.h >= player.y - 5 || colision(a, player)) {
            hit = true;
        }
    });
    if (hit) perderVida();

    dibujar();
    requestAnimationFrame(loop);
}

function moverAliens() {
    let tocarBorde = false;
    aliens.forEach(a => {
        if (!a.vivo) return;
        a.x += 8 * alienDir;
        if (a.x <= 2 || a.x + a.w >= width - 2) tocarBorde = true;
    });

    if (tocarBorde) {
        alienDir *= -1;
        aliens.forEach(a => {
            if (a.vivo) {
                a.y += 16 + Math.random() * 8; // caída no uniforme
            }
        });
    }
}

function perderVida() {
    if (!gameRunning) return;
    lives--;
    actualizarHUD();
    bullets = [];

    if (lives <= 0) {
        lives = 0;
        actualizarHUD();
        finJuego();
        return;
    }

    // Empujar aliens hacia arriba un poco
    aliens.forEach(a => {
        if (a.vivo) a.y = Math.max(35, a.y - 50);
    });
    player.x = width / 2 - PLAYER_W / 2;
}

function finJuego() {
    gameRunning = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("invasores-record", highScore);
        recordEl.textContent = highScore;
        recordInicioEl.textContent = highScore;
        mensajeEl.textContent = "¡NUEVO RÉCORD! " + score;
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
        ctx.globalAlpha = 0.35 + Math.random() * 0.4;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    aliens.forEach(a => {
        if (a.vivo) dibujarAlien(a);
    });

    ctx.fillStyle = "#0f0";
    ctx.shadowColor = "#0f0";
    ctx.shadowBlur = 8;
    bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
    ctx.shadowBlur = 0;

    if (player) dibujarNave(player);
}

function dibujarNave(p) {
    ctx.fillStyle = "#4af";
    ctx.fillRect(p.x + 8, p.y + 10, p.w - 16, 12);
    ctx.fillStyle = "#f44";
    ctx.fillRect(p.x + 14, p.y + 4, p.w - 28, 10);
    ctx.fillStyle = "#f00";
    ctx.fillRect(p.x, p.y + 14, 10, 10);
    ctx.fillRect(p.x + p.w - 10, p.y + 14, 10, 10);
    ctx.fillStyle = "#8cf";
    ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 12);
}

function dibujarAlien(a) {
    const colores = [
        ["#f0a", "#a0f"],
        ["#f80", "#f40"],
        ["#0af", "#08f"]
    ];
    const [c1, c2] = colores[a.tipo] || colores[2];

    ctx.fillStyle = c1;
    ctx.fillRect(a.x + 4, a.y + 6, a.w - 8, a.h - 10);
    ctx.fillStyle = c2;
    ctx.fillRect(a.x + 2, a.y + 2, a.w - 4, 10);
    ctx.fillStyle = "#ff0";
    ctx.fillRect(a.x + 6, a.y + 4, 5, 5);
    ctx.fillRect(a.x + a.w - 11, a.y + 4, 5, 5);
    ctx.fillStyle = c1;
    ctx.fillRect(a.x + 4, a.y, 3, 5);
    ctx.fillRect(a.x + a.w - 7, a.y, 3, 5);
    ctx.fillRect(a.x + 6, a.y + a.h - 6, 4, 6);
    ctx.fillRect(a.x + a.w - 10, a.y + a.h - 6, 4, 6);
}

// Evitar scroll
document.addEventListener("touchmove", e => {
    if (gameRunning) e.preventDefault();
}, { passive: false });

init();
