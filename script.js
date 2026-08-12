// ========== CONFIG ==========
const COLS = 11;
const ROWS = 5;
const ALIEN_W = 28;
const ALIEN_H = 22;
const ALIEN_GAP_X = 12;
const ALIEN_GAP_Y = 14;
const PLAYER_W = 40;
const PLAYER_H = 28;
const BULLET_W = 4;
const BULLET_H = 12;
const FIRE_RATE = 280; // ms entre disparos automáticos
const ALIEN_STEP_X = 8;
const ALIEN_DROP = 18;

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
let score = 0;
let lives = 3;
let highScore = 0;
let gameRunning = false;
let gameOver = false;
let keys = { left: false, right: false };
let touchSide = 0; // -1 izq, 0 nada, 1 der
let stars = [];

// ========== DOM ==========
const pantallaInicio = document.getElementById("pantalla-inicio");
const pantallaJuego = document.getElementById("pantalla-juego");
const btnEmpezar = document.getElementById("btn-empezar");
const btnReiniciar = document.getElementById("btn-reiniciar");
const btnMenu = document.getElementById("btn-menu");
const puntosEl = document.getElementById("puntos");
const vidasEl = document.getElementById("vidas");
const recordEl = document.getElementById("record");
const recordInicioEl = document.getElementById("record-inicio");
const mensajeEl = document.getElementById("mensaje-juego");

// ========== INICIO ==========
function init() {
    highScore = parseInt(localStorage.getItem("invasores-record") || "0", 10);
    recordInicioEl.textContent = highScore;
    recordEl.textContent = highScore;

    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");
    resize();

    // Estrellas de fondo
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
    // Teclado
    window.addEventListener("keydown", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
    });
    window.addEventListener("keyup", e => {
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
    });

    // Táctil: mitad izquierda / derecha
    const handleTouch = (e) => {
        e.preventDefault();
        if (!gameRunning) return;
        const touch = e.touches[0] || e.changedTouches[0];
        if (!touch) return;
        const x = touch.clientX;
        touchSide = x < window.innerWidth / 2 ? -1 : 1;
    };

    canvas.addEventListener("touchstart", handleTouch, { passive: false });
    canvas.addEventListener("touchmove", handleTouch, { passive: false });
    canvas.addEventListener("touchend", () => { touchSide = 0; });
    canvas.addEventListener("touchcancel", () => { touchSide = 0; });

    // También en toda la pantalla de juego
    pantallaJuego.addEventListener("touchstart", handleTouch, { passive: false });
    pantallaJuego.addEventListener("touchmove", handleTouch, { passive: false });
    pantallaJuego.addEventListener("touchend", () => { touchSide = 0; });
}

// ========== JUEGO ==========
function empezarJuego() {
    pantallaInicio.classList.add("oculta");
    pantallaJuego.classList.remove("oculta");
    btnReiniciar.classList.add("oculta");
    btnMenu.classList.add("oculta");
    mensajeEl.classList.add("oculta");

    score = 0;
    lives = 3;
    gameOver = false;
    gameRunning = true;
    bullets = [];
    alienDir = 1;
    alienSpeed = 0.6;
    alienMoveInterval = 700;
    lastFire = 0;

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
    const totalW = COLS * ALIEN_W + (COLS - 1) * ALIEN_GAP_X;
    const startX = (width - totalW) / 2;
    const startY = 50;

    // Tipos de alien por fila (colores distintos)
    const tipos = [0, 0, 1, 1, 2]; // 0=rojo, 1=naranja, 2=magenta

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            aliens.push({
                x: startX + c * (ALIEN_W + ALIEN_GAP_X),
                y: startY + r * (ALIEN_H + ALIEN_GAP_Y),
                w: ALIEN_W,
                h: ALIEN_H,
                tipo: tipos[r],
                vivo: true
            });
        }
    }
}

function actualizarHUD() {
    puntosEl.textContent = score;
    vidasEl.textContent = lives;
    recordEl.textContent = highScore;
}

// ========== LOOP ==========
function loop(timestamp) {
    if (!gameRunning) return;

    // Movimiento jugador
    const speed = 5;
    if (keys.left || touchSide === -1) player.x -= speed;
    if (keys.right || touchSide === 1) player.x += speed;
    player.x = Math.max(8, Math.min(width - PLAYER_W - 8, player.x));

    // Disparo automático
    if (timestamp - lastFire > FIRE_RATE) {
        bullets.push({
            x: player.x + PLAYER_W / 2 - BULLET_W / 2,
            y: player.y - 4,
            w: BULLET_W,
            h: BULLET_H,
            vy: -9
        });
        lastFire = timestamp;
    }

    // Mover balas
    bullets.forEach(b => b.y += b.vy);
    bullets = bullets.filter(b => b.y + b.h > 0);

    // Mover aliens (por intervalos)
    if (timestamp - lastAlienMove > alienMoveInterval) {
        moverAliens();
        lastAlienMove = timestamp;
    }

    // Colisiones bala → alien
    bullets.forEach(b => {
        aliens.forEach(a => {
            if (!a.vivo) return;
            if (colision(b, a)) {
                a.vivo = false;
                b.y = -100; // fuera
                const puntos = a.tipo === 0 ? 30 : a.tipo === 1 ? 20 : 10;
                score += puntos;
                actualizarHUD();
            }
        });
    });
    bullets = bullets.filter(b => b.y > -50);

    // ¿Todos muertos?
    if (aliens.every(a => !a.vivo)) {
        // Siguiente oleada más rápida
        alienMoveInterval = Math.max(280, alienMoveInterval - 60);
        alienSpeed += 0.15;
        crearAliens();
    }

    // ¿Aliens tocan al jugador o llegan abajo?
    aliens.forEach(a => {
        if (!a.vivo) return;
        if (a.y + a.h >= player.y) {
            perderVida();
        }
        if (colision(a, player)) {
            perderVida();
        }
    });

    dibujar();
    requestAnimationFrame(loop);
}

function moverAliens() {
    let tocarBorde = false;
    aliens.forEach(a => {
        if (!a.vivo) return;
        a.x += ALIEN_STEP_X * alienDir;
        if (a.x <= 4 || a.x + a.w >= width - 4) tocarBorde = true;
    });

    if (tocarBorde) {
        alienDir *= -1;
        aliens.forEach(a => {
            if (a.vivo) a.y += ALIEN_DROP;
        });
    }
}

function perderVida() {
    lives--;
    actualizarHUD();
    bullets = [];
    if (lives <= 0) {
        finJuego();
    } else {
        // Resetear posición de aliens un poco hacia arriba
        aliens.forEach(a => {
            if (a.vivo) a.y = Math.max(40, a.y - 40);
        });
        player.x = width / 2 - PLAYER_W / 2;
    }
}

function finJuego() {
    gameRunning = false;
    gameOver = true;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem("invasores-record", highScore);
        recordEl.textContent = highScore;
        recordInicioEl.textContent = highScore;
        mensajeEl.textContent = "¡NUEVO RÉCORD! " + score;
    } else {
        mensajeEl.textContent = "GAME OVER · " + score;
    }
    mensajeEl.classList.remove("oculta");
    btnReiniciar.classList.remove("oculta");
    btnMenu.classList.remove("oculta");
}

function colision(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ========== DIBUJO ==========
function dibujar() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // Estrellas
    ctx.fillStyle = "#fff";
    stars.forEach(s => {
        ctx.globalAlpha = 0.4 + Math.random() * 0.4;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });
    ctx.globalAlpha = 1;

    // Aliens
    aliens.forEach(a => {
        if (!a.vivo) return;
        dibujarAlien(a);
    });

    // Balas
    ctx.fillStyle = "#0f0";
    bullets.forEach(b => {
        ctx.shadowColor = "#0f0";
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x, b.y, b.w, b.h);
    });
    ctx.shadowBlur = 0;

    // Nave
    if (player) dibujarNave(player);
}

function dibujarNave(p) {
    // Cuerpo
    ctx.fillStyle = "#4af";
    ctx.fillRect(p.x + 8, p.y + 10, p.w - 16, 12);
    // Cabina
    ctx.fillStyle = "#f44";
    ctx.fillRect(p.x + 14, p.y + 4, p.w - 28, 10);
    // Alas
    ctx.fillStyle = "#f00";
    ctx.fillRect(p.x, p.y + 14, 10, 10);
    ctx.fillRect(p.x + p.w - 10, p.y + 14, 10, 10);
    // Cañón
    ctx.fillStyle = "#8cf";
    ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 12);
}

function dibujarAlien(a) {
    const colores = [
        ["#f0a", "#a0f"], // magenta
        ["#f80", "#f40"], // naranja
        ["#0af", "#08f"]  // azul
    ];
    const [c1, c2] = colores[a.tipo] || colores[2];

    // Cuerpo
    ctx.fillStyle = c1;
    ctx.fillRect(a.x + 4, a.y + 6, a.w - 8, a.h - 10);
    // Cabeza / ojos
    ctx.fillStyle = c2;
    ctx.fillRect(a.x + 2, a.y + 2, a.w - 4, 10);
    // Ojos
    ctx.fillStyle = "#ff0";
    ctx.fillRect(a.x + 6, a.y + 4, 5, 5);
    ctx.fillRect(a.x + a.w - 11, a.y + 4, 5, 5);
    // Antenas
    ctx.fillStyle = c1;
    ctx.fillRect(a.x + 4, a.y, 3, 5);
    ctx.fillRect(a.x + a.w - 7, a.y, 3, 5);
    // Piernas
    ctx.fillRect(a.x + 6, a.y + a.h - 6, 4, 6);
    ctx.fillRect(a.x + a.w - 10, a.y + a.h - 6, 4, 6);
}

// ========== EVENTOS UI ==========
btnEmpezar.addEventListener("click", empezarJuego);
btnReiniciar.addEventListener("click", empezarJuego);
btnMenu.addEventListener("click", () => {
    gameRunning = false;
    pantallaJuego.classList.add("oculta");
    pantallaInicio.classList.remove("oculta");
    highScore = parseInt(localStorage.getItem("invasores-record") || "0", 10);
    recordInicioEl.textContent = highScore;
});

// Evitar scroll en móvil
document.addEventListener("touchmove", e => {
    if (gameRunning) e.preventDefault();
}, { passive: false });

init();
