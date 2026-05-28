// ============================================================
// BUILD LOG (atlas.js) — most recent first
// scriptorium_persist | ga_scriptorium_unsealed flag persists Scriptorium open
//   state + atheneum-scriptorium path; applyPersistedState() reconciles CHAMBERS
//   on init so returning users see it unsealed. realms_unlocked also accepted
//   as fallback for users pre-dating the flag.
// atlas_scriptorium_unseal_moment | replaced 1.5s ambient drop-shadow with
//   three-stage moment: charge 700ms (focusing-dim + violet aura builds) →
//   break 500ms (flash overlay burst at Scriptorium position) → open 1200ms
//   (newly-opened settle pulse; dim lifts). Total 8.8s → 9.7s ceremony;
//   downstream beats shifted 900ms. mount() guarded against duplicate trigger.
// atlas_in_place_reveal | Atlas.runReveal(onComplete) public API;
//   already-unlocked guard; onComplete callback fires at ceremony end
//   so atheneum chain can continue to arrow hint. ~9s ceremony:
//   paper-fade-up → title → chamber/cosmic/star fade-in → Scriptorium
//   unseal flash + re-render → title fade-out → genie-suction →
//   trigger button mount with arrival glow. Sets realms_unlocked.
// atlas_reveal_ceremony | initial ceremony implementation; CSS injected
//   via injectStyles(); reRenderChamber helper; isRevealCeremonyRunning
//   flag prevents user interruption; closeAtlas null-guards triggerBtn.
// ============================================================

(function(){
  'use strict';

  // Chamber registry. Coordinates are percentages of map area (x: left, y: top).
  // Scale is asset render diameter in px on desktop. Atheneum href passes ?dive=1;
  // atheneum.html decides whether to honor it via ga_journey_v1. atlas_world_map brief.
  var CHAMBERS = [
    { id: 'atheneum',    name: 'The Atheneum',    func: 'Skill Mastery', href: '/atheneum.html?dive=1', asset: 'assets/chambers/chamber-atheneum.png',    status: 'open',   x: 50, y: 48, scale: 280 },
    { id: 'scriptorium', name: 'The Scriptorium', func: 'Journal',       href: '/scriptorium.html',     asset: 'assets/chambers/chamber-scriptorium.png', status: 'sealed', x: 30, y: 28, scale: 200 },
    { id: 'threshold',   name: 'The Threshold',   func: 'World Map',     href: '/threshold.html',       asset: 'assets/chambers/chamber-threshold.png',   status: 'open',   x: 18, y: 75, scale: 200 },
    { id: 'arcanium',    name: 'The Arcanium',    func: 'Library',       href: null,                    asset: 'assets/chambers/chamber-arcanium.png',    status: 'sealed', x: 80, y: 35, scale: 200 },
    { id: 'agora',       name: 'The Agora',       func: 'Community',     href: null,                    asset: 'assets/chambers/chamber-agora.png',       status: 'sealed', x: 75, y: 80, scale: 200 }
  ];

  // Pencil paths drawn between connected open chambers. Sealed chambers have no paths.
  // atheneumâ†”scriptorium added when scriptorium unseals post-Anchored ceremony.
  var CHAMBER_PATHS = [
    { from: 'atheneum', to: 'threshold' }
  ];

  var SCRIPTORIUM_FLAG = 'ga_scriptorium_unsealed';

  function applyPersistedState(){
    try {
      // ga_scriptorium_unsealed is written by the ceremony going forward.
      // realms_unlocked is the fallback for users who completed the ceremony
      // before that flag existed — both imply the Scriptorium is open.
      var scripUnsealed = localStorage.getItem(SCRIPTORIUM_FLAG) === 'true' ||
                          localStorage.getItem('realms_unlocked') === 'true';
      if(scripUnsealed){
        var scrip = CHAMBERS.find(function(c){ return c.id === 'scriptorium'; });
        if(scrip) scrip.status = 'open';
        // ensure the atheneum<->scriptorium path exists exactly once
        var hasPath = CHAMBER_PATHS.some(function(p){
          return (p.from === 'atheneum' && p.to === 'scriptorium') ||
                 (p.from === 'scriptorium' && p.to === 'atheneum');
        });
        if(!hasPath) CHAMBER_PATHS.push({ from: 'atheneum', to: 'scriptorium' });
      }
    } catch(e){}
  }

  // Cosmic objects â€” atmospheric assets populating the void between chambers.
  // Not navigable. Each asset is rendered as an <img> with onerror hiding it
  // if the file is missing, so operators can ship the map even before all
  // assets exist. Drop files into /assets/space/ to enable.
  // Position: percentage of paper area. Scale: rendered px width on desktop.
  // Cosmic objects â€” atmospheric assets in deep void.
  // Smaller and pushed to map edges so chambers physically dominate.
  // Comet stays static (visible mid-passage as captured by The Maker).
  var COSMIC_OBJECTS = [
    { id: 'comet',      asset: 'assets/space/space-comet.png',      x: 70, y: 8,  scale: 220, motion: null },
    { id: 'planet-1',   asset: 'assets/space/space-planet-1.png',   x: 95, y: 55, scale: 90,  motion: null },
    { id: 'planet-2',   asset: 'assets/space/space-planet-2.png',   x: 5,  y: 55, scale: 95,  motion: null },
    { id: 'artifact-1', asset: 'assets/space/space-artifact-1.png', x: 50, y: 95, scale: 75,  motion: null }
  ];

  var MAKERS_NOTES = [
    { text: "the cavity holds a smaller cavity",       x: 50, y: 35, context: 'always' },
    { text: "the void is itself a substance",          x: 38, y: 60, context: 'always' },
    { text: "all roads return to the Atheneum",        x: 58, y: 60, context: 'always' },
    { text: "before the Threshold there was no name",  x: 28, y: 86, context: 'always' },
    { text: "what falls inward becomes a sky",         x: 40, y: 30, context: 'always' },
    { text: "what enters the cavity does not return the same", x: 42, y: 56, context: 'always' },
    { text: "the way through is not around",           x: 48, y: 70, context: 'always' },
    { text: "between two waves, a doorway",            x: 22, y: 86, context: 'always' },
    { text: "what is sealed remembers what was kept",  x: 70, y: 25, context: 'always' },
    { text: "what burns in stillness is not fire",     x: 24, y: 60, context: 'always' },
    { text: "by the cavity, by the threshold, by the silent third", x: 50, y: 28, context: 'always' },
    { text: "open as the geode opens",                 x: 60, y: 38, context: 'always' },
    { text: "as above the cavity, so within",          x: 44, y: 24, context: 'always' },
    { text: "I drew what I could not enter",           x: 12, y: 24, context: 'always' },
    { text: "every star here was once a question",     x: 80, y: 50, context: 'always' },
    { text: "the third seal will open in its time",    x: 45, y: 90, context: 'arcanium-sealed' },
    { text: "still sealed, still listening",           x: 68, y: 28, context: 'arcanium-sealed' },
    { text: "what waits beyond is also waiting",       x: 78, y: 80, context: 'agora-sealed' },
    { text: "let the seal hold until the keeper is ready", x: 30, y: 22, context: 'scriptorium-sealed' },
    { text: "the comet returns when called",           x: 64, y: 14, context: 'always' },
    { text: "the artifact remains unread",             x: 50, y: 90, context: 'always' },
    { text: "no map is the territory; this one tries", x: 88, y: 70, context: 'always' }
  ];

  var currentChamberId = null;
  var isOpen = false;
  var triggerBtn = null;
  var overlayEl = null;
  var paperEl = null;
  var isRevealCeremonyRunning = false;

  var Atlas = {
    init: function(config){
      config = config || {};
      currentChamberId = config.current || null;
      applyPersistedState();
      injectStyles();
      mount();
    },
    initCeremony: function(){
      applyPersistedState();
      injectStyles();
      runRealmsUnlockCeremony();
    },
    open: function(){ openAtlas(); },
    close: function(){ closeAtlas(); },
    runReveal: function(onComplete){ runRealmsRevealCeremony(onComplete); }
  };
  window.Atlas = Atlas;

  function injectStyles(){
    if(document.getElementById('atlas-styles')) return;
    var style = document.createElement('style');
    style.id = 'atlas-styles';
    style.textContent = [
      '.atlas-trigger{position:fixed;top:68px;left:12px;height:36px;',
        'background:rgba(8,8,20,0.85);border:1px solid rgba(201,168,76,0.5);',
        'border-radius:20px;cursor:pointer;z-index:9997;padding:0 18px;',
        'display:inline-flex;align-items:center;gap:8px;',
        'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
        'transition:all .25s;outline:none;',
        'box-shadow:0 2px 14px rgba(0,0,0,0.4),0 0 18px rgba(201,168,76,0.15);',
        'font-family:\'Cinzel\',serif;font-size:10.5px;letter-spacing:.28em;',
        'color:rgba(240,236,228,0.88);text-transform:uppercase}',
      '.atlas-trigger:hover{border-color:rgba(201,168,76,0.85);',
        'color:#f0ece4;box-shadow:0 2px 14px rgba(0,0,0,0.4),0 0 22px rgba(201,168,76,0.5)}',
      '.atlas-trigger:focus,.atlas-trigger:focus-visible{outline:none}',
      '.atlas-trigger.open{border-color:rgba(201,168,76,0.75);background:rgba(30,22,12,0.85);color:#f0ece4}',
      '@media(min-width:500px){.atlas-trigger{top:74px;left:16px;font-size:11px;padding:0 22px}}',

      '.atlas-overlay{position:fixed;inset:0;z-index:9996;',
        'background:rgba(6,4,13,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);',
        'opacity:0;pointer-events:none;transition:opacity .5s ease;',
        'display:flex;align-items:center;justify-content:center;padding:40px 20px}',
      '.atlas-overlay.active{opacity:1;pointer-events:auto}',

      '.atlas-paper{position:relative;width:min(1200px,92vw);height:min(820px,82vh);',
        'background:radial-gradient(ellipse at 50% 45%,#ebe2cf 0%,#e6dcc6 70%,#c9bea4 100%),#ebe2cf;',
        'box-shadow:inset 0 0 100px rgba(80,60,30,0.14),0 30px 80px rgba(0,0,0,0.7),0 8px 20px rgba(0,0,0,0.5);',
        'border-radius:2px;overflow:hidden;',
        'transform:scale(0.94);opacity:0;',
        'transition:transform .7s cubic-bezier(0.32,0.72,0.24,1),opacity .6s ease}',
      '.atlas-overlay.active .atlas-paper{transform:scale(1);opacity:1}',

      '.atlas-grid,.atlas-grid-major{position:absolute;inset:0;pointer-events:none}',
      '.atlas-grid{background-image:linear-gradient(to right,rgba(120,130,145,0.14) 0.5px,transparent 0.5px),',
        'linear-gradient(to bottom,rgba(120,130,145,0.14) 0.5px,transparent 0.5px);',
        'background-size:24px 24px;z-index:1;opacity:0.85}',
      '.atlas-grid-major{background-image:linear-gradient(to right,rgba(120,130,145,0.20) 0.7px,transparent 0.7px),',
        'linear-gradient(to bottom,rgba(120,130,145,0.20) 0.7px,transparent 0.7px);',
        'background-size:120px 120px;z-index:2;opacity:0.7}',
      '.atlas-grain{position:absolute;inset:0;pointer-events:none;z-index:3;mix-blend-mode:multiply;opacity:0.4}',

      '.atlas-candle{position:absolute;width:520px;height:520px;border-radius:50%;',
        'background:radial-gradient(circle at center,rgba(255,200,100,0.30) 0%,rgba(244,180,100,0.18) 30%,rgba(244,180,100,0.06) 55%,transparent 80%);',
        'pointer-events:none;z-index:5;filter:blur(6px);',
        'transform:translate(-50%,-50%);left:50%;top:50%;opacity:0;',
        'transition:opacity .6s ease;mix-blend-mode:multiply}',
      '.atlas-paper:hover .atlas-candle{opacity:1}',

      '.atlas-dust{position:absolute;inset:0;pointer-events:none;z-index:5}',
      '.atlas-dust-mote{position:absolute;width:2px;height:2px;border-radius:50%;' +
        'background:radial-gradient(circle,#fff5d8 0%,#f4c673 60%,transparent 100%);' +
        'opacity:0;mix-blend-mode:screen;filter:blur(0.4px)}',

      '.atlas-stars{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}',
      '.atlas-star{position:absolute;display:block;pointer-events:none;opacity:0.85;will-change:opacity}',
      '.atlas-star-small{opacity:0.7}',
      '.atlas-star-medium{opacity:0.82}',
      '.atlas-star-large{opacity:0.95}',
      '@keyframes atlas-star-twinkle{0%,100%{opacity:0.4}50%{opacity:1}}',


      '.atlas-astrolabe{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3}',

      '.atlas-annotation-stage{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5.4;overflow:hidden}',
      '.atlas-annotation{position:absolute;font-family:\'Tangerine\',cursive;font-style:italic;font-weight:700;' +
        'font-size:22px;color:#1a1815;line-height:1.1;text-align:left;white-space:nowrap;' +
        'pointer-events:none;letter-spacing:0.01em;text-shadow:0 0 0.4px rgba(26,24,21,0.3);' +
        'transform-origin:left center}',
      '.atlas-annotation-char{display:inline-block;opacity:0;' +
        'transition:opacity 250ms cubic-bezier(0.2,0.8,0.4,1.0)}',
      '.atlas-annotation-char.is-written{opacity:0.72}',
      '.atlas-annotation-char.is-erasing{opacity:0;transition:opacity 350ms cubic-bezier(0.4,0,0.6,1)}',


      '.atlas-cosmic{position:absolute;transform:translate(-50%,-50%);pointer-events:none;z-index:4}',
      '.atlas-cosmic img{display:block;width:100%;height:auto;opacity:0.92}',
      '.atlas-cosmic-drift{position:absolute;inset:0;pointer-events:none;z-index:5}',
      '.atlas-cosmic-drifter{position:absolute;width:3px;height:3px;border-radius:50%;' +
        'background:radial-gradient(circle,#b8a8f0 0%,#7f77dd 50%,transparent 100%);' +
        'opacity:0;mix-blend-mode:multiply;filter:blur(0.6px)}',

      '.atlas-paths{position:absolute;inset:0;pointer-events:none;z-index:4}',

      '.atlas-chamber{position:absolute;transform:translate(-50%,-50%);',
        'background:none;border:none;padding:0;margin:0;',
        'display:flex;flex-direction:column;align-items:center;',
        'cursor:pointer;z-index:6;isolation:isolate;',
        'transition:transform .4s cubic-bezier(0.32,0.72,0.24,1),filter .4s ease}',
      '.atlas-chamber-art{position:relative;width:100%;display:block}',
      '.atlas-chamber-art img{display:block;width:100%;height:auto;transition:filter .4s ease}',
      '.atlas-threshold-void{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen;opacity:0.85}',
      '.atlas-arcanium-pulse{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}',
      '.atlas-atheneum-stars{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;mix-blend-mode:screen}',
      '.atlas-chamber.open{filter:drop-shadow(0 0 12px rgba(244,198,115,0.18)) drop-shadow(0 0 4px rgba(255,220,150,0.12))}',
      '.atlas-chamber.open:hover{transform:translate(-50%,-50%) scale(1.04);' +
        'filter:drop-shadow(0 0 24px rgba(244,198,115,0.45)) drop-shadow(0 0 8px rgba(255,220,150,0.35))}',
      '.atlas-chamber.current{filter:drop-shadow(0 0 16px rgba(244,198,115,0.30)) drop-shadow(0 0 6px rgba(255,220,150,0.22))}',
      '.atlas-chamber.current:hover{transform:translate(-50%,-50%) scale(1.04);' +
        'filter:drop-shadow(0 0 26px rgba(244,198,115,0.50)) drop-shadow(0 0 8px rgba(255,220,150,0.40))}',
      '.atlas-chamber.sealed{cursor:default;opacity:0.72;transition:opacity .4s ease,transform .4s cubic-bezier(0.32,0.72,0.24,1)}',
      '.atlas-chamber.sealed:hover{transform:translate(-50%,-50%) scale(1.015);opacity:0.85}',

      '.atlas-chamber.current .atlas-here-mark{display:block}',
      '.atlas-here-mark{display:none;position:absolute;top:42%;left:50%;',
        'transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;',
        'background:radial-gradient(circle,#ffe5a0 0%,#f4c673 50%,transparent 100%);',
        'animation:atlas-here-breathe 6s ease-in-out infinite;pointer-events:none;',
        'box-shadow:0 0 14px rgba(244,198,115,0.7);z-index:1}',
      '@keyframes atlas-here-breathe{',
        '0%,100%{opacity:0.65;transform:translate(-50%,-50%) scale(1)}',
        '50%{opacity:1;transform:translate(-50%,-50%) scale(1.25)}}',

      '.atlas-chamber-pill{margin-top:8px;display:inline-flex;flex-direction:column;' +
        'align-items:center;padding:5px 14px;border-radius:14px;' +
        'background:rgba(235,226,207,0.55);' +
        'border:1px solid rgba(26,24,21,0.18);' +
        'pointer-events:none;' +
        'transition:background .35s ease,border-color .35s ease}',
      '.atlas-chamber.open .atlas-chamber-pill{' +
        'border-color:rgba(201,168,76,0.40);' +
        'background:rgba(244,232,210,0.62)}',
      '.atlas-chamber.current .atlas-chamber-pill{' +
        'border-color:rgba(201,168,76,0.65);' +
        'background:rgba(252,238,212,0.78)}',
      '.atlas-chamber.open:hover .atlas-chamber-pill{' +
        'background:rgba(252,238,212,0.78);' +
        'border-color:rgba(201,168,76,0.65)}',
      '.atlas-chamber.sealed .atlas-chamber-pill{' +
        'background:rgba(220,212,194,0.45);' +
        'border-color:rgba(26,24,21,0.14)}',
      '.atlas-chamber-label{font-family:\'Cinzel Decorative\',serif;font-weight:700;' +
        'font-size:13px;letter-spacing:.10em;color:#1a1815;opacity:0.92;' +
        'text-align:center;white-space:nowrap;line-height:1.1}',
      '.atlas-chamber-func{margin-top:2px;font-family:\'Caveat\',cursive;font-weight:500;' +
        'font-size:13px;color:#4a4843;opacity:0.78;text-align:center;' +
        'white-space:nowrap;line-height:1}',
      '.atlas-chamber.sealed .atlas-chamber-label{opacity:0.62}',
      '.atlas-chamber.sealed .atlas-chamber-func{opacity:0.55}',
      '.atlas-chamber.sealed .atlas-chamber-func::after{content:\' \u00b7 sealed\';font-style:italic;opacity:0.85}',

      '.atlas-chamber-aura{position:absolute;top:50%;left:50%;' +
        'width:140%;height:140%;transform:translate(-50%,-50%);' +
        'border-radius:50%;pointer-events:none;z-index:-1;' +
        'background:radial-gradient(circle at center,' +
          'rgba(127,119,221,0.18) 0%,' +
          'rgba(127,119,221,0.10) 25%,' +
          'rgba(127,119,221,0.04) 50%,' +
          'transparent 70%);' +
        'animation:atlas-aura-breathe 10s ease-in-out infinite;' +
        'mix-blend-mode:multiply;filter:blur(12px)}',
      '.atlas-chamber-aura-hidden{display:none}',
      '.atlas-chamber-aura-current{' +
        'background:radial-gradient(circle at center,' +
          'rgba(127,119,221,0.28) 0%,' +
          'rgba(127,119,221,0.15) 25%,' +
          'rgba(127,119,221,0.05) 50%,' +
          'transparent 70%);' +
        'animation:atlas-aura-breathe-current 8s ease-in-out infinite}',
      '@keyframes atlas-aura-breathe{' +
        '0%,100%{opacity:0.55;transform:translate(-50%,-50%) scale(1)}' +
        '50%{opacity:0.85;transform:translate(-50%,-50%) scale(1.06)}}',
      '@keyframes atlas-aura-breathe-current{' +
        '0%,100%{opacity:0.7;transform:translate(-50%,-50%) scale(1)}' +
        '50%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}}',


      '.atlas-title{position:absolute;top:32px;left:50%;transform:translateX(-50%);z-index:7;',
        'font-family:\'Cinzel\',serif;font-weight:600;font-size:14px;',
        'letter-spacing:.42em;color:#1a1815;opacity:0.85;text-transform:uppercase;',
        'pointer-events:none;text-align:center;white-space:nowrap}',
      '.atlas-title::before,.atlas-title::after{content:\'Â·\';margin:0 14px;opacity:0.6}',

      '.atlas-compass{position:absolute;bottom:28px;left:32px;width:80px;height:80px;',
        'opacity:0.55;z-index:7;pointer-events:none}',

      '.atlas-maker{position:absolute;bottom:24px;right:32px;z-index:7;',
        'font-family:\'Caveat\',cursive;font-style:italic;font-size:13px;',
        'color:#4a4843;opacity:0.6;letter-spacing:.04em;pointer-events:none}',

      '.atlas-close{position:absolute;top:24px;right:24px;width:36px;height:36px;',
        'background:none;border:1px solid rgba(26,24,21,0.3);border-radius:50%;',
        'cursor:pointer;z-index:8;display:flex;align-items:center;justify-content:center;',
        'transition:all .25s;color:#1a1815;opacity:0.6;font-size:20px;line-height:1;',
        'font-family:\'Cinzel\',serif}',
      '.atlas-close:hover{opacity:1;border-color:rgba(26,24,21,0.7);background:rgba(26,24,21,0.05)}',

      '@media(max-width:680px){',
        '.atlas-paper{width:92vw;height:88vh;overflow-y:auto;padding:20px 16px}',
        '.atlas-paths,.atlas-compass{display:none}',
        '.atlas-title{position:relative;top:auto;left:auto;transform:none;margin:8px auto 24px}',
        '.atlas-maker{position:relative;bottom:auto;right:auto;text-align:right;margin-top:24px}',
        '.atlas-chambers-mobile{display:flex;flex-direction:column;gap:18px;align-items:center;padding-bottom:20px}',
        '.atlas-chamber{position:relative;left:auto!important;top:auto!important;transform:none!important;width:88%;max-width:280px}',
        '.atlas-chamber img{width:60%;margin:0 auto}',
        '.atlas-chamber.open:hover,.atlas-chamber.sealed:hover{transform:none!important}',
        '.atlas-chamber.open:active{transform:scale(0.98)!important}',
        '.atlas-chambers-desktop{display:none}',
      '}',
      '@media(min-width:681px){',
        '.atlas-chambers-mobile{display:none}',
        '.atlas-chambers-desktop{display:block;position:absolute;inset:0}',
      '}',

      '.ceremony-text{position:absolute;font-family:\'Tangerine\',cursive;font-style:italic;font-weight:700;' +
        'font-size:32px;color:#1a1815;opacity:0.85;white-space:nowrap;pointer-events:none;z-index:50}',
      '.ceremony-text .char{display:inline-block;opacity:0;transition:opacity 250ms cubic-bezier(0.2,0.8,0.4,1.0)}',
      '.ceremony-text .char.is-written{opacity:1}',
      '.ceremony-text.is-fading .char{opacity:0;transition:opacity 350ms cubic-bezier(0.4,0,0.6,1)}',
      '.atlas-chamber.ceremony-fade-in,.atlas-cosmic.ceremony-fade-in{animation:ceremonyFadeIn 1.5s ease-out forwards}',
      '@keyframes ceremonyFadeIn{from{opacity:0}to{opacity:1}}',
      '.atlas-chamber.scriptorium-unsealing{animation:scriptoriumUnsealFlash 2.5s ease-out forwards}',
      '@keyframes scriptoriumUnsealFlash{' +
        '0%{filter:drop-shadow(0 0 0 rgba(180,140,220,0))}' +
        '40%{filter:drop-shadow(0 0 36px rgba(180,140,220,0.85))}' +
        '100%{filter:drop-shadow(0 0 12px rgba(180,140,220,0.25))}}',

      '.atlas-overlay.atlas-ceremony-hidden .atlas-chamber,' +
      '.atlas-overlay.atlas-ceremony-hidden .atlas-cosmic,' +
      '.atlas-overlay.atlas-ceremony-hidden .atlas-star,' +
      '.atlas-overlay.atlas-ceremony-hidden .atlas-pulse,' +
      '.atlas-overlay.atlas-ceremony-hidden .atlas-annotation{opacity:0!important;pointer-events:none!important}',

      '.atlas-overlay.atlas-ceremony-revealing .atlas-chamber,' +
      '.atlas-overlay.atlas-ceremony-revealing .atlas-cosmic{animation:atlasCeremonyFadeInScale 1.2s ease-out forwards}',
      '.atlas-overlay.atlas-ceremony-revealing .atlas-star{animation:atlasCeremonyFadeIn 0.8s ease-out forwards}',
      '@keyframes atlasCeremonyFadeInScale{from{opacity:0;transform:translate(-50%,-50%) scale(0.92)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}',
      '@keyframes atlasCeremonyFadeIn{from{opacity:0}to{opacity:0.85}}',

      '.atlas-ceremony-title{position:absolute;top:8%;left:50%;' +
        'transform:translateX(-50%);' +
        'font-family:\'Cinzel Decorative\',serif;font-weight:600;font-size:38px;' +
        'color:#1a1815;letter-spacing:0.04em;' +
        'opacity:0;transition:opacity 1.1s ease-out;z-index:100;white-space:nowrap;pointer-events:none}',
      '.atlas-ceremony-title.is-visible{opacity:0.92}',

      // Stage 1 — Focusing dim: dims non-target elements, charge animation on Scriptorium
      '.atlas-overlay.atlas-ceremony-focusing .atlas-chamber:not(.atlas-ceremony-unseal-target),' +
      '.atlas-overlay.atlas-ceremony-focusing .atlas-cosmic,' +
      '.atlas-overlay.atlas-ceremony-focusing .atlas-star,' +
      '.atlas-overlay.atlas-ceremony-focusing .atlas-ceremony-title{animation:atlasRevealFocusDim 700ms ease-out forwards}',
      '@keyframes atlasRevealFocusDim{from{opacity:1}to{opacity:0.5}}',
      '.atlas-overlay.atlas-ceremony-focusing .atlas-chamber.atlas-ceremony-unseal-target{animation:atlasScripCharge 700ms ease-in forwards}',
      '@keyframes atlasScripCharge{' +
        '0%{opacity:1;filter:drop-shadow(0 0 4px rgba(180,140,220,0.2))}' +
        '100%{opacity:1;filter:drop-shadow(0 0 24px rgba(180,140,220,0.85)) drop-shadow(0 0 48px rgba(140,110,220,0.5))}}',
      // Stage 2 — Flash overlay: separate DOM element, radial-gradient violet/iridescent burst
      '.atlas-ceremony-flash{position:absolute;width:600px;height:600px;' +
        'margin-left:-300px;margin-top:-300px;border-radius:50%;pointer-events:none;z-index:50;' +
        'opacity:0;' +
        'background:radial-gradient(circle,rgba(255,245,230,0.95) 0%,rgba(216,180,255,0.85) 18%,' +
          'rgba(140,110,220,0.55) 40%,rgba(80,50,160,0.25) 65%,rgba(40,25,90,0) 100%);' +
        'mix-blend-mode:screen;transform:scale(0.3)}',
      '.atlas-ceremony-flash.is-firing{animation:atlasScripFlash 500ms cubic-bezier(0.2,0.7,0.3,1) forwards}',
      '@keyframes atlasScripFlash{' +
        '0%{opacity:0;transform:scale(0.3)}' +
        '35%{opacity:1;transform:scale(1.0)}' +
        '100%{opacity:0;transform:scale(1.4)}}',
      // Stage 3 — Open: newly-opened settle pulse after re-render
      '.atlas-chamber.atlas-ceremony-newly-opened{animation:atlasScripNewlyOpened 1.2s ease-out forwards}',
      '@keyframes atlasScripNewlyOpened{' +
        '0%{opacity:1;filter:drop-shadow(0 0 24px rgba(180,140,220,0.7))}' +
        '100%{opacity:1;filter:drop-shadow(0 0 12px rgba(180,140,220,0.25))}}',
      // Restore dim — animate non-target elements back to full opacity
      '.atlas-overlay.atlas-ceremony-opening .atlas-chamber:not(.atlas-ceremony-unseal-target),' +
      '.atlas-overlay.atlas-ceremony-opening .atlas-cosmic,' +
      '.atlas-overlay.atlas-ceremony-opening .atlas-star,' +
      '.atlas-overlay.atlas-ceremony-opening .atlas-ceremony-title{animation:atlasRevealFocusRestore 400ms ease-out forwards}',
      '@keyframes atlasRevealFocusRestore{from{opacity:0.5}to{opacity:1}}',

      '.atlas-overlay.atlas-ceremony-suctioning{animation:atlasGenieSuction 1.4s ease-in forwards;transform-origin:12px 68px}',
      '@keyframes atlasGenieSuction{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0.02) translate(-40vw,-40vh)}}',
      '@media(min-width:500px){.atlas-overlay.atlas-ceremony-suctioning{transform-origin:16px 74px}}',

      '.atlas-trigger.atlas-ceremony-arrived{animation:atlasTriggerArrival 1.4s ease-out}',
      '@keyframes atlasTriggerArrival{' +
        '0%{box-shadow:0 0 0 rgba(201,168,76,0);border-color:rgba(201,168,76,0.4)}' +
        '30%{box-shadow:0 0 24px rgba(201,168,76,0.7);border-color:rgba(201,168,76,1)}' +
        '100%{box-shadow:0 0 0 rgba(201,168,76,0);border-color:rgba(201,168,76,0.4)}}'

    ].join('');
    document.head.appendChild(style);
  }

  function mount(){
    if(localStorage.getItem('realms_unlocked') !== 'true') return;
    if(triggerBtn && triggerBtn.parentNode){ triggerBtn.parentNode.removeChild(triggerBtn); }
    triggerBtn = document.createElement('button');
    triggerBtn.className = 'atlas-trigger';
    triggerBtn.setAttribute('aria-label','Open the Atlas');
    triggerBtn.textContent = 'Atlas';
    triggerBtn.addEventListener('click', function(){ isOpen ? closeAtlas() : openAtlas(); });
    document.body.appendChild(triggerBtn);
  }

  function buildOverlay(){
    if(overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.className = 'atlas-overlay';
    overlayEl.setAttribute('aria-hidden','true');

    overlayEl.innerHTML = [
      '<div class="atlas-paper" id="atlasPaper">',
        '<div class="atlas-grid"></div>',
        '<div class="atlas-grid-major"></div>',
        '<svg class="atlas-grain" preserveAspectRatio="none" viewBox="0 0 100 100">',
          '<defs><filter id="atlas-grain-f">',
            '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11"/>',
            '<feColorMatrix values="0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0.5 0"/>',
          '</filter></defs>',
          '<rect width="100" height="100" filter="url(#atlas-grain-f)"/>',
        '</svg>',
        '<div class="atlas-candle" id="atlasCandle"></div>',
        buildStarField(),
        buildAstrolabeMarks(),
        buildCosmicObjects(false),
        buildCosmicDrift(),
        buildPaperDust(),
        buildAnnotationStage(),
        '<div class="atlas-title">Evermark</div>',
        '<svg class="atlas-compass" viewBox="0 0 80 80">',
          '<defs><filter id="atlas-pencil-c"><feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.0"/></filter></defs>',
          '<g filter="url(#atlas-pencil-c)" stroke="#1a1815" fill="none" stroke-linecap="round" stroke-width="0.8">',
            '<circle cx="40" cy="40" r="32"/>',
            '<circle cx="40" cy="40" r="26" stroke-width="0.5" opacity="0.6"/>',
            '<line x1="40" y1="6" x2="40" y2="74"/>',
            '<line x1="6" y1="40" x2="74" y2="40"/>',
            '<line x1="16" y1="16" x2="64" y2="64" stroke-width="0.5" opacity="0.6"/>',
            '<line x1="16" y1="64" x2="64" y2="16" stroke-width="0.5" opacity="0.6"/>',
            '<path d="M 36 8 L 40 2 L 44 8 L 40 6 Z" fill="#1a1815"/>',
            '<circle cx="40" cy="40" r="2" fill="#1a1815"/>',
          '</g>',
          '<text x="40" y="86" font-family="Cinzel" font-size="6" letter-spacing="0.2em" fill="#1a1815" opacity="0.6" text-anchor="middle">N</text>',
        '</svg>',
        '<div class="atlas-maker">â€” drawn by The Maker</div>',
        '<button class="atlas-close" id="atlasClose" aria-label="Close Atlas">\u00d7</button>',
        buildPathsSVG(),
        '<div class="atlas-chambers-desktop">' + buildChambersHTML(false) + '</div>',
        '<div class="atlas-chambers-mobile">' + buildChambersHTML(true) + '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlayEl);
    paperEl = overlayEl.querySelector('#atlasPaper');

    overlayEl.querySelector('#atlasClose').addEventListener('click', closeAtlas);
    overlayEl.addEventListener('click', function(e){ if(e.target === overlayEl) closeAtlas(); });
    document.addEventListener('keydown', function(e){ if(isOpen && e.key === 'Escape') closeAtlas(); });

    var candle = overlayEl.querySelector('#atlasCandle');
    paperEl.addEventListener('mousemove', function(e){
      var rect = paperEl.getBoundingClientRect();
      candle.style.left = (e.clientX - rect.left) + 'px';
      candle.style.top  = (e.clientY - rect.top)  + 'px';
    });

    overlayEl.querySelectorAll('.atlas-chamber').forEach(function(el){
      el.addEventListener('click', function(){
        var id = el.getAttribute('data-chamber-id');
        var ch = CHAMBERS.find(function(c){ return c.id === id; });
        if(!ch || ch.status !== 'open' || !ch.href) return;
        if(id === currentChamberId){ closeAtlas(); return; }
        window.location.href = ch.href;
      });
    });
  }

  function buildStarField(){
    var stars = [
      // SMALL stars (38)
      { x: 60, y: 8,  size: 24, variant: 'small', rot: 22,  twinkle: true,  dur: 5.5 },
      { x: 64, y: 14, size: 18, variant: 'small', rot: 0,   twinkle: false },
      { x: 70, y: 10, size: 22, variant: 'small', rot: 45,  twinkle: true,  dur: 6.8 },
      { x: 82, y: 18, size: 20, variant: 'small', rot: 67,  twinkle: false },
      { x: 88, y: 22, size: 18, variant: 'small', rot: 22,  twinkle: true,  dur: 4.2 },
      { x: 95, y: 50, size: 22, variant: 'small', rot: 0,   twinkle: false },
      { x: 97, y: 65, size: 18, variant: 'small', rot: 45,  twinkle: false },
      { x: 35, y: 68, size: 22, variant: 'small', rot: 22,  twinkle: false },
      { x: 42, y: 82, size: 24, variant: 'small', rot: 67,  twinkle: false },
      { x: 50, y: 95, size: 18, variant: 'small', rot: 0,   twinkle: true,  dur: 6.1 },
      { x: 58, y: 88, size: 22, variant: 'small', rot: 45,  twinkle: false },
      { x: 62, y: 95, size: 20, variant: 'small', rot: 22,  twinkle: false },
      { x: 4,  y: 12, size: 24, variant: 'small', rot: 0,   twinkle: false },
      { x: 6,  y: 28, size: 20, variant: 'small', rot: 67,  twinkle: true,  dur: 5.5 },
      { x: 3,  y: 50, size: 22, variant: 'small', rot: 22,  twinkle: false },
      { x: 5,  y: 90, size: 22, variant: 'small', rot: 45,  twinkle: false },
      { x: 88, y: 60, size: 24, variant: 'small', rot: 0,   twinkle: false },
      { x: 92, y: 65, size: 18, variant: 'small', rot: 67,  twinkle: true,  dur: 4.8 },
      { x: 94, y: 70, size: 18, variant: 'small', rot: 22,  twinkle: false },
      { x: 38, y: 14, size: 18, variant: 'small', rot: 45,  twinkle: false },
      { x: 22, y: 50, size: 18, variant: 'small', rot: 22,  twinkle: false },
      { x: 14, y: 60, size: 20, variant: 'small', rot: 0,   twinkle: false },
      { x: 8,  y: 5,  size: 22, variant: 'small', rot: 67,  twinkle: false },
      { x: 14, y: 8,  size: 20, variant: 'small', rot: 22,  twinkle: true,  dur: 5.3 },
      { x: 30, y: 5,  size: 18, variant: 'small', rot: 0,   twinkle: false },
      { x: 56, y: 22, size: 20, variant: 'small', rot: 45,  twinkle: false },
      { x: 28, y: 92, size: 20, variant: 'small', rot: 67,  twinkle: false },
      { x: 78, y: 92, size: 22, variant: 'small', rot: 22,  twinkle: false },
      { x: 4,  y: 75, size: 18, variant: 'small', rot: 0,   twinkle: false },
      { x: 25, y: 16, size: 18, variant: 'small', rot: 45,  twinkle: true,  dur: 4.5 },
      { x: 82, y: 38, size: 20, variant: 'small', rot: 22,  twinkle: false },
      { x: 12, y: 42, size: 18, variant: 'small', rot: 67,  twinkle: false },
      { x: 88, y: 10, size: 18, variant: 'small', rot: 0,   twinkle: false },
      { x: 22, y: 32, size: 20, variant: 'small', rot: 45,  twinkle: true,  dur: 5.8 },
      { x: 50, y: 50, size: 18, variant: 'small', rot: 22,  twinkle: false },
      { x: 74, y: 80, size: 20, variant: 'small', rot: 67,  twinkle: false },
      { x: 38, y: 30, size: 18, variant: 'small', rot: 0,   twinkle: true,  dur: 4.8 },
      { x: 66, y: 76, size: 18, variant: 'small', rot: 22,  twinkle: false },
      // MEDIUM stars (10)
      { x: 76, y: 6,  size: 38, variant: 'medium', rot: 0,   twinkle: false },
      { x: 42, y: 8,  size: 36, variant: 'medium', rot: 22,  twinkle: true,  dur: 7.0 },
      { x: 18, y: 4,  size: 40, variant: 'medium', rot: 45,  twinkle: false },
      { x: 93, y: 78, size: 42, variant: 'medium', rot: 67,  twinkle: true,  dur: 5.0 },
      { x: 90, y: 72, size: 38, variant: 'medium', rot: 0,   twinkle: false },
      { x: 28, y: 30, size: 36, variant: 'medium', rot: 22,  twinkle: true,  dur: 6.5 },
      { x: 72, y: 45, size: 38, variant: 'medium', rot: 45,  twinkle: true,  dur: 6.5 },
      { x: 8,  y: 82, size: 38, variant: 'medium', rot: 0,   twinkle: false },
      { x: 86, y: 30, size: 36, variant: 'medium', rot: 67,  twinkle: false },
      { x: 32, y: 76, size: 38, variant: 'medium', rot: 22,  twinkle: false },
      // LARGE showpiece stars (4)
      { x: 96, y: 38, size: 64, variant: 'large', rot: 0,   twinkle: true,  dur: 6.0 },
      { x: 14, y: 22, size: 60, variant: 'large', rot: 22,  twinkle: false },
      { x: 80, y: 88, size: 62, variant: 'large', rot: 45,  twinkle: true,  dur: 7.5 },
      { x: 16, y: 70, size: 58, variant: 'large', rot: 67,  twinkle: false }
    ];

    var html = '<div class="atlas-stars">';
    stars.forEach(function(s, i){
      var twinkleStyle = '';
      if(s.twinkle){
        twinkleStyle = 'animation:atlas-star-twinkle ' + s.dur + 's ease-in-out infinite;' +
                       'animation-delay:' + (-i * 0.3) + 's;';
      }
      html += '<img class="atlas-star atlas-star-' + s.variant + '" ' +
                'src="/assets/space/star-' + s.variant + '.png" alt="" ' +
                'style="left:' + s.x + '%;top:' + s.y + '%;' +
                       'width:' + s.size + 'px;height:' + s.size + 'px;' +
                       'transform:translate(-50%,-50%) rotate(' + s.rot + 'deg);' +
                       twinkleStyle + '" ' +
                'onerror="this.style.display=\'none\'" loading="lazy"/>';
    });
    html += '</div>';
    return html;
  }

  function buildAstrolabeMarks(){
    return [
      '<svg class="atlas-astrolabe" viewBox="0 0 100 100" preserveAspectRatio="none">',
        '<defs>',
          '<filter id="atlas-astro-pencil" x="-3%" y="-3%" width="106%" height="106%">',
            '<feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="9"/>',
            '<feDisplacementMap in="SourceGraphic" scale="0.5"/>',
          '</filter>',
        '</defs>',
        '<g filter="url(#atlas-astro-pencil)" stroke="#1a1815" fill="none" stroke-linecap="round" opacity="0.35">',

          '<circle cx="9" cy="44" r="2" stroke-width="0.2"/>',
          '<line x1="7" y1="44" x2="11" y2="44" stroke-width="0.2"/>',
          '<line x1="9" y1="42" x2="9" y2="46" stroke-width="0.2"/>',

          '<line x1="93" y1="55" x2="97" y2="55" stroke-width="0.2"/>',
          '<line x1="95" y1="53" x2="95" y2="57" stroke-width="0.2"/>',
          '<circle cx="95" cy="55" r="0.6" stroke-width="0.15"/>',

        '</g>',
      '</svg>'
    ].join('');
  }

  function buildCosmicObjects(isMobile){
    if(isMobile) return '';
    return COSMIC_OBJECTS.map(function(obj){
      var motionClass = obj.motion ? ' atlas-cosmic-' + obj.motion : '';
      return '<div class="atlas-cosmic' + motionClass + '" ' +
               'style="left:' + obj.x + '%;top:' + obj.y + '%;width:' + obj.scale + 'px" ' +
               'data-cosmic-id="' + obj.id + '">' +
               '<img src="' + obj.asset + '" alt="" ' +
                    'onerror="this.parentElement.style.display=\'none\'" ' +
                    'loading="lazy"/>' +
             '</div>';
    }).join('');
  }


  function buildCosmicDrift(){
    var drifters = [
      { x: 70, y: 30, dur: 92,  dx: -45, dy: 25,  delay: 0    },
      { x: 25, y: 25, dur: 105, dx: 50,  dy: -10, delay: -25  },
      { x: 85, y: 75, dur: 88,  dx: -55, dy: -30, delay: -52  },
      { x: 15, y: 65, dur: 110, dx: 60,  dy: -40, delay: -38  },
      { x: 55, y: 85, dur: 97,  dx: 25,  dy: -55, delay: -70  },
      { x: 45, y: 12, dur: 86,  dx: -30, dy: 50,  delay: -15  },
      { x: 78, y: 18, dur: 118, dx: -65, dy: 40,  delay: -88  },
      { x: 8,  y: 42, dur: 95,  dx: 70,  dy: 20,  delay: -42  },
      { x: 92, y: 55, dur: 102, dx: -50, dy: 30,  delay: -60  },
      { x: 35, y: 92, dur: 124, dx: 40,  dy: -65, delay: -110 }
    ];
    var html = '<div class="atlas-cosmic-drift">';
    drifters.forEach(function(d, i){
      html += '<div class="atlas-cosmic-drifter" style="' +
        'left:' + d.x + '%;top:' + d.y + '%;' +
        'animation:atlas-drift-' + i + ' ' + d.dur + 's ease-in-out infinite;' +
        'animation-delay:' + d.delay + 's' +
      '"></div>';
    });
    html += '<style>';
    drifters.forEach(function(d, i){
      html += '@keyframes atlas-drift-' + i + '{' +
        '0%,100%{transform:translate(0,0);opacity:0}' +
        '20%{opacity:0.5}' +
        '50%{transform:translate(' + d.dx + 'vw,' + d.dy + 'vh);opacity:0.6}' +
        '80%{opacity:0.4}' +
      '}';
    });
    html += '</style>';
    html += '</div>';
    return html;
  }

  function buildPaperDust(){
    var motes = [
      { x: 15, y: 20, dur: 47, dx: 70,  dy: 10,  delay: 0   },
      { x: 80, y: 15, dur: 53, dx: -65, dy: 20,  delay: -8  },
      { x: 25, y: 60, dur: 61, dx: 50,  dy: -15, delay: -22 },
      { x: 70, y: 70, dur: 49, dx: -55, dy: 5,   delay: -14 },
      { x: 50, y: 30, dur: 67, dx: 30,  dy: 40,  delay: -36 },
      { x: 90, y: 50, dur: 55, dx: -75, dy: -25, delay: -19 },
      { x: 10, y: 80, dur: 71, dx: 60,  dy: -50, delay: -44 },
      { x: 60, y: 10, dur: 59, dx: -20, dy: 60,  delay: -27 }
    ];
    var html = '<div class="atlas-dust">';
    motes.forEach(function(m, i){
      html += '<div class="atlas-dust-mote" style="' +
        'left:' + m.x + '%;top:' + m.y + '%;' +
        'animation:atlas-dust-' + i + ' ' + m.dur + 's ease-in-out infinite;' +
        'animation-delay:' + m.delay + 's' +
      '"></div>';
    });
    html += '<style>';
    motes.forEach(function(m, i){
      html += '@keyframes atlas-dust-' + i + '{' +
        '0%,100%{transform:translate(0,0);opacity:0}' +
        '20%{opacity:0.45}' +
        '50%{transform:translate(' + m.dx + 'px,' + m.dy + 'px);opacity:0.55}' +
        '80%{opacity:0.4}' +
      '}';
    });
    html += '</style>';
    html += '</div>';
    return html;
  }

  function buildPathsSVG(){
    if(!CHAMBER_PATHS.length) return '<svg class="atlas-paths"></svg>';
    var lookup = {};
    CHAMBERS.forEach(function(c){ lookup[c.id] = c; });
    var paths = CHAMBER_PATHS.map(function(p){
      var a = lookup[p.from], b = lookup[p.to];
      if(!a || !b) return '';
      var midX = (a.x + b.x) / 2;
      var midY = (a.y + b.y) / 2 + 4;
      return '<path d="M ' + a.x + ' ' + a.y + ' Q ' + midX + ' ' + midY + ' ' + b.x + ' ' + b.y + '" ' +
             'stroke="#1a1815" stroke-width="0.18" fill="none" stroke-dasharray="0.3,0.6" opacity="0.28" stroke-linecap="round"/>';
    }).join('');
    return '<svg class="atlas-paths" viewBox="0 0 100 100" preserveAspectRatio="none">' +
           '<defs><filter id="atlas-path-pencil" x="-3%" y="-3%" width="106%" height="106%">' +
             '<feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="2" seed="5"/>' +
             '<feDisplacementMap in="SourceGraphic" scale="0.4"/>' +
           '</filter></defs>' +
           '<g filter="url(#atlas-path-pencil)">' + paths + '</g>' +
           '</svg>';
  }

  function buildThresholdVoidLayer(){
    return [
      '<svg class="atlas-threshold-void" viewBox="0 0 100 100" preserveAspectRatio="none">',
        '<defs>',
          '<linearGradient id="atlas-void-grad" x1="0%" y1="0%" x2="0%" y2="100%">',
            '<stop offset="0%" stop-color="#9586e8" stop-opacity="0.0">',
              '<animate attributeName="stop-color" values="#9586e8;#b8a8f0;#7f77dd;#9586e8" dur="11s" repeatCount="indefinite"/>',
            '</stop>',
            '<stop offset="35%" stop-color="#b8a8f0" stop-opacity="0.45">',
              '<animate attributeName="stop-color" values="#b8a8f0;#e8def8;#9586e8;#b8a8f0" dur="11s" repeatCount="indefinite"/>',
              '<animate attributeName="stop-opacity" values="0.45;0.6;0.45" dur="9s" repeatCount="indefinite"/>',
            '</stop>',
            '<stop offset="65%" stop-color="#7f77dd" stop-opacity="0.5">',
              '<animate attributeName="stop-color" values="#7f77dd;#9586e8;#6c63c8;#7f77dd" dur="11s" repeatCount="indefinite"/>',
              '<animate attributeName="stop-opacity" values="0.5;0.65;0.5" dur="9s" repeatCount="indefinite"/>',
            '</stop>',
            '<stop offset="100%" stop-color="#3a2a78" stop-opacity="0.0">',
              '<animate attributeName="stop-color" values="#3a2a78;#5a4ea8;#3a2a78" dur="11s" repeatCount="indefinite"/>',
            '</stop>',
          '</linearGradient>',
        '</defs>',
        '<rect x="42" y="28" width="16" height="64" fill="url(#atlas-void-grad)" rx="4"/>',
        '<circle cx="48" cy="80" r="0.6" fill="#fff0f8" opacity="0.85">',
          '<animate attributeName="cy" values="92;30" dur="8s" repeatCount="indefinite" begin="0s"/>',
          '<animate attributeName="opacity" values="0;0.85;0" dur="8s" repeatCount="indefinite" begin="0s"/>',
        '</circle>',
        '<circle cx="52" cy="70" r="0.5" fill="#e8def8" opacity="0.7">',
          '<animate attributeName="cy" values="92;30" dur="9.5s" repeatCount="indefinite" begin="-2.3s"/>',
          '<animate attributeName="opacity" values="0;0.7;0" dur="9.5s" repeatCount="indefinite" begin="-2.3s"/>',
        '</circle>',
        '<circle cx="46" cy="60" r="0.4" fill="#fff0f8" opacity="0.6">',
          '<animate attributeName="cy" values="92;30" dur="11s" repeatCount="indefinite" begin="-5.5s"/>',
          '<animate attributeName="opacity" values="0;0.6;0" dur="11s" repeatCount="indefinite" begin="-5.5s"/>',
        '</circle>',
        '<circle cx="50" cy="55" r="0.7" fill="#e8def8" opacity="0.75">',
          '<animate attributeName="cy" values="92;28" dur="7.5s" repeatCount="indefinite" begin="-1.2s"/>',
          '<animate attributeName="opacity" values="0;0.75;0" dur="7.5s" repeatCount="indefinite" begin="-1.2s"/>',
        '</circle>',
        '<circle cx="54" cy="65" r="0.4" fill="#fff0f8" opacity="0.65">',
          '<animate attributeName="cy" values="92;28" dur="10s" repeatCount="indefinite" begin="-4.1s"/>',
          '<animate attributeName="opacity" values="0;0.65;0" dur="10s" repeatCount="indefinite" begin="-4.1s"/>',
        '</circle>',
      '</svg>'
    ].join('');
  }

  function buildArcaniumPulseLayer(){
    return [
      '<svg class="atlas-arcanium-pulse" viewBox="0 0 100 100" preserveAspectRatio="none">',
        '<defs>',
          '<radialGradient id="atlas-arc-pulse-grad" cx="50%" cy="50%" r="35%">',
            '<stop offset="0%" stop-color="#b8a8f0" stop-opacity="0.0"/>',
            '<stop offset="40%" stop-color="#9586e8" stop-opacity="0.0"/>',
            '<stop offset="100%" stop-color="#7f77dd" stop-opacity="0.0"/>',
          '</radialGradient>',
        '</defs>',
        '<ellipse cx="50" cy="50" rx="22" ry="40" fill="url(#atlas-arc-pulse-grad)">',
          '<animate attributeName="opacity" values="0.0;0.55;0.0" dur="9s" repeatCount="indefinite"/>',
        '</ellipse>',
        '<rect x="46" y="22" width="8" height="56" fill="#b8a8f0" opacity="0" rx="2">',
          '<animate attributeName="opacity" values="0;0.32;0" dur="9s" repeatCount="indefinite"/>',
        '</rect>',
      '</svg>'
    ].join('');
  }

  function buildAtheneumStarsLayer(){
    return [
      '<svg class="atlas-atheneum-stars" viewBox="0 0 100 100" preserveAspectRatio="none">',
        '<circle cx="44" cy="35" r="0.4" fill="#fff5d8" opacity="0">',
          '<animate attributeName="opacity" values="0;0.9;0" dur="4.5s" repeatCount="indefinite" begin="0s"/>',
        '</circle>',
        '<circle cx="56" cy="32" r="0.5" fill="#fff5d8" opacity="0">',
          '<animate attributeName="opacity" values="0;0.85;0" dur="6s" repeatCount="indefinite" begin="-1.8s"/>',
        '</circle>',
        '<circle cx="50" cy="38" r="0.35" fill="#e8def8" opacity="0">',
          '<animate attributeName="opacity" values="0;0.7;0" dur="5s" repeatCount="indefinite" begin="-3.2s"/>',
        '</circle>',
        '<circle cx="61" cy="40" r="0.4" fill="#fff5d8" opacity="0">',
          '<animate attributeName="opacity" values="0;0.8;0" dur="7s" repeatCount="indefinite" begin="-4.5s"/>',
        '</circle>',
        '<circle cx="40" cy="42" r="0.3" fill="#e8def8" opacity="0">',
          '<animate attributeName="opacity" values="0;0.6;0" dur="5.8s" repeatCount="indefinite" begin="-2.4s"/>',
        '</circle>',
      '</svg>'
    ].join('');
  }

  function buildChambersHTML(isMobile){
    return CHAMBERS.map(function(ch){
      var classes = ['atlas-chamber', ch.status];
      if(ch.id === currentChamberId) classes.push('current');
      var posStyle = isMobile ? '' : ' style="left:' + ch.x + '%;top:' + ch.y + '%;width:' + ch.scale + 'px"';
      var motionLayer = '';
      if(ch.id === 'threshold'){
        motionLayer = buildThresholdVoidLayer();
      } else if(ch.id === 'arcanium'){
        motionLayer = buildArcaniumPulseLayer();
      } else if(ch.id === 'atheneum'){
        motionLayer = buildAtheneumStarsLayer();
      }
      var auraClass = ch.status === 'open' ? 'atlas-chamber-aura' : 'atlas-chamber-aura atlas-chamber-aura-hidden';
      if(ch.id === currentChamberId) auraClass += ' atlas-chamber-aura-current';

      return '<button class="' + classes.join(' ') + '"' + posStyle + ' data-chamber-id="' + ch.id + '" aria-label="' + ch.name + (ch.status === 'sealed' ? ' (sealed)' : '') + '">' +
               '<div class="' + auraClass + '"></div>' +
               '<div class="atlas-chamber-art">' +
                 '<img src="' + ch.asset + '" alt="' + ch.name + '" loading="lazy"/>' +
                 motionLayer +
               '</div>' +
               '<div class="atlas-here-mark"></div>' +
               '<div class="atlas-chamber-pill">' +
                 '<div class="atlas-chamber-label">' + ch.name + '</div>' +
                 '<div class="atlas-chamber-func">' + ch.func + '</div>' +
               '</div>' +
             '</button>';
    }).join('');
  }


  function buildAnnotationStage(){
    return '<div class="atlas-annotation-stage"></div>';
  }

  var annotationSchedulerStarted = false;
  var annotationSchedulerTimeout = null;
  var lastNoteIndex = -1;

  function startAnnotationScheduler(){
    if(annotationSchedulerStarted) return;
    annotationSchedulerStarted = true;
    annotationSchedulerTimeout = setTimeout(function(){
      fireAnnotation();
      scheduleNextAnnotation();
    }, 2500);
  }

  function stopAnnotationScheduler(){
    annotationSchedulerStarted = false;
    if(annotationSchedulerTimeout){
      clearTimeout(annotationSchedulerTimeout);
      annotationSchedulerTimeout = null;
    }
  }

  function scheduleNextAnnotation(){
    if(!annotationSchedulerStarted) return;
    var delay = 10000 + Math.random() * 8000;
    annotationSchedulerTimeout = setTimeout(function(){
      fireAnnotation();
      scheduleNextAnnotation();
    }, delay);
  }

  function isContextValid(context){
    if(context === 'always') return true;
    if(context === 'arcanium-sealed'){
      var a = CHAMBERS.find(function(c){ return c.id === 'arcanium'; });
      return a && a.status === 'sealed';
    }
    if(context === 'scriptorium-sealed'){
      var s = CHAMBERS.find(function(c){ return c.id === 'scriptorium'; });
      return s && s.status === 'sealed';
    }
    if(context === 'agora-sealed'){
      var ag = CHAMBERS.find(function(c){ return c.id === 'agora'; });
      return ag && ag.status === 'sealed';
    }
    return true;
  }

  function getExclusionRects(){
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var MARGIN = 3;
    var rects = [];
    function pushRect(item){
      var halfW = (item.scale / 2) / vw * 100;
      var halfH = (item.scale / 2) / vh * 100;
      rects.push({
        left:   item.x - halfW - MARGIN,
        right:  item.x + halfW + MARGIN,
        top:    item.y - halfH - MARGIN,
        bottom: item.y + halfH + MARGIN
      });
    }
    CHAMBERS.forEach(pushRect);
    COSMIC_OBJECTS.forEach(pushRect);
    return rects;
  }

  function noteCollides(note, exclusionRects){
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var CHAR_WIDTH_PX  = 8;
    var PHRASE_HEIGHT_PX = 28;
    var widthPct  = (note.text.length * CHAR_WIDTH_PX) / vw * 100;
    var heightPct = PHRASE_HEIGHT_PX / vh * 100;
    var phraseRect = {
      left:   note.x,
      right:  note.x + widthPct,
      top:    note.y - heightPct / 2,
      bottom: note.y + heightPct / 2
    };
    for(var i = 0; i < exclusionRects.length; i++){
      var ex = exclusionRects[i];
      if(phraseRect.left < ex.right && phraseRect.right > ex.left &&
         phraseRect.top  < ex.bottom && phraseRect.bottom > ex.top){
        return true;
      }
    }
    return false;
  }

  function fireAnnotation(){
    if(!overlayEl || !overlayEl.classList.contains('active')) return;
    var stage = overlayEl.querySelector('.atlas-annotation-stage');
    if(!stage) return;
    var validNotes = MAKERS_NOTES.filter(function(note, i){
      return isContextValid(note.context) && i !== lastNoteIndex;
    });
    if(validNotes.length === 0) return;
    var exclusionRects = getExclusionRects();
    var safeNotes = validNotes.filter(function(note){
      return !noteCollides(note, exclusionRects);
    });
    if(safeNotes.length === 0) return;
    var note = safeNotes[Math.floor(Math.random() * safeNotes.length)];
    lastNoteIndex = MAKERS_NOTES.indexOf(note);
    spawnAnnotation(stage, note);
  }

  function spawnAnnotation(stage, note){
    var el = document.createElement('div');
    el.className = 'atlas-annotation';
    el.style.left = note.x + '%';
    el.style.top = note.y + '%';
    var rotation = (Math.random() - 0.5) * 4;
    el.style.transform = 'translateY(-50%) rotate(' + rotation + 'deg)';

    var chars = note.text.split('');
    var spans = [];
    for(var i = 0; i < chars.length; i++){
      var span = document.createElement('span');
      span.className = 'atlas-annotation-char';
      span.textContent = (chars[i] === ' ') ? '\u00a0' : chars[i];
      el.appendChild(span);
      spans.push(span);
    }

    stage.appendChild(el);
    void el.offsetWidth; // commit opacity:0 state for all spans before transitions

    var WRITE_STAGGER  = 60;
    var WRITE_DURATION = 250;
    var HOLD_AFTER_LAST = 1500;
    var ERASE_STAGGER  = 50;
    var ERASE_DURATION = 350;
    var REMOVAL_BUFFER = 100;

    var lastIdx        = spans.length - 1;
    var writeFinishes  = (lastIdx * WRITE_STAGGER) + WRITE_DURATION;
    var eraseStarts    = writeFinishes + HOLD_AFTER_LAST;
    var eraseFinishes  = eraseStarts + (lastIdx * ERASE_STAGGER) + ERASE_DURATION;

    spans.forEach(function(span, i){
      setTimeout(function(){ span.classList.add('is-written'); }, i * WRITE_STAGGER);
    });

    spans.forEach(function(span, i){
      setTimeout(function(){
        span.classList.remove('is-written');
        span.classList.add('is-erasing');
      }, eraseStarts + (i * ERASE_STAGGER));
    });

    setTimeout(function(){
      if(el.parentNode) el.parentNode.removeChild(el);
    }, eraseFinishes + REMOVAL_BUFFER);
  }

  function openAtlas(){
    buildOverlay();
    isOpen = true;
    triggerBtn.classList.add('open');
    overlayEl.setAttribute('aria-hidden','false');
    void overlayEl.offsetWidth;
    overlayEl.classList.add('active');
    startAnnotationScheduler();
  }

  function closeAtlas(){
    if(isRevealCeremonyRunning) return;
    isOpen = false;
    if(triggerBtn) triggerBtn.classList.remove('open');
    if(overlayEl){
      overlayEl.classList.remove('active');
      overlayEl.setAttribute('aria-hidden','true');
    }
    stopAnnotationScheduler();
  }

  // ============================================================
  // REALMS UNLOCK CEREMONY
  // Six-beat progressive revelation triggered by ?ceremony=realms_unlock
  // ============================================================

  function runRealmsUnlockCeremony(){
    buildOverlay();
    overlayEl.classList.add('active');
    isOpen = true;
    document.body.style.overflow = 'hidden';

    var blackoutEl = document.createElement('div');
    blackoutEl.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99998;opacity:1;transition:opacity 2s ease-in-out;pointer-events:none';
    document.body.appendChild(blackoutEl);

    var paper = overlayEl.querySelector('#atlasPaper');
    paper.querySelectorAll(
      '.atlas-chambers-desktop,.atlas-chambers-mobile,' +
      '.atlas-cosmic,.atlas-star,.atlas-title,.atlas-compass,' +
      '.atlas-maker,.atlas-paths,.atlas-astrolabe,' +
      '.atlas-annotation-stage,.atlas-cosmic-drift,.atlas-paper-dust'
    ).forEach(function(el){ el.style.opacity = '0'; });
    paper.style.cssText += ';opacity:0;transition:opacity 2s ease-in-out';

    setTimeout(function(){
      blackoutEl.style.opacity = '0';
      paper.style.opacity = '0.6';
    }, 600);

    setTimeout(function(){
      if(blackoutEl.parentNode) blackoutEl.parentNode.removeChild(blackoutEl);
    }, 3000);

    scheduleCeremonyBeat1();
    scheduleCeremonyBeat2();
    scheduleCeremonyBeat3();
    scheduleCeremonyBeat4();
    scheduleCeremonyBeat5();
    scheduleCeremonyBeat6();
  }

  function spawnCeremonyText(text, x, y){
    var paper = overlayEl.querySelector('#atlasPaper');
    var el = document.createElement('div');
    el.className = 'ceremony-text';
    el.style.left = x + '%';
    el.style.top = y + '%';
    el.style.transform = 'translate(-50%,-50%)';
    text.split('').forEach(function(ch){
      var span = document.createElement('span');
      span.className = 'char';
      span.textContent = (ch === ' ') ? '\u00a0' : ch;
      el.appendChild(span);
    });
    paper.appendChild(el);
    void el.offsetWidth;
    var spans = el.querySelectorAll('.char');
    spans.forEach(function(span, i){
      setTimeout(function(){ span.classList.add('is-written'); }, i * 60);
    });
    return { el: el, writeDuration: ((spans.length - 1) * 60) + 250 };
  }

  function fadeOutCeremonyText(textObj, holdMs){
    setTimeout(function(){
      textObj.el.classList.add('is-fading');
      setTimeout(function(){
        if(textObj.el.parentNode) textObj.el.parentNode.removeChild(textObj.el);
      }, 600);
    }, holdMs);
  }

  function ceremonyRevealEl(el){
    el.style.opacity = '';
    el.classList.add('ceremony-fade-in');
  }

  function scheduleCeremonyBeat1(){
    setTimeout(function(){
      var t = spawnCeremonyText('here is the world.', 50, 18);
      fadeOutCeremonyText(t, t.writeDuration + 2500);
    }, 2500);
  }

  function scheduleCeremonyBeat2(){
    setTimeout(function(){
      var el = overlayEl.querySelector('[data-chamber-id="atheneum"]');
      if(el) ceremonyRevealEl(el);
    }, 8000);
    setTimeout(function(){
      var t = spawnCeremonyText('you are here.', 50, 65);
      fadeOutCeremonyText(t, t.writeDuration + 2500);
    }, 9500);
  }

  function scheduleCeremonyBeat3(){
    setTimeout(function(){
      var t = spawnCeremonyText('and these are your siblings.', 50, 18);
      fadeOutCeremonyText(t, t.writeDuration + 5500);
    }, 14000);
    ['threshold','scriptorium','arcanium','agora'].forEach(function(id, i){
      setTimeout(function(){
        var el = overlayEl.querySelector('[data-chamber-id="' + id + '"]');
        if(el) ceremonyRevealEl(el);
      }, 16000 + (i * 1500));
    });
  }

  function scheduleCeremonyBeat4(){
    setTimeout(function(){
      var t = spawnCeremonyText('the void between them is not empty.', 50, 88);
      fadeOutCeremonyText(t, t.writeDuration + 3500);
    }, 24000);
    setTimeout(function(){
      overlayEl.querySelectorAll('[data-cosmic-id]').forEach(function(el, i){
        setTimeout(function(){ ceremonyRevealEl(el); }, i * 800);
      });
    }, 25500);
    setTimeout(function(){
      overlayEl.querySelectorAll('.atlas-star').forEach(function(el, i){
        setTimeout(function(){ el.style.opacity = ''; }, i * 30);
      });
    }, 28000);
  }

  function scheduleCeremonyBeat5(){
    setTimeout(function(){
      var t = spawnCeremonyText('one of them is opening for you now.', 50, 88);
      fadeOutCeremonyText(t, t.writeDuration + 3000);
    }, 33000);
    setTimeout(function(){
      var scrip = overlayEl.querySelector('[data-chamber-id="scriptorium"]');
      if(scrip) scrip.classList.add('scriptorium-unsealing');
      var scripData = CHAMBERS.find(function(c){ return c.id === 'scriptorium'; });
      if(scripData) scripData.status = 'open';
      try { localStorage.setItem('ga_scriptorium_unsealed', 'true'); } catch(e){}
      setTimeout(function(){ reRenderChamber('scriptorium'); }, 1500);
    }, 35000);
  }

  function scheduleCeremonyBeat6(){
    setTimeout(function(){
      var t = spawnCeremonyText('the others will open in their time.', 50, 18);
      fadeOutCeremonyText(t, t.writeDuration + 4000);
    }, 40000);
    setTimeout(function(){
      completeRealmsUnlockCeremony();
    }, 48000);
  }

  function reRenderChamber(chamberId){
    overlayEl.querySelectorAll('[data-chamber-id="' + chamberId + '"]').forEach(function(el){
      el.classList.remove('sealed');
      el.classList.add('open');
      var aura = el.querySelector('.atlas-chamber-aura');
      if(aura) aura.classList.remove('atlas-chamber-aura-hidden');
    });
  }

  function completeRealmsUnlockCeremony(){
    localStorage.setItem('realms_unlocked', 'true');
    var paper = overlayEl.querySelector('#atlasPaper');
    if(paper){
      paper.style.transition = 'opacity 1.5s ease-out';
      paper.style.opacity = '1';
    }
    overlayEl.querySelectorAll(
      '.atlas-title,.atlas-compass,.atlas-maker,.atlas-paths,.atlas-astrolabe'
    ).forEach(function(el){ el.style.opacity = ''; });
    mount();
    isOpen = true;
    if(triggerBtn) triggerBtn.classList.add('open');
    overlayEl.setAttribute('aria-hidden','false');
    startAnnotationScheduler();
    if(window.history && window.history.replaceState){
      window.history.replaceState({}, '', '/threshold.html');
    }
  }

  // ============================================================
  // ATLAS REVEAL CEREMONY (Part B)
  // Short 9-second ceremony fired after CTA video close on atheneum.
  // Gated by realms_unlocked flag — runs only on first completion.
  // ============================================================

  function runRealmsRevealCeremony(onComplete){
    if(localStorage.getItem('realms_unlocked') === 'true'){
      if(typeof onComplete === 'function') onComplete();
      return;
    }
    buildOverlay();
    isRevealCeremonyRunning = true;
    isOpen = true;
    document.body.style.overflow = 'hidden';

    var closeBtn = overlayEl.querySelector('#atlasClose');
    if(closeBtn) closeBtn.style.display = 'none';

    overlayEl.classList.add('atlas-ceremony-hidden');
    void overlayEl.offsetWidth;
    overlayEl.classList.add('active');
    overlayEl.setAttribute('aria-hidden','false');

    setTimeout(function(){
      var title = document.createElement('div');
      title.className = 'atlas-ceremony-title';
      title.textContent = 'The realms of Evermark';
      var paper = overlayEl.querySelector('.atlas-paper');
      if(paper) paper.appendChild(title);
      void title.offsetWidth;
      title.classList.add('is-visible');
    }, 1100);

    setTimeout(function(){
      overlayEl.classList.remove('atlas-ceremony-hidden');
      overlayEl.classList.add('atlas-ceremony-revealing');
    }, 2400);

    // Stage 1 — Charge (t=4400): focus dim + charge aura on Scriptorium
    setTimeout(function(){
      var scrip = overlayEl.querySelector('[data-chamber-id="scriptorium"]');
      if(scrip) scrip.classList.add('atlas-ceremony-unseal-target');
      overlayEl.classList.add('atlas-ceremony-focusing');
    }, 4400);

    // Stage 2 — Break (t=5100): flash overlay burst at Scriptorium position
    setTimeout(function(){
      var paper = overlayEl.querySelector('.atlas-paper');
      var scrip = overlayEl.querySelector('[data-chamber-id="scriptorium"]');
      if(!paper || !scrip) return;
      var scripData = CHAMBERS.find(function(c){ return c.id === 'scriptorium'; });
      if(!scripData) return;
      var flash = document.createElement('div');
      flash.className = 'atlas-ceremony-flash';
      flash.style.left = scripData.x + '%';
      flash.style.top  = scripData.y + '%';
      paper.appendChild(flash);
      void flash.offsetWidth;
      flash.classList.add('is-firing');
      scripData.status = 'open';
      try { localStorage.setItem('ga_scriptorium_unsealed', 'true'); } catch(e){}
      setTimeout(function(){
        if(flash.parentNode) flash.parentNode.removeChild(flash);
      }, 600);
    }, 5100);

    // Stage 3 — Open (t=5600): re-render in open state, lift dim, settle pulse
    setTimeout(function(){
      reRenderChamber('scriptorium');
      overlayEl.classList.remove('atlas-ceremony-focusing');
      overlayEl.classList.add('atlas-ceremony-opening');
      var scrip = overlayEl.querySelector('[data-chamber-id="scriptorium"]');
      if(scrip) scrip.classList.add('atlas-ceremony-newly-opened');
      setTimeout(function(){
        var s = overlayEl ? overlayEl.querySelector('[data-chamber-id="scriptorium"]') : null;
        if(s) s.classList.remove('atlas-ceremony-newly-opened');
      }, 1200);
    }, 5600);

    // Title fades out: t=7300 (was 6400)
    setTimeout(function(){
      var title = overlayEl.querySelector('.atlas-ceremony-title');
      if(title) title.classList.remove('is-visible');
    }, 7300);

    // Genie-suction: t=8300 (was 7400)
    setTimeout(function(){
      overlayEl.classList.add('atlas-ceremony-suctioning');
    }, 8300);

    // Ceremony complete: t=9700 (was 8800)
    setTimeout(function(){
      completeReveal(onComplete);
    }, 9700);
  }

  function completeReveal(onComplete){
    isRevealCeremonyRunning = false;
    localStorage.setItem('realms_unlocked','true');

    if(overlayEl && overlayEl.parentNode){
      overlayEl.parentNode.removeChild(overlayEl);
    }
    overlayEl = null;
    isOpen = false;

    document.body.style.overflow = '';

    mount();

    if(triggerBtn){
      triggerBtn.classList.add('atlas-ceremony-arrived');
      setTimeout(function(){
        if(triggerBtn) triggerBtn.classList.remove('atlas-ceremony-arrived');
      }, 1400);
    }

    if(typeof onComplete === 'function') onComplete();
  }

})();
