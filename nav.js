/*
 * nav.js — Persistent chamber navigation for Gamer Ascension
 *
 * Usage:
 *   1. Include <script src="nav.js"></script> near end of <body>
 *   2. Call Nav.init({ current: 'atheneum' }) to mark the current chamber
 *      (valid values: 'threshold', 'atheneum', 'arcanium', 'scriptorium', 'agora')
 *
 * Renders a compass icon in the top-left header area. Clicking it opens a
 * chamber list panel. Current chamber is highlighted; sealed chambers are shown
 * but disabled.
 *
 * No external dependencies. Pure vanilla JS. Self-contained styles injected
 * into the document head on init.
 */

(function(){
  'use strict';

  var CHAMBERS = [
    { id: 'threshold',   name: 'The Threshold',   func: 'World Map',         href: '/threshold.html', status: 'open' },
    { id: 'atheneum',    name: 'The Atheneum',    func: 'Skill Mastery',     href: '/pregame.html',   status: 'open' },
    { id: 'arcanium',    name: 'The Arcanium',    func: 'Library',           href: null,              status: 'sealed' },
    { id: 'scriptorium', name: 'The Scriptorium', func: 'Mail and Journal',  href: null,              status: 'sealed' },
    { id: 'agora',       name: 'The Agora',       func: 'Community Forum',   href: null,              status: 'sealed' }
  ];

  var currentChamberId = null;
  var isOpen = false;
  var triggerBtn = null;
  var panelEl = null;
  var backdropEl = null;

  var Nav = {
    init: function(config){
      config = config || {};
      currentChamberId = config.current || null;
      injectStyles();
      mount();
    },
    open: function(){ openPanel(); },
    close: function(){ closePanel(); }
  };
  window.Nav = Nav;

  function injectStyles(){
    if(document.getElementById('nav-styles')) return;
    var style = document.createElement('style');
    style.id = 'nav-styles';
    style.textContent = '' +
      // Trigger button — compass icon + "Chambers" label, positioned below the page header
      '.nav-trigger{position:fixed;top:68px;left:12px;height:34px;' +
        'background:rgba(8,8,20,0.75);border:1px solid rgba(201,168,76,0.3);' +
        'border-radius:20px;cursor:pointer;z-index:9997;padding:0 14px 0 10px;' +
        'display:inline-flex;align-items:center;gap:8px;' +
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);' +
        'transition:all .25s;outline:none;box-shadow:0 2px 12px rgba(0,0,0,0.3);' +
        'font-family:\'Cinzel\',serif;font-size:10px;letter-spacing:.22em;' +
        'color:rgba(240,236,228,0.75);text-transform:uppercase}' +
      '.nav-trigger:hover{border-color:rgba(201,168,76,0.6);' +
        'color:#f0ece4;box-shadow:0 2px 12px rgba(0,0,0,0.3),0 0 14px rgba(201,168,76,0.25)}' +
      '.nav-trigger:focus,.nav-trigger:focus-visible{outline:none;box-shadow:0 2px 12px rgba(0,0,0,0.3)}' +
      '.nav-trigger.open{border-color:rgba(201,168,76,0.75);' +
        'background:rgba(30,22,12,0.85);color:#f0ece4}' +
      '.nav-trigger svg{width:18px;height:18px;transition:transform .4s ease;flex-shrink:0}' +
      '.nav-trigger.open svg{transform:rotate(180deg)}' +
      '.nav-trigger-label{display:inline-block;line-height:1}' +
      '@media(min-width:500px){' +
        '.nav-trigger{top:74px;left:16px;height:36px;padding:0 16px 0 12px;font-size:11px}' +
        '.nav-trigger svg{width:20px;height:20px}' +
      '}' +

      // Backdrop (click-to-close)
      '.nav-backdrop{position:fixed;inset:0;z-index:9995;background:transparent;' +
        'opacity:0;pointer-events:none;transition:opacity .3s ease}' +
      '.nav-backdrop.active{opacity:1;pointer-events:auto}' +

      // Panel
      '.nav-panel{position:fixed;top:112px;left:12px;width:min(320px,calc(100vw - 24px));' +
        'background:linear-gradient(180deg,rgba(15,12,28,0.95) 0%,rgba(8,8,20,0.95) 100%);' +
        'border:1px solid rgba(201,168,76,0.35);border-radius:4px;padding:14px;' +
        'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' +
        'box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 60px rgba(157,139,255,0.15),' +
          'inset 0 1px 0 rgba(255,240,200,0.08);' +
        'z-index:9996;opacity:0;pointer-events:none;' +
        'transform:translateY(-8px);transition:opacity .3s ease,transform .3s ease;' +
        'max-height:calc(100vh - 80px);overflow-y:auto}' +
      '.nav-panel.active{opacity:1;pointer-events:auto;transform:translateY(0)}' +
      '@media(min-width:500px){.nav-panel{top:120px;left:16px}}' +

      // Panel header
      '.nav-panel-header{font-family:\'Cinzel\',serif;font-size:9px;letter-spacing:.3em;' +
        'color:rgba(201,168,76,0.75);text-transform:uppercase;padding:2px 8px 12px;' +
        'display:flex;align-items:center;gap:10px}' +
      '.nav-panel-header::after{content:\'\';flex:1;height:1px;' +
        'background:linear-gradient(90deg,rgba(201,168,76,0.3),transparent)}' +

      // Chamber row
      '.nav-chamber{display:block;padding:12px 14px;border-radius:3px;' +
        'border:1px solid transparent;text-decoration:none;color:inherit;' +
        'transition:all .2s;margin-bottom:4px;cursor:pointer}' +
      '.nav-chamber:last-child{margin-bottom:0}' +
      '.nav-chamber.open-chamber:hover{background:rgba(201,168,76,0.05);' +
        'border-color:rgba(201,168,76,0.3)}' +
      '.nav-chamber.sealed{opacity:0.45;cursor:not-allowed}' +
      '.nav-chamber.current{background:rgba(157,139,255,0.08);' +
        'border-color:rgba(157,139,255,0.35);cursor:default}' +
      '.nav-chamber.current:hover{background:rgba(157,139,255,0.08);' +
        'border-color:rgba(157,139,255,0.35)}' +

      '.nav-chamber-top{display:flex;justify-content:space-between;align-items:baseline;' +
        'gap:10px;margin-bottom:3px}' +
      '.nav-chamber-name{font-family:\'Cinzel Decorative\',serif;font-size:16px;' +
        'font-weight:700;letter-spacing:.01em;color:#f0ece4;line-height:1.15}' +
      '.nav-chamber.sealed .nav-chamber-name{color:rgba(240,236,228,0.6)}' +
      '.nav-chamber-tag{font-family:\'DM Sans\',sans-serif;font-size:8px;' +
        'letter-spacing:.2em;text-transform:uppercase;padding:2px 7px;border-radius:2px;' +
        'white-space:nowrap;flex-shrink:0}' +
      '.nav-chamber-tag.current-tag{color:rgba(157,139,255,0.9);' +
        'border:1px solid rgba(157,139,255,0.4);background:rgba(157,139,255,0.08)}' +
      '.nav-chamber-tag.sealed-tag{color:rgba(240,236,228,0.4);' +
        'border:1px solid rgba(255,255,255,0.1);background:transparent}' +

      '.nav-chamber-func{font-family:\'Cinzel\',serif;font-size:10px;' +
        'letter-spacing:.2em;color:rgba(157,139,255,0.65);text-transform:uppercase}' +
      '.nav-chamber.sealed .nav-chamber-func{color:rgba(240,236,228,0.3)}' +

      '.nav-panel-footer{margin-top:10px;padding:10px 8px 2px;' +
        'border-top:1px solid rgba(255,255,255,0.06);' +
        'font-family:\'DM Sans\',sans-serif;font-size:10px;letter-spacing:.05em;' +
        'color:rgba(240,236,228,0.35);text-align:center}' +
      '.nav-panel-footer a{color:rgba(240,236,228,0.55);text-decoration:underline;' +
        'text-decoration-color:rgba(240,236,228,0.15)}' +
      '.nav-panel-footer a:hover{color:#f0ece4}' +
      '';
    document.head.appendChild(style);
  }

  function mount(){
    // Remove any existing elements (re-mount safe)
    var existingTrigger = document.querySelector('.nav-trigger');
    if(existingTrigger) existingTrigger.remove();
    var existingPanel = document.querySelector('.nav-panel');
    if(existingPanel) existingPanel.remove();
    var existingBackdrop = document.querySelector('.nav-backdrop');
    if(existingBackdrop) existingBackdrop.remove();

    // Trigger button with compass SVG
    triggerBtn = document.createElement('button');
    triggerBtn.className = 'nav-trigger';
    triggerBtn.setAttribute('aria-label', 'Open chamber navigation');
    triggerBtn.setAttribute('title', 'Navigate chambers');
    triggerBtn.innerHTML = '' +
      '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        // Outer circle
        '<circle cx="12" cy="12" r="9.5" stroke="rgba(201,168,76,0.85)" stroke-width="1"/>' +
        // Inner circle
        '<circle cx="12" cy="12" r="1.3" fill="rgba(201,168,76,0.95)"/>' +
        // Four cardinal points (N/E/S/W) — compass needle
        '<path d="M 12 3.5 L 13.2 11 L 12 12 L 10.8 11 Z" fill="rgba(201,168,76,0.95)"/>' +
        '<path d="M 12 20.5 L 10.8 13 L 12 12 L 13.2 13 Z" fill="rgba(201,168,76,0.45)"/>' +
        '<path d="M 3.5 12 L 11 13.2 L 12 12 L 11 10.8 Z" fill="rgba(201,168,76,0.45)"/>' +
        '<path d="M 20.5 12 L 13 10.8 L 12 12 L 13 13.2 Z" fill="rgba(201,168,76,0.45)"/>' +
      '</svg>' +
      '<span class="nav-trigger-label">Chambers</span>';
    triggerBtn.addEventListener('click', togglePanel);
    document.body.appendChild(triggerBtn);

    // Backdrop
    backdropEl = document.createElement('div');
    backdropEl.className = 'nav-backdrop';
    backdropEl.addEventListener('click', closePanel);
    document.body.appendChild(backdropEl);

    // Panel
    panelEl = document.createElement('div');
    panelEl.className = 'nav-panel';
    panelEl.setAttribute('role', 'navigation');
    panelEl.setAttribute('aria-label', 'Chamber navigation');

    var headerHtml = '<div class="nav-panel-header">Chambers</div>';
    var chambersHtml = CHAMBERS.map(function(ch){
      var isCurrent = ch.id === currentChamberId;
      var isSealed = ch.status === 'sealed';
      var classes = ['nav-chamber'];
      if(isSealed) classes.push('sealed');
      else if(isCurrent) classes.push('current');
      else classes.push('open-chamber');

      var tagHtml = '';
      if(isCurrent) tagHtml = '<span class="nav-chamber-tag current-tag">Here</span>';
      else if(isSealed) tagHtml = '<span class="nav-chamber-tag sealed-tag">Sealed</span>';

      var tag = ch.href && !isSealed && !isCurrent ? 'a' : 'div';
      var hrefAttr = (tag === 'a') ? ' href="' + ch.href + '"' : '';

      return '<' + tag + ' class="' + classes.join(' ') + '"' + hrefAttr + '>' +
        '<div class="nav-chamber-top">' +
          '<span class="nav-chamber-name">' + ch.name + '</span>' +
          tagHtml +
        '</div>' +
        '<div class="nav-chamber-func">' + ch.func + '</div>' +
      '</' + tag + '>';
    }).join('');

    var footerHtml = '<div class="nav-panel-footer">' +
      'Realms open as the architects finish their work.' +
      '</div>';

    panelEl.innerHTML = headerHtml + chambersHtml + footerHtml;
    document.body.appendChild(panelEl);

    // Keyboard: ESC closes
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isOpen) closePanel();
    });
  }

  function togglePanel(){
    if(isOpen) closePanel();
    else openPanel();
  }

  function openPanel(){
    if(!panelEl || !triggerBtn) return;
    isOpen = true;
    panelEl.classList.add('active');
    backdropEl.classList.add('active');
    triggerBtn.classList.add('open');
  }

  function closePanel(){
    if(!panelEl || !triggerBtn) return;
    isOpen = false;
    panelEl.classList.remove('active');
    backdropEl.classList.remove('active');
    triggerBtn.classList.remove('open');
  }

})();
