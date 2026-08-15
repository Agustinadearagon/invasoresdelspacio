# Invasores del Espacio

Juego arcade inspirado en el clásico **Space Invaders**, hecho con HTML, CSS y JavaScript puro (sin frameworks ni librerías externas).

Pensado para móvil y también jugable en PC.

**Demo:** [https://agustinadearagon.github.io/invasoresdelspacio/](https://agustinadearagon.github.io/invasoresdelspacio/)

---

## Cómo jugar

1. La nave **dispara sola** de forma continua.
2. Muévete con los botones **←** y **→** de la parte inferior de la pantalla (en móvil) o con las **flechas del teclado** / teclas **A** y **D** (en PC).
3. Destruye todos los alienígenas.
4. Si te golpean o un alien en picado te toca, pierdes una vida.
5. Consigue la mayor puntuación posible.

### Dificultades

| Modo    | Vidas | Características                  |
|---------|-------|----------------------------------|
| Fácil   | 5     | Ataques lentos, menos aliens     |
| Normal  | 3     | Equilibrado                      |
| Difícil | 3     | Ataques agresivos y más rápidos  |

El récord se guarda automáticamente en el navegador.

---

## Controles

| Acción          | Móvil              | PC                    |
|-----------------|--------------------|-----------------------|
| Mover izquierda | Botón ◀            | ← o A                 |
| Mover derecha   | Botón ▶            | → o D                 |
| Silenciar       | Botón 🔊 / 🔇      | Botón 🔊 / 🔇         |

---

## Características

- 3 niveles de dificultad
- Ataques en picado de los aliens
- Formación en V
- Música de fondo y efectos de sonido (generados con Web Audio API, sin archivos externos)
- Botón de silencio
- Récord persistente (localStorage)
- Funciona offline (Service Worker)
- Diseño retro con estilo neón

---

## Cómo ejecutar el proyecto

### Opción 1: Abrir directamente
Puedes abrir el archivo `index.html` en el navegador, aunque algunas funciones (como el Service Worker) funcionan mejor con un servidor local.

### Opción 2: Servidor local (recomendado)

Con Python:

```bash
# Python 3
python -m http.server 8000
