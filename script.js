// AstroPhase Astronomical Calculator & Simulator Script

// Astronomical Constants
const SYNODIC_MONTH = 29.5305877057; // days
// Known New Moon reference: Jan 11, 2024 11:57 UTC
const KNOWN_NEW_MOON = new Date(Date.UTC(2024, 0, 11, 11, 57, 0));

// State Management
let state = {
    currentDate: new Date(),
    baseDate: new Date(),
    dayOffset: 0,
    isPlaying: false,
    animationInterval: null
};

// DOM Elements
const dateInput = document.getElementById('dateInput');
const timeSlider = document.getElementById('timeSlider');
const sliderVal = document.getElementById('sliderVal');
const btnPlay = document.getElementById('btn-play');
const btnToday = document.getElementById('btn-today');
const btnPrevPhase = document.getElementById('btn-prev-phase');
const btnNextPhase = document.getElementById('btn-next-phase');
const phaseNameEl = document.getElementById('phaseName');
const statIllumination = document.getElementById('statIllumination');
const statAge = document.getElementById('statAge');
const statDistance = document.getElementById('statDistance');
const statEclipse = document.getElementById('statEclipse');
const eclipseAlert = document.getElementById('eclipseAlert');
const phaseGrid = document.getElementById('phaseGrid');
const scienceNote = document.getElementById('scienceNote');

const orbitalCanvas = document.getElementById('orbitalCanvas');
const ctxOrbital = orbitalCanvas.getContext('2d');
const moonCanvas = document.getElementById('moonCanvas');
const ctxMoon = moonCanvas.getContext('2d');

// Initialize App
function init() {
    setBaseDate(new Date());
    setupEventListeners();
    updateAll();
}

function setupEventListeners() {
    dateInput.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const parts = e.target.value.split('-');
        const d = new Date(Date.UTC(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
        setBaseDate(d);
        state.dayOffset = 0;
        timeSlider.value = 0;
        updateAll();
    });

    timeSlider.addEventListener('input', (e) => {
        state.dayOffset = parseInt(e.target.value);
        updateAll();
    });

    btnToday.addEventListener('click', () => {
        setBaseDate(new Date());
        state.dayOffset = 0;
        timeSlider.value = 0;
        updateAll();
    });

    btnPlay.addEventListener('click', togglePlay);

    btnPrevPhase.addEventListener('click', () => navigatePhase(-1));
    btnNextPhase.addEventListener('click', () => navigatePhase(1));
}

function setBaseDate(date) {
    state.baseDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    dateInput.value = state.baseDate.toISOString().split('T')[0];
}

function getActiveDate() {
    const d = new Date(state.baseDate.getTime());
    d.setUTCDate(d.getUTCDate() + state.dayOffset);
    return d;
}

function updateAll() {
    state.currentDate = getActiveDate();
    sliderVal.textContent = state.dayOffset;
    
    const astro = calculateAstronomy(state.currentDate);
    
    renderOrbitalCanvas(astro);
    renderMoonCanvas(astro);
    updateStats(astro);
    renderPhaseGrid(astro);
}

// Astronomical Calculations
function calculateAstronomy(date) {
    const diffTime = date.getTime() - KNOWN_NEW_MOON.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    let moonAge = diffDays % SYNODIC_MONTH;
    if (moonAge < 0) moonAge += SYNODIC_MONTH;

    const phaseFraction = moonAge / SYNODIC_MONTH; // 0 to 1
    
    // Illumination calculation (cosine model)
    const illumination = (1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2 * 100;
    
    // Phase naming
    const phaseName = getPhaseName(phaseFraction);

    // Simulated orbital angles
    // Sun is at fixed direction (e.g., right or top). Let's put Sun on the right (angle 0).
    const earthAngle = (diffDays / 365.25) * 2 * Math.PI;
    const moonAngle = earthAngle + (phaseFraction * 2 * Math.PI);

    // Distance variation (perigee / apogee approximation ~363,300 to 405,500 km)
    const anomaly = (moonAge / 27.55) * 2 * Math.PI; // anomalistic month approx
    const distance = Math.round(384400 - 21100 * Math.cos(anomaly));

    // Eclipse check (Node alignment approx when moonAge is near 0 or 14.76 and latitude is near ecliptic)
    // Simplified: check if moonAngle aligns closely with Earth-Sun axis and node condition
    const nodeCheck = Math.sin(moonAge * 2 * Math.PI / 173.3); // draconic month approx
    let eclipseStatus = "Normal Orbit";
    let isEclipse = false;
    
    if (Math.abs(moonAge < 1 || Math.abs(moonAge - SYNODIC_MONTH) < 1) && Math.abs(nodeCheck) < 0.25) {
        eclipseStatus = "Solar Eclipse Possible";
        isEclipse = true;
    } else if (Math.abs(moonAge - SYNODIC_MONTH / 2) < 1 && Math.abs(nodeCheck) < 0.25) {
        eclipseStatus = "Lunar Eclipse Possible";
        isEclipse = true;
    }

    return {
        date,
        moonAge,
        phaseFraction,
        illumination,
        phaseName,
        earthAngle,
        moonAngle,
        distance,
        eclipseStatus,
        isEclipse
    };
}

function getPhaseName(fraction) {
    if (fraction < 0.03 || fraction > 0.97) return "New Moon";
    if (fraction < 0.22) return "Waxing Crescent";
    if (fraction < 0.28) return "First Quarter";
    if (fraction < 0.47) return "Waxing Gibbous";
    if (fraction < 0.53) return "Full Moon";
    if (fraction < 0.72) return "Waning Gibbous";
    if (fraction < 0.78) return "Last Quarter";
    return "Waning Crescent";
}

// Rendering: Orbital Diagram
function renderOrbitalCanvas(astro) {
    const w = orbitalCanvas.width;
    const h = orbitalCanvas.height;
    ctxOrbital.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h / 2;

    // Sun rays indicator (from right)
    ctxOrbital.strokeStyle = 'rgba(251, 191, 36, 0.15)';
    ctxOrbital.lineWidth = 2;
    ctxOrbital.setLineDash([4, 4]);
    ctxOrbital.beginPath();
    ctxOrbital.moveTo(0, centerY);
    ctxOrbital.lineTo(w, centerY);
    ctxOrbital.stroke();
    ctxOrbital.setLineDash([]);

    // Earth orbit around hypothetical sun (off-screen right or center representation)
    // For clarity, let's keep Earth near center and show Moon orbiting Earth.
    const earthX = centerX - 30;
    const earthY = centerY;
    const earthRadius = 18;

    // Moon orbit around Earth
    const moonOrbitRadius = 85;
    ctxOrbital.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctxOrbital.lineWidth = 1;
    ctxOrbital.beginPath();
    ctxOrbital.arc(earthX, earthY, moonOrbitRadius, 0, 2 * Math.PI);
    ctxOrbital.stroke();

    // Moon position
    // In synodic view, sun is on the right (angle 0). Moon angle relative to Earth-Sun line:
    const moonX = earthX + moonOrbitRadius * Math.cos(astro.moonAngle);
    const moonY = earthY + moonOrbitRadius * Math.sin(astro.moonAngle);

    // Draw Earth
    ctxOrbital.fillStyle = '#3b82f6';
    ctxOrbital.beginPath();
    ctxOrbital.arc(earthX, earthY, earthRadius, 0, 2 * Math.PI);
    ctxOrbital.fill();
    ctxOrbital.strokeStyle = '#60a5fa';
    ctxOrbital.lineWidth = 2;
    ctxOrbital.stroke();

    // Draw Moon
    ctxOrbital.fillStyle = '#cbd5e1';
    ctxOrbital.beginPath();
    ctxOrbital.arc(moonX, moonY, 8, 0, 2 * Math.PI);
    ctxOrbital.fill();

    // Line from Earth to Moon
    ctxOrbital.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctxOrbital.lineWidth = 1;
    ctxOrbital.beginPath();
    ctxOrbital.moveTo(earthX, earthY);
    ctxOrbital.lineTo(moonX, moonY);
    ctxOrbital.stroke();

    // Sun label / indicator at top right
    ctxOrbital.fillStyle = '#fbbf24';
    ctxOrbital.font = '12px system-ui';
    ctxOrbital.fillText('Sunlight ➔', w - 85, 25);
}

// Rendering: Detailed Moon Phase Disc
function renderMoonCanvas(astro) {
    const w = moonCanvas.width;
    const h = moonCanvas.height;
    ctxMoon.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const r = 75;

    // Background dark circle (shadow)
    ctxMoon.fillStyle = '#0f172a';
    ctxMoon.beginPath();
    ctxMoon.arc(cx, cy, r, 0, 2 * Math.PI);
    ctxMoon.fill();

    // Draw illuminated part
    ctxMoon.fillStyle = '#f8fafc';
    
    const frac = astro.phaseFraction;
    
    ctxMoon.beginPath();
    if (frac <= 0.5) {
        // Waxing: right side lit
        ctxMoon.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
        // Terminator curve
        const cpWidth = r * Math.abs(1 - 4 * frac);
        if (frac < 0.25) {
            ctxMoon.quadraticCurveTo(cx - cpWidth, cy, cx, cy - r);
        } else {
            ctxMoon.quadraticCurveTo(cx + cpWidth, cy, cx, cy - r);
        }
    } else {
        // Waning: left side lit
        ctxMoon.arc(cx, cy, r, Math.PI / 2, 3 * Math.PI / 2, false);
        const cpWidth = r * Math.abs(1 - 4 * (frac - 0.5));
        if (frac < 0.75) {
            ctxMoon.quadraticCurveTo(cx + cpWidth, cy, cx, cy + r);
        } else {
            ctxMoon.quadraticCurveTo(cx - cpWidth, cy, cx, cy + r);
        }
    }
    ctxMoon.fill();

    // Outer ring highlight
    ctxMoon.strokeStyle = '#334155';
    ctxMoon.lineWidth = 2;
    ctxMoon.beginPath();
    ctxMoon.arc(cx, cy, r, 0, 2 * Math.PI);
    ctxMoon.stroke();
}

// Update Text Stats
function updateStats(astro) {
    phaseNameEl.textContent = astro.phaseName;
    statIllumination.textContent = astro.illumination.toFixed(1) + '%';
    statAge.textContent = astro.moonAge.toFixed(1) + ' days';
    statDistance.textContent = astro.distance.toLocaleString() + ' km';
    
    statEclipse.textContent = astro.eclipseStatus;
    if (astro.isEclipse) {
        statEclipse.classList.add('eclipse-active');
    } else {
        statEclipse.classList.remove('eclipse-active');
    }

    // Update Science Note dynamically based on phase
    if (astro.phaseName === "New Moon") {
        scienceNote.textContent = "During a New Moon, the Moon is positioned directly between the Earth and Sun. The illuminated side is facing away from us, making the Moon virtually invisible in the night sky.";
    } else if (astro.phaseName === "Full Moon") {
        scienceNote.textContent = "During a Full Moon, Earth is positioned directly between the Sun and Moon. The entire face of the Moon is illuminated by solar rays.";
    } else if (astro.phaseName.includes("Quarter")) {
        scienceNote.textContent = "At Quarter phases, the Moon is at a 90-degree angle relative to Earth and Sun. Exactly half of the visible moonlit disk is seen.";
    } else {
        scienceNote.textContent = "The Moon's phases progress smoothly through synodic cycles. Waxing phases show increasing illumination, while waning phases show decreasing illumination.";
    }
}

// Render Phase Grid Calendar (Key phases around current cycle)
function renderPhaseGrid(astro) {
    phaseGrid.innerHTML = '';
    
    // 4 key phases of the current cycle
    const keyPhases = [
        { name: 'New Moon', targetFraction: 0.0 },
        { name: 'First Qtr', targetFraction: 0.25 },
        { name: 'Full Moon', targetFraction: 0.5 },
        { name: 'Last Qtr', targetFraction: 0.75 }
    ];

    keyPhases.forEach(kp => {
        const div = document.createElement('div');
        div.className = 'phase-mini-card';
        
        const diffFraction = kp.targetFraction - (astro.moonAge / SYNODIC_MONTH);
        let dayDiff = Math.round(diffFraction * SYNODIC_MONTH);
        if (dayDiff < -15) dayDiff += Math.round(SYNODIC_MONTH);
        if (dayDiff > 15) dayDiff -= Math.round(SYNODIC_MONTH);
        
        if (Math.abs(dayDiff) <= 1) {
            div.classList.add('active');
        }

        const c = document.createElement('canvas');
        c.width = 50;
        c.height = 50;
        drawMiniMoon(c.getContext('2d'), kp.targetFraction);
        
        const label = document.createElement('div');
        label.innerHTML = `<strong>${kp.name}</strong><br><span style="color:var(--text-secondary)">${dayDiff >= 0 ? '+' + dayDiff : dayDiff}d</span>`;

        div.appendChild(c);
        div.appendChild(label);

        div.addEventListener('click', () => {
            state.dayOffset += dayDiff;
            timeSlider.value = state.dayOffset;
            updateAll();
        });

        phaseGrid.appendChild(div);
    });
}

function drawMiniMoon(ctx, frac) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = 20;

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    if (frac <= 0.5) {
        ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
        const cpWidth = r * Math.abs(1 - 4 * frac);
        if (frac < 0.25) {
            ctx.quadraticCurveTo(cx - cpWidth, cy, cx, cy - r);
        } else {
            ctx.quadraticCurveTo(cx + cpWidth, cy, cx, cy - r);
        }
    } else {
        ctx.arc(cx, cy, r, Math.PI / 2, 3 * Math.PI / 2, false);
        const cpWidth = r * Math.abs(1 - 4 * (frac - 0.5));
        if (frac < 0.75) {
            ctx.quadraticCurveTo(cx + cpWidth, cy, cx, cy + r);
        } else {
            ctx.quadraticCurveTo(cx - cpWidth, cy, cx, cy + r);
        }
    }
    ctx.fill();
}

// Animation Play / Pause
function togglePlay() {
    if (state.isPlaying) {
        clearInterval(state.animationInterval);
        state.isPlaying = false;
        btnPlay.textContent = 'Play Animation';
        btnPlay.classList.remove('secondary');
        btnPlay.classList.add('primary');
    } else {
        state.isPlaying = true;
        btnPlay.textContent = 'Pause Animation';
        btnPlay.classList.remove('primary');
        btnPlay.classList.add('secondary');
        
        state.animationInterval = setInterval(() => {
            state.dayOffset += 1;
            if (state.dayOffset > 60) state.dayOffset = -60;
            timeSlider.value = state.dayOffset;
            updateAll();
        }, 150);
    }
}

// Phase Navigation
function navigatePhase(direction) {
    // Approximate jump by quarter moon (~7.38 days)
    state.dayOffset += direction * 7.4;
    state.dayOffset = Math.round(state.dayOffset);
    timeSlider.value = state.dayOffset;
    updateAll();
}

// Run on load
init();
