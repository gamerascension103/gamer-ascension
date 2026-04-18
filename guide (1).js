/*
 * The Guide - Gamer Ascension
 * A persistent character across the site who handles interface education and wayfinding.
 * Uses "Ascendant" as the canonical address for the user.
 *
 * Usage on each page:
 *   Include this file via script tag: src equals "guide.js"
 *   Then call Guide.init with config:
 *     - chamber: unique key for localStorage
 *     - chamberName: display name
 *     - chamberLabel: subtitle
 *     - script: array of dialogue lines for first visit and "explain again"
 *     - summonPosition: optional override of bottom-right coords. Default bottom 20px / right 20px.
 *     - autoSummonDelay: optional delay for first-visit auto-summon. Default 1200ms.
 */

(function(global){
  'use strict';

  var config = null;
  var dialogueIndex = 0;
  var typewriterTimeout = null;
  var isOpen = false;
  var mode = 'dialogue';
  var hasBeenSeenThisChamber = false;

  var summonEl = null;
  var overlayEl = null;
  var dialogueTextEl = null;
  var speakerNameEl = null;
  var progressEl = null;
  var continueBtn = null;
  var orbBodyEl = null;
  var orbRaysEl = null;
  var flareInterval = null;
  var dialogueBoxEl = null;
  var menuEl = null;
  var footerEl = null;

  var Guide = {
    init: function(userConfig){
      config = userConfig || {};
      if(!config.chamber || !config.script || !Array.isArray(config.script)){
        console.warn('Guide.init: missing chamber or script');
        return;
      }

      try {
        hasBeenSeenThisChamber = localStorage.getItem('ga_guide_seen_' + config.chamber) === '1';
      } catch(e){
        hasBeenSeenThisChamber = false;
      }

      injectStyles();
      buildDOM();

      if(!hasBeenSeenThisChamber){
        var delay = typeof config.autoSummonDelay === 'number' ? config.autoSummonDelay : 1200;
        setTimeout(function(){ Guide.summonDialogue(); }, delay);
        if(summonEl) summonEl.classList.add('guide-pulsing');
      }
    },

    summonDialogue: function(){
      if(!overlayEl || isOpen) return;
      isOpen = true;
      mode = 'dialogue';
      dialogueIndex = 0;

      if(summonEl) summonEl.classList.remove('guide-pulsing');

      overlayEl.classList.add('active');
      document.body.classList.add('guide-active');

      if(menuEl) menuEl.classList.remove('active');
      if(footerEl) footerEl.classList.add('active');

      setTimeout(renderDialogueLine, 400);
    },

    summonMenu: function(){
      if(!overlayEl || isOpen) return;
      isOpen = true;
      mode = 'menu';

      if(summonEl) summonEl.classList.remove('guide-pulsing');

      overlayEl.classList.add('active');
      document.body.classList.add('guide-active');

      setTimeout(renderMenu, 400);
    },

    summonFarewell: function(message){
      if(!overlayEl) return;
      if(!isOpen){
        isOpen = true;
        overlayEl.classList.add('active');
        document.body.classList.add('guide-active');
      }
      mode = 'farewell';
      if(menuEl) menuEl.classList.remove('active');
      if(footerEl) footerEl.classList.remove('active');

      speakerNameEl.textContent = 'The Guide';
      dialogueTextEl.innerHTML = '';
      if(orbBodyEl) orbBodyEl.classList.add('speaking'); if(orbRaysEl) orbRaysEl.classList.add('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

      var full = message;
      var i = 0;
      if(typewriterTimeout) clearTimeout(typewriterTimeout);

      function tick(){
        if(i <= full.length){
          dialogueTextEl.innerHTML = full.substring(0, i) + '<span class="guide-cursor"></span>';
          i++;
          typewriterTimeout = setTimeout(tick, 28);
        } else {
          dialogueTextEl.innerHTML = full;
          if(orbBodyEl) orbBodyEl.classList.remove('speaking'); if(orbRaysEl) orbRaysEl.classList.remove('speaking');
          if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
          setTimeout(function(){
            if(overlayEl) overlayEl.classList.add('guide-fading');
            setTimeout(function(){
              Guide.dismiss();
              if(overlayEl) overlayEl.classList.remove('guide-fading');
            }, 800);
          }, 1200);
        }
      }
      tick();
    },

    dismiss: function(){
      if(!overlayEl) return;
      isOpen = false;

      if(typewriterTimeout){
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }

      overlayEl.classList.remove('active');
      document.body.classList.remove('guide-active');

      if(orbBodyEl) orbBodyEl.classList.remove('speaking'); if(orbRaysEl) orbRaysEl.classList.remove('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');

      try {
        localStorage.setItem('ga_guide_seen_' + config.chamber, '1');
      } catch(e){}
      hasBeenSeenThisChamber = true;
    },

    summon: function(){
      if(!hasBeenSeenThisChamber){
        Guide.summonDialogue();
      } else {
        Guide.summonMenu();
      }
    },

    reset: function(){
      try {
        localStorage.removeItem('ga_guide_seen_' + config.chamber);
      } catch(e){}
      location.reload();
    }
  };

  function buildDOM(){
    summonEl = document.createElement('button');
    summonEl.className = 'guide-summon';
    summonEl.setAttribute('aria-label', 'Summon the Guide');
    summonEl.setAttribute('title', 'Summon the Guide');
    summonEl.innerHTML = '<img src="shard.png" alt="" class="guide-summon-img" draggable="false"><span class="guide-summon-orb"></span>';
    summonEl.addEventListener('click', function(e){
      e.preventDefault();
      Guide.summon();
    });

    if(config.summonPosition){
      var sp = config.summonPosition;
      if(sp.bottom != null){
        summonEl.style.bottom = typeof sp.bottom === 'number' ? sp.bottom + 'px' : sp.bottom;
      }
      if(sp.right != null){
        summonEl.style.right = typeof sp.right === 'number' ? sp.right + 'px' : sp.right;
      }
      if(sp.left != null){
        summonEl.style.right = 'auto';
        summonEl.style.left = typeof sp.left === 'number' ? sp.left + 'px' : sp.left;
      }
      if(sp.top != null){
        summonEl.style.bottom = 'auto';
        summonEl.style.top = typeof sp.top === 'number' ? sp.top + 'px' : sp.top;
      }
    }
    document.body.appendChild(summonEl);

    overlayEl = document.createElement('div');
    overlayEl.className = 'guide-overlay';
    overlayEl.innerHTML = '' +
      '<div class="guide-overlay-bg"></div>' +
      '<button class="guide-close" aria-label="Dismiss the Guide" title="Dismiss">&times;</button>' +
      '<div class="guide-stage">' +
        '<div class="guide-aura"></div>' +
        '<div class="guide-shard">' +
          '<img src="shard.png" alt="" class="guide-shard-img" draggable="false">' +
          '<div class="guide-orb-wrap">' +
            '<div class="guide-orb-rays" id="guideOrbRays"></div>' +
            '<div class="guide-orb-aura"></div>' +
            '<div class="guide-orb-body" id="guideOrbBody">' +
              '<div class="guide-orb-core"></div>' +
              '<div class="guide-orb-center"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="guide-ember-layer" id="guideEmberLayer"></div>' +
      '</div>' +
      '<div class="guide-dialogue-box" id="guideDialogueBox">' +
        '<div class="guide-box-corners">' +
          '<span class="guide-corner guide-corner-tl"></span>' +
          '<span class="guide-corner guide-corner-tr"></span>' +
          '<span class="guide-corner guide-corner-bl"></span>' +
          '<span class="guide-corner guide-corner-br"></span>' +
        '</div>' +
        '<div class="guide-speaker" id="guideSpeaker">The Guide</div>' +
        '<div class="guide-text" id="guideText"></div>' +
        '<div class="guide-menu" id="guideMenu"></div>' +
        '<div class="guide-footer" id="guideFooter">' +
          '<div class="guide-progress" id="guideProgress"></div>' +
          '<button class="guide-continue" id="guideContinue">Continue</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlayEl);

    dialogueTextEl = document.getElementById('guideText');
    speakerNameEl = document.getElementById('guideSpeaker');
    progressEl = document.getElementById('guideProgress');
    continueBtn = document.getElementById('guideContinue');
    orbBodyEl = document.getElementById('guideOrbBody');
    orbRaysEl = document.getElementById('guideOrbRays');
    dialogueBoxEl = document.getElementById('guideDialogueBox');
    menuEl = document.getElementById('guideMenu');
    footerEl = document.getElementById('guideFooter');

    overlayEl.querySelector('.guide-close').addEventListener('click', function(){
      Guide.dismiss();
    });
    continueBtn.addEventListener('click', advanceDialogue);
    overlayEl.querySelector('.guide-overlay-bg').addEventListener('click', function(){
      Guide.dismiss();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && isOpen) Guide.dismiss();
    });

    startEmbers();
    startFlares();
  }

  function renderMenu(){
    speakerNameEl.textContent = 'The Guide';
    dialogueTextEl.innerHTML = '';
    if(footerEl) footerEl.classList.remove('active');

    if(orbBodyEl) orbBodyEl.classList.add('speaking'); if(orbRaysEl) orbRaysEl.classList.add('speaking');
    if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

    var greeting = 'How may I be of assistance, ascendant?';
    var i = 0;
    if(typewriterTimeout) clearTimeout(typewriterTimeout);

    function tick(){
      if(i <= greeting.length){
        dialogueTextEl.innerHTML = greeting.substring(0, i) + '<span class="guide-cursor"></span>';
        i++;
        typewriterTimeout = setTimeout(tick, 28);
      } else {
        dialogueTextEl.innerHTML = greeting;
        if(orbBodyEl) orbBodyEl.classList.remove('speaking'); if(orbRaysEl) orbRaysEl.classList.remove('speaking');
        if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
        showMenuOptions();
      }
    }
    tick();
  }

  function showMenuOptions(){
    if(!menuEl) return;
    menuEl.innerHTML = '' +
      '<button class="guide-menu-btn" data-action="explain">Explain how this page works again</button>' +
      '<button class="guide-menu-btn" data-action="dismiss">Nevermind, I will keep exploring</button>';
    menuEl.classList.add('active');

    var btns = menuEl.querySelectorAll('.guide-menu-btn');
    btns.forEach(function(btn, idx){
      btn.style.animationDelay = (idx * 0.12) + 's';
      btn.addEventListener('click', function(){
        var action = btn.getAttribute('data-action');
        handleMenuChoice(action);
      });
    });
  }

  function handleMenuChoice(action){
    if(menuEl){
      menuEl.classList.remove('active');
      menuEl.innerHTML = '';
    }

    if(action === 'explain'){
      runBridgeLine('Of course, ascendant.', function(){
        mode = 'dialogue';
        dialogueIndex = 0;
        if(footerEl) footerEl.classList.add('active');
        setTimeout(renderDialogueLine, 300);
      });
    } else if(action === 'dismiss'){
      Guide.summonFarewell('As you wish, ascendant.');
    }
  }

  function runBridgeLine(text, callback){
    speakerNameEl.textContent = 'The Guide';
    dialogueTextEl.innerHTML = '';
    if(orbBodyEl) orbBodyEl.classList.add('speaking'); if(orbRaysEl) orbRaysEl.classList.add('speaking');
    if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

    var i = 0;
    if(typewriterTimeout) clearTimeout(typewriterTimeout);

    function tick(){
      if(i <= text.length){
        dialogueTextEl.innerHTML = text.substring(0, i) + '<span class="guide-cursor"></span>';
        i++;
        typewriterTimeout = setTimeout(tick, 28);
      } else {
        dialogueTextEl.innerHTML = text;
        if(orbBodyEl) orbBodyEl.classList.remove('speaking'); if(orbRaysEl) orbRaysEl.classList.remove('speaking');
        if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
        setTimeout(callback, 600);
      }
    }
    tick();
  }

  function renderDialogueLine(){
    if(!config || !config.script || dialogueIndex >= config.script.length) return;
    var line = config.script[dialogueIndex];

    speakerNameEl.textContent = line.speaker || 'The Guide';
    dialogueTextEl.innerHTML = '';
    progressEl.textContent = (dialogueIndex + 1) + ' / ' + config.script.length;
    continueBtn.disabled = true;
    continueBtn.textContent = 'Continue';

    if(orbBodyEl) orbBodyEl.classList.add('speaking'); if(orbRaysEl) orbRaysEl.classList.add('speaking');
    if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

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
        if(orbBodyEl) orbBodyEl.classList.remove('speaking'); if(orbRaysEl) orbRaysEl.classList.remove('speaking');
        if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
        if(dialogueIndex === config.script.length - 1){
          continueBtn.textContent = 'Dismiss';
        }
      }
    }
    tick();
  }

  function advanceDialogue(){
    if(continueBtn.disabled){
      if(typewriterTimeout) clearTimeout(typewriterTimeout);
      dialogueTextEl.innerHTML = config.script[dialogueIndex].text;
      continueBtn.disabled = false;
      if(orbBodyEl) orbBodyEl.classList.remove('speaking'); if(orbRaysEl) orbRaysEl.classList.remove('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
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

  function startFlares(){
    // Occasional "thinking" flare every 8-10 seconds while the Guide is visible
    function scheduleFlare(){
      var delay = 7500 + Math.random() * 3500;
      setTimeout(function(){
        if(isOpen && orbBodyEl){
          orbBodyEl.classList.add('flare');
          setTimeout(function(){
            if(orbBodyEl) orbBodyEl.classList.remove('flare');
          }, 850);
        }
        scheduleFlare();
      }, delay);
    }
    scheduleFlare();
  }

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


  var stylesInjected = false;
  function injectStyles(){
    if(stylesInjected) return;
    stylesInjected = true;

    var style = document.createElement('style');
    style.id = 'guide-styles';
    style.textContent = '' +
      '.guide-summon{position:fixed;bottom:20px;right:20px;width:64px;height:64px;' +
        'background:transparent;border:none;cursor:pointer;z-index:9998;padding:0;' +
        'display:flex;align-items:center;justify-content:center;' +
        'filter:drop-shadow(0 0 12px rgba(157,139,255,0.35));' +
        'transition:filter .3s,transform .3s;will-change:filter,transform}' +
      '.guide-summon:hover{filter:drop-shadow(0 0 20px rgba(201,168,76,0.55));transform:scale(1.08)}' +
      '.guide-summon.guide-pulsing{animation:guide-summon-pulse 2.4s ease-in-out infinite}' +
      '@keyframes guide-summon-pulse{0%,100%{filter:drop-shadow(0 0 12px rgba(157,139,255,0.35))}' +
        '50%{filter:drop-shadow(0 0 24px rgba(201,168,76,0.65)) drop-shadow(0 0 40px rgba(157,139,255,0.4))}}' +
      '.guide-summon .guide-summon-img{width:100%;height:100%;display:block;object-fit:contain;' +
        'filter:drop-shadow(0 0 8px rgba(157,139,255,0.5))}' +
      '.guide-summon .guide-summon-orb{position:absolute;top:43%;left:51%;transform:translate(-50%,-50%);' +
        'width:8px;height:8px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(255,248,220,1) 0%,rgba(255,230,170,0.8) 40%,rgba(201,168,76,0.3) 70%,transparent 100%);' +
        'filter:blur(0.5px);' +
        'box-shadow:0 0 8px rgba(255,240,200,0.8),0 0 14px rgba(201,168,76,0.5);' +
        'animation:guide-summon-orb-breathe 3s ease-in-out infinite;pointer-events:none}' +
      '@keyframes guide-summon-orb-breathe{0%,100%{opacity:0.85;transform:translate(-50%,-50%) scale(1)}' +
        '50%{opacity:1;transform:translate(-50%,-50%) scale(1.25)}}' +

      '.guide-overlay{position:fixed;inset:0;z-index:9999;opacity:0;pointer-events:none;' +
        'transition:opacity .6s ease;display:flex;flex-direction:column;align-items:center;' +
        'justify-content:center;padding:60px 20px 30px;overflow-y:auto}' +
      '.guide-overlay.active{opacity:1;pointer-events:auto}' +
      '.guide-overlay.guide-fading{opacity:0;transition:opacity .8s ease}' +
      '.guide-overlay-bg{position:absolute;inset:0;background:rgba(4,4,10,0.92);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:0;cursor:pointer}' +
      '.guide-close{position:absolute;top:16px;right:16px;width:36px;height:36px;' +
        'background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.55);' +
        'border-radius:50%;font-size:20px;cursor:pointer;z-index:2;transition:all .2s;' +
        'display:flex;align-items:center;justify-content:center;line-height:1;padding:0;' +
        'font-family:sans-serif}' +
      '.guide-close:hover{border-color:rgba(201,168,76,0.5);color:#c9a84c}' +

      // Stage: shard PNG positioned, orb floating inside the hollow
      '.guide-stage{position:relative;width:min(340px,75vw);height:min(520px,62vh);' +
        'display:flex;align-items:center;justify-content:center;z-index:1;margin-bottom:16px}' +
      '.guide-aura{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:130%;height:85%;border-radius:50%;' +
        'background:radial-gradient(ellipse,rgba(157,139,255,0.18) 0%,rgba(127,119,221,0.08) 40%,transparent 70%);' +
        'z-index:1;filter:blur(20px);pointer-events:none;' +
        'animation:guide-aura-breathe 5s ease-in-out infinite}' +
      '@keyframes guide-aura-breathe{0%,100%{opacity:0.55;transform:translate(-50%,-50%) scale(1)}' +
        '50%{opacity:0.85;transform:translate(-50%,-50%) scale(1.06)}}' +

      // The shard PNG, floating gently
      '.guide-shard{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:100%;height:100%;z-index:2;pointer-events:none;' +
        'filter:drop-shadow(0 0 24px rgba(157,139,255,0.35));' +
        'animation:guide-shard-float 7s ease-in-out infinite}' +
      '.guide-shard-img{width:100%;height:100%;object-fit:contain;display:block;' +
        'mix-blend-mode:screen}' +
      '@keyframes guide-shard-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}' +
        '50%{transform:translate(-50%,-50%) translateY(-8px)}}' +

      // Orb wrap: anchored to the hollow center (51.3% x, 43.2% y of the shard PNG)
      '.guide-orb-wrap{position:absolute;top:43.2%;left:51.3%;transform:translate(-50%,-50%);' +
        'width:18%;height:12%;z-index:3;pointer-events:none}' +

      // Light rays radiating out from the orb into the cavity walls
      '.guide-orb-rays{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:260%;height:260%;border-radius:50%;pointer-events:none;' +
        'background:' +
          'conic-gradient(from 0deg,' +
            'transparent 0deg,rgba(255,240,200,0.18) 5deg,transparent 20deg,' +
            'transparent 40deg,rgba(255,240,200,0.14) 48deg,transparent 60deg,' +
            'transparent 90deg,rgba(255,240,200,0.2) 95deg,transparent 110deg,' +
            'transparent 135deg,rgba(255,240,200,0.12) 142deg,transparent 160deg,' +
            'transparent 180deg,rgba(255,240,200,0.18) 185deg,transparent 200deg,' +
            'transparent 225deg,rgba(255,240,200,0.14) 232deg,transparent 250deg,' +
            'transparent 270deg,rgba(255,240,200,0.2) 275deg,transparent 295deg,' +
            'transparent 315deg,rgba(255,240,200,0.12) 322deg,transparent 340deg,' +
            'transparent 360deg);' +
        'mask:radial-gradient(circle,black 15%,transparent 55%);' +
        '-webkit-mask:radial-gradient(circle,black 15%,transparent 55%);' +
        'filter:blur(1.5px);opacity:0.6;' +
        'animation:guide-orb-rays-rotate 40s linear infinite,guide-orb-rays-fade 5s ease-in-out infinite;' +
        'mix-blend-mode:screen}' +
      '@keyframes guide-orb-rays-rotate{from{transform:translate(-50%,-50%) rotate(0deg)}' +
        'to{transform:translate(-50%,-50%) rotate(360deg)}}' +
      '@keyframes guide-orb-rays-fade{0%,100%{opacity:0.35}50%{opacity:0.7}}' +
      '.guide-orb-rays.speaking{animation:guide-orb-rays-rotate 40s linear infinite,guide-orb-rays-fade-speak 1.4s ease-in-out infinite;opacity:0.9}' +
      '@keyframes guide-orb-rays-fade-speak{0%,100%{opacity:0.7}50%{opacity:1}}' +

      // Soft outer aura around the orb — bleeds into the cavity
      '.guide-orb-aura{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:200%;height:200%;border-radius:50%;pointer-events:none;' +
        'background:radial-gradient(circle,' +
          'rgba(255,240,200,0.45) 0%,' +
          'rgba(255,220,150,0.22) 20%,' +
          'rgba(201,168,76,0.1) 45%,' +
          'transparent 75%);' +
        'filter:blur(6px);mix-blend-mode:screen;' +
        'animation:guide-orb-aura-breathe 4s ease-in-out infinite}' +
      '@keyframes guide-orb-aura-breathe{0%,100%{opacity:0.75;transform:translate(-50%,-50%) scale(1)}' +
        '50%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}}' +

      // The orb body — the main visible luminous presence
      '.guide-orb-body{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:100%;height:150%;pointer-events:none;' +
        'animation:guide-orb-breathe 4s ease-in-out infinite;' +
        'will-change:transform,opacity}' +
      '@keyframes guide-orb-breathe{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.88}' +
        '50%{transform:translate(-50%,-50%) scale(1.08);opacity:1}}' +
      '.guide-orb-body.speaking{animation:guide-orb-breathe-speak 1.4s ease-in-out infinite}' +
      '@keyframes guide-orb-breathe-speak{0%,100%{transform:translate(-50%,-50%) scale(1.12);opacity:0.95}' +
        '50%{transform:translate(-50%,-50%) scale(1.28);opacity:1}}' +

      // Occasional flare — triggered by JS class toggle
      '.guide-orb-body.flare{animation:guide-orb-flare 0.8s ease-out}' +
      '@keyframes guide-orb-flare{0%{transform:translate(-50%,-50%) scale(1);filter:brightness(1)}' +
        '40%{transform:translate(-50%,-50%) scale(1.3);filter:brightness(1.5)}' +
        '100%{transform:translate(-50%,-50%) scale(1);filter:brightness(1)}}' +

      // Main orb gradient body
      '.guide-orb-core{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:100%;height:100%;border-radius:50%;' +
        'background:radial-gradient(circle,' +
          'rgba(255,248,220,1) 0%,' +
          'rgba(255,240,200,0.95) 15%,' +
          'rgba(255,220,140,0.7) 35%,' +
          'rgba(201,168,76,0.35) 60%,' +
          'transparent 85%);' +
        'filter:blur(3px);mix-blend-mode:screen}' +

      // Bright innermost pinprick
      '.guide-orb-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:20%;height:20%;border-radius:50%;' +
        'background:radial-gradient(circle,#fff8dc 0%,rgba(255,248,220,0.9) 40%,transparent 90%);' +
        'box-shadow:0 0 12px rgba(255,248,220,0.9),0 0 20px rgba(255,220,140,0.5);' +
        'filter:blur(0.5px)}' +


      '.guide-ember-layer{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible}' +
      '.guide-ember{position:absolute;width:3px;height:3px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(255,230,170,0.95) 0%,rgba(201,168,76,0.6) 50%,transparent 100%);' +
        'filter:blur(0.4px);opacity:0;animation:guide-ember-rise 7s ease-out forwards}' +
      '@keyframes guide-ember-rise{0%{opacity:0;transform:translate(0,0) scale(0.6)}' +
        '15%{opacity:0.9}60%{opacity:0.6}' +
        '100%{opacity:0;transform:translate(var(--drift,0px),-180px) scale(0.3)}}' +

      // TIER 3 DIALOGUE BOX
      '.guide-dialogue-box{width:100%;max-width:680px;' +
        'background:linear-gradient(180deg,rgba(15,12,28,0.92) 0%,rgba(8,8,20,0.92) 100%);' +
        'border:1px solid rgba(201,168,76,0.35);border-radius:4px;padding:26px 30px 22px;' +
        'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);position:relative;z-index:1;' +
        'box-shadow:0 0 40px rgba(157,139,255,0.2),' +
          '0 0 80px rgba(157,139,255,0.1),' +
          'inset 0 1px 0 rgba(255,240,200,0.08),' +
          'inset 0 0 60px rgba(157,139,255,0.05);' +
        'transition:box-shadow .4s ease}' +

      '.guide-box-corners{position:absolute;inset:0;pointer-events:none}' +
      '.guide-corner{position:absolute;width:14px;height:14px;border:1px solid rgba(201,168,76,0.7)}' +
      '.guide-corner-tl{top:-1px;left:-1px;border-right:none;border-bottom:none}' +
      '.guide-corner-tr{top:-1px;right:-1px;border-left:none;border-bottom:none}' +
      '.guide-corner-bl{bottom:-1px;left:-1px;border-right:none;border-top:none}' +
      '.guide-corner-br{bottom:-1px;right:-1px;border-left:none;border-top:none}' +

      '.guide-dialogue-box.guide-pulsing-text{animation:guide-box-pulse 1.4s ease-in-out infinite}' +
      '@keyframes guide-box-pulse{' +
        '0%,100%{box-shadow:0 0 40px rgba(157,139,255,0.2),0 0 80px rgba(157,139,255,0.1),inset 0 1px 0 rgba(255,240,200,0.08),inset 0 0 60px rgba(157,139,255,0.05)}' +
        '50%{box-shadow:0 0 60px rgba(201,168,76,0.3),0 0 120px rgba(201,168,76,0.15),inset 0 1px 0 rgba(255,240,200,0.15),inset 0 0 80px rgba(201,168,76,0.1)}' +
      '}' +

      '.guide-speaker{font-family:"Cinzel",serif;font-size:11px;letter-spacing:.3em;' +
        'color:rgba(201,168,76,0.9);text-transform:uppercase;margin-bottom:14px;' +
        'display:flex;align-items:center;gap:10px}' +
      '.guide-speaker::before{content:"";width:28px;height:1px;' +
        'background:linear-gradient(90deg,transparent,rgba(201,168,76,0.6))}' +
      '.guide-speaker::after{content:"";flex:1;height:1px;' +
        'background:linear-gradient(90deg,rgba(201,168,76,0.25),transparent)}' +
      '.guide-text{font-family:"DM Sans",sans-serif;font-size:15.5px;font-weight:300;' +
        'line-height:1.75;color:#f0ece4;min-height:100px}' +
      '.guide-text .guide-cursor{display:inline-block;width:8px;height:16px;background:#c9a84c;' +
        'margin-left:4px;vertical-align:middle;animation:guide-cursor-blink 0.8s ease-in-out infinite}' +
      '@keyframes guide-cursor-blink{0%,49%{opacity:1}50%,100%{opacity:0}}' +

      '.guide-menu{display:none;flex-direction:column;gap:10px;margin-top:18px}' +
      '.guide-menu.active{display:flex}' +
      '.guide-menu-btn{background:transparent;border:1px solid rgba(157,139,255,0.35);' +
        'color:rgba(240,236,228,0.9);font-family:"Cinzel",serif;font-size:13px;font-weight:400;' +
        'letter-spacing:.06em;padding:12px 18px;border-radius:3px;cursor:pointer;' +
        'transition:border-color .25s, color .25s, background .25s, transform .25s;' +
        'text-align:left;line-height:1.5;' +
        'opacity:0;animation:guide-menu-btn-in 0.5s ease forwards}' +
      '.guide-menu-btn:hover{border-color:rgba(201,168,76,0.7);color:#c9a84c;' +
        'background:rgba(201,168,76,0.06);transform:translateX(3px)}' +
      '@keyframes guide-menu-btn-in{from{opacity:0;transform:translateY(8px)}' +
        'to{opacity:1;transform:translateY(0)}}' +

      '.guide-footer{display:none;justify-content:space-between;align-items:center;' +
        'margin-top:14px;gap:12px;flex-wrap:wrap}' +
      '.guide-footer.active{display:flex}' +
      '.guide-progress{font-size:10px;color:rgba(240,236,228,0.3);letter-spacing:.15em;' +
        'font-family:"DM Sans",sans-serif;text-transform:uppercase}' +
      '.guide-continue{background:transparent;border:1px solid rgba(201,168,76,0.4);color:#c9a84c;' +
        'font-family:"Cinzel",serif;font-size:11px;font-weight:400;letter-spacing:.25em;' +
        'padding:9px 22px;border-radius:2px;cursor:pointer;text-transform:uppercase;' +
        'transition:all .2s;position:relative;overflow:hidden}' +
      '.guide-continue::before{content:"";position:absolute;top:50%;left:-100%;width:100%;height:1px;' +
        'background:linear-gradient(90deg,transparent,rgba(201,168,76,0.7),transparent);transition:left .5s}' +
      '.guide-continue:hover::before{left:100%}' +
      '.guide-continue:hover{border-color:#c9a84c;background:rgba(201,168,76,0.08);' +
        'box-shadow:0 0 16px rgba(201,168,76,0.2)}' +
      '.guide-continue:disabled{opacity:0.3;cursor:not-allowed}' +

      'body.guide-active{overflow:hidden}' +

      '@media(max-width:640px){' +
        '.guide-summon{bottom:16px;right:16px;width:56px;height:56px}' +
        '.guide-stage{width:min(260px,75vw);height:min(380px,48vh)}' +
        '.guide-dialogue-box{padding:20px 22px 18px}' +
        '.guide-text{font-size:14.5px}' +
        '.guide-menu-btn{font-size:12.5px;padding:11px 14px}' +
      '}';

    document.head.appendChild(style);
  }

  global.Guide = Guide;

})(typeof window !== 'undefined' ? window : this);
