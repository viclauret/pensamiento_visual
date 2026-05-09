/* ══════════════════════════════════════════════════════════
   ¿Cuestión de Suerte? — script.js
   Pensamiento Visual · IDI1015-1
   ══════════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────────────
   1. DIBUJO DE PERSONAJES EN CANVAS
   Se usan canvas para poder redibuar los personajes cuando
   cambia su estado (normal, herido, revelado).
─────────────────────────────────────────────────────────── */

// Paleta de colores de los personajes
const CHARS = {
  // Jugador 1 y 2 antes del reveal (neutros, distintos colores de ropa)
  A_NORMAL:  { skin:'#fbbf24', hair:'#7c3aed', shirt:'#3b82f6', pants:'#1d4ed8', shoe:'#111827' },
  B_NORMAL:  { skin:'#9ca3af', hair:'#4b5563', shirt:'#16a34a', pants:'#15803d', shoe:'#111827' },
  // Después del reveal
  A_FEMALE:  { skin:'#fbbf24', hair:'#7c3aed', shirt:'#c026d3', pants:'#7c3aed', shoe:'#111827' },
  B_MALE:    { skin:'#d1d5db', hair:'#374151', shirt:'#16a34a', pants:'#15803d', shoe:'#111827' },
};

/**
 * Dibuja un personaje pixel art en un canvas 40×60.
 * @param {HTMLCanvasElement} canvas
 * @param {Object} colors  — { skin, hair, shirt, pants, shoe }
 * @param {boolean} hurt   — si true, añade ojos X y expresión de daño
 */
function drawCharacter(canvas, colors, hurt = false) {
  const ctx = canvas.getContext('2d');
  const W = 40, H = 60;
  ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = false;

  const px = (x, y, w, h, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };

  // Pelo (detrás de la cabeza)
  px(6,  2,  4, 20, colors.hair);  // lado izq
  px(30, 2,  4, 20, colors.hair);  // lado der

  // Cabeza
  px(10, 2,  20, 16, colors.skin);

  // Ojos
  if (hurt) {
    // ojos X
    ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(14,8); ctx.lineTo(17,11); ctx.moveTo(17,8); ctx.lineTo(14,11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(23,8); ctx.lineTo(26,11); ctx.moveTo(26,8); ctx.lineTo(23,11); ctx.stroke();
    // boca torcida
    ctx.beginPath(); ctx.moveTo(15,15); ctx.quadraticCurveTo(20,13,25,15); ctx.stroke();
    // estrellitas de mareo
    ctx.fillStyle = '#fbbf24'; ctx.font = '8px serif';
    ctx.fillText('★', 3, 10);
    ctx.fillText('★', 32, 10);
  } else {
    px(14, 8,  4, 4, '#1f2937');   // ojo izq
    px(22, 8,  4, 4, '#1f2937');   // ojo der
    px(15,14, 10, 2, '#6b7280');   // boca
  }

  // Cuerpo (camisa)
  px(8,  20, 24, 16, colors.shirt);
  // Brazos
  px(2,  20,  6, 12, colors.shirt);
  px(32, 20,  6, 12, colors.shirt);

  // Piernas
  px(10, 37,  8, 14, colors.pants);
  px(22, 37,  8, 14, colors.pants);

  // Zapatos
  px(9,  49, 10,  7, colors.shoe);
  px(21, 49, 10,  7, colors.shoe);
}

/* ───────────────────────────────────────────────────────────
   2. ESTADO GLOBAL DE LA NARRATIVA
─────────────────────────────────────────────────────────── */

const STATE = {
  // vidas de cada jugador (empiezan con 5)
  vidasA: 5,
  vidasB: 5,
  // si el género ya fue revelado
  generoRevelado: false,
  // si el usuario ya respondió la pregunta interactiva
  respondioPreg: false,
  // cuántos personajes encontró en el mini‑juego
  encontradosMinijuego: 0,
  minijuegoCompleto: false,
};

/* ───────────────────────────────────────────────────────────
   3. BARRA DE PROGRESO
─────────────────────────────────────────────────────────── */

function actualizarProgreso() {
  const scrollTop = window.scrollY;
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = Math.min(scrollTop / docH, 1);
  document.getElementById('progress-bar').style.width = (pct * 100) + '%';
}

/* ───────────────────────────────────────────────────────────
   4. REVEAL ON SCROLL — IntersectionObserver
   Activa la animación CSS cuando el elemento entra al viewport.
─────────────────────────────────────────────────────────── */

function initScrollReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Disparar efectos secundarios según la sección
        dispararEfecto(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => io.observe(el));
}

/**
 * Efectos secundarios cuando cada sección entra al viewport.
 * Aquí se conectan las animaciones y visualizaciones con el scroll narrativo.
 */
function dispararEfecto(el) {
  // Perder vida cuando aparece la alerta de corazón
  if (el.id === 'heartLoss1') perderVida('A');

  // Perder vida en poción (el último elemento de esa escena)
  if (el.closest('#pocion') && el.classList.contains('corazon-perdido')) perderVida('A');

  // Perder vida en accidente
  if (el.closest('#accidente') && el.classList.contains('corazon-perdido')) perderVida('A');

  // Iniciar visualizaciones al entrar a las secciones de datos
  if (el.id === 'data-corazon') {
    setTimeout(() => {
      countUp(document.getElementById('count-h'), 63.2, 1, 900);
      setTimeout(() => countUp(document.getElementById('count-f'), 25.9, 1, 900), 1000);
    }, 400);
  }
  if (el.id === 'data-efectos') {
    buildGridPersonas('maleGridEfectos', 'femaleGridEfectos', 'maleCountEfectos', 'femaleCountEfectos', 30, 45);
  }
  if (el.id === 'data-autismo') {
    setTimeout(buildChartAutismo, 300);
  }
  if (el.id === 'data-accidente') {
    buildGridPersonas('maleGrid', 'femaleGrid', 'maleCount', 'femaleCount', 22, 28);
    setTimeout(() => {
      animateCar();
    }, 400);
  }
  // Reveal de género → cambiar apariencia de personajes
  if (el.id === 'gender-card') {
    setTimeout(revelarGenero, 500);
  }
}

/* ───────────────────────────────────────────────────────────
   5. MANEJO DE VIDAS
─────────────────────────────────────────────────────────── */

/**
 * Quita una vida al jugador indicado ('A' o 'B') y actualiza
 * los corazones en pantalla. También redibuja el personaje con
 * cara de daño por un momento.
 */
function perderVida(jugador) {
  const key = `vidas${jugador}`;
  if (STATE[key] <= 0) return;
  STATE[key]--;

  const vidaEl = document.getElementById(`vida${jugador}`);
  const corazones = vidaEl ? vidaEl.querySelectorAll('.corazon') : [];
  // Apagar el último corazón activo
  for (let i = corazones.length - 1; i >= 0; i--) {
    if (!corazones[i].classList.contains('perdido')) {
      corazones[i].classList.add('perdido');
      break;
    }
  }

  // Animar el canvas con cara de daño
  const canvas = document.getElementById(`canvas${jugador}`);
  if (canvas) {
    const colors = jugador === 'A' ? CHARS.A_NORMAL : CHARS.B_NORMAL;
    drawCharacter(canvas, colors, true);
    canvas.classList.add('char-hurt-anim');
    setTimeout(() => {
      drawCharacter(canvas, colors, false);
      canvas.classList.remove('char-hurt-anim');
    }, 700);
  }
}

/* ───────────────────────────────────────────────────────────
   6. REVEAL DE GÉNERO
   Cambia el dibujo de los personajes a su versión con género
   revelado y añade los tags visuales.
─────────────────────────────────────────────────────────── */

function revelarGenero() {
  if (STATE.generoRevelado) return;
  STATE.generoRevelado = true;

  const canvasA = document.getElementById('canvasA');
  const canvasB = document.getElementById('canvasB');

  // Redibujar con apariencia de género
  if (canvasA) drawCharacter(canvasA, CHARS.A_FEMALE);
  if (canvasB) drawCharacter(canvasB, CHARS.B_MALE);

  // Cambiar etiquetas de los personajes
  const lblA = document.querySelector('.label-j1');
  const lblB = document.querySelector('.label-j2');
  if (lblA) {
    lblA.textContent = 'MUJER';
    lblA.style.color = '#c026d3';
  }
  if (lblB) {
    lblB.textContent = 'HOMBRE';
    lblB.style.color = '#16a34a';
  }

  // Añadir animación de entrada a la card
  const card = document.getElementById('gender-card');
  if (card) card.classList.add('animating');
}

/* ───────────────────────────────────────────────────────────
   7. PREGUNTA INTERACTIVA
   Bloquea el scroll hasta que el usuario elija una respuesta.
─────────────────────────────────────────────────────────── */

function initPreguntaInteractiva() {
  const opciones = document.querySelectorAll('.opcion');
  const feedbackBox = document.getElementById('feedback-box');
  const feedbackTexto = document.getElementById('feedback-texto');
  const btnContinuar = document.getElementById('btn-continuar');

  // Al entrar a la escena de reveal, bloqueamos el scroll
  const revealSection = document.getElementById('reveal');
  if (!revealSection) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !STATE.respondioPreg) {
        bloquearScroll();
      }
    });
  }, { threshold: 0.6 });
  observer.observe(revealSection);

  opciones.forEach(opcion => {
    opcion.addEventListener('click', () => {
      if (STATE.respondioPreg) return;

      const valor = opcion.dataset.valor;

      // Marcar cada opción como correcta o incorrecta
      opciones.forEach(op => {
        op.disabled = true;
        if (op.dataset.valor === 'genero') {
          op.classList.add('correcto');
        } else {
          op.classList.add('incorrecto');
        }
      });

      // Mostrar feedback según lo que eligió
      let msg = '';
      if (valor === 'genero') {
        msg = '✓ Correcto. La única diferencia entre ambos jugadores era su género. Los sesgos estructurales afectan de manera desigual a hombres y mujeres.';
      } else if (valor === 'edad') {
        msg = '✗ No es la edad. Ambos jugadores tienen la misma edad. La diferencia que marcó todo fue su género.';
      } else {
        msg = '✗ No es la suerte. No fue azar, fue sesgo. Los sesgos estructurales de género explican por qué al Jugador 1 le fue consistentemente peor.';
      }
      feedbackTexto.textContent = msg;
      feedbackBox.style.display = 'block';

    });
  });

  // El botón "Continuar" desbloquea el scroll y lleva a la siguiente escena
  if (btnContinuar) {
    btnContinuar.addEventListener('click', () => {
      STATE.respondioPreg = true;
      desbloquearScroll();
      document.getElementById('gender-reveal').scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function bloquearScroll() {
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
}

function desbloquearScroll() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
}

/* ───────────────────────────────────────────────────────────
   8. MINI‑JUEGO DE AUTISMO
   Hay una grilla de íconos variados. Dos de ellos son los
   personajes. El usuario debe encontrarlos. Al completarlo,
   se muestra el dato sobre diagnóstico de autismo.
─────────────────────────────────────────────────────────── */

const ICONOS_FALSOS = ['🐱','🍄','⚔️','🌸','🎯','🦊','🏹','💎','🌟','⚡','🐸','🎭','🎪','🧩','🦋'];
// Los "personajes" en el mini-juego
const ICONO_J1 = '🧑'; // jugador 1
const ICONO_J2 = '🧒'; // jugador 2

function initMinijuego() {
  const grid = document.getElementById('miniGrid');
  const resultado = document.getElementById('miniResultado');
  const statAutismo = document.getElementById('stat-autismo');
  const heartLoss3 = document.getElementById('heartLoss3');

  if (!grid) return;

  // Mezclar íconos: 15 falsos + 2 jugadores = 17 ítems
  let items = [...ICONOS_FALSOS, ICONO_J1, ICONO_J2];
  // Mezcla aleatoria (Fisher-Yates)
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  items.forEach(icono => {
    const div = document.createElement('div');
    div.className = 'mini-item';
    div.textContent = icono;

    const esJugador = icono === ICONO_J1 || icono === ICONO_J2;

    div.addEventListener('click', () => {
      if (STATE.minijuegoCompleto) return;
      if (div.classList.contains('encontrado') || div.classList.contains('bloqueado')) return;

      if (esJugador) {
        div.classList.add('encontrado');
        STATE.encontradosMinijuego++;

        if (STATE.encontradosMinijuego === 1) {
          resultado.textContent = `¡Encontraste al primer jugador! Busca al otro...`;
        }

        if (STATE.encontradosMinijuego >= 2) {
          // Juego completo
          STATE.minijuegoCompleto = true;
          resultado.textContent = '¡Los encontraste a los dos! Pero, ¿qué tan fácil fue?';

          // Bloquear los demás
          grid.querySelectorAll('.mini-item:not(.encontrado)').forEach(el => {
            el.classList.add('bloqueado');
          });

          // Mostrar el dato después de un momento
          setTimeout(() => {
            if (statAutismo) {
              statAutismo.style.display = 'block';
              statAutismo.classList.add('reveal-on-scroll', 'visible');
            }
            if (heartLoss3) {
              heartLoss3.style.display = 'flex';
              heartLoss3.classList.add('reveal-on-scroll', 'visible');
              perderVida('A');
            }
          }, 1200);
        }
      } else {
        // Clic en ícono equivocado: pequeño shake visual
        div.style.transform = 'scale(0.85)';
        setTimeout(() => { div.style.transform = ''; }, 200);
      }
    });

    grid.appendChild(div);
  });
}

/* ───────────────────────────────────────────────────────────
   9. CONTADOR ANIMADO (count-up)
   Anima un número desde 0 hasta el valor objetivo.
─────────────────────────────────────────────────────────── */

function countUp(el, target, dec, ms) {
  if (!el) return;
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / ms, 1);
    const ease = 1 - Math.pow(1 - p, 3);  // ease-out cúbico
    el.textContent = (ease * target).toFixed(dec) + '%';
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target.toFixed(dec) + '%';
  })(t0);
}

/* ───────────────────────────────────────────────────────────
   10. GRILLAS DE PERSONAS (visualización waffle chart)
   Construye dos grillas de 100 personas con las afectadas
   en rojo y las anima de arriba hacia abajo.
─────────────────────────────────────────────────────────── */

function makePersonSVG(type, injured) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 18 24');
  svg.setAttribute('width',   '18');
  svg.setAttribute('height',  '24');
  svg.style.imageRendering = 'pixelated';

  // Colores según tipo y estado
  const headCol  = injured ? '#fca5a5' : (type === 'male' ? '#9ca3af' : '#fbbf24');
  const bodyCol  = injured ? '#ef4444' : (type === 'male' ? '#6b7280' : '#c026d3');
  const legsCol  = injured ? '#dc2626' : (type === 'male' ? '#4b5563' : '#7c3aed');

  const r = (x,y,w,h,f) => {
    const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('x',x); rect.setAttribute('y',y);
    rect.setAttribute('width',w); rect.setAttribute('height',h);
    rect.setAttribute('fill',f);
    svg.appendChild(rect);
  };

  r(5, 0, 8, 7, headCol);   // cabeza
  r(3, 7, 12,8, bodyCol);   // cuerpo
  r(3, 15, 5, 9, legsCol);  // pierna izq
  r(10,15, 5, 9, legsCol);  // pierna der

  const wrapper = document.createElement('div');
  wrapper.className = 'person' + (injured ? ' injured' : '');
  wrapper.appendChild(svg);
  return wrapper;
}

function buildGridPersonas(maleId, femaleId, maleCountId, femaleCountId, maleInjured, femaleInjured) {
  const mg = document.getElementById(maleId);
  const fg = document.getElementById(femaleId);
  if (!mg || !fg) return;

  mg.innerHTML = ''; fg.innerHTML = '';

  for (let i = 0; i < 100; i++) {
    mg.appendChild(makePersonSVG('male',   i < maleInjured));
    fg.appendChild(makePersonSVG('female', i < femaleInjured));
  }

  // Animación con delay escalonado
  setTimeout(() => animarGrid(maleId,   maleCountId,   maleInjured),    300);
  setTimeout(() => animarGrid(femaleId, femaleCountId, femaleInjured),  550);
}

function animarGrid(gridId, countId, injured) {
  const grid    = document.getElementById(gridId);
  const countEl = document.getElementById(countId);
  if (!grid || !countEl) return;

  const cells = grid.querySelectorAll('.person');
  let val = 0;
  cells.forEach((cell, i) => {
    setTimeout(() => {
      cell.classList.add('visible');
      if (i < injured) {
        val++;
        countEl.textContent = val;
      }
    }, i * 14);
  });
}

/* ───────────────────────────────────────────────────────────
   11. ANIMACIÓN DEL AUTO (accidente)
─────────────────────────────────────────────────────────── */

function animateCar() {
  const car = document.getElementById('carWrapper');
  if (!car) return;
  car.classList.remove('crash');
  void car.offsetWidth; // forzar reflow
  car.classList.add('crash');

  ['s1','s2','s3','s4'].forEach((id, idx) => {
    const s = document.getElementById(id);
    if (!s) return;
    s.classList.remove('active');
    setTimeout(() => {
      s.classList.add('active');
      setTimeout(() => s.classList.remove('active'), 700);
    }, idx * 80 + 100);
  });
}

// Función global para el botón "↺ REPETIR"
function runAnimAuto() {
  const mc = document.getElementById('maleCount');
  const fc = document.getElementById('femaleCount');
  if (mc) mc.textContent = '0';
  if (fc) fc.textContent = '0';
  document.querySelectorAll('#maleGrid .person, #femaleGrid .person')
    .forEach(p => p.classList.remove('visible'));

  setTimeout(animateCar, 300);
  setTimeout(() => animarGrid('maleGrid',   'maleCount',   22), 900);
  setTimeout(() => animarGrid('femaleGrid', 'femaleCount', 28), 1150);
}

/* ───────────────────────────────────────────────────────────
   12. GRÁFICO DE AUTISMO (Chart.js)
─────────────────────────────────────────────────────────── */

function buildChartAutismo() {
  const canvas = document.getElementById('chartAutismo');
  if (!canvas || canvas._built) return;
  canvas._built = true;

  const labels   = ['1960s','1970s','1980s','1990s','2000s','2010s','2020s'];
  const ratios   = [2.5, 3.0, 4.0, 4.2, 4.5, 4.2, 3.8];
  const pctM     = ratios.map(r => parseFloat(((1 / (r + 1)) * 100).toFixed(1)));
  const pctH     = pctM.map(p => parseFloat((100 - p).toFixed(1)));

  Chart.defaults.color       = '#9ca3af';
  Chart.defaults.borderColor = '#1f2937';
  Chart.defaults.font.family = "'Press Start 2P', monospace";
  Chart.defaults.font.size   = 7;

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Mujeres (%)',
          data: pctM,
          backgroundColor: 'rgba(192,38,211,0.75)', // morado/fucsia
          stack: 'stack0',
        },
        {
          label: 'Hombres (%)',
          data: pctH,
          backgroundColor: 'rgba(124,58,237,0.55)', // morado oscuro
          stack: 'stack0',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#9ca3af', font:{ size:7 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}%` } },
      },
      scales: {
        x: { stacked: true, ticks: { color: '#6b7280' } },
        y: {
          stacked: true, max: 100,
          ticks: { callback: v => v + '%', color: '#6b7280' },
        },
      },
    },
  });
}

/* ───────────────────────────────────────────────────────────
   13. BOTÓN START — hace scroll a la presentación
─────────────────────────────────────────────────────────── */

function initBtnStart() {
  const btn = document.getElementById('btn-start');
  if (!btn) return;
  btn.addEventListener('click', () => {
    document.getElementById('presentacion').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ───────────────────────────────────────────────────────────
   14. INIT — se ejecuta cuando carga el DOM
─────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  // Dibujar personajes iniciales (genéricos)
  const canvasA = document.getElementById('canvasA');
  const canvasB = document.getElementById('canvasB');
  if (canvasA) drawCharacter(canvasA, CHARS.A_NORMAL);
  if (canvasB) drawCharacter(canvasB, CHARS.B_NORMAL);

  // Iniciar sistemas
  initScrollReveal();
  initPreguntaInteractiva();
  initMinijuego();
  initBtnStart();

  // Barra de progreso
  window.addEventListener('scroll', actualizarProgreso, { passive: true });
  actualizarProgreso();
});
