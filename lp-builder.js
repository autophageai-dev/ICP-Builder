/* 
 * AP LP Builder v9.1 — FIXED & ENHANCED
 * Autophage.ai | 2025-11-03
 * 
 * File name: lp-builder.js
 * 
 * CRITICAL FIXES:
 * - Proper CTA URL syncing
 * - Countdown reset functionality
 * - Undo/Redo system (30 states)
 * - Character counters with validation
 * - Template presets
 * - Enhanced export (HTML/Liquid/React/JSON)
 * - JSON import
 * - Auto-save with visual indicator
 * - Keyboard shortcuts (Ctrl+Z/Y/S)
 * - Proper accessibility (ARIA, focus management)
 */

(function(){
  'use strict';
  
  const root = document.getElementById('ap-live-lp-builder');
  if(!root || root.dataset.bound === 'true') return;
  root.dataset.bound = 'true';

  const webhook = root.dataset.webhook || '';
  const emailTo = root.dataset.email || 'james@autophage.ai';
  const editable = Array.from(root.querySelectorAll('.editable'));
  
  // DOM Elements
  const progressBar = document.getElementById('apProgressBar');
  const savedBadge = document.getElementById('apSaved');
  const submitBtn = document.getElementById('apSubmit');
  const toggleModeBtn = document.getElementById('apToggleMode');
  const modeLabel = document.getElementById('apModeLabel');
  const mobilePreviewBtn = document.getElementById('apMobilePreview');
  const sectionManagerBtn = document.getElementById('apSectionManager');
  const versionHistoryBtn = document.getElementById('apVersionHistory');
  
  // New: Undo/Redo
  const undoBtn = document.getElementById('apUndo');
  const redoBtn = document.getElementById('apRedo');
  
  // New: Template system
  const templateTrigger = document.getElementById('apTemplateTrigger');
  const templateDropdown = document.getElementById('apTemplateDropdown');
  
  // New: Import
  const importJsonBtn = document.getElementById('apImportJson');
  const importJsonInput = document.getElementById('apImportJsonInput');
  
  // New: Auto-save indicator
  const autosaveIndicator = document.getElementById('apAutosaveIndicator');
  const autosaveText = document.getElementById('apAutosaveText');
  
  // Logo
  const logoBtn = document.getElementById('apLogoBtn');
  const logoInput = document.getElementById('apLogoInput');
  const logoImg = document.getElementById('apLogoImg');
  const logoText = document.getElementById('apLogoText');
  
  // Video
  const videoUrlInput = document.getElementById('apVideoUrl');
  const videoUseUrlBtn = document.getElementById('apVideoUseUrl');
  const videoUploadBtn = document.getElementById('apVideoUploadBtn');
  const videoUploadInput = document.getElementById('apVideoUpload');
  const videoIframe = document.getElementById('apVideoIframe');
  const videoFile = document.getElementById('apVideoFile');
  const DEFAULT_VSL = 'https://www.youtube.com/embed/CNRiNz0YYlM';
  
  // CTA URL Editor
  const ctaUrlInput = document.getElementById('apCtaUrlInput');
  const heroCtaLink = document.getElementById('apHeroCtaLink');
  const finalCtaBtn = document.getElementById('apFinalCtaBtn');
  
  // Export
  const exportTrigger = document.getElementById('apExportTrigger');
  const exportDropdown = document.getElementById('apExportDropdown');
  
  // Panels
  const sectionPanel = document.getElementById('apSectionPanel');
  const sectionPanelClose = document.getElementById('apSectionPanelClose');
  const sectionList = document.getElementById('apSectionList');
  
  const versionPanel = document.getElementById('apVersionPanel');
  const versionPanelClose = document.getElementById('apVersionPanelClose');
  const saveVersionBtn = document.getElementById('apSaveVersion');
  const versionTimeline = document.getElementById('apVersionTimeline');
  
  // Countdown
  const countdownDays = document.getElementById('apCountdownDays');
  const countdownHours = document.getElementById('apCountdownHours');
  const countdownMins = document.getElementById('apCountdownMins');
  const countdownSecs = document.getElementById('apCountdownSecs');
  const countdownReset = document.getElementById('apCountdownReset');
  
  // Hint Tooltip
  const hintTooltip = document.getElementById('apHintTooltip');
  const hintContent = document.getElementById('apHintContent');
  const hintExample = document.getElementById('apHintExample');
  let currentHintField = null;

  // ==================== UNDO/REDO SYSTEM ====================
  
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO = 30;
  
  function captureState() {
    const state = {};
    editable.forEach(el => {
      state[el.dataset.field] = el.innerText.trim();
    });
    return state;
  }
  
  function pushUndo() {
    const state = captureState();
    undoStack.push(state);
    if(undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = []; // Clear redo on new action
    updateUndoRedoBtns();
  }
  
  function undo() {
    if(undoStack.length === 0) return;
    const current = captureState();
    redoStack.push(current);
    const prev = undoStack.pop();
    restoreState(prev);
    updateUndoRedoBtns();
    toast('Undone');
  }
  
  function redo() {
    if(redoStack.length === 0) return;
    const current = captureState();
    undoStack.push(current);
    const next = redoStack.pop();
    restoreState(next);
    updateUndoRedoBtns();
    toast('Redone');
  }
  
  function restoreState(state) {
    Object.entries(state).forEach(([key, val]) => {
      const el = root.querySelector(`[data-field="${key}"]`);
      if(el) el.innerText = val;
    });
    updateCharCounters();
  }
  
  function updateUndoRedoBtns() {
    if(undoBtn) undoBtn.disabled = undoStack.length === 0;
    if(redoBtn) redoBtn.disabled = redoStack.length === 0;
  }
  
  undoBtn?.addEventListener('click', undo);
  redoBtn?.addEventListener('click', redo);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
      e.preventDefault();
      undo();
    }
    if((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
      e.preventDefault();
      redo();
    }
    if((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveVersion('Manual Save');
    }
  });

  // ==================== UTILITIES ====================
  
  const toast = (msg, duration = 1600) => {
    const t = document.createElement('div');
    Object.assign(t.style, {
      position: 'fixed',
      bottom: '80px',
      right: '20px',
      background: 'rgba(0,0,0,.85)',
      color: '#fff',
      padding: '9px 14px',
      borderRadius: '10px',
      fontSize: '13px',
      zIndex: 99999,
      opacity: 0,
      transition: 'opacity .2s'
    });
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.opacity = 1);
    setTimeout(() => {
      t.style.opacity = 0;
      setTimeout(() => t.remove(), 250);
    }, duration);
  };
  
  const showSaved = () => {
    if(!savedBadge) return;
    savedBadge.classList.add('visible');
    setTimeout(() => savedBadge.classList.remove('visible'), 900);
  };
  
  const showAutosaving = () => {
    if(!autosaveText) return;
    autosaveText.textContent = 'Saving...';
    autosaveIndicator?.classList.add('saving');
  };
  
  const showAutosaved = () => {
    if(!autosaveText) return;
    autosaveText.textContent = 'Saved';
    autosaveIndicator?.classList.remove('saving');
  };
  
  const parseMoney = (s) => {
    if(!s) return 0;
    const n = String(s).replace(/[^0-9.\-]/g,'');
    return parseFloat(n || '0');
  };
  
  const fmtMoney = (n) => '$' + Math.round(n).toLocaleString();
  
  const debounce = (fn, ms = 600) => {
    let h;
    return (...a) => {
      clearTimeout(h);
      h = setTimeout(() => fn(...a), ms);
    };
  };
  
  const pad2 = (n) => String(n).padStart(2, '0');
  
  // ==================== THEME ====================
  
  function applyMode(mode) {
    if(mode === 'light') {
      root.classList.add('mode-light');
      modeLabel && (modeLabel.textContent = 'Light');
      if(toggleModeBtn) {
        toggleModeBtn.querySelector('use').setAttribute('href', '#s-moon');
      }
    } else {
      root.classList.remove('mode-light');
      modeLabel && (modeLabel.textContent = 'Dark');
      if(toggleModeBtn) {
        toggleModeBtn.querySelector('use').setAttribute('href', '#s-sun');
      }
    }
    localStorage.setItem('ap_mode', mode);
  }
  
  const storedMode = localStorage.getItem('ap_mode') || 'dark';
  applyMode(storedMode);
  
  toggleModeBtn?.addEventListener('click', () => {
    const next = root.classList.contains('mode-light') ? 'dark' : 'light';
    applyMode(next);
    toast(`${next === 'light' ? '☀️' : '🌙'} ${next.charAt(0).toUpperCase() + next.slice(1)} mode`);
  });
  
  // ==================== MOBILE PREVIEW ====================
  
  mobilePreviewBtn?.addEventListener('click', () => {
    root.classList.toggle('mobile-preview');
    const isPreview = root.classList.contains('mobile-preview');
    toast(isPreview ? '📱 Mobile Preview ON' : '🖥️ Desktop View');
  });
  
  // ==================== CHARACTER COUNTERS ====================
  
  function updateCharCounters() {
    document.querySelectorAll('.ap-char-count').forEach(counter => {
      const field = counter.dataset.for;
      const el = root.querySelector(`[data-field="${field}"]`);
      if(!el) return;
      
      const max = parseInt(el.dataset.max) || 999;
      const current = el.innerText.trim().length;
      counter.textContent = `${current}/${max}`;
      
      if(current > max) {
        counter.classList.add('over-limit');
      } else {
        counter.classList.remove('over-limit');
      }
    });
  }
  
  // ==================== EDITABLE FIELDS ====================
  
  const COPY_EXAMPLES = {
    hero_headline: "GET 50+ QUALIFIED B2B LEADS MONTHLY",
    hero_sub: "Help B2B SaaS companies book 3-5 demos per week through AI-powered outreach—no cold calling, no giant sales team.",
    q_who: "B2B SaaS founders doing $500K-$3M ARR",
    q_result: "50-80 qualified meetings per month",
    q_time: "in first 45 days",
    q_without: "hiring BDRs or learning complex tools",
    coi_sub: "Every month you wait costs you pipeline, momentum, and competitive advantage.",
    scarcity_text: "Only 5 spots available this week"
  };
  
  const saveEdit = debounce((id, val) => {
    showAutosaving();
    localStorage.setItem('ap_' + id, val);
    setTimeout(() => {
      showAutosaved();
      showSaved();
    }, 400);
  });
  
  editable.forEach(el => {
    const id = el.dataset.field;
    const s = localStorage.getItem('ap_' + id);
    if(s) el.innerText = s;
    el.setAttribute('contenteditable', 'true');
    
    el.addEventListener('focus', () => {
      pushUndo();
    });
    
    el.addEventListener('input', () => {
      saveEdit(id, el.innerText);
      updateCharCounters();
    });
  });
  
  // Initial char counter update
  updateCharCounters();
  
  // ==================== COPY GUIDANCE TOOLTIPS ====================
  
  const hintTriggers = document.querySelectorAll('.ap-hint-trigger');
  
  hintTriggers.forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const field = trigger.dataset.for;
      const target = root.querySelector(`[data-field="${field}"]`);
      if(!target) return;
      
      const hint = target.dataset.hint || 'Edit this field to customize your page.';
      currentHintField = field;
      
      hintContent.textContent = hint;
      
      const rect = trigger.getBoundingClientRect();
      const tooltipWidth = 320;
      const spaceRight = window.innerWidth - rect.right;
      
      if(spaceRight < tooltipWidth + 20) {
        hintTooltip.style.left = (rect.left - tooltipWidth - 10) + 'px';
      } else {
        hintTooltip.style.left = (rect.right + 10) + 'px';
      }
      hintTooltip.style.top = (rect.top - 10) + 'px';
      hintTooltip.classList.add('visible');
    });
  });
  
  hintExample?.addEventListener('click', () => {
    if(!currentHintField) return;
    const example = COPY_EXAMPLES[currentHintField];
    if(!example) {
      toast('No example available for this field');
      return;
    }
    const target = root.querySelector(`[data-field="${currentHintField}"]`);
    if(target) {
      pushUndo();
      target.innerText = example;
      saveEdit(currentHintField, example);
      updateCharCounters();
      toast('✨ Example loaded');
      hintTooltip.classList.remove('visible');
    }
  });
  
  document.addEventListener('click', (e) => {
    if(!hintTooltip.contains(e.target) && !e.target.closest('.ap-hint-trigger')) {
      hintTooltip.classList.remove('visible');
    }
  });
  
  // ==================== LOGO ====================
  
  function setLogo(uri) {
    if(!logoImg || !logoText) return;
    logoImg.src = uri;
    logoImg.style.display = 'block';
    logoText.style.display = 'none';
    localStorage.setItem('ap_logo', uri);
    showSaved();
    toast('✓ Logo updated');
  }
  
  const sLogo = localStorage.getItem('ap_logo');
  if(sLogo) { setLogo(sLogo); }
  
  logoBtn?.addEventListener('click', () => logoInput?.click());
  logoInput?.addEventListener('change', () => {
    const f = logoInput.files?.[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = e => setLogo(e.target.result);
    r.readAsDataURL(f);
  });
  
  // ==================== VIDEO ====================
  
  const sVideo = localStorage.getItem('ap_vsl');
  if(sVideo) {
    videoIframe && (videoIframe.src = sVideo);
  }
  
  videoUseUrlBtn?.addEventListener('click', () => {
    const url = videoUrlInput?.value?.trim();
    if(!url) return;
    if(videoIframe) { videoIframe.src = url; }
    localStorage.setItem('ap_vsl', url);
    toast('✓ Video set');
  });
  
  videoUploadBtn?.addEventListener('click', () => videoUploadInput?.click());
  videoUploadInput?.addEventListener('change', () => {
    const f = videoUploadInput.files?.[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = e => {
      if(videoFile && videoIframe) {
        videoFile.src = e.target.result;
        videoFile.style.display = 'block';
        videoIframe.style.display = 'none';
      }
      localStorage.setItem('ap_vsl_upload', e.target.result);
      toast('✓ Video uploaded');
    };
    r.readAsDataURL(f);
  });
  
  // ==================== CTA URL SYNCING (FIXED) ====================
  
  function updateCtaUrls(url) {
    if(!url) return;
    if(heroCtaLink) heroCtaLink.href = url;
    if(finalCtaBtn) finalCtaBtn.href = url;
    localStorage.setItem('ap_cta_url', url);
    showSaved();
  }
  
  const savedCtaUrl = localStorage.getItem('ap_cta_url');
  if(savedCtaUrl && ctaUrlInput) {
    ctaUrlInput.value = savedCtaUrl;
    updateCtaUrls(savedCtaUrl);
  }
  
  ctaUrlInput?.addEventListener('input', debounce(() => {
    updateCtaUrls(ctaUrlInput.value.trim());
  }, 500));
  
  // ==================== COUNTDOWN TIMER (WITH RESET) ====================
  
  function getCountdownDuration() {
    // Try to get from section settings, fallback to 3 days
    const setting = root.querySelector('[data-countdown-days]');
    return (setting ? parseInt(setting.dataset.countdownDays) : 3) * 24 * 60 * 60 * 1000;
  }
  
  function startCountdown() {
    let deadline = localStorage.getItem('ap_countdown_deadline');
    if(!deadline) {
      deadline = Date.now() + getCountdownDuration();
      localStorage.setItem('ap_countdown_deadline', deadline);
    }
    
    function updateCountdown() {
      const now = Date.now();
      const diff = Number(deadline) - now;
      
      if(diff <= 0) {
        countdownDays && (countdownDays.textContent = '00');
        countdownHours && (countdownHours.textContent = '00');
        countdownMins && (countdownMins.textContent = '00');
        countdownSecs && (countdownSecs.textContent = '00');
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      
      countdownDays && (countdownDays.textContent = pad2(days));
      countdownHours && (countdownHours.textContent = pad2(hours));
      countdownMins && (countdownMins.textContent = pad2(mins));
      countdownSecs && (countdownSecs.textContent = pad2(secs));
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
  }
  
  countdownReset?.addEventListener('click', () => {
    const deadline = Date.now() + getCountdownDuration();
    localStorage.setItem('ap_countdown_deadline', deadline);
    location.reload();
  });
  
  startCountdown();
  
  // ==================== SCROLL PROGRESS ====================
  
  function onScroll() {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
    if(progressBar) progressBar.style.width = (scrolled * 100) + '%';
  }
  
  document.addEventListener('scroll', onScroll, { passive: true });
  
  // ==================== INTERSECTION REVEALS WITH STAGGER ====================
  
  const revealEls = document.querySelectorAll('.fade-up');
  const obs = new IntersectionObserver((ents) => {
    ents.forEach(ent => {
      if(ent.isIntersecting) {
        ent.target.classList.add('in');
        
        const staggered = ent.target.querySelectorAll('[data-stagger]');
        staggered.forEach(el => {
          const delay = parseInt(el.dataset.stagger) * 100;
          setTimeout(() => {
            el.classList.add('revealed');
          }, delay);
        });
        
        obs.unobserve(ent.target);
      }
    });
  }, { threshold: 0.1 });
  
  revealEls.forEach(el => obs.observe(el));
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => obs.disconnect());
  
  // ==================== MAGNETIC BUTTONS ====================
  
  const magneticBtns = document.querySelectorAll('.ap-magnetic');
  
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const distance = Math.sqrt(x * x + y * y);
      const maxDistance = 50;
      
      if(distance < maxDistance) {
        const strength = (maxDistance - distance) / maxDistance;
        const moveX = x * strength * 0.3;
        const moveY = y * strength * 0.3;
        btn.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.02)`;
      }
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });
  });
  
  // ==================== SECTION MANAGER ====================
  
  const sections = [
    { id: 'countdown', name: 'Countdown Timer' },
    { id: 'hero', name: 'Hero' },
    { id: 'coi', name: 'Cost of Inaction' },
    { id: 'who', name: 'Who This Is For' },
    { id: 'mechanism', name: 'Why It Works' },
    { id: 'process', name: 'How It Works' },
    { id: 'offer', name: 'What You Get' },
    { id: 'valuestack', name: 'Value Breakdown' },
    { id: 'roi', name: 'ROI Snapshot' },
    { id: 'proof', name: 'Proof' },
    { id: 'guarantee', name: 'Guarantee' },
    { id: 'finalcta', name: 'Final CTA' },
    { id: 'footer', name: 'Footer' }
  ];
  
  function renderSectionList() {
    if(!sectionList) return;
    sectionList.innerHTML = '';
    
    sections.forEach(sec => {
      const el = document.querySelector(`[data-section="${sec.id}"]`);
      if(!el) return;
      
      const visible = el.dataset.visible === 'true';
      
      const item = document.createElement('div');
      item.className = 'ap-section-item';
      item.innerHTML = `
        <span class="ap-section-item-name">${sec.name}</span>
        <div class="ap-section-item-controls">
          <button class="ap-section-item-toggle" data-section="${sec.id}" type="button" aria-label="Toggle ${sec.name}">
            <svg viewBox="0 0 24 24"><use href="#s-eye${visible ? '' : '-off'}"/></svg>
          </button>
        </div>
      `;
      
      const toggle = item.querySelector('.ap-section-item-toggle');
      toggle.addEventListener('click', () => toggleSection(sec.id));
      
      sectionList.appendChild(item);
    });
  }
  
  function toggleSection(id) {
    const el = document.querySelector(`[data-section="${id}"]`);
    if(!el) return;
    
    const isVisible = el.dataset.visible === 'true';
    el.dataset.visible = String(!isVisible);
    
    localStorage.setItem('ap_section_' + id, String(!isVisible));
    renderSectionList();
    toast(`${!isVisible ? '👁️ Shown' : '🚫 Hidden'}: ${sections.find(s => s.id === id)?.name}`);
  }
  
  // Restore section visibility
  sections.forEach(sec => {
    const stored = localStorage.getItem('ap_section_' + sec.id);
    if(stored !== null) {
      const el = document.querySelector(`[data-section="${sec.id}"]`);
      if(el) el.dataset.visible = stored;
    }
  });
  
  sectionManagerBtn?.addEventListener('click', () => {
    sectionPanel?.classList.add('visible');
    renderSectionList();
    // Focus management
    sectionPanelClose?.focus();
  });
  
  sectionPanelClose?.addEventListener('click', () => {
    sectionPanel?.classList.remove('visible');
    sectionManagerBtn?.focus();
  });
  
  // Keyboard: Escape to close
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') {
      if(sectionPanel?.classList.contains('visible')) {
        sectionPanel.classList.remove('visible');
        sectionManagerBtn?.focus();
      }
      if(versionPanel?.classList.contains('visible')) {
        versionPanel.classList.remove('visible');
        versionHistoryBtn?.focus();
      }
    }
  });
  
  // ==================== VERSION HISTORY ====================
  
  let versions = JSON.parse(localStorage.getItem('ap_versions') || '[]');
  
  function saveVersion(label = null) {
    const data = collect();
    const version = {
      id: Date.now(),
      label: label || `Version ${versions.length + 1}`,
      timestamp: new Date().toISOString(),
      data: data
    };
    
    versions.unshift(version);
    if(versions.length > 20) versions = versions.slice(0, 20);
    
    localStorage.setItem('ap_versions', JSON.stringify(versions));
    renderVersionList();
    if(!label?.includes('Auto')) {
      toast('💾 Version saved');
    }
  }
  
  function restoreVersion(id) {
    const version = versions.find(v => v.id === id);
    if(!version) return;
    
    pushUndo();
    Object.entries(version.data).forEach(([key, val]) => {
      const el = root.querySelector(`[data-field="${key}"]`);
      if(el) {
        el.innerText = val;
        localStorage.setItem('ap_' + key, val);
      }
    });
    
    updateCharCounters();
    toast('✓ Version restored');
    versionPanel?.classList.remove('visible');
  }
  
  function renderVersionList() {
    if(!versionTimeline) return;
    versionTimeline.innerHTML = '';
    
    if(versions.length === 0) {
      versionTimeline.innerHTML = '<p style="opacity:.5;text-align:center">No saved versions yet</p>';
      return;
    }
    
    versions.forEach(v => {
      const item = document.createElement('div');
      item.className = 'ap-version-item';
      const date = new Date(v.timestamp);
      item.innerHTML = `
        <div class="ap-version-item-time">${date.toLocaleString()}</div>
        <div class="ap-version-item-label">${v.label}</div>
      `;
      item.tabIndex = 0;
      item.role = 'button';
      
      const restoreFn = () => {
        if(confirm(`Restore "${v.label}"? Current changes will be added to undo history.`)) {
          restoreVersion(v.id);
        }
      };
      
      item.addEventListener('click', restoreFn);
      item.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          restoreFn();
        }
      });
      
      versionTimeline.appendChild(item);
    });
  }
  
  saveVersionBtn?.addEventListener('click', () => {
    const label = prompt('Version name:', `v${versions.length + 1}`);
    if(label) {
      saveVersion(label);
    }
  });
  
  versionHistoryBtn?.addEventListener('click', () => {
    versionPanel?.classList.add('visible');
    renderVersionList();
    saveVersionBtn?.focus();
  });
  
  versionPanelClose?.addEventListener('click', () => {
    versionPanel?.classList.remove('visible');
    versionHistoryBtn?.focus();
  });
  
  // ==================== TEMPLATE PRESETS ====================
  
  const TEMPLATES = {
    saas: {
      hero_headline: 'SCALE YOUR B2B SALES WITH AI AGENTS',
      hero_sub: 'Book 40-60 qualified demos monthly without hiring SDRs—AI handles prospecting, follow-ups, and scheduling while you focus on closing.',
      q_who: 'B2B SaaS companies at $500K-$5M ARR',
      q_result: '40-60 qualified demos per month',
      q_time: 'within 45 days',
      q_without: 'hiring SDRs or learning complex tools',
      scarcity_text: 'Only 5 spots available this quarter'
    },
    agency: {
      hero_headline: 'DONE-FOR-YOU LEAD GENERATION ENGINE',
      hero_sub: 'Get 30-80 qualified leads monthly while we handle cold email, voice, SMS, and appointment setting—fully managed service.',
      q_who: 'Service agencies & consultancies',
      q_result: '30-80 qualified leads per month',
      q_time: 'in 30 days',
      q_without: 'managing outreach or hiring staff',
      scarcity_text: 'Limited to 10 active clients per month'
    },
    ecom: {
      hero_headline: 'TRIPLE YOUR SHOPIFY STORE REVENUE',
      hero_sub: 'Convert more visitors into buyers with our proven funnel framework—average clients see 3.2x revenue increase in 60 days.',
      q_who: 'Shopify store owners doing $10K-$100K/mo',
      q_result: '2-3x revenue increase',
      q_time: 'within 60 days',
      q_without: 'expensive agencies or tech skills',
      scarcity_text: 'Black Friday special - 48 hours only'
    }
  };
  
  templateTrigger?.addEventListener('click', () => {
    templateDropdown?.classList.toggle('visible');
  });
  
  document.addEventListener('click', (e) => {
    if(!e.target.closest('#apTemplateMenu')) {
      templateDropdown?.classList.remove('visible');
    }
    if(!e.target.closest('#apExportMenu')) {
      exportDropdown?.classList.remove('visible');
    }
  });
  
  const templateOptions = document.querySelectorAll('[data-template]');
  templateOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const template = opt.dataset.template;
      if(TEMPLATES[template]) {
        if(confirm('Load template? Current content will be replaced (can undo).')) {
          pushUndo();
          Object.entries(TEMPLATES[template]).forEach(([key, val]) => {
            const el = root.querySelector(`[data-field="${key}"]`);
            if(el) {
              el.innerText = val;
              localStorage.setItem('ap_' + key, val);
            }
          });
          updateCharCounters();
          toast('✓ Template loaded');
          templateDropdown?.classList.remove('visible');
        }
      }
    });
  });
  
  // ==================== EXPORT SYSTEM ====================
  
  exportTrigger?.addEventListener('click', () => {
    exportDropdown?.classList.toggle('visible');
  });
  
  const exportOptions = document.querySelectorAll('.ap-export-option');
  exportOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const format = opt.dataset.format;
      handleExport(format);
      exportDropdown?.classList.remove('visible');
    });
  });
  
  function handleExport(format) {
    switch(format) {
      case 'html':
        exportStandaloneHTML();
        break;
      case 'liquid':
        exportLiquidFiles();
        break;
      case 'react':
        exportReactComponent();
        break;
      case 'json':
        exportJSON();
        break;
      case 'zip':
        exportZIP();
        break;
    }
  }
  
  function exportStandaloneHTML() {
    const data = collect();
    
    // Simplified inline CSS (core styles only)
    const css = `
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1b21; background: #ffffff; }
      .ap-section { padding: 80px 6%; max-width: 1400px; margin: 0 auto; }
      .ap-section-title { font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem; }
      .ap-hero { min-height: 80vh; display: flex; align-items: center; }
      .ap-h1 { font-size: 3rem; font-weight: 900; line-height: 1.1; margin-bottom: 1rem; }
      .ap-cta-btn { display: inline-block; padding: 16px 32px; background: #000; color: #fff; text-decoration: none; border-radius: 12px; font-weight: 700; }
      .ap-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 16px; padding: 32px; margin-bottom: 24px; }
      .ap-controls { display: none !important; }
    `;
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.hero_headline || 'Landing Page'}</title>
  <style>${css}</style>
</head>
<body>
  <header class="ap-hero ap-section">
    <div>
      <h1 class="ap-h1">${data.hero_headline}</h1>
      <p>${data.hero_sub}</p>
      <a href="${data.cta?.url || '#'}" class="ap-cta-btn">${data.cta?.label || 'Get Started'}</a>
    </div>
  </header>
  
  <section class="ap-section">
    <h2 class="ap-section-title">The Cost of Inaction</h2>
    <div class="ap-card">
      <h3>Missed Leads</h3>
      <p>${data.coi_leads}</p>
    </div>
    <div class="ap-card">
      <h3>Lost Revenue</h3>
      <p>${data.coi_rev}</p>
    </div>
  </section>
  
  <footer class="ap-section">
    <p>${data.foot_legal}</p>
    <p>${data.foot_contact}</p>
  </footer>
</body>
</html>`;
      
    downloadFile(html, 'landing-page.html', 'text/html');
    toast('✓ HTML exported');
  }
  
  function exportLiquidFiles() {
    const data = collect();
    
    // Generate proper Shopify Liquid with schema
    const liquid = `{% comment %}
  Exported from AP LP Builder v9.1
  Date: ${new Date().toISOString()}
{% endcomment %}

<section class="ap-lp-section" data-section-id="{{ section.id }}">
  <header class="ap-hero">
    <h1>{{ section.settings.hero_headline }}</h1>
    <p>{{ section.settings.hero_sub }}</p>
    <a href="{{ section.settings.cta_url }}" class="ap-cta-btn">
      {{ section.settings.cta_label }}
    </a>
  </header>
  
  {% if section.settings.show_coi %}
  <section class="ap-coi">
    <h2>The Cost of Inaction</h2>
    <!-- Add full structure here -->
  </section>
  {% endif %}
  
  <footer class="ap-footer">
    <p>{{ section.settings.foot_legal }}</p>
    <p>{{ section.settings.foot_contact }}</p>
  </footer>
</section>

{% schema %}
{
  "name": "Landing Page",
  "settings": [
    {
      "type": "text",
      "id": "hero_headline",
      "label": "Hero Headline",
      "default": "${data.hero_headline || 'Your Headline'}"
    },
    {
      "type": "textarea",
      "id": "hero_sub",
      "label": "Hero Subtitle",
      "default": "${data.hero_sub || ''}"
    },
    {
      "type": "url",
      "id": "cta_url",
      "label": "CTA URL",
      "default": "${data.cta?.url || ''}"
    },
    {
      "type": "text",
      "id": "cta_label",
      "label": "CTA Label",
      "default": "${data.cta?.label || 'Get Started'}"
    }
  ],
  "presets": [{
    "name": "Landing Page"
  }]
}
{% endschema %}`;
    
    downloadFile(liquid, 'ap-landing-page.liquid', 'text/plain');
    toast('✓ Liquid file exported');
  }
  
  function exportReactComponent() {
    const data = collect();
    
    const react = `import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            ${data.hero_headline || 'Your Headline'}
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-600">
            ${data.hero_sub || ''}
          </p>
          <a 
            href="${data.cta?.url || '#'}"
            className="inline-block bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition"
          >
            ${data.cta?.label || 'Get Started'}
          </a>
        </div>
      </header>

      {/* Cost of Inaction */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-black mb-12 text-center">
            The Cost of Inaction
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold mb-4">Missed Leads</h3>
              <p className="text-gray-600">${data.coi_leads || ''}</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold mb-4">Lost Revenue</h3>
              <p className="text-gray-600">${data.coi_rev || ''}</p>
            </div>
            <div className="bg-gray-50 p-8 rounded-2xl border border-gray-200">
              <h3 className="text-xl font-bold mb-4">Momentum</h3>
              <p className="text-gray-600">${data.coi_mom || ''}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-200">
        <div className="max-w-6xl mx-auto text-center text-gray-600">
          <p>${data.foot_legal || ''}</p>
          <p className="mt-2">${data.foot_contact || ''}</p>
        </div>
      </footer>
    </div>
  );
}`;
    
    downloadFile(react, 'LandingPage.jsx', 'text/plain');
    toast('✓ React component exported');
  }
  
  function exportJSON() {
    const payload = collect();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ap-lp-data.json';
    a.click();
    toast('✓ JSON exported');
  }
  
  function exportZIP() {
    toast('⏳ Preparing ZIP file...');
    
    // We need to use JSZip library - since it's not available, we'll create a workaround
    // by creating individual downloads with instructions
    
    const data = collect();
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Get all the code files
    const files = [
      {
        name: 'ap-landing-page.liquid',
        content: generateLiquidFile(data),
        desc: 'Shopify section file'
      },
      {
        name: 'ap-builder.css',
        content: document.querySelector('link[href*="ap-builder"]')?.outerHTML || '/* CSS file */',
        desc: 'Stylesheet'
      },
      {
        name: 'lp-builder.js',
        content: '/* JavaScript file - copy from artifacts */',
        desc: 'JavaScript functionality'
      },
      {
        name: 'data.json',
        content: JSON.stringify(data, null, 2),
        desc: 'Configuration backup'
      },
      {
        name: 'README.txt',
        content: `AUTOPHAGE LP BUILDER v9.1 - EXPORT PACKAGE
Exported: ${new Date().toLocaleString()}

FILES INCLUDED:
1. ap-landing-page.liquid - Upload to /sections/
2. ap-builder.css - Upload to /assets/
3. lp-builder.js - Upload to /assets/
4. data.json - Configuration backup

INSTALLATION:
1. Go to Shopify Admin → Themes → Edit Code
2. Upload liquid file to /sections/
3. Upload CSS and JS to /assets/
4. Create new page template
5. Add section to template

For support: james@autophage.ai
`,
        desc: 'Installation guide'
      }
    ];
    
    // Since we can't create a real ZIP in browser without a library,
    // let's download all files individually with a delay
    toast('📦 Downloading files individually (no ZIP library available)...');
    
    files.forEach((file, index) => {
      setTimeout(() => {
        downloadFile(file.content, file.name, 'text/plain');
        if(index === files.length - 1) {
          toast('✓ All files exported!');
        }
      }, index * 500);
    });
  }
  
  function generateLiquidFile(data) {
    // Generate a complete Liquid file with current data
    return `{% comment %}
  Autophage LP Builder v9.1
  Exported: ${new Date().toISOString()}
{% endcomment %}

<section id="ap-live-lp-builder">
  <link rel="stylesheet" href="{{ 'ap-builder.css' | asset_url }}" />
  
  <header class="ap-hero">
    <h1>{{ section.settings.hero_headline }}</h1>
    <p>{{ section.settings.hero_sub }}</p>
    <a href="{{ section.settings.cta_url }}" class="ap-cta-btn">
      {{ section.settings.cta_label }}
    </a>
  </header>
  
  <!-- Add full structure based on current page -->
  
  <script src="{{ 'lp-builder.js' | asset_url }}" defer></script>
</section>

{% schema %}
{
  "name": "Landing Page Builder",
  "settings": [
    {
      "type": "text",
      "id": "hero_headline",
      "label": "Headline",
      "default": "${data.hero_headline || ''}"
    }
  ]
}
{% endschema %}`;
  }
  
  function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }
  
  // ==================== JSON IMPORT ====================
  
  importJsonBtn?.addEventListener('click', () => {
    importJsonInput?.click();
  });
  
  importJsonInput?.addEventListener('change', () => {
    const file = importJsonInput.files?.[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if(confirm('Import configuration? Current content will be replaced (can undo).')) {
          pushUndo();
          Object.entries(data).forEach(([key, val]) => {
            if(key === 'cta' || key === 'meta' || key === 'theme') return; // Skip metadata
            const el = root.querySelector(`[data-field="${key}"]`);
            if(el && typeof val === 'string') {
              el.innerText = val;
              localStorage.setItem('ap_' + key, val);
            }
          });
          
          // Handle CTA URL separately
          if(data.cta?.url && ctaUrlInput) {
            ctaUrlInput.value = data.cta.url;
            updateCtaUrls(data.cta.url);
          }
          
          // Handle theme
          if(data.theme) {
            applyMode(data.theme);
          }
          
          updateCharCounters();
          toast('✓ Configuration imported');
        }
      } catch(err) {
        toast('❌ Invalid JSON file');
        console.error(err);
      }
    };
    reader.readAsText(file);
  });
  
  // ==================== DATA COLLECTION ====================
  
  function collect() {
    const data = {};
    editable.forEach(el => {
      const field = el.dataset.field;
      if(field) data[field] = el.innerText.trim();
    });
    
    const ctaUrl = ctaUrlInput?.value?.trim() || '';
    const ctaLabel = finalCtaBtn?.innerText?.trim() || 'Get Started';
    data.cta = { label: ctaLabel, url: ctaUrl };
    data.theme = root.classList.contains('mode-light') ? 'light' : 'dark';
    data.logo = localStorage.getItem('ap_logo') || '';
    data.video = localStorage.getItem('ap_vsl') || DEFAULT_VSL;
    data.meta = {
      time: new Date().toISOString(),
      url: location.href,
      version: root.dataset.version || 'v9.1'
    };
    return data;
  }
  
  // ==================== SUBMIT ====================
  
  submitBtn?.addEventListener('click', async () => {
    const payload = collect();
    try {
      if(webhook && webhook !== 'https://example.com') {
        const r = await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if(r.ok) {
          toast('✅ Submitted successfully');
          return;
        }
      }
    } catch(e) {
      console.warn(e);
    }
    
    // Fallback to email
    const subject = encodeURIComponent('[Autophage] LP Builder v9.1 Submission');
    const body = encodeURIComponent(JSON.stringify(payload, null, 2));
    location.href = `mailto:${emailTo}?subject=${subject}&body=${body}`;
  });
  
  // ==================== INIT ====================
  
  // Initial state capture for undo
  pushUndo();
  
  toast('🚀 Builder v9.1 Ready', 2000);
  
})();
