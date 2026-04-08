let APP_DATA = {};
let STATE = {
  xp: 0,
  level: 1,
  totalSolved: 0,
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
  dailyStreak: 0,
  lastDate: null,
  equationsSolved: 0,
  graphsPlotted: 0,
  calculatorsUsed: new Set(),
  tutorMessages: 0,
  hardCorrect: 0,
  topicStats: {},
  activityLog: [],
  unlockedAchievements: []
};
let tutorSessionTopics = new Set();
let tutorMsgCount = 0;
let quizTimerInterval = null;

function saveState() {
  const toSave = { ...STATE, calculatorsUsed: [...STATE.calculatorsUsed] };
  localStorage.setItem('mathgenius_state', JSON.stringify(toSave));
}

function loadState() {
  try {
    const saved = localStorage.getItem('mathgenius_state');
    if (saved) {
      STATE = { ...STATE, ...JSON.parse(saved) };
      STATE.calculatorsUsed = new Set(STATE.calculatorsUsed || []);
    }
  } catch (e) { console.error('Failed to load state', e); }
}

function logActivity(icon, text) {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  STATE.activityLog.unshift({ icon, text, time });
  if (STATE.activityLog.length > 50) STATE.activityLog.pop();
  renderActivityLog();
}

function addXP(amount) {
  STATE.xp += amount;
  checkLevelUp();
  updateTopBar();
  updateSidebarFooter();
}

function checkLevelUp() {
  if (!APP_DATA.levels) return;
  let newLevel = 1;
  let levelName = 'Beginner';
  for (let l of APP_DATA.levels) {
    if (STATE.xp >= l.minXP) { newLevel = l.level; levelName = l.name; }
  }
  if (newLevel > STATE.level) {
    STATE.level = newLevel;
    const elName = document.getElementById('levelupName');
    const elModal = document.getElementById('levelUpModal');
    if(elName) elName.textContent = levelName;
    if(elModal) elModal.style.display = 'flex';
    sparkConfetti();
  }
}

document.getElementById('levelUpClose')?.addEventListener('click', () => { 
  const el = document.getElementById('levelUpModal'); if(el) el.style.display = 'none'; 
});
document.getElementById('achModalClose')?.addEventListener('click', () => { 
  const el = document.getElementById('achievementModal'); if(el) el.style.display = 'none'; 
});

function checkAchievements() {
  if (!APP_DATA.achievements) return;
  APP_DATA.achievements.forEach(a => {
    if (STATE.unlockedAchievements.includes(a.id)) return;
    let unlocked = false;
    const c = a.condition;
    if (c.type === 'totalSolved' && STATE.totalSolved >= c.count) unlocked = true;
    else if (c.type === 'streak' && STATE.streak >= c.count) unlocked = true;
    else if (c.type === 'correctAnswers' && STATE.totalCorrect >= c.count) unlocked = true;
    else if (c.type === 'accuracy') { if (STATE.totalSolved >= c.minProblems && (STATE.totalCorrect / STATE.totalSolved * 100) >= c.percent) unlocked = true; }
    else if (c.type === 'graphsPlotted' && STATE.graphsPlotted >= c.count) unlocked = true;
    else if (c.type === 'equationsSolved' && STATE.equationsSolved >= c.count) unlocked = true;
    else if (c.type === 'calculatorsUsed' && STATE.calculatorsUsed.size >= c.count) unlocked = true;
    else if (c.type === 'tutorMessages' && STATE.tutorMessages >= c.count) unlocked = true;
    else if (c.type === 'hardCorrect' && STATE.hardCorrect >= c.count) unlocked = true;
    else if (c.type === 'dailyStreak' && STATE.dailyStreak >= c.count) unlocked = true;

    if (unlocked) {
      STATE.unlockedAchievements.push(a.id);
      addXP(a.points);
      logActivity(a.icon, 'Unlocked: ' + a.name);
      const nameEl = document.getElementById('achModalName');
      const descEl = document.getElementById('achModalDesc');
      const iconEl = document.getElementById('achModalIcon');
      const ptsEl = document.getElementById('achModalPoints');
      const modEl = document.getElementById('achievementModal');
      if(nameEl) nameEl.textContent = a.name;
      if(descEl) descEl.textContent = a.description;
      if(iconEl) iconEl.textContent = a.icon;
      if(ptsEl) ptsEl.textContent = '+' + a.points + ' XP';
      if(modEl) modEl.style.display = 'flex';
      renderAchievementsFull();
      sparkConfetti();
    }
  });
  saveState();
}

function sparkConfetti() {
  const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    c.style.width = Math.random() * 8 + 4 + 'px';
    c.style.height = c.style.width;
    c.style.animationDuration = Math.random() * 2 + 2 + 's';
    c.style.opacity = Math.random();
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

function initTheme() {
  const toggle = document.getElementById('themeToggle');
  const stored = localStorage.getItem('mathgenius_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
  if(toggle) {
    toggle.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      const nxt = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nxt);
      localStorage.setItem('mathgenius_theme', nxt);
    });
  }
}

function navigateTo(section) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('section-' + section)?.classList.add('active');
  document.getElementById('nav-' + section)?.classList.add('active');
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
  
  const titles = {
    'dashboard': ['Dashboard', 'Welcome back! Keep learning.'],
    'graph-lab': ['Graph Lab', 'Visualize mathematical functions interactively.'],
    'equation-solver': ['Equation Solver', 'Step-by-step solutions to any equation.'],
    'ai-tutor': ['AI Tutor', 'Get help from your personal math assistant.'],
    'practice-zone': ['Practice Zone', 'Test your skills with smart quizzes.'],
    'calculators': ['Smart Calculators', 'Tools for budget, EMI, and everyday math.'],
    'performance': ['Performance', 'Track your progress and achievements.']
  };
  if (titles[section]) {
    const elT = document.getElementById('pageTitle');
    const elS = document.getElementById('pageSubtitle');
    if(elT) elT.textContent = titles[section][0];
    if(elS) elS.textContent = titles[section][1];
  }
  
  if(section === 'dashboard') renderDashboard();
  if(section === 'performance' && typeof renderPerformance === 'function') renderPerformance();
  if(section === 'graph-lab' && window.resizeGraph) window.resizeGraph();
}

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.section));
});
document.getElementById('menuBtn')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebarOverlay')?.classList.add('visible');
});
document.getElementById('sidebarClose')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
});
document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
});

function updateTopBar() {
  const elStr = document.getElementById('topStreakNum');
  const elXp = document.getElementById('topXpNum');
  if(elStr) elStr.textContent = STATE.streak;
  if(elXp) elXp.textContent = STATE.xp + ' XP';
}

function updateSidebarFooter() {
  if (!APP_DATA.levels) return;
  const curlvl = APP_DATA.levels.find(l => l.level === STATE.level) || APP_DATA.levels[0];
  const elLvl = document.getElementById('sidebarLevel');
  const elBar = document.getElementById('sidebarXpBar');
  const elLbl = document.getElementById('sidebarXpLabel');
  if(elLvl) elLvl.textContent = `Level ${curlvl.level} \u2014 ${curlvl.name}`;
  if(elBar) {
    const pct = Math.min(((STATE.xp - curlvl.minXP) / (curlvl.maxXP - curlvl.minXP)) * 100, 100);
    elBar.style.width = pct + '%';
  }
  if(elLbl) elLbl.textContent = `${STATE.xp} / ${curlvl.maxXP} XP`;
}

function renderDashboard() {
  const sSolved = document.getElementById('statSolvedNum');
  const sAcc = document.getElementById('statAccuracyNum');
  const sStr = document.getElementById('statStreakNum');
  const sBStr = document.getElementById('statStreakBest');
  const sLvl = document.getElementById('statLevelNum');
  const sLvlN = document.getElementById('statLevelName');

  if(sSolved) sSolved.textContent = STATE.totalSolved;
  const acc = STATE.totalSolved > 0 ? Math.round(STATE.totalCorrect / STATE.totalSolved * 100) : 0;
  if(sAcc) sAcc.textContent = acc + '%';
  if(sStr) sStr.textContent = STATE.streak;
  if(sBStr) sBStr.textContent = 'Best: ' + STATE.bestStreak;
  if(sLvl) sLvl.textContent = STATE.level;
  
  const curLvl = APP_DATA.levels?.find(l => l.level === STATE.level);
  if(curLvl && sLvlN) sLvlN.textContent = curLvl.name;

  const elRec = document.getElementById('recentActivity');
  if (elRec) {
    if (!STATE.activityLog.length) {
      elRec.innerHTML = '<div class="empty-state"><div class="empty-icon">\ud83d\udccb</div><p>No activity yet. Start practicing!</p><button class="btn btn-sm btn-primary" onclick="navigateTo(\'practice-zone\')">Start Now</button></div>';
    } else {
      elRec.innerHTML = STATE.activityLog.slice(0, 5).map(a => `<div class="log-item"><span class="log-icon">${a.icon}</span><span class="log-text">${a.text}</span><span class="log-time">${a.time}</span></div>`).join('');
    }
  }
  const elAch = document.getElementById('dashboardAchievements');
  if(elAch && APP_DATA.achievements) {
    const recent = STATE.unlockedAchievements.slice(-3).reverse().map(id => {
      const a = APP_DATA.achievements.find(ac => ac.id === id);
      return a ? `<div class="ach-mini"><div class="ach-mini-icon" style="background:${a.iconBg}20">${a.icon}</div><div class="ach-mini-text">${a.name}</div></div>` : '';
    }).join('');
    if(STATE.unlockedAchievements.length === 0) {
      elAch.innerHTML = '<div class="empty-state"><div class="empty-icon">\ud83c\udfc6</div><p>Solve problems to earn your first achievement!</p></div>';
    } else {
      elAch.innerHTML = recent + (STATE.unlockedAchievements.length > 3 ? `<div class="ach-mini" style="justify-content:center;color:var(--text-muted);cursor:pointer;" onclick="navigateTo('performance')">+ ${STATE.unlockedAchievements.length-3} more</div>` : '');
    }
  }
  const elSAch = document.getElementById('sidebarAchievements');
  if(elSAch && APP_DATA.achievements) {
    const recentS = STATE.unlockedAchievements.slice(-3).reverse().map(id => {
      const a = APP_DATA.achievements.find(ac => ac.id === id);
      return a ? `<div class="ach-mini"><div class="ach-mini-icon" style="background:${a.iconBg}20">${a.icon}</div><div class="ach-mini-text" style="font-size:0.75rem">${a.name}</div></div>` : '';
    }).join('');
    if(STATE.unlockedAchievements.length === 0) {
      elSAch.innerHTML = '<div style="font-size:0.75rem;color:var(--text-muted)">No achievements yet</div>';
    } else {
      elSAch.innerHTML = recentS;
    }
  }
  
  renderSmartInsights();
}

function renderSmartInsights() {
  const container = document.getElementById('smartInsightsContainer');
  if (!container) return;

  const solved = STATE.totalSolved;
  const acc = solved > 0 ? Math.round(STATE.totalCorrect / solved * 100) : 0;
  const topics = Object.entries(STATE.topicStats);

  if (solved < 3) {
    container.innerHTML = `
      <div class="insight-card-premium" style="background: var(--surface-2); border: 1px dashed var(--border); padding: 1.5rem; border-radius: 12px; text-align: center;">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🧠</div>
        <h4 style="margin-bottom: 0.5rem;">AI Insights are warming up...</h4>
        <p style="font-size: 0.9rem; color: var(--text-secondary);">Solve at least 3 problems to unlock personalized AI learning insights.</p>
      </div>
    `;
    return;
  }

  let strongest = { name: 'None', pct: 0 };
  let weakest = { name: 'None', pct: 101 };

  topics.forEach(([name, stat]) => {
    const p = Math.round(stat.correct / stat.total * 100);
    if (p > strongest.pct) strongest = { name, pct: p };
    if (p < weakest.pct) weakest = { name, pct: p };
  });

  const streakMsg = STATE.streak >= 3 ? `<div class="insight-badge active">🔥 ${STATE.streak} Day Streak</div>` : '';

  container.innerHTML = `
    <div class="insights-grid-premium">
      <div class="insight-card-premium">
        <div class="icp-icon">⭐</div>
        <div class="icp-content">
          <div class="icp-label">Top Strength</div>
          <div class="icp-value">${strongest.name}</div>
          <div class="icp-desc">Your accuracy in this topic is ${strongest.pct}%. Outstanding!</div>
        </div>
      </div>
      <div class="insight-card-premium">
        <div class="icp-icon">🎯</div>
        <div class="icp-content">
          <div class="icp-label">Avenue for Growth</div>
          <div class="icp-value">${weakest.name}</div>
          <div class="icp-desc">Practice more ${weakest.name} to boost your overall score.</div>
        </div>
      </div>
      <div class="insight-card-premium icp-highlight">
        <div class="icp-icon">🚀</div>
        <div class="icp-content">
          <div class="icp-label">AI recommendation</div>
          <div class="icp-value">${acc >= 80 ? 'Level Up' : acc >= 50 ? 'Steady Progress' : 'Revise Basics'}</div>
          <div class="icp-desc">${acc >= 80 ? 'You are ready for harder challenges!' : 'Focus on consistency to improve your accuracy.'}</div>
        </div>
      </div>
    </div>
  `;
}

let graphCtx = null;
let graphCanvas = null;
let isAnimating = false;
let animationFrameId = null;

function initGraphLab() {
  graphCanvas = document.getElementById('graphCanvas');
  const placeholder = document.getElementById('canvasPlaceholder');
  const plotBtn = document.getElementById('plotGraphBtn');
  
  if(plotBtn) plotBtn.disabled = true;
  
  if (graphCanvas) {
    graphCtx = graphCanvas.getContext('2d');
    const resize = () => { 
      const rect = graphCanvas.parentElement.getBoundingClientRect();
      const newW = rect.width || graphCanvas.parentElement.clientWidth || 600;
      if (newW > 0) graphCanvas.width = newW;
      graphCanvas.height = 300; 
    };
    resize();
    window.resizeGraph = () => { resize(); const btn = document.getElementById('plotGraphBtn'); if(!btn.disabled) btn?.click(); };
    window.addEventListener('resize', () => { setTimeout(window.resizeGraph, 100); });
  }

  document.querySelectorAll('.graph-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.graph-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderGraphParams(tab.dataset.graph);
      if(graphCtx){ graphCtx.clearRect(0,0,graphCanvas.width,graphCanvas.height); }
      if(placeholder) placeholder.style.display = 'flex';
      const kpp = document.getElementById('keyPointsPanel');
      if(kpp) kpp.style.display='none';
      const eqDisp = document.getElementById('graphEquationDisplay');
      if(eqDisp) eqDisp.textContent='';
      const plotGraphBtn = document.getElementById('plotGraphBtn');
      if(plotGraphBtn) plotGraphBtn.disabled = false;
    });
  });

  document.getElementById('plotGraphBtn')?.addEventListener('click', () => {
    const type = document.querySelector('.graph-tab.active')?.dataset.graph || 'linear';
    if(placeholder) placeholder.style.display = 'none';
    showLoadingState();
    setTimeout(() => {
      plotGraph(type);
      hideLoadingState();
      STATE.graphsPlotted++;
      logActivity('\ud83d\udcc8', 'Plotted ' + type + ' graph');
      addXP(10);
      saveState();
      checkAchievements();
    }, 300);
  });

  document.getElementById('graphResetBtn')?.addEventListener('click', () => {
    renderGraphParams(document.querySelector('.graph-tab.active')?.dataset.graph || 'linear');
    document.getElementById('plotGraphBtn')?.click();
  });
  
  document.getElementById('graphAnimBtn')?.addEventListener('click', () => {
    const type = document.querySelector('.graph-tab.active')?.dataset.graph || 'linear';
    const btn = document.getElementById('graphAnimBtn');
    if(placeholder) placeholder.style.display = 'none';
    
    if(isAnimating) {
      isAnimating = false;
      if(animationFrameId) cancelAnimationFrame(animationFrameId);
      btn.textContent = '▶ Animate';
      btn.classList.remove('active');
    } else {
      isAnimating = true;
      btn.textContent = '⏸ Stop';
      btn.classList.add('active');
      animateGraphParams(type);
    }
  });
  
  let autoPlayInterval = null;
  document.getElementById('graphCycleBtn')?.addEventListener('click', () => {
    const btn = document.getElementById('graphCycleBtn');
    if(autoPlayInterval) { clearInterval(autoPlayInterval); autoPlayInterval=null; btn.textContent='🍿 Auto-Play'; btn.classList.remove('active'); return; }
    btn.textContent='⏹ Stop Auto'; btn.classList.add('active');
    
    autoPlayInterval = setInterval(() => {
      let inputs = document.getElementById('graphParams').querySelectorAll('.param-text-input');
      if(inputs.length > 0) {
        let tp = inputs[0];
        let val = parseFloat(tp.value);
        let max = parseFloat(tp.max) || 10, min = parseFloat(tp.min) || -10;
        val += (parseFloat(tp.step)||1);
        if(val > max) val = min;
        tp.value = val;
        
        const display = tp.parentElement.querySelector('.param-value-display');
        if(display) {
          display.textContent = parseFloat(val.toFixed(2));
          display.style.animation = 'none';
          setTimeout(() => { display.style.animation = 'paramValuePulse 0.6s ease'; }, 10);
        }
        
        triggerGraphUpdate();
      }
      STATE.graphsAnimated = (STATE.graphsAnimated||0)+1;
      saveState(); checkAchievements();
    }, 150);
  });
  
  renderGraphParams('linear');
}

function renderGraphParams(type) {
  const container = document.getElementById('graphParams');
  if(!container) return;
  
  const graphTypes = {
    linear: {
      formula: 'y = mx + b',
      params: [
        { name: 'm', label: 'Slope (m)', type: 'number', min: -10, max: 10, step: 0.1, default: 2, placeholder: 'Enter slope value' },
        { name: 'b', label: 'Y-intercept (b)', type: 'number', min: -10, max: 10, step: 0.1, default: 1, placeholder: 'Enter y-intercept' }
      ]
    },
    quadratic: {
      formula: 'y = ax² + bx + c',
      params: [
        { name: 'a', label: 'Coefficient a', type: 'number', min: -5, max: 5, step: 0.1, default: 1, placeholder: 'Coefficient of x²' },
        { name: 'b', label: 'Coefficient b', type: 'number', min: -10, max: 10, step: 0.1, default: 0, placeholder: 'Coefficient of x' },
        { name: 'c', label: 'Constant c', type: 'number', min: -10, max: 10, step: 0.1, default: -4, placeholder: 'Constant term' }
      ]
    },
    cubic: {
      formula: 'y = x³',
      params: [
        { name: 'scale', label: 'Scale Factor', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1, placeholder: 'Scale factor' }
      ]
    },
    trig: {
      formula: 'y = A·sin(B·x)',
      params: [
        { name: 'amp', label: 'Amplitude (A)', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1, placeholder: 'Wave height' },
        { name: 'freq', label: 'Frequency (B)', type: 'number', min: 0.1, max: 5, step: 0.1, default: 1, placeholder: 'Wave frequency' }
      ]
    },
    exponential: {
      formula: 'y = base^x',
      params: [
        { name: 'base', label: 'Base', type: 'number', min: 1.1, max: 5, step: 0.1, default: 2, placeholder: 'Exponential base' }
      ]
    }
  };

  const config = graphTypes[type] || graphTypes.linear;
  let html = `<div class="graph-config-section">
    <div class="graph-formula-display">${config.formula}</div>
    <div class="graph-inputs-grid">`;
  
  config.params.forEach(param => {
    const inputId = `gp_${param.name}`;
    
    html += `
      <div class="param-input-group">
        <label class="param-label-new">${param.label}</label>
        <div class="param-input-wrapper">
          <input 
            type="${param.type}" 
            id="${inputId}"
            class="param-text-input"
            min="${param.min}" 
            max="${param.max}" 
            step="${param.step}"
            value="${param.default}"
            placeholder="${param.placeholder}"
            data-min="${param.min}"
            data-max="${param.max}"
            data-step="${param.step}"
            data-param="${param.name}"
            aria-label="${param.label}"
          />
          <span class="param-value-display" data-param="${param.name}">${param.default}</span>
        </div>
      </div>`;
  });
  
  html += `</div></div>`;
  container.innerHTML = html;
  
  
  attachGraphInputListeners(type);
}

function attachGraphInputListeners(type) {
  const graphTypes = {
    linear: ['m', 'b'],
    quadratic: ['a', 'b', 'c'],
    cubic: ['scale'],
    trig: ['amp', 'freq'],
    exponential: ['base']
  };
  
  const params = graphTypes[type] || [];
  
  params.forEach(param => {
    const inputEl = document.getElementById(`gp_${param}`);
    const displayEl = document.querySelector(`.param-value-display[data-param="${param}"]`);
    
    if (!inputEl) return;
    
    inputEl.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const min = parseFloat(e.target.dataset.min);
      const max = parseFloat(e.target.dataset.max);
      
      if (isNaN(val) || val < min || val > max) {
        e.target.style.borderColor = 'var(--danger)';
        return;
      }
      
      e.target.style.borderColor = '';
      updateParamDisplay(param, val);
      triggerGraphUpdate();
    });
    
    inputEl.addEventListener('blur', (e) => {
      const val = parseFloat(e.target.value) || 0;
      const min = parseFloat(e.target.dataset.min);
      const max = parseFloat(e.target.dataset.max);
      const clampedVal = Math.max(min, Math.min(max, val));
      e.target.value = parseFloat(clampedVal.toFixed(2));
    });
  });
}

function updateParamDisplay(param, value) {
  const displayEls = document.querySelectorAll('.param-value-display');
  displayEls.forEach(el => {
    const inputEl = el.previousElementSibling?.previousElementSibling;
    if (inputEl && inputEl.id === `gp_${param}`) {
      el.textContent = parseFloat(value.toFixed(2));
      el.style.animation = 'none';
      setTimeout(() => { el.style.animation = 'paramValuePulse 0.6s ease'; }, 10);
    }
  });
}

function showLoadingState() {
  const canvas = document.getElementById('graphCanvas');
  if(canvas && canvas.parentElement) {
    const loader = document.createElement('div');
    loader.id = 'graphLoader';
    loader.className = 'graph-loading';
    loader.innerHTML = '<div class="graph-loading-spinner"></div><span>Rendering graph...</span>';
    canvas.parentElement.style.position = 'relative';
    canvas.parentElement.appendChild(loader);
  }
}

function hideLoadingState() {
  const loader = document.getElementById('graphLoader');
  if(loader) loader.remove();
}

function animateGraphParams(type) {
  const graphTypeParams = {
    linear: ['m', 'b'],
    quadratic: ['a', 'b', 'c'],
    cubic: ['scale'],
    trig: ['amp', 'freq'],
    exponential: ['base']
  };
  
  const params = graphTypeParams[type] || [];
  const startValues = {};
  const targetValues = {};
  const minValues = {};
  const maxValues = {};
  
  params.forEach(param => {
    const inputEl = document.getElementById(`gp_${param}`);
    if(inputEl) {
      startValues[param] = parseFloat(inputEl.value);
      minValues[param] = parseFloat(inputEl.getAttribute('min')) || 0;
      maxValues[param] = parseFloat(inputEl.getAttribute('max')) || 10;
      targetValues[param] = Math.abs(startValues[param] - minValues[param]) < 0.1 ? maxValues[param] : minValues[param];
    }
  });
  
  const duration = 3000;
  const startTime = performance.now();
  
  const animate = (currentTime) => {
    if(!isAnimating) return;
    
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = progress < 0.5 ? 2*progress*progress : -1+4*progress-2*progress*progress;
    
    params.forEach(param => {
      const inputEl = document.getElementById(`gp_${param}`);
      if(inputEl) {
        const newValue = startValues[param] + (targetValues[param] - startValues[param]) * easeProgress;
        const clampedValue = Math.max(minValues[param], Math.min(maxValues[param], newValue));
        inputEl.value = parseFloat(clampedValue.toFixed(2));
        updateParamDisplay(param, clampedValue);
      }
    });
    
    plotGraph(type);
    
    if(progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      if(isAnimating) {
        animateGraphParams(type);
      }
    }
  };
  
  animationFrameId = requestAnimationFrame(animate);
}

function triggerGraphUpdate() {
  if(isAnimating) return;
  clearTimeout(window.graphUpdateTimeout);
  window.graphUpdateTimeout = setTimeout(() => {
    const btn = document.getElementById('plotGraphBtn');
    if(btn && !btn.disabled) btn?.click();
  }, 100);
}

window.graphAnimId = null;

function plotGraph(type) {
  if (!graphCtx || !graphCanvas) return;
  const w = graphCanvas.width;
  const h = graphCanvas.height;
  
  if (window.graphAnimId) { cancelAnimationFrame(window.graphAnimId); window.graphAnimId = null; }

  const cx = w/2, cy = h/2;
  const gridScale = 20;
  const drawGrid = () => {
    graphCtx.clearRect(0,0,w,h);
    graphCtx.strokeStyle = document.documentElement.getAttribute('data-theme')==='light' ? '#e5e7eb' : '#374151';
    graphCtx.lineWidth = 1;
    for(let x=0; x<w; x+=gridScale) { graphCtx.beginPath(); graphCtx.moveTo(x,0); graphCtx.lineTo(x,h); graphCtx.stroke(); }
    for(let y=0; y<h; y+=gridScale) { graphCtx.beginPath(); graphCtx.moveTo(0,y); graphCtx.lineTo(w,y); graphCtx.stroke(); }
    
    graphCtx.strokeStyle = document.documentElement.getAttribute('data-theme')==='light' ? '#9ca3af' : '#4b5563';
    graphCtx.lineWidth = 2;
    graphCtx.beginPath(); graphCtx.moveTo(0, cy); graphCtx.lineTo(w, cy); graphCtx.stroke();
    graphCtx.beginPath(); graphCtx.moveTo(cx, 0); graphCtx.lineTo(cx, h); graphCtx.stroke();
  };
  
  drawGrid();

  let m=1,b=0,a=1,c=0,amp=1,freq=1,base=2,paramScale=1;
  let equationStr = '', kps = [];
  if(type==='linear') { 
    m=parseFloat(document.getElementById('gp_m')?.value)||0; 
    b=parseFloat(document.getElementById('gp_b')?.value)||0; 
    equationStr=`y = ${m.toFixed(2)}x + ${b.toFixed(2)}`; 
    kps=[`y-intercept: (0, ${b.toFixed(2)})`, `x-intercept: (${m!==0?(-b/m).toFixed(2):'none'}, 0)`]; 
  }
  if(type==='quadratic') { 
    a=parseFloat(document.getElementById('gp_a')?.value)||1; 
    b=parseFloat(document.getElementById('gp_b')?.value)||0; 
    c=parseFloat(document.getElementById('gp_c')?.value)||0; 
    equationStr=`y = ${a.toFixed(2)}x² + ${b.toFixed(2)}x + ${c.toFixed(2)}`; 
    const vx=-b/(2*a),vy=a*vx*vx+b*vx+c; 
    kps=[`Vertex: (${vx.toFixed(2)}, ${vy.toFixed(2)})`, `y-intercept: (0, ${c.toFixed(2)})`]; 
  }
  if(type==='trig') { 
    amp=parseFloat(document.getElementById('gp_amp')?.value)||1; 
    freq=parseFloat(document.getElementById('gp_freq')?.value)||1; 
    equationStr=`y = ${amp.toFixed(2)}sin(${freq.toFixed(2)}x)`; 
    kps=[`Amplitude: ${amp.toFixed(2)}`,`Period: ${(2*Math.PI/freq).toFixed(2)}`]; 
  }
  if(type==='cubic') { 
    paramScale=parseFloat(document.getElementById('gp_scale')?.value)||1;
    equationStr = `y = ${paramScale.toFixed(2)}x³`; 
    kps=['Root: (0, 0)']; 
  }
  if(type==='exponential') { 
    base=parseFloat(document.getElementById('gp_base')?.value)||2; 
    equationStr=`y = ${base.toFixed(2)}^x`; 
    kps=[`y-intercept: (0, 1)`]; 
  }

  const eqEl = document.getElementById('graphEquationDisplay');
  const kpPanel = document.getElementById('keyPointsPanel');
  const kpList = document.getElementById('keyPointsList');
  if(eqEl) eqEl.textContent = equationStr;
  if(kpPanel) kpPanel.style.display = 'block';
  if(kpList) kpList.innerHTML = kps.map(k=>`<div class="kp-item">• ${k}</div>`).join('');

  graphCtx.strokeStyle = '#6366f1';
  graphCtx.lineWidth = 3;
  graphCtx.beginPath();
  
  const getPoint = (px) => {
    const x = (px - cx) / gridScale;
    let y = 0;
    if(type==='linear') y = m*x + b;
    else if(type==='quadratic') y = a*x*x + b*x + c;
    else if(type==='cubic') y = (x*x*x/5)*paramScale; 
    else if(type==='trig') y = amp*Math.sin(freq*x);
    else if(type==='exponential') y = Math.pow(base, x/2);
    return cy - y*gridScale;
  };
  
  for(let px=0; px<=w; px++) {
    const py = getPoint(px);
    if(px===0) graphCtx.moveTo(px, py);
    else graphCtx.lineTo(px, py);
  }
  graphCtx.stroke();
}

function toast(msg, type='info', duration=3000) {
  const container = document.getElementById('toastContainer');
  if(!container) return;
  const tn = document.createElement('div');
  tn.className = `toast`;
  tn.textContent = msg;
  Object.assign(tn.style, {
    padding: '1rem', background: 'var(--surface-color)', color: 'var(--text-color)', borderLeft: `4px solid var(--${type==='warning'?'warning':type==='danger'?'danger':type==='success'?'success':'accent'})`, margin: '0.5rem', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', transition: 'opacity 0.3s'
  });
  container.appendChild(tn);
  setTimeout(()=> { tn.style.opacity = '0'; setTimeout(()=>tn.remove(), 300); }, duration);
}



const SOLVER_CONFIGS = {
  linear:{label:'Linear Equation',desc:'ax + b = c',fields:[{id:'lin_a',label:'a (coefficient of x)',val:2},{id:'lin_b',label:'b (constant left)',val:3},{id:'lin_c',label:'c (right side)',val:11}]},
  quadratic:{label:'Quadratic Equation',desc:'ax\u00b2 + bx + c = 0',fields:[{id:'q_a',label:'a',val:1},{id:'q_b',label:'b',val:-5},{id:'q_c',label:'c',val:6}]},
  system:{label:'System of Equations',desc:'a1x + b1y = c1 AND a2x + b2y = c2',fields:[{id:'s_a1',label:'a1',val:2},{id:'s_b1',label:'b1',val:1},{id:'s_c1',label:'c1',val:7},{id:'s_a2',label:'a2',val:1},{id:'s_b2',label:'b2',val:-1},{id:'s_c2',label:'c2',val:2}]},
  cubic:{label:'Cubic Equation',desc:'ax\u00b3 + bx\u00b2 + cx + d = 0',fields:[{id:'cu_a',label:'a',val:1},{id:'cu_b',label:'b',val:-6},{id:'cu_c',label:'c',val:11},{id:'cu_d',label:'d',val:-6}]},
  percentage:{label:'Percentage Problems',desc:'Profit / Loss / Discount',fields:[{id:'pct_cp',label:'Cost Price (\u20b9)',val:800},{id:'pct_sp',label:'Selling Price (\u20b9)',val:1000},{id:'pct_disc',label:'Discount % (0 if N/A)',val:0}]}
};
let currentSolver='linear';

function initEquationSolver(){
  document.querySelectorAll('.solver-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.solver-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      currentSolver=tab.dataset.solver;
      renderSolverInputs();
      document.getElementById('solverResult').style.display='none';
      document.getElementById('solverPlaceholder').style.display='flex';
      document.getElementById('visualizeEqBtn').style.display='none';
    });
  });
  renderSolverInputs();
  document.getElementById('solveBtn').addEventListener('click', solveEquation);
  document.getElementById('visualizeEqBtn').addEventListener('click',()=>{ navigateTo('graph-lab'); mapSolverToGraph(); });
}
function renderSolverInputs(){
  const cfg=SOLVER_CONFIGS[currentSolver];
  const el=document.getElementById('solverInputs');
  el.innerHTML=`<div class="eq-display">${cfg.desc}</div>`+cfg.fields.map(f=>`<div class="solver-input-group"><label class="solver-input-label">${f.label}</label><input type="number" class="form-input" id="${f.id}" value="${f.val}" step="any"/></div>`).join('');
}
function getSolverVal(id){ return parseFloat(document.getElementById(id)?.value||0)||0; }

function solveEquation(){
  const resultEl=document.getElementById('solverResult');
  const stepsEl=document.getElementById('stepsContainer');
  stepsEl.innerHTML='<div style="padding:1rem;color:var(--text-muted)">Analyzing...</div>';
  resultEl.style.display='block';
  document.getElementById('solverPlaceholder').style.display='none';
  document.getElementById('resultBadge').textContent='Solved \u2713';
  let steps=[], canViz=false;
  if(currentSolver==='linear'){steps=solveLinear();canViz=true;}
  else if(currentSolver==='quadratic'){steps=solveQuadratic();canViz=true;}
  else if(currentSolver==='system') steps=solveSystem();
  else if(currentSolver==='cubic') steps=solveCubic();
  else steps=solvePercentage();
  document.getElementById('visualizeEqBtn').style.display=canViz?'block':'none';
  STATE.equationsSolved++;
  logActivity('\u2211','Solved a '+currentSolver+' equation');
  addXP(15); saveState(); checkAchievements();
  setTimeout(()=>{
    stepsEl.innerHTML='';
    steps.forEach((s,i)=>setTimeout(()=>{
      const div=document.createElement('div'); div.className='step-card';
      div.innerHTML=`<div class="step-header"><div class="step-num">${i+1}</div><div class="step-title">${s.title}</div><button class="step-expand-btn" onclick="toggleStepExplain(this)">Why? \ud83d\udca1</button></div><div class="step-body"><div class="step-math">${s.math}</div>${s.isAnswer?`<div class="step-result-highlight"><div class="step-answer">${s.answer}</div></div>`:''}<div class="step-explain">${s.explain}</div></div>`;
      stepsEl.appendChild(div);
    }, i*150));
  }, 500);
}
window.toggleStepExplain=function(btn){ const e=btn.closest('.step-card').querySelector('.step-explain'); e.classList.toggle('visible'); btn.textContent=e.classList.contains('visible')?'Hide \u2715':'Why? \ud83d\udca1'; };

function solveLinear(){
  const a=getSolverVal('lin_a'),b=getSolverVal('lin_b'),c=getSolverVal('lin_c'),x=(c-b)/a;
  return [{title:'Write the equation',math:`${a}x + ${b} = ${c}`,explain:'Start by writing out the equation clearly.'},
    {title:'Move constant to right',math:`${a}x = ${c-b}`,explain:'Subtract b from both sides.'},
    {title:'Divide by coefficient',math:`x = ${c-b} / ${a}`,explain:'Divide both sides by the coefficient of x.'},
    {title:'Final Answer',math:`x = ${x.toFixed(4)}`,explain:'Verify by substituting back.',isAnswer:true,answer:`x = ${+x.toFixed(4)}`}];
}
function solveQuadratic(){
  const a=getSolverVal('q_a'),b=getSolverVal('q_b'),c=getSolverVal('q_c'),disc=b*b-4*a*c;
  const steps=[{title:'Standard form',math:`${a}x\u00b2 + ${b}x + ${c} = 0`,explain:'Quadratic: ax\u00b2 + bx + c = 0.'},
    {title:'Discriminant',math:`\u0394 = ${b}\u00b2 - 4(${a})(${c}) = ${disc}`,explain:'\u0394>0: two roots, \u0394=0: one root, \u0394<0: no real roots.'},
    {title:'Quadratic formula',math:`x = (-${b} \u00b1 \u221a${disc}) / ${2*a}`,explain:'The quadratic formula always works.'}];
  if(disc<0) steps.push({title:'No real roots',math:`\u0394 < 0`,explain:'Roots are complex.',isAnswer:true,answer:'No real roots'});
  else if(disc===0){ const x=-b/(2*a); steps.push({title:'Double root',math:`x = ${x.toFixed(4)}`,explain:'\u0394=0: one repeated root.',isAnswer:true,answer:`x = ${+x.toFixed(4)}`}); }
  else { const x1=(-b+Math.sqrt(disc))/(2*a),x2=(-b-Math.sqrt(disc))/(2*a); steps.push({title:'Two roots',math:`x\u2081=${+x1.toFixed(4)}, x\u2082=${+x2.toFixed(4)}`,explain:'Two distinct real solutions.',isAnswer:true,answer:`x\u2081 = ${+x1.toFixed(4)},  x\u2082 = ${+x2.toFixed(4)}`}); }
  return steps;
}
function solveSystem(){
  const a1=getSolverVal('s_a1'),b1=getSolverVal('s_b1'),c1=getSolverVal('s_c1'),a2=getSolverVal('s_a2'),b2=getSolverVal('s_b2'),c2=getSolverVal('s_c2'),det=a1*b2-a2*b1;
  const steps=[{title:'Write system',math:`${a1}x + ${b1}y = ${c1}  AND  ${a2}x + ${b2}y = ${c2}`,explain:'Two equations, two unknowns.'},
    {title:'Elimination',math:`Multiply Eq1\u00d7${b2}, Eq2\u00d7${b1} then subtract`,explain:'Eliminate y by making coefficients equal.'}];
  if(Math.abs(det)<1e-10) steps.push({title:'No unique solution',math:'det = 0',explain:'Lines are parallel or coincident.',isAnswer:true,answer:'No unique solution'});
  else { const x=(c1*b2-c2*b1)/det,y=(a1*c2-a2*c1)/det; steps.push({title:'Solve for x',math:`x = ${+x.toFixed(4)}`,explain:'After eliminating y.'}); steps.push({title:'Final Answer',math:`x=${+x.toFixed(3)}, y=${+y.toFixed(3)}`,explain:'Substitute back to verify.',isAnswer:true,answer:`x = ${+x.toFixed(3)},  y = ${+y.toFixed(3)}`}); }
  return steps;
}
function solveCubic(){
  const a=getSolverVal('cu_a'),b=getSolverVal('cu_b'),c=getSolverVal('cu_c'),d=getSolverVal('cu_d');
  const roots=[];
  for(let x=-20;x<=20;x+=0.01){ const y=a*x**3+b*x**2+c*x+d; if(Math.abs(y)<0.05) roots.push(+x.toFixed(1)); }
  const u=[...new Set(roots)].slice(0,3);
  return [{title:'Cubic equation',math:`${a}x\u00b3 + ${b}x\u00b2 + ${c}x + ${d} = 0`,explain:'Can have 1 or 3 real roots.'},
    {title:'Rational root theorem',math:`Test \u00b1factors of ${d} / factors of ${a}`,explain:'Integer roots are factors of constant term / leading coefficient.'},
    {title:'Numerical scan',math:`Scanning x \u2208 [-20, 20]...`,explain:'Sign changes indicate roots.'},
    {title:'Approximate roots',math:u.length?`x \u2248 ${u.join(', ')}`:'No simple roots found',explain:'Numerical approximations.',isAnswer:true,answer:u.length?`x \u2248 ${u.join(', ')}`:'No real roots found'}];
}
function solvePercentage(){
  const cp=getSolverVal('pct_cp'),sp=getSolverVal('pct_sp'),disc=getSolverVal('pct_disc');
  const steps=[{title:'Identify values',math:`CP = \u20b9${cp},  SP = \u20b9${sp}`,explain:'CP = cost price, SP = selling price.'}];
  if(sp>cp){ const p=sp-cp,pct=(p/cp*100).toFixed(2); steps.push({title:'Calculate Profit',math:`Profit = ${sp}-${cp} = \u20b9${p}`,explain:'Profit when SP > CP.'}); steps.push({title:'Profit %',math:`Profit% = (${p}/${cp})\u00d7100 = ${pct}%`,explain:'Always on Cost Price.',isAnswer:true,answer:`Profit = \u20b9${p} (${pct}%)`}); }
  else if(sp<cp){ const l=cp-sp,pct=(l/cp*100).toFixed(2); steps.push({title:'Calculate Loss',math:`Loss = ${cp}-${sp} = \u20b9${l}`,explain:'Loss when SP < CP.'}); steps.push({title:'Loss %',math:`Loss% = (${l}/${cp})\u00d7100 = ${pct}%`,explain:'Always on Cost Price.',isAnswer:true,answer:`Loss = \u20b9${l} (${pct}%)`}); }
  else steps.push({title:'No Profit No Loss',math:`SP = CP = \u20b9${cp}`,explain:'Break-even.',isAnswer:true,answer:'No Profit, No Loss'});
  if(disc>0){ const da=sp*disc/100; steps.push({title:`${disc}% Discount`,math:`Discount = \u20b9${da.toFixed(2)}, Final = \u20b9${(sp-da).toFixed(2)}`,explain:'Discount on Marked Price.'}); }
  return steps;
}
function mapSolverToGraph(){
  if(currentSolver==='linear'){ document.querySelector('[data-graph="linear"]').click(); }
  else if(currentSolver==='quadratic'){ document.querySelector('[data-graph="quadratic"]').click(); setTimeout(()=>{ const ai=document.getElementById('gp_a'),bi=document.getElementById('gp_b'),ci=document.getElementById('gp_c'); if(ai)ai.value=getSolverVal('q_a'); if(bi)bi.value=getSolverVal('q_b'); if(ci)ci.value=getSolverVal('q_c'); },200); }
  setTimeout(()=>document.getElementById('plotGraphBtn').click(),400);
}

function initAITutor(){
  const chatEl=document.getElementById('chatMessages'); chatEl.innerHTML='';
  if(APP_DATA.aiTutor?.greetings){ appendBotMessage(APP_DATA.aiTutor.greetings[Math.floor(Math.random()*APP_DATA.aiTutor.greetings.length)]); }
  renderTips();
  document.getElementById('chatSendBtn').addEventListener('click', sendChat);
  document.getElementById('chatInput').addEventListener('keydown',e=>{ if(e.key==='Enter') sendChat(); });
  document.getElementById('clearChatBtn').addEventListener('click',()=>{
    document.getElementById('chatMessages').innerHTML=''; tutorSessionTopics.clear(); tutorMsgCount=0; updateTutorStats();
    if(APP_DATA.aiTutor?.greetings) appendBotMessage(APP_DATA.aiTutor.greetings[0]);
  });
  document.querySelectorAll('.suggestion-chip').forEach(chip=>chip.addEventListener('click',()=>{ document.getElementById('chatInput').value=chip.dataset.msg; sendChat(); }));
  updateTutorStats();
}
function appendUserMessage(text){ const el=document.getElementById('chatMessages'),t=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); el.insertAdjacentHTML('beforeend',`<div class="chat-msg user"><div class="msg-bubble">${escHtml(text)}</div><div class="msg-time">${t}</div></div>`); el.scrollTop=el.scrollHeight; }
function appendBotMessage(text){
  const el=document.getElementById('chatMessages'),t=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
  const typing=document.createElement('div'); typing.className='chat-msg bot'; typing.innerHTML='<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  el.appendChild(typing); el.scrollTop=el.scrollHeight;
  setTimeout(()=>{ typing.remove(); el.insertAdjacentHTML('beforeend',`<div class="chat-msg bot"><div class="msg-bubble">${text}</div><div class="msg-time">${t}</div></div>`); el.scrollTop=el.scrollHeight; }, Math.min(900+text.length*7, 2500));
}
function sendChat(){
  const input=document.getElementById('chatInput'),text=input.value.trim(); if(!text) return;
  input.value=''; appendUserMessage(text); tutorMsgCount++; STATE.tutorMessages++;
  appendBotMessage(getAIResponse(text)); updateTutorStats();
  logActivity('\ud83e\udd16','Asked AI: '+text.substring(0,35)); addXP(5); saveState(); checkAchievements();
}
function getAIResponse(msg){
  const lower=msg.toLowerCase(),tutor=APP_DATA.aiTutor;
  if(!tutor) return 'Ask me about any math topic!';
  for(const [topic,kws] of Object.entries(tutor.keywords||{})){ if(kws.some(k=>lower.includes(k))){ tutorSessionTopics.add(topic); updateTutorStats(); const r=tutor.responses?.[topic]||tutor.responses?.default; if(r){ const enc=tutor.encouragements?.[Math.floor(Math.random()*tutor.encouragements.length)]||''; return r+(enc?'\n\n'+enc:''); } } }
  if(/hi|hello|hey/.test(lower)) return tutor.greetings[Math.floor(Math.random()*tutor.greetings.length)];
  if(/tip|hint|trick/.test(lower)){ const t=(tutor.tips||[])[Math.floor(Math.random()*(tutor.tips||[]).length)]; return t?`\ud83d\udca1 Tip: ${t.tip}`:'Ask me about math topics!'; }
  return tutor.responses?.default||'Ask me about algebra, geometry, trigonometry, or calculus! \ud83e\udde0';
}
function renderTips(){ const el=document.getElementById('tutorTipsList'); if(!APP_DATA.aiTutor?.tips){el.innerHTML='';return;} el.innerHTML=APP_DATA.aiTutor.tips.slice(0,5).map(t=>`<div class="tip-item"><div class="tip-topic">${t.topic}</div><div class="tip-text">${t.tip}</div></div>`).join(''); }
function updateTutorStats(){ document.getElementById('tutorMsgCount').textContent=tutorMsgCount; document.getElementById('tutorTopicsCount').textContent=tutorSessionTopics.size; }
function escHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let currentQuestions=[],currentQIndex=0,score=0,qStreak=0,qBestStreak=0,qPoints=0,isTimedMode=false,quizTimeSec=300;

function initPracticeZone(){
  document.getElementById('startQuickQuiz').addEventListener('click',()=>startQuiz(false, false));
  document.getElementById('startTimedChallenge').addEventListener('click',()=>startQuiz(true, false));
  document.getElementById('startRealLifeMath')?.addEventListener('click',()=>startQuiz(false, true));
  document.getElementById('nextQuestionBtn').addEventListener('click',nextQuestion);
  document.getElementById('quitQuizBtn').addEventListener('click',endQuiz);
  document.getElementById('hintBtn').addEventListener('click',()=>{ const h=document.getElementById('hintText'); h.style.display=h.style.display==='none'?'block':'none'; });
  document.getElementById('playAgainBtn').addEventListener('click',()=>{ document.getElementById('resultsScreen').style.display='none'; document.getElementById('practiceModeScreen').style.display='block'; });
}
function getAllQuestions(cat,diff){
  if(!APP_DATA.practiceQuestions) return [];
  const qs=[],cats=cat==='all'?Object.keys(APP_DATA.practiceQuestions):[cat];
  cats.forEach(c=>{ const cd=APP_DATA.practiceQuestions[c]; if(!cd) return; const diffs=diff==='adaptive'?['easy','medium','hard']:[diff]; diffs.forEach(d=>{ if(cd[d]) qs.push(...cd[d]); }); });
  return qs.sort(()=>Math.random()-0.5);
}
function startQuiz(timed, isRealLife = false){
  isTimedMode=timed;
  let cat=timed?document.getElementById('timedCategory').value:document.getElementById('quickCategory').value;
  if (isRealLife) cat = 'real_life';
  const diff=timed?'adaptive':document.getElementById('quickDifficulty').value;
  if (cat === 'real_life') {
    currentQuestions = getAllQuestions('real_life', diff);
    if (currentQuestions.length === 0) {
      currentQuestions = getAllQuestions('real_life', 'adaptive'); 
    }
    currentQuestions = currentQuestions.slice(0, timed ? 10 : 5);
  } else {
    currentQuestions = getAllQuestions(cat, diff);
    if (currentQuestions.length === 0 && diff !== 'adaptive') {
      currentQuestions = getAllQuestions(cat, 'adaptive');
    }
    currentQuestions = currentQuestions.slice(0, timed ? 15 : 10);
  }
  if(!currentQuestions.length){ toast('No questions available. Try different settings.','warning'); return; }
  currentQIndex=0; score=0; qStreak=0; qBestStreak=0; qPoints=0;
  document.getElementById('practiceModeScreen').style.display='none';
  document.getElementById('resultsScreen').style.display='none';
  document.getElementById('quizScreen').style.display='block';
  document.getElementById('quizCategoryTag').textContent=cat.charAt(0).toUpperCase()+cat.slice(1);
  document.getElementById('quizDifficultyTag').textContent=diff.charAt(0).toUpperCase()+diff.slice(1);
  if(timed){ quizTimeSec=300; document.getElementById('quizTimerWrap').style.display='flex'; if(quizTimerInterval)clearInterval(quizTimerInterval); quizTimerInterval=setInterval(()=>{ quizTimeSec--; const m=Math.floor(quizTimeSec/60),s=quizTimeSec%60; document.getElementById('quizTimer').textContent=`${m}:${s.toString().padStart(2,'0')}`; if(quizTimeSec<=30)document.getElementById('quizTimerWrap').style.color='var(--danger)'; if(quizTimeSec<=0){clearInterval(quizTimerInterval);endQuiz();} },1000); }
  else document.getElementById('quizTimerWrap').style.display='none';
  showQuestion();
}
function showQuestion(){
  if(currentQIndex>=currentQuestions.length){endQuiz();return;}
  const q=currentQuestions[currentQIndex],total=currentQuestions.length;
  document.getElementById('quizProgressText').textContent=`Question ${currentQIndex+1} of ${total}`;
  document.getElementById('quizProgressBar').style.width=((currentQIndex/total)*100)+'%';
  document.getElementById('quizScore').textContent=score; document.getElementById('quizStreak').textContent=qStreak; document.getElementById('quizPoints').textContent=qPoints;
  document.getElementById('questionTopic').textContent=q.topic||'Math';
  document.getElementById('questionText').textContent=q.question;
  document.getElementById('hintText').textContent=q.hint||'No hint available'; document.getElementById('hintText').style.display='none';
  document.getElementById('feedbackCard').style.display='none'; document.getElementById('hintBtn').style.display='block';
  const opts=[...q.options].sort(()=>Math.random()-0.5);
  document.getElementById('optionsGrid').innerHTML=opts.map((o,i)=>`<button class="option-btn" data-answer="${o}" id="opt_${i}">${o}</button>`).join('');
  document.querySelectorAll('.option-btn').forEach(btn=>btn.addEventListener('click',()=>answerQuestion(btn,q)));
}
function answerQuestion(btn,q){
  document.querySelectorAll('.option-btn').forEach(b=>b.classList.add('disabled'));
  const correct=btn.dataset.answer===q.answer;
  const selectedAnswer = btn.dataset.answer;
  document.querySelectorAll('.option-btn').forEach(b=>{ if(b.dataset.answer===q.answer)b.classList.add('correct'); else if(b===btn&&!correct)b.classList.add('wrong'); });
  const pts=correct?q.points:0;
  if(correct){ score++;qStreak++;qPoints+=pts; if(qStreak>qBestStreak)qBestStreak=qStreak; STATE.totalCorrect++;STATE.streak++; if(STATE.streak>STATE.bestStreak)STATE.bestStreak=STATE.streak; if(q.points>=30)STATE.hardCorrect++; }
  else { qStreak=0;STATE.streak=0; }
  STATE.totalSolved++;
  const topic=q.topic||'General'; if(!STATE.topicStats)STATE.topicStats={}; if(!STATE.topicStats[topic])STATE.topicStats[topic]={correct:0,total:0}; STATE.topicStats[topic].total++; if(correct)STATE.topicStats[topic].correct++;
  saveState(); checkAchievements(); updateTopBar(); renderSmartInsights();
  document.getElementById('feedbackIcon').textContent=correct?'\ud83c\udf89':'\u274c';
  document.getElementById('feedbackText').textContent=correct?((APP_DATA.aiTutor?.encouragements||['Great job!'])[Math.floor(Math.random()*(APP_DATA.aiTutor?.encouragements?.length||1))]):((APP_DATA.aiTutor?.corrections||['Not quite!'])[Math.floor(Math.random()*(APP_DATA.aiTutor?.corrections?.length||1))]);
  document.getElementById('feedbackExplanation').textContent=q.explanation||'';
  
  const explainBtn = document.getElementById('explainMistakeBtn');
  const aiBreakdown = document.getElementById('aiMistakeBreakdown');
  if(explainBtn && aiBreakdown) {
    if(!correct) {
      explainBtn.style.display = 'block';
      aiBreakdown.style.display = 'none';
      explainBtn.onclick = () => {
        const tipsList=APP_DATA.aiTutor?.tips||[{tip:"Always double check your steps."}];
        explainBtn.style.display = 'none';
        aiBreakdown.style.display = 'block';
        
        let reason = "This typically indicates a minor calculation slip or a procedural error.";
        if (q.id.startsWith('alg') && selectedAnswer.includes('-') !== q.answer.includes('-')) {
          reason = "It looks like there might be a sign error (+/-) in your calculation.";
        } else if (q.id.startsWith('arith') && Math.abs(parseFloat(selectedAnswer) - parseFloat(q.answer)) < 5) {
          reason = "You were very close! A small calculation error in the final step is likely.";
        } else if (q.topic === 'Percentage') {
          reason = "Percentage errors often happen if the base (total) isn't used correctly.";
        }

        let feedbackHTML = "<strong>🧐 MathGenius Diagnosis:</strong><br/>You selected <em>" + selectedAnswer + "</em>. " + reason + "<br/><br/>";
        feedbackHTML += "<strong>✅ The Correct Path:</strong><br/>" + (q.explanation || "Review the step-by-step logic carefully.") + "<br/><br/>";
        feedbackHTML += "<strong>💡 AI Tip:</strong> " + tipsList[Math.floor(Math.random()*tipsList.length)].tip;
        aiBreakdown.innerHTML = feedbackHTML;
      };
    } else {
      explainBtn.style.display = 'none';
      aiBreakdown.style.display = 'none';
    }
  }

  document.getElementById('feedbackCard').style.display='flex'; document.getElementById('hintBtn').style.display='none';
  document.getElementById('quizScore').textContent=score; document.getElementById('quizStreak').textContent=qStreak; document.getElementById('quizPoints').textContent=qPoints;
  logActivity(correct?'\u2705':'\u274c',(correct?'Correct: ':'Wrong: ')+q.question.substring(0,35));
  if(correct) addXP(pts);
}
function nextQuestion(){ currentQIndex++; showQuestion(); }
function endQuiz(){
  if(quizTimerInterval){clearInterval(quizTimerInterval);quizTimerInterval=null;}
  document.getElementById('quizScreen').style.display='none'; document.getElementById('resultsScreen').style.display='block';
  const total=currentQIndex>0?Math.min(currentQIndex,currentQuestions.length):currentQuestions.length;
  const acc=total>0?Math.round(score/total*100):0;
  document.getElementById('resultsTrophy').textContent=acc>=90?'\ud83c\udfc6':acc>=70?'\ud83e\udd47':acc>=50?'\ud83e\udd48':'\ud83d\udcda';
  document.getElementById('resultsTitle').textContent=acc>=90?'Outstanding! \ud83c\udf1f':acc>=70?'Great Job!':acc>=50?'Good Effort!':'Keep Practicing!';
  document.getElementById('rsScore').textContent=`${score}/${total}`; document.getElementById('rsAccuracy').textContent=acc+'%'; document.getElementById('rsPoints').textContent=qPoints; document.getElementById('rsStreak').textContent=qBestStreak;
  document.getElementById('resultsFeedback').textContent=acc>=80?'Excellent! You really know your math!':acc>=60?'Good job! A bit more practice and you will be perfect!':'Review the weak topics and try again!';
  setTimeout(()=>document.getElementById('resultsBarFill').style.width=acc+'%',200);
}

function initCalculators(){
  document.querySelectorAll('.calc-tab').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.calc-tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.calc-panel').forEach(p=>p.classList.remove('active'));
    tab.classList.add('active'); document.getElementById('calc-'+tab.dataset.calc).classList.add('active');
    STATE.calculatorsUsed.add(tab.dataset.calc); saveState(); checkAchievements();
  }));
  document.getElementById('addExpenseRow').addEventListener('click',()=>{
    const row=document.createElement('div'); row.className='expense-row';
    row.innerHTML='<input type="text" class="form-input exp-name" placeholder="Expense"/><input type="number" class="form-input exp-amt" placeholder="Amount"/><button class="btn-remove-exp">\u2715</button>';
    row.querySelector('.btn-remove-exp').addEventListener('click',()=>row.remove());
    document.getElementById('expenseRows').appendChild(row);
  });
  document.getElementById('expenseRows').querySelectorAll('.btn-remove-exp').forEach(b=>b.addEventListener('click',()=>b.closest('.expense-row').remove()));
  document.getElementById('calcBudgetBtn').addEventListener('click',calcBudget);
  document.getElementById('calcEmiBtn').addEventListener('click',calcEMI);
  document.getElementById('calcSavingsBtn').addEventListener('click',calcSavings);
  document.getElementById('calcDiscountBtn').addEventListener('click',calcDiscount);
  document.getElementById('calcStudyBtn').addEventListener('click',calcStudy);
  document.getElementById('addSubjectRow').addEventListener('click',()=>{
    const row=document.createElement('div'); row.className='study-subject-row';
    row.innerHTML='<input type="text" class="form-input subj-name" placeholder="Subject"/><select class="styled-select subj-priority"><option value="3">High</option><option value="2" selected>Medium</option><option value="1">Low</option></select>';
    document.getElementById('studySubjectRows').appendChild(row);
  });
  STATE.calculatorsUsed.add('budget');
}
function fmtNum(n){return n.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});}
function calcBudget(){
  const income=parseFloat(document.getElementById('budgetIncome').value)||0;
  if(!income){toast('Enter your monthly income first.','warning');return;}
  const rows=[...document.querySelectorAll('.expense-row')]; let totalExp=0; const expenses=[];
  rows.forEach(r=>{const name=r.querySelector('.exp-name')?.value||'Expense',amt=parseFloat(r.querySelector('.exp-amt')?.value)||0; if(amt>0){expenses.push({name,amt});totalExp+=amt;}});
  const balance=income-totalExp,savePct=((balance/income)*100).toFixed(1);
  const status=balance<0?'danger':balance<income*0.1?'warning':'success';
  let html=`<div class="result-row"><span class="result-label">Monthly Income</span><span class="result-val">\u20b9${fmtNum(income)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Total Expenses</span><span class="result-val danger">\u20b9${fmtNum(totalExp)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Balance</span><span class="result-val ${status}">\u20b9${fmtNum(balance)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Savings Rate</span><span class="result-val highlight">${savePct}%</span></div>`;
  html+=`<div class="mini-chart"><div class="mc-segment" style="width:${Math.min((totalExp/income)*100,100)}%;background:var(--danger)"></div><div class="mc-segment" style="width:${Math.max(0,(balance/income)*100)}%;background:var(--success)"></div></div>`;
  const insight=balance<0?`\u26a0\ufe0f Overspending by \u20b9${fmtNum(-balance)}! Reduce expenses immediately.`:balance<income*0.2?`\u26a1 Saving ${savePct}% — aim for at least 20%.`:`\u2705 Excellent! Saving ${savePct}%. Consider investing the surplus.`;
  html+=`<div class="insight-card"><div class="insight-title">🤖 AI Insight</div><div class="insight-text">${insight}</div></div>`;
  document.getElementById('budgetResultContent').innerHTML=html; document.getElementById('budgetResult').style.display='block';
  logActivity('\ud83d\udcb0','Analyzed budget'); addXP(10); saveState(); checkAchievements();
}
function calcEMI(){
  const P=parseFloat(document.getElementById('emiPrincipal').value)||0,r=parseFloat(document.getElementById('emiRate').value)/12/100,n=parseInt(document.getElementById('emiTenure').value)||0;
  if(!P||!r||!n){toast('Fill all EMI fields.','warning');return;}
  const emi=P*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1),total=emi*n,interest=total-P;
  let html=`<div class="result-row"><span class="result-label">Monthly EMI</span><span class="result-val highlight">\u20b9${fmtNum(emi)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Total Payable</span><span class="result-val">\u20b9${fmtNum(total)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Principal</span><span class="result-val success">\u20b9${fmtNum(P)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Total Interest</span><span class="result-val danger">\u20b9${fmtNum(interest)}</span></div>`;
  html+=`<div class="mini-chart"><div class="mc-segment" style="width:${(P/total*100).toFixed(0)}%;background:var(--success)"></div><div class="mc-segment" style="width:${(interest/total*100).toFixed(0)}%;background:var(--danger)"></div></div>`;
  html+=`<div class="insight-card"><div class="insight-title">🤖 AI Insight</div><div class="insight-text">You pay \u20b9${fmtNum(interest)} extra in interest (${((interest/P)*100).toFixed(1)}%). Prepayments can save significantly!</div></div>`;
  document.getElementById('emiResultContent').innerHTML=html; document.getElementById('emiResult').style.display='block';
  logActivity('\ud83c\udfe6','Calculated EMI'); addXP(10); saveState(); checkAchievements();
}
function calcSavings(){
  const name=document.getElementById('savingsGoalName').value||'Goal',target=parseFloat(document.getElementById('savingsTarget').value)||0,current=parseFloat(document.getElementById('savingsCurrent').value)||0,monthly=parseFloat(document.getElementById('savingsMonthly').value)||0,rate=parseFloat(document.getElementById('savingsRate').value)/12/100||0;
  if(!target||!monthly){toast('Enter target and monthly contribution.','warning');return;}
  const remaining=target-current; let months=rate>0?Math.log((target*rate/monthly)+1)/Math.log(1+rate):remaining/monthly; months=Math.max(1,Math.ceil(months));
  const yrs=Math.floor(months/12),mos=months%12,pct=Math.min((current/target)*100,100);
  let html=`<div class="result-row"><span class="result-label">Goal: ${name}</span><span class="result-val highlight">\u20b9${fmtNum(target)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Current Savings</span><span class="result-val success">\u20b9${fmtNum(current)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Remaining</span><span class="result-val">\u20b9${fmtNum(remaining)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Time to Goal</span><span class="result-val highlight">${yrs>0?yrs+'yr ':''}${mos} months</span></div>`;
  html+=`<div class="progress-bar-row"><div class="pb-label-row"><span>Progress</span><span>${pct.toFixed(1)}%</span></div><div class="pb-track"><div class="pb-fill" style="width:${pct}%;background:linear-gradient(90deg,var(--success),var(--accent))"></div></div></div>`;
  html+=`<div class="insight-card"><div class="insight-title">\ud83d\udca1 AI Insight</div><div class="insight-text">You are ${pct.toFixed(1)}% there! At \u20b9${fmtNum(monthly)}/month you will reach "${name}" in ${yrs>0?yrs+' year(s) and ':''}${mos} months. ${pct<20?'Start strong â€” consistency is key!':'Great progress!'}</div></div>`;
  document.getElementById('savingsResultContent').innerHTML=html; document.getElementById('savingsResult').style.display='block';
  logActivity('\ud83c\udfaf','Planned savings: '+name); addXP(10); saveState(); checkAchievements();
}
function calcDiscount(){
  const orig=parseFloat(document.getElementById('discOriginalPrice').value)||0,d1=parseFloat(document.getElementById('disc1').value)||0,d2=parseFloat(document.getElementById('disc2').value)||0,tax=parseFloat(document.getElementById('discTax').value)||0;
  if(!orig){toast('Enter original price.','warning');return;}
  const a1=orig*(1-d1/100),a2=d2>0?a1*(1-d2/100):a1,taxAmt=a2*tax/100,final=a2+taxAmt,saved=orig-a2;
  let html=`<div class="result-row"><span class="result-label">Original Price</span><span class="result-val">\u20b9${fmtNum(orig)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">After Discount 1 (${d1}%)</span><span class="result-val">\u20b9${fmtNum(a1)}</span></div>`;
  if(d2>0) html+=`<div class="result-row"><span class="result-label">After Discount 2 (${d2}%)</span><span class="result-val">\u20b9${fmtNum(a2)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Total Saved</span><span class="result-val success">-\u20b9${fmtNum(saved)} (${((saved/orig)*100).toFixed(1)}%)</span></div>`;
  if(tax>0) html+=`<div class="result-row"><span class="result-label">GST (${tax}%)</span><span class="result-val danger">+\u20b9${fmtNum(taxAmt)}</span></div>`;
  html+=`<div class="result-row"><span class="result-label">Final Price</span><span class="result-val highlight">\u20b9${fmtNum(final)}</span></div>`;
  html+=`<div class="insight-card"><div class="insight-title">\ud83d\udca1 AI Insight</div><div class="insight-text">You save \u20b9${fmtNum(saved)} (${((saved/orig)*100).toFixed(1)}%). ${saved>orig*0.3?'Excellent deal!':'Look for extra coupons to save more!'}</div></div>`;
  document.getElementById('discountResultContent').innerHTML=html; document.getElementById('discountResult').style.display='block';
  logActivity('\ud83c\udff7\ufe0f','Calculated discount'); addXP(10); saveState(); checkAchievements();
}
function calcStudy(){
  const hours=parseFloat(document.getElementById('studyHours').value)||6,examDate=document.getElementById('studyExamDate').value;
  const rows=[...document.querySelectorAll('.study-subject-row')]; const subjects=[];
  rows.forEach(r=>{const name=r.querySelector('.subj-name')?.value,priority=parseInt(r.querySelector('.subj-priority')?.value)||2; if(name) subjects.push({name,priority});});
  if(!subjects.length){toast('Add at least one subject.','warning');return;}
  const daysLeft=examDate?Math.max(1,Math.ceil((new Date(examDate)-new Date())/(86400000))):30;
  const totalWeight=subjects.reduce((s,sub)=>s+sub.priority,0);
  const colors=['var(--accent)','var(--success)','var(--warning)','var(--purple)','var(--pink)','var(--cyan)'];
  let html=`<div class="result-row"><span class="result-label">Daily Study</span><span class="result-val highlight">${hours}h</span></div><div class="result-row"><span class="result-label">Days Remaining</span><span class="result-val">${daysLeft}</span></div>`;
  subjects.forEach((sub,i)=>{const h=(hours*sub.priority/totalWeight).toFixed(1),pct=((sub.priority/totalWeight)*100).toFixed(0),color=colors[i%colors.length]; html+=`<div class="progress-bar-row"><div class="pb-label-row"><span style="color:${color};font-weight:600">${sub.name}</span><span>${h}h/day (${pct}%)</span></div><div class="pb-track"><div class="pb-fill" style="width:${pct}%;background:${color}"></div></div></div>`;});
  const top=subjects.slice().sort((a,b)=>b.priority-a.priority)[0];
  html+=`<div class="insight-card"><div class="insight-title">\ud83d\udca1 AI Recommendation</div><div class="insight-text">Focus most on ${top.name}. Take 10-min breaks every 45 mins. ${daysLeft<14?'\u26a0\ufe0f Exam is near â€” prioritize revision!':'Good time ahead â€” build strong foundations first.'}</div></div>`;
  document.getElementById('studyResultContent').innerHTML=html; document.getElementById('studyResult').style.display='block';
  logActivity('\ud83d\udcc5','Generated study schedule'); addXP(10); saveState(); checkAchievements();
}

function renderPerformance(){
  const acc=STATE.totalSolved>0?Math.round(STATE.totalCorrect/STATE.totalSolved*100):0;
  document.getElementById('perfAccuracyVal').textContent=acc+'%';
  const circ=document.getElementById('accuracyCircleFill'),circumference=2*Math.PI*52;
  circ.style.strokeDasharray=circumference;
  setTimeout(()=>circ.style.strokeDashoffset=circumference-(acc/100*circumference),300);
  document.getElementById('perfTotalSolved').textContent=STATE.totalSolved;
  document.getElementById('perfBestStreak').textContent=STATE.bestStreak;
  document.getElementById('perfTotalXP').textContent=STATE.xp;
  renderTopicBars(); renderAchievementsFull(); renderActivityLog();
}
function renderTopicBars(){
  const el=document.getElementById('topicBars'),stats=STATE.topicStats,keys=Object.keys(stats);
  if(!keys.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">\ud83d\udcca</div><p>Solve problems to see breakdown!</p></div>';return;}
  el.innerHTML=keys.map(k=>{const s=stats[k],pct=s.total>0?Math.round(s.correct/s.total*100):0,color=pct>=80?'var(--success)':pct>=60?'var(--warning)':'var(--danger)'; return `<div class="topic-bar-item"><div class="tb-header"><span class="tb-name">${k}</span><span class="tb-stat">${s.correct}/${s.total} (${pct}%)</span></div><div class="tb-track"><div class="tb-fill" style="width:${pct}%;background:${color}"></div></div></div>`; }).join('');
}
function renderAchievementsFull(){
  const el=document.getElementById('achievementsFull');
  if(!APP_DATA.achievements){el.innerHTML='';return;}
  el.innerHTML=APP_DATA.achievements.map(a=>{const locked=!STATE.unlockedAchievements.includes(a.id); return `<div class="ach-item ${locked?'locked':''}"><div class="ach-icon-wrap" style="background:${a.iconBg}20">${a.icon}</div><div class="ach-info"><div class="ach-name">${a.name}</div><div class="ach-desc">${a.description}</div></div><div class="ach-pts">${locked?'\ud83d\udd12':'+'+a.points}</div></div>`; }).join('');
}
function renderActivityLog(){
  const el=document.getElementById('activityLog');
  if(!STATE.activityLog.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">\ud83d\udccb</div><p>No activity yet!</p></div>';return;}
  el.innerHTML=STATE.activityLog.map(a=>`<div class="log-item"><span class="log-icon">${a.icon}</span><span class="log-text">${a.text}</span><span class="log-time">${a.time}</span></div>`).join('');
}

function initVoiceInput() {
  const fab = document.getElementById('voiceFab');
  const tooltip = document.getElementById('voiceStatusTooltip');
  if(!fab) return;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) {
    fab.addEventListener('click', () => { setTimeout(() => tooltip.classList.remove('visible'), 2000); tooltip.textContent = 'Voice unsupported'; tooltip.classList.add('visible'); toast('Voice feature not supported in this browser.', 'warning'); });
    return;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  let isListening = false;
  
  fab.addEventListener('click', () => {
    if(isListening) { recognition.stop(); return; }
    recognition.start();
  });
  
  recognition.onstart = () => { isListening = true; fab.classList.add('listening'); tooltip.textContent = 'Listening...'; tooltip.classList.add('visible'); setTimeout(() => tooltip.classList.remove('visible'), 2000); };
  recognition.onend = () => { isListening = false; fab.classList.remove('listening'); };
  
  recognition.onerror = (e) => { isListening = false; fab.classList.remove('listening'); console.error(e); tooltip.textContent = 'Error: ' + e.error; tooltip.classList.add('visible'); setTimeout(() => tooltip.classList.remove('visible'), 2000); };
  
  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript.toLowerCase();
    toast('🗣️ You: ' + transcript, 'info');
    processVoiceCommand(transcript);
  };
}

function processVoiceCommand(cmd) {
  STATE.voiceUsed = (STATE.voiceUsed || 0) + 1;
  saveState();
  checkAchievements();
  
  if(cmd.includes('solve')) {
    let eq = cmd.replace('solve', '').trim().replace(/plus/g, '+').replace(/minus/g, '-').replace(/equals/g, '=').replace(/times/g, '*').replace(/divided by/g, '/').replace(/is equal to/g, '=');
    eq = eq.replace(/\s+/g,''); 
    const match = eq.match(/([+-]?\d*)x([+-]\d+)?=(-?\d+)/);
    if(match) {
      let mStr = match[1], bStr = match[2] || "+0", cStr = match[3];
      if(mStr==='' || mStr==='+') mStr = "1"; if(mStr==='-') mStr="-1";
      const m = parseFloat(mStr);
      let b = parseFloat(bStr);
      const c = parseFloat(cStr);
      
      navigateTo('equation-solver');
      setTimeout(() => {
        document.querySelector('.solver-tab[data-solver="linear"]')?.click();
        const sm = document.getElementById('sl_m'), sb = document.getElementById('sl_b'), sc = document.getElementById('sl_c');
        if(sm) sm.value = m; if(sb) sb.value = b; if(sc) sc.value = c;
        setTimeout(() => document.getElementById('solveBtn')?.click(), 200);
      }, 400);
      return;
    }
  }
  
  navigateTo('ai-tutor');
  setTimeout(() => {
    const input = document.getElementById('chatInput');
    if(input) { input.value = cmd; document.getElementById('chatSendBtn')?.click(); }
  }, 400);
}

function showResetConfirmation() {
  const modal = document.getElementById('resetConfirmModal');
  if(modal) {
    modal.style.display = 'flex';
  }
}

function resetProgress() {
  localStorage.removeItem('mathgenius_state');
  STATE = {
    xp: 0,
    level: 1,
    totalSolved: 0,
    totalCorrect: 0,
    streak: 0,
    bestStreak: 0,
    dailyStreak: 0,
    lastDate: null,
    equationsSolved: 0,
    graphsPlotted: 0,
    calculatorsUsed: new Set(),
    tutorMessages: 0,
    hardCorrect: 0,
    topicStats: {},
    activityLog: [],
    unlockedAchievements: []
  };
  
  updateTopBar();
  updateSidebarFooter();
  renderDashboard();
  
  if(typeof renderPerformance === 'function') {
    renderPerformance();
  }
  
  const modal = document.getElementById('resetConfirmModal');
  if(modal) {
    modal.style.display = 'none';
  }
  
  toast('✨ Progress reset successfully! You\'re back to the beginning.', 'success', 3000);
}

document.getElementById('resetConfirmBtn')?.addEventListener('click', resetProgress);
document.getElementById('resetCancelBtn')?.addEventListener('click', () => {
  const modal = document.getElementById('resetConfirmModal');
  if(modal) {
    modal.style.display = 'none';
  }
});
document.getElementById('resetConfirmModal')?.addEventListener('click', (e) => {
  if(e.target.id === 'resetConfirmModal') {
    e.target.style.display = 'none';
  }
});

async function init(){
  loadState(); initTheme();
  try { const res=await fetch('data.json'); APP_DATA=await res.json(); } catch(e){ console.error('data.json load failed',e); APP_DATA={}; }
  initGraphLab(); initEquationSolver(); initAITutor(); initPracticeZone(); initCalculators(); initVoiceInput();
  updateTopBar(); updateSidebarFooter(); renderDashboard(); navigateTo('dashboard');
  const today=new Date().toDateString(),yesterday=new Date(Date.now()-86400000).toDateString();
  if(STATE.lastDate!==today){ STATE.dailyStreak=STATE.lastDate===yesterday?STATE.dailyStreak+1:1; STATE.lastDate=today; saveState(); checkAchievements(); }
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.style.cssText='position:absolute;width:0;height:0';
  svg.innerHTML='<defs><linearGradient id="cpGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#8b5cf6"/></linearGradient></defs>';
  document.body.appendChild(svg);
  setTimeout(()=>toast('Welcome to MathGenius AI! Earn XP by solving problems. \ud83e\udde0','info',4000),1200);
}
document.addEventListener('DOMContentLoaded',init);
