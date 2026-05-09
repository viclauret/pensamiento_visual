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
  heartPlayer: null,
  heartDiagnosedA: false,
  heartDiagnosedB: false,
  scrollLocked: false,
};

let lockedScrollY = 0;
let chartAutismoInstance = null;

const HEART_SCENARIOS = {
  A: {
    label: 'Jugador 1',
    symptoms: ['Fatiga extrema', 'Náuseas', 'Falta de aire', 'Dolor de mandíbula o espalda'],
    realState: 'EN RIESGO',
    diagnosis: 'SANA',
    message: 'Sus síntomas no fueron reconocidos como urgentes. No recibe seguimiento.',
    tone: 'missed',
  },
  B: {
    label: 'Jugador 2',
    symptoms: ['Dolor en el pecho', 'Dolor en el brazo izquierdo', 'Falta de aire'],
    realState: 'EN RIESGO',
    diagnosis: 'ENFERMEDAD CARDÍACA',
    message: 'Sus síntomas fueron reconocidos. Recibe atención y seguimiento.',
    tone: 'treated',
  },
};

const DATA_WAFFLE = {
  efectos: {
    years: [1968, 1980, 1995, 2010, 2026],
    male: [24, 26, 28, 29, 30],
    female: [35, 38, 41, 43, 45],
    maleGrid: 'maleGridEfectos',
    femaleGrid: 'femaleGridEfectos',
    maleCount: 'maleCountEfectos',
    femaleCount: 'femaleCountEfectos',
    yearEl: 'yearEfectos',
    slider: 'sliderEfectos',
  },
  accidente: {
    years: [2000, 2008, 2016, 2024],
    male: [20, 21, 22, 22],
    female: [25, 26, 27, 28],
    maleGrid: 'maleGrid',
    femaleGrid: 'femaleGrid',
    maleCount: 'maleCount',
    femaleCount: 'femaleCount',
    yearEl: 'yearAccidente',
    slider: 'sliderAccidente',
  },
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

function initDataSectionTriggers() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      dispararEfecto(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.25 });

  document.querySelectorAll('.data-section').forEach(section => io.observe(section));
}

/**
 * Efectos secundarios cuando cada sección entra al viewport.
 * Aquí se conectan las animaciones y visualizaciones con el scroll narrativo.
 */
function dispararEfecto(el) {
  // Perder vida en poción (el último elemento de esa escena)
  if (el.closest('#pocion') && el.classList.contains('corazon-perdido')) perderVida('A');

  // Perder vida en accidente
  if (el.closest('#accidente') && el.classList.contains('corazon-perdido')) perderVida('A');

  // Iniciar visualizaciones al entrar a las secciones de datos
  if (el.id === 'data-efectos') {
    buildWafflePair('efectos');
  }
  if (el.id === 'data-autismo') {
    setTimeout(buildChartAutismo, 300);
  }
  if (el.id === 'autismo') {
    setTimeout(buildChartAutismo, 300);
  }
  if (el.id === 'data-accidente') {
    buildWafflePair('accidente');
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
  playDamageSound();

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
    const colors = getCharacterColors(jugador);
    drawCharacter(canvas, colors, true);
    canvas.classList.add('char-hurt-anim');
    const personaje = document.getElementById(`personaje${jugador}`);
    if (personaje) {
      personaje.classList.add('personaje-hit');
      spawnDamageTag(personaje);
    }
    setTimeout(() => {
      drawCharacter(canvas, colors, false);
      canvas.classList.remove('char-hurt-anim');
      if (personaje) personaje.classList.remove('personaje-hit');
    }, 700);
  }
}

function getCharacterColors(jugador) {
  if (jugador === 'A') return STATE.generoRevelado ? CHARS.A_FEMALE : CHARS.A_NORMAL;
  return STATE.generoRevelado ? CHARS.B_MALE : CHARS.B_NORMAL;
}

function spawnDamageTag(personaje) {
  const tag = document.createElement('span');
  tag.className = 'damage-tag';
  tag.textContent = '-1';
  personaje.appendChild(tag);
  setTimeout(() => tag.remove(), 900);
}

function playDamageSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;
  try {
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 260);
  } catch (err) {
    // Le son est bonus: on ignore les navigateurs qui le bloquent.
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
        revealSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(bloquearScroll, 350);
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
  if (STATE.scrollLocked) return;
  STATE.scrollLocked = true;
  lockedScrollY = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${lockedScrollY}px`;
  document.body.style.width = '100%';
}

function desbloquearScroll() {
  if (!STATE.scrollLocked) return;
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  STATE.scrollLocked = false;
  const y = lockedScrollY;
  lockedScrollY = 0;
  window.scrollTo(0, y);
}

function lockScroll() {
  bloquearScroll();
}

function unlockScroll() {
  desbloquearScroll();
}

/* ───────────────────────────────────────────────────────────
   8. QUESTIONNAIRE CARDÍACO
─────────────────────────────────────────────────────────── */

function initHeartQuiz() {
  const quiz = document.getElementById('heartQuiz');
  const panel = document.getElementById('heartPanel');
  const list = document.getElementById('symptomList');
  const diagnosisCard = document.getElementById('diagnosisCard');
  const diagnoseBtn = document.getElementById('btnDiagnoseHeart');
  const heartLoss = document.getElementById('heartLoss1');
  if (!quiz || !panel || !list || !diagnosisCard || !diagnoseBtn) return;

  quiz.querySelectorAll('[data-heart-player]').forEach(btn => {
    btn.addEventListener('click', () => {
      const player = btn.dataset.heartPlayer;
      STATE.heartPlayer = player;
      quiz.querySelectorAll('[data-heart-player]').forEach(el => el.classList.toggle('active', el === btn));
      renderHeartSymptoms(player);
      panel.hidden = false;
      diagnosisCard.hidden = true;
      diagnoseBtn.hidden = false;
    });
  });

  diagnoseBtn.addEventListener('click', () => {
    if (!STATE.heartPlayer) return;
    renderHeartDiagnosis(STATE.heartPlayer);
    diagnoseBtn.hidden = true;
    if (STATE.heartPlayer === 'A' && !STATE.heartDiagnosedA) {
      STATE.heartDiagnosedA = true;
      if (heartLoss) {
        heartLoss.hidden = false;
        heartLoss.classList.add('visible');
      }
      perderVida('A');
    }
    if (STATE.heartPlayer === 'B') STATE.heartDiagnosedB = true;
  });
}

function renderHeartSymptoms(player) {
  const list = document.getElementById('symptomList');
  if (!list) return;
  const scenario = HEART_SCENARIOS[player];
  list.innerHTML = '';
  scenario.symptoms.forEach(symptom => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'symptom-chip';
    item.textContent = symptom;
    item.addEventListener('click', () => item.classList.toggle('selected'));
    list.appendChild(item);
  });
}

function renderHeartDiagnosis(player) {
  const card = document.getElementById('diagnosisCard');
  if (!card) return;
  const scenario = HEART_SCENARIOS[player];
  card.className = `diagnosis-card ${scenario.tone}`;
  card.innerHTML = `
    <div class="diagnosis-row"><span>Estado real</span><strong>${scenario.realState}</strong></div>
    <div class="diagnosis-row"><span>Diagnóstico recibido</span><strong>${scenario.diagnosis}</strong></div>
    <p>${scenario.message}</p>
  `;
  card.hidden = false;
}

/* ───────────────────────────────────────────────────────────
   9. MINI‑JUEGO DE AUTISMO
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

function buildWafflePair(key) {
  const cfg = DATA_WAFFLE[key];
  if (!cfg) return;
  const slider = document.getElementById(cfg.slider);
  if (slider && !slider.dataset.bound) {
    slider.dataset.bound = 'true';
    slider.addEventListener('input', () => updateWafflePair(key, Number(slider.value), false));
  }
  updateWafflePair(key, slider ? Number(slider.value) : cfg.years.length - 1, true);
}

function updateWafflePair(key, index, animate = false) {
  const cfg = DATA_WAFFLE[key];
  if (!cfg) return;
  const safeIndex = Math.max(0, Math.min(index, cfg.years.length - 1));
  const yearEl = document.getElementById(cfg.yearEl);
  if (yearEl) yearEl.textContent = cfg.years[safeIndex];
  renderWaffle(cfg.maleGrid, cfg.maleCount, cfg.male[safeIndex], 'male', animate);
  renderWaffle(cfg.femaleGrid, cfg.femaleCount, cfg.female[safeIndex], 'female', animate);
}

function renderWaffle(gridId, countId, affected, type, animate) {
  const grid = document.getElementById(gridId);
  const countEl = document.getElementById(countId);
  if (!grid || !countEl) return;

  grid.innerHTML = '';
  countEl.textContent = '0';
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement('span');
    cell.className = `waffle-cell ${i < affected ? `affected ${type}` : ''}`;
    if (animate) {
      cell.style.transitionDelay = `${i * 8}ms`;
      requestAnimationFrame(() => cell.classList.add('visible'));
    } else {
      cell.classList.add('visible');
    }
    grid.appendChild(cell);
  }
  if (animate) countToNumber(countEl, affected, 700);
  else countEl.textContent = affected;
}

function countToNumber(el, target, ms) {
  const t0 = performance.now();
  (function tick(now) {
    const p = Math.min((now - t0) / ms, 1);
    el.textContent = Math.round(target * p);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = target;
  })(t0);
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
  document.querySelectorAll('#maleGrid .waffle-cell, #femaleGrid .waffle-cell')
    .forEach(p => p.classList.remove('visible'));

  setTimeout(animateCar, 300);
  setTimeout(() => updateWafflePair('accidente', Number(document.getElementById('sliderAccidente')?.value || 3), true), 900);
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

  chartAutismoInstance = new Chart(canvas, {
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

function initBtnReset() {
  const btn = document.getElementById('btn-reset');
  if (!btn) return;
  btn.addEventListener('click', resetGame);
}

function resetGame() {
  window.location.href = `${window.location.pathname}#inicio`;
  window.location.reload();
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
  initDataSectionTriggers();
  initPreguntaInteractiva();
  initHeartQuiz();
  initMinijuego();
  initBtnStart();
  initBtnReset();

  // Barra de progreso
  window.addEventListener('scroll', actualizarProgreso, { passive: true });
  actualizarProgreso();
});
