/*
 * The Guide — Gamer Ascension
 * A persistent character across the site who handles interface education and wayfinding.
 *
 * Usage on each page:
 *
 *   <script src="guide.js"></script>
 *   <script>
 *     Guide.init({
 *       chamber: 'atheneum',            // unique key for localStorage
 *       chamberName: 'The Atheneum',
 *       chamberLabel: 'Skill Mastery',
 *       script: [
 *         { speaker: 'The Guide', text: '...' },
 *         ...
 *       ],
 *       autoSummonDelay: 800             // optional, ms before auto-appearance on first visit. Default 1200.
 *     });
 *   </script>
 *
 * The Guide handles its own rendering, state, and animation. Each page just
 * provides the config and the Guide does the rest.
 */

(function(global){
  'use strict';

  // -- State --
  var config = null;
  var dialogueIndex = 0;
  var typewriterTimeout = null;
  var isOpen = false;
  var hasBeenSeenThisChamber = false;

  // -- DOM references (populated in init) --
  var summonEl = null;
  var overlayEl = null;
  var dialogueTextEl = null;
  var speakerNameEl = null;
  var progressEl = null;
  var continueBtn = null;
  var coreGlowEl = null;

  // -- Public API --
  var Guide = {
    init: function(userConfig){
      config = userConfig || {};
      if(!config.chamber || !config.script || !Array.isArray(config.script)){
        console.warn('Guide.init: missing chamber or script');
        return;
      }

      // Check if already seen in this chamber
      try {
        hasBeenSeenThisChamber = localStorage.getItem('ga_guide_seen_' + config.chamber) === '1';
      } catch(e){
        hasBeenSeenThisChamber = false;
      }

      // Inject styles once
      injectStyles();

      // Build DOM
      buildDOM();

      // Auto-summon on first visit after a short delay (lets the page settle)
      if(!hasBeenSeenThisChamber){
        var delay = typeof config.autoSummonDelay === 'number' ? config.autoSummonDelay : 1200;
        setTimeout(function(){ Guide.summon(); }, delay);
        // Also make the icon pulse while waiting
        if(summonEl) summonEl.classList.add('guide-pulsing');
      }
    },

    summon: function(){
      if(!overlayEl || isOpen) return;
      isOpen = true;
      dialogueIndex = 0;

      // Stop icon pulsing while dialogue is open
      if(summonEl) summonEl.classList.remove('guide-pulsing');

      // Show overlay
      overlayEl.classList.add('active');
      document.body.classList.add('guide-active');

      // Start dialogue after fade-in
      setTimeout(renderDialogueLine, 400);
    },

    dismiss: function(){
      if(!overlayEl) return;
      isOpen = false;

      // Clear typewriter
      if(typewriterTimeout){
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }

      // Hide overlay
      overlayEl.classList.remove('active');
      document.body.classList.remove('guide-active');

      // Settle core glow
      if(coreGlowEl) coreGlowEl.classList.remove('speaking');

      // Mark as seen
      try {
        localStorage.setItem('ga_guide_seen_' + config.chamber, '1');
      } catch(e){}
      hasBeenSeenThisChamber = true;
    },

    // Dev helper — clear the "seen" state for this chamber and reload
    reset: function(){
      try {
        localStorage.removeItem('ga_guide_seen_' + config.chamber);
      } catch(e){}
      location.reload();
    }
  };

  // -- Internal: DOM construction --
  function buildDOM(){
    // Summon icon (bottom-right floating)
    summonEl = document.createElement('button');
    summonEl.className = 'guide-summon';
    summonEl.setAttribute('aria-label', 'Summon the Guide');
    summonEl.setAttribute('title', 'Summon the Guide');
    summonEl.innerHTML = getShardSVG(true); // small version
    summonEl.addEventListener('click', function(e){
      e.preventDefault();
      Guide.summon();
    });
    document.body.appendChild(summonEl);

    // Overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'guide-overlay';
    overlayEl.innerHTML = '' +
      '<div class="guide-overlay-bg"></div>' +
      '<button class="guide-close" aria-label="Dismiss the Guide" title="Dismiss">&times;</button>' +
      '<div class="guide-stage">' +
        '<div class="guide-aura"></div>' +
        '<div class="guide-core-glow" id="guideCoreGlow"></div>' +
        '<div class="guide-shard">' + getShardSVG(false) + '</div>' +
        '<div class="guide-ember-layer" id="guideEmberLayer"></div>' +
      '</div>' +
      '<div class="guide-dialogue-box">' +
        '<div class="guide-speaker" id="guideSpeaker">The Guide</div>' +
        '<div class="guide-text" id="guideText"></div>' +
        '<div class="guide-footer">' +
          '<div class="guide-progress" id="guideProgress"></div>' +
          '<button class="guide-continue" id="guideContinue">Continue</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlayEl);

    // Store element references
    dialogueTextEl = document.getElementById('guideText');
    speakerNameEl = document.getElementById('guideSpeaker');
    progressEl = document.getElementById('guideProgress');
    continueBtn = document.getElementById('guideContinue');
    coreGlowEl = document.getElementById('guideCoreGlow');

    // Wire close and continue buttons
    overlayEl.querySelector('.guide-close').addEventListener('click', function(){
      Guide.dismiss();
    });
    continueBtn.addEventListener('click', advanceDialogue);

    // Click outside the dialogue box to dismiss (but not outside the whole overlay)
    overlayEl.querySelector('.guide-overlay-bg').addEventListener('click', function(){
      Guide.dismiss();
    });

    // Esc key to dismiss
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isOpen) Guide.dismiss();
    });

    // Start ember spawning loop
    startEmbers();
  }

  // -- Internal: dialogue rendering --
  function renderDialogueLine(){
    if(!config || !config.script || dialogueIndex >= config.script.length) return;
    var line = config.script[dialogueIndex];

    speakerNameEl.textContent = line.speaker || 'The Guide';
    dialogueTextEl.innerHTML = '';
    progressEl.textContent = (dialogueIndex + 1) + ' / ' + config.script.length;
    continueBtn.disabled = true;
    continueBtn.textContent = 'Continue';

    // Activate speaking glow
    if(coreGlowEl) coreGlowEl.classList.add('speaking');

    // Typewriter effect
    var full = line.text;
    var i = 0;
    if(typewriterTimeout) clearTimeout(typewriterTimeout);

    function tick(){
      if(i <= full.length){
        dialogueTextEl.innerHTML = full.substring(0, i) + '<span class="guide-cursor"></span>';
        i++;
        typewriterTimeout = setTimeout(tick, 22);
      } else {
        dialogueTextEl.innerHTML = full;
        continueBtn.disabled = false;
        if(coreGlowEl) coreGlowEl.classList.remove('speaking');
        if(dialogueIndex === config.script.length - 1){
          continueBtn.textContent = 'Dismiss';
        }
      }
    }
    tick();
  }

  function advanceDialogue(){
    // Skip typewriter if still running
    if(continueBtn.disabled){
      if(typewriterTimeout) clearTimeout(typewriterTimeout);
      dialogueTextEl.innerHTML = config.script[dialogueIndex].text;
      continueBtn.disabled = false;
      if(coreGlowEl) coreGlowEl.classList.remove('speaking');
      if(dialogueIndex === config.script.length - 1){
        continueBtn.textContent = 'Dismiss';
      }
      return;
    }

    if(dialogueIndex < config.script.length - 1){
      dialogueIndex++;
      renderDialogueLine();
    } else {
      Guide.dismiss();
    }
  }

  // -- Internal: ember spawning --
  function startEmbers(){
    var layer = document.getElementById('guideEmberLayer');
    if(!layer) return;

    function spawn(){
      if(!isOpen){
        setTimeout(spawn, 1000);
        return;
      }
      var em = document.createElement('div');
      em.className = 'guide-ember';
      var layerRect = layer.getBoundingClientRect();
      var w = layerRect.width;
      var h = layerRect.height;
      // Spawn above the apex of the shard
      var spawnX = (w / 2) + (Math.random() - 0.5) * 50;
      var spawnY = (h * 0.08) + (Math.random() - 0.5) * 20;
      em.style.left = spawnX + 'px';
      em.style.top = spawnY + 'px';
      em.style.setProperty('--drift', ((Math.random() - 0.5) * 40) + 'px');
      var size = 2 + Math.random() * 2;
      em.style.width = size + 'px';
      em.style.height = size + 'px';
      layer.appendChild(em);
      setTimeout(function(){ em.remove(); }, 7000);

      var next = 1500 + Math.random() * 2500;
      setTimeout(spawn, next);
    }
    setTimeout(spawn, 2000);
  }

  // -- Internal: shard SVG (inline, self-contained) --
  function getShardSVG(small){
    // The core shard geometry — bipyramid with inner nebula glow.
    // Small version for summon icon, full version for dialogue overlay.
    var viewBox = '0 0 400 660';
    return '' +
      '<svg viewBox="' + viewBox + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="guide-shard-svg' + (small ? ' guide-shard-svg-small' : '') + '">' +
        '<defs>' +
          '<filter id="gd-softBlur-' + (small ? 's' : 'l') + '" x="-50%" y="-50%" width="200%" height="200%">' +
            '<feGaussianBlur stdDeviation="8"/>' +
          '</filter>' +
          '<filter id="gd-starGlow-' + (small ? 's' : 'l') + '" x="-100%" y="-100%" width="300%" height="300%">' +
            '<feGaussianBlur stdDeviation="4"/>' +
          '</filter>' +
          '<linearGradient id="gd-upperLeft-' + (small ? 's' : 'l') + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#3a2f55" stop-opacity="0.92"/>' +
            '<stop offset="50%" stop-color="#554270" stop-opacity="0.88"/>' +
            '<stop offset="100%" stop-color="#2b2140" stop-opacity="0.95"/>' +
          '</linearGradient>' +
          '<linearGradient id="gd-upperCenter-' + (small ? 's' : 'l') + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#6a5a8a" stop-opacity="0.85"/>' +
            '<stop offset="40%" stop-color="#4a3a68" stop-opacity="0.8"/>' +
            '<stop offset="100%" stop-color="#2e2345" stop-opacity="0.92"/>' +
          '</linearGradient>' +
          '<linearGradient id="gd-upperRight-' + (small ? 's' : 'l') + '" x1="100%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#261a3a" stop-opacity="0.95"/>' +
            '<stop offset="60%" stop-color="#3a2b54" stop-opacity="0.9"/>' +
            '<stop offset="100%" stop-color="#1d1530" stop-opacity="0.97"/>' +
          '</linearGradient>' +
          '<linearGradient id="gd-lowerLeft-' + (small ? 's' : 'l') + '" x1="100%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#4a3a68" stop-opacity="0.9"/>' +
            '<stop offset="50%" stop-color="#332650" stop-opacity="0.92"/>' +
            '<stop offset="100%" stop-color="#1a1230" stop-opacity="0.98"/>' +
          '</linearGradient>' +
          '<linearGradient id="gd-lowerCenter-' + (small ? 's' : 'l') + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
            '<stop offset="0%" stop-color="#453465" stop-opacity="0.88"/>' +
            '<stop offset="60%" stop-color="#2a1f42" stop-opacity="0.95"/>' +
            '<stop offset="100%" stop-color="#140e24" stop-opacity="1"/>' +
          '</linearGradient>' +
          '<linearGradient id="gd-lowerRight-' + (small ? 's' : 'l') + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
            '<stop offset="0%" stop-color="#2d213f" stop-opacity="0.95"/>' +
            '<stop offset="60%" stop-color="#1e1530" stop-opacity="0.98"/>' +
            '<stop offset="100%" stop-color="#110a1e" stop-opacity="1"/>' +
          '</linearGradient>' +
          '<radialGradient id="gd-coreGlow-' + (small ? 's' : 'l') + '" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#fff5d0" stop-opacity="1"/>' +
            '<stop offset="15%" stop-color="#ffe08a" stop-opacity="0.95"/>' +
            '<stop offset="35%" stop-color="#d49840" stop-opacity="0.7"/>' +
            '<stop offset="60%" stop-color="#8a5fa8" stop-opacity="0.4"/>' +
            '<stop offset="100%" stop-color="#4a2d6b" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<radialGradient id="gd-nebulaPurple-' + (small ? 's' : 'l') + '" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#a080dd" stop-opacity="0.6"/>' +
            '<stop offset="40%" stop-color="#7f55b8" stop-opacity="0.4"/>' +
            '<stop offset="100%" stop-color="#4a2d6b" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<radialGradient id="gd-apexStar-' + (small ? 's' : 'l') + '" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>' +
            '<stop offset="30%" stop-color="#fff8dc" stop-opacity="0.9"/>' +
            '<stop offset="100%" stop-color="#ffe08a" stop-opacity="0"/>' +
          '</radialGradient>' +
          '<clipPath id="gd-crystalClip-' + (small ? 's' : 'l') + '">' +
            '<polygon points="200,40 300,300 240,330 200,620 160,330 100,300"/>' +
          '</clipPath>' +
        '</defs>' +
        // Crystal body
        '<polygon points="200,40 160,330 100,300" fill="url(#gd-upperLeft-' + (small ? 's' : 'l') + ')"/>' +
        '<polygon points="200,40 240,330 160,330" fill="url(#gd-upperCenter-' + (small ? 's' : 'l') + ')"/>' +
        '<polygon points="200,40 300,300 240,330" fill="url(#gd-upperRight-' + (small ? 's' : 'l') + ')"/>' +
        '<polygon points="100,300 300,300 240,330 160,330" fill="#1a1024" opacity="0.6"/>' +
        '<polygon points="160,330 240,330 200,620" fill="url(#gd-lowerCenter-' + (small ? 's' : 'l') + ')"/>' +
        '<polygon points="100,300 160,330 200,620" fill="url(#gd-lowerLeft-' + (small ? 's' : 'l') + ')"/>' +
        '<polygon points="240,330 300,300 200,620" fill="url(#gd-lowerRight-' + (small ? 's' : 'l') + ')"/>' +
        // Inner nebula
        '<g clip-path="url(#gd-crystalClip-' + (small ? 's' : 'l') + ')">' +
          '<ellipse cx="200" cy="330" rx="110" ry="80" fill="url(#gd-nebulaPurple-' + (small ? 's' : 'l') + ')" filter="url(#gd-softBlur-' + (small ? 's' : 'l') + ')" opacity="0.85"/>' +
          '<circle cx="200" cy="325" r="35" fill="url(#gd-coreGlow-' + (small ? 's' : 'l') + ')" opacity="0.9"/>' +
          '<circle cx="200" cy="325" r="6" fill="#fff8dc" opacity="0.95"/>' +
        '</g>' +
        // Rim highlights
        '<line x1="200" y1="40" x2="160" y2="330" stroke="#ffe8a8" stroke-width="1.5" opacity="0.55"/>' +
        '<line x1="200" y1="40" x2="240" y2="330" stroke="#b08838" stroke-width="1" opacity="0.4"/>' +
        '<line x1="100" y1="300" x2="300" y2="300" stroke="#c9a84c" stroke-width="1" opacity="0.5"/>' +
        '<line x1="160" y1="330" x2="200" y2="620" stroke="#d0a048" stroke-width="1.2" opacity="0.5"/>' +
        // Apex star
        '<g class="guide-apex-star" transform="translate(200 40)">' +
          '<line x1="-48" y1="0" x2="48" y2="0" stroke="#ffffff" stroke-width="1.2" opacity="0.8" filter="url(#gd-starGlow-' + (small ? 's' : 'l') + ')"/>' +
          '<line x1="0" y1="-48" x2="0" y2="48" stroke="#ffffff" stroke-width="1.2" opacity="0.8" filter="url(#gd-starGlow-' + (small ? 's' : 'l') + ')"/>' +
          '<circle cx="0" cy="0" r="14" fill="url(#gd-apexStar-' + (small ? 's' : 'l') + ')" opacity="0.9"/>' +
          '<circle cx="0" cy="0" r="3" fill="#ffffff" opacity="1"/>' +
        '</g>' +
      '</svg>';
  }

  // -- Internal: style injection --
  var stylesInjected = false;
  function injectStyles(){
    if(stylesInjected) return;
    stylesInjected = true;

    var style = document.createElement('style');
    style.id = 'guide-styles';
    style.textContent = '' +
      // Summon icon — bottom-right floating
      '.guide-summon{position:fixed;bottom:20px;right:20px;width:64px;height:64px;' +
        'background:transparent;border:none;cursor:pointer;z-index:9998;padding:0;' +
        'display:flex;align-items:center;justify-content:center;' +
        'filter:drop-shadow(0 0 12px rgba(157,139,255,0.35));' +
        'transition:filter .3s,transform .3s;will-change:filter,transform}' +
      '.guide-summon:hover{filter:drop-shadow(0 0 20px rgba(201,168,76,0.55));transform:scale(1.08)}' +
      '.guide-summon.guide-pulsing{animation:guide-summon-pulse 2.4s ease-in-out infinite}' +
      '@keyframes guide-summon-pulse{0%,100%{filter:drop-shadow(0 0 12px rgba(157,139,255,0.35))}' +
        '50%{filter:drop-shadow(0 0 24px rgba(201,168,76,0.65)) drop-shadow(0 0 40px rgba(157,139,255,0.4))}}' +
      '.guide-summon .guide-shard-svg-small{width:100%;height:100%;display:block;overflow:visible}' +

      // Overlay — full-screen dialogue
      '.guide-overlay{position:fixed;inset:0;z-index:9999;opacity:0;pointer-events:none;' +
        'transition:opacity .6s ease;display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;padding:60px 20px 30px;overflow-y:auto}' +
      '.guide-overlay.active{opacity:1;pointer-events:auto}' +
      '.guide-overlay-bg{position:absolute;inset:0;background:rgba(4,4,10,0.92);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:0;cursor:pointer}' +
      '.guide-close{position:absolute;top:16px;right:16px;width:36px;height:36px;' +
        'background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.55);' +
        'border-radius:50%;font-size:20px;cursor:pointer;z-index:2;transition:all .2s;' +
        'display:flex;align-items:center;justify-content:center;line-height:1;padding:0;' +
        'font-family:sans-serif}' +
      '.guide-close:hover{border-color:rgba(201,168,76,0.5);color:#c9a84c}' +

      // Stage — shard + glow + embers
      '.guide-stage{position:relative;width:min(320px,70vw);height:min(460px,58vh);' +
        'display:flex;align-items:center;justify-content:center;z-index:1;margin-bottom:16px}' +
      '.guide-aura{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:130%;height:80%;border-radius:50%;' +
        'background:radial-gradient(ellipse,rgba(157,139,255,0.18) 0%,rgba(127,119,221,0.08) 40%,transparent 70%);' +
        'z-index:1;filter:blur(18px);pointer-events:none;' +
        'animation:guide-aura-breathe 5s ease-in-out infinite}' +
      '@keyframes guide-aura-breathe{0%,100%{opacity:0.55;transform:translate(-50%,-50%) scale(1)}' +
        '50%{opacity:0.85;transform:translate(-50%,-50%) scale(1.06)}}' +
      '.guide-core-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:50%;height:28%;border-radius:50%;' +
        'background:radial-gradient(ellipse,rgba(255,210,150,0.35) 0%,rgba(201,168,76,0.18) 40%,transparent 70%);' +
        'z-index:2;filter:blur(18px);pointer-events:none;opacity:0.65;' +
        'transition:opacity .6s ease;mix-blend-mode:screen}' +
      '.guide-core-glow.speaking{opacity:1;animation:guide-core-pulse 1.4s ease-in-out infinite}' +
      '@keyframes guide-core-pulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.9}' +
        '50%{transform:translate(-50%,-50%) scale(1.12);opacity:1}}' +
      '.guide-shard{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:100%;height:100%;z-index:3;pointer-events:none;' +
        'filter:drop-shadow(0 0 30px rgba(157,139,255,0.25)) drop-shadow(0 0 60px rgba(201,168,76,0.18));' +
        'animation:guide-shard-float 7s ease-in-out infinite}' +
      '.guide-shard .guide-shard-svg{width:100%;height:100%;display:block;overflow:visible}' +
      '@keyframes guide-shard-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}' +
        '50%{transform:translate(-50%,-50%) translateY(-8px)}}' +
      '.guide-apex-star{transform-origin:200px 40px;animation:guide-apex-pulse 5s ease-in-out infinite}' +
      '@keyframes guide-apex-pulse{0%,100%{opacity:0.7;transform:translate(200px,40px) scale(1)}' +
        '50%{opacity:1;transform:translate(200px,40px) scale(1.12)}}' +

      // Embers
      '.guide-ember-layer{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible}' +
      '.guide-ember{position:absolute;width:3px;height:3px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(255,230,170,0.95) 0%,rgba(201,168,76,0.6) 50%,transparent 100%);' +
        'filter:blur(0.4px);opacity:0;animation:guide-ember-rise 7s ease-out forwards}' +
      '@keyframes guide-ember-rise{0%{opacity:0;transform:translate(0,0) scale(0.6)}' +
        '15%{opacity:0.9}60%{opacity:0.6}' +
        '100%{opacity:0;transform:translate(var(--drift,0px),-180px) scale(0.3)}}' +

      // Dialogue box
      '.guide-dialogue-box{width:100%;max-width:640px;background:rgba(8,8,16,0.88);' +
        'border:1px solid rgba(157,139,255,0.3);border-radius:4px;padding:22px 24px;' +
        'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);position:relative;z-index:1}' +
      '.guide-speaker{font-family:"Cinzel",serif;font-size:11px;letter-spacing:.25em;' +
        'color:rgba(157,139,255,0.9);text-transform:uppercase;margin-bottom:12px}' +
      '.guide-text{font-family:"DM Sans",sans-serif;font-size:15px;font-weight:300;' +
        'line-height:1.7;color:#f0ece4;min-height:100px}' +
      '.guide-text .guide-cursor{display:inline-block;width:8px;height:16px;background:#c9a84c;' +
        'margin-left:4px;vertical-align:middle;animation:guide-cursor-blink 0.8s ease-in-out infinite}' +
      '@keyframes guide-cursor-blink{0%,49%{opacity:1}50%,100%{opacity:0}}' +
      '.guide-footer{display:flex;justify-content:space-between;align-items:center;' +
        'margin-top:14px;gap:12px;flex-wrap:wrap}' +
      '.guide-progress{font-size:10px;color:rgba(240,236,228,0.3);letter-spacing:.1em;' +
        'font-family:"DM Sans",sans-serif}' +
      '.guide-continue{background:transparent;border:1px solid rgba(201,168,76,0.4);color:#c9a84c;' +
        'font-family:"Cinzel",serif;font-size:11px;font-weight:400;letter-spacing:.2em;' +
        'padding:8px 20px;border-radius:2px;cursor:pointer;text-transform:uppercase;transition:all .2s}' +
      '.guide-continue:hover{border-color:#c9a84c;background:rgba(201,168,76,0.08)}' +
      '.guide-continue:disabled{opacity:0.3;cursor:not-allowed}' +

      // Prevent scroll when guide is active
      'body.guide-active{overflow:hidden}' +

      // Mobile adjustments
      '@media(max-width:640px){' +
        '.guide-summon{bottom:16px;right:16px;width:56px;height:56px}' +
        '.guide-stage{width:min(260px,75vw);height:min(380px,48vh)}' +
        '.guide-dialogue-box{padding:18px 20px}' +
        '.guide-text{font-size:14px}' +
      '}';

    document.head.appendChild(style);
  }

  // -- Export --
  global.Guide = Guide;

})(typeof window !== 'undefined' ? window : this);
