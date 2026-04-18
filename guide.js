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

  // State for tap-to-skip: every typewriter function sets these before
  // running its tick(). completeCurrentTyping() reads them to finish the
  // current line instantly and fire the completion callback.
  var currentTypingFullText = '';
  var currentTypingCompletion = null;

  var summonEl = null;
  var overlayEl = null;
  var dialogueTextEl = null;
  var speakerNameEl = null;
  var progressEl = null;
  var continueBtn = null;
  var sigilEl = null;
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
      if(sigilEl) sigilEl.classList.add('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

      var full = message;
      var i = 0;
      if(typewriterTimeout) clearTimeout(typewriterTimeout);

      // Register for tap-to-skip
      currentTypingFullText = full;
      currentTypingCompletion = function(){
        dialogueTextEl.innerHTML = full;
        if(sigilEl) sigilEl.classList.remove('speaking');
        if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
        setTimeout(function(){
          if(overlayEl) overlayEl.classList.add('guide-fading');
          setTimeout(function(){
            Guide.dismiss();
            if(overlayEl) overlayEl.classList.remove('guide-fading');
          }, 800);
        }, 1200);
      };

      function tick(){
        if(i <= full.length){
          dialogueTextEl.innerHTML = full.substring(0, i) + '<span class="guide-cursor"></span>';
          i++;
          typewriterTimeout = setTimeout(tick, 28);
        } else {
          typewriterTimeout = null;
          currentTypingCompletion();
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

      if(sigilEl) sigilEl.classList.remove('speaking');
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
    summonEl.innerHTML = '<svg class="guide-summon-sigil" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
      // Simplified outer ring — 4 arc segments
      '<g class="guide-summon-ring">' +
        '<path d="M 50 10 A 40 40 0 0 1 80 30" fill="none" stroke="rgba(255,235,170,0.85)" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M 90 50 A 40 40 0 0 1 70 85" fill="none" stroke="rgba(255,235,170,0.85)" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M 50 90 A 40 40 0 0 1 20 70" fill="none" stroke="rgba(255,235,170,0.85)" stroke-width="1.2" stroke-linecap="round"/>' +
        '<path d="M 10 50 A 40 40 0 0 1 30 15" fill="none" stroke="rgba(255,235,170,0.85)" stroke-width="1.2" stroke-linecap="round"/>' +
      '</g>' +
      // Central almond eye
      '<path d="M 38 50 Q 50 42, 62 50" fill="none" stroke="rgba(255,245,200,1)" stroke-width="1.4" stroke-linecap="round"/>' +
      '<path d="M 38 50 Q 50 58, 62 50" fill="none" stroke="rgba(255,245,200,1)" stroke-width="1.4" stroke-linecap="round"/>' +
      '<circle cx="50" cy="50" r="1.8" fill="rgba(255,253,235,1)"/>' +
      // Four small anchor dots at cardinal positions
      '<circle cx="50" cy="10" r="1.6" fill="rgba(255,240,190,1)"/>' +
      '<circle cx="90" cy="50" r="1.6" fill="rgba(255,240,190,1)"/>' +
      '<circle cx="50" cy="90" r="1.6" fill="rgba(255,240,190,1)"/>' +
      '<circle cx="10" cy="50" r="1.6" fill="rgba(255,240,190,1)"/>' +
    '</svg>';
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
        '<div class="guide-sigil-wrap" id="guideSigilWrap">' +
          '<div class="guide-sigil-glow"></div>' +
          '<svg class="guide-sigil" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' +
              '<defs>' +
                '<filter id="sigilGlow" x="-50%" y="-50%" width="200%" height="200%">' +
                  '<feGaussianBlur stdDeviation="2.5" result="blur"/>' +
                  '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
                '</filter>' +
                '<radialGradient id="eyeGrad" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0%" stop-color="#f0e8ff" stop-opacity="1"/>' +
                  '<stop offset="35%" stop-color="#c5b8ff" stop-opacity="0.85"/>' +
                  '<stop offset="100%" stop-color="#7a6ad9" stop-opacity="0.25"/>' +
                '</radialGradient>' +
                '<radialGradient id="particleGrad" cx="50%" cy="50%" r="50%">' +
                  '<stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>' +
                  '<stop offset="40%" stop-color="#b8f8f8" stop-opacity="0.95"/>' +
                  '<stop offset="100%" stop-color="#5ad7e0" stop-opacity="0"/>' +
                '</radialGradient>' +
              '</defs>' +

              // ANCHOR POINTS & THREADS (held-together structure)
              '<g class="sm-anchors">' +
                '<line class="sm-thread sm-thread-ne" x1="312" y1="88" x2="250" y2="150" stroke="rgba(197,184,255,0.5)" stroke-width="1" stroke-linecap="round"/>' +
                '<line class="sm-thread sm-thread-se" x1="312" y1="312" x2="250" y2="250" stroke="rgba(197,184,255,0.5)" stroke-width="1" stroke-linecap="round"/>' +
                '<line class="sm-thread sm-thread-sw" x1="88" y1="312" x2="150" y2="250" stroke="rgba(197,184,255,0.5)" stroke-width="1" stroke-linecap="round"/>' +
                '<line class="sm-thread sm-thread-nw" x1="88" y1="88" x2="150" y2="150" stroke="rgba(197,184,255,0.5)" stroke-width="1" stroke-linecap="round"/>' +
                '<path class="sm-anchor sm-anchor-ne" d="M 312 80 L 320 88 L 312 96 L 304 88 Z" fill="rgba(224,216,240,1)" stroke="rgba(240,232,255,0.9)" stroke-width="0.7"/>' +
                '<path class="sm-anchor sm-anchor-se" d="M 312 320 L 320 312 L 312 304 L 304 312 Z" fill="rgba(224,216,240,1)" stroke="rgba(240,232,255,0.9)" stroke-width="0.7"/>' +
                '<path class="sm-anchor sm-anchor-sw" d="M 88 320 L 96 312 L 88 304 L 80 312 Z" fill="rgba(224,216,240,1)" stroke="rgba(240,232,255,0.9)" stroke-width="0.7"/>' +
                '<path class="sm-anchor sm-anchor-nw" d="M 88 80 L 96 88 L 88 96 L 80 88 Z" fill="rgba(224,216,240,1)" stroke="rgba(240,232,255,0.9)" stroke-width="0.7"/>' +
              '</g>' +

              // RUNIC MARKS drifting on perimeter
              '<g class="sm-runes">' +
                '<g class="sm-rune sm-rune-1" transform="rotate(0 200 200)"><circle cx="360" cy="200" r="2" fill="rgba(224,216,240,1)"/><circle cx="360" cy="200" r="4" fill="none" stroke="rgba(197,184,255,0.6)" stroke-width="0.5"/></g>' +
                '<g class="sm-rune sm-rune-2" transform="rotate(72 200 200)"><circle cx="360" cy="200" r="2" fill="rgba(224,216,240,1)"/><circle cx="360" cy="200" r="4" fill="none" stroke="rgba(197,184,255,0.6)" stroke-width="0.5"/></g>' +
                '<g class="sm-rune sm-rune-3" transform="rotate(144 200 200)"><circle cx="360" cy="200" r="2" fill="rgba(224,216,240,1)"/><circle cx="360" cy="200" r="4" fill="none" stroke="rgba(197,184,255,0.6)" stroke-width="0.5"/></g>' +
                '<g class="sm-rune sm-rune-4" transform="rotate(216 200 200)"><circle cx="360" cy="200" r="2" fill="rgba(224,216,240,1)"/><circle cx="360" cy="200" r="4" fill="none" stroke="rgba(197,184,255,0.6)" stroke-width="0.5"/></g>' +
                '<g class="sm-rune sm-rune-5" transform="rotate(288 200 200)"><circle cx="360" cy="200" r="2" fill="rgba(224,216,240,1)"/><circle cx="360" cy="200" r="4" fill="none" stroke="rgba(197,184,255,0.6)" stroke-width="0.5"/></g>' +
              '</g>' +

              // ORBITAL 1 (outermost, pentagon) — radius 160, slow
              '<g class="sm-orbit sm-orbit-1">' +
                '<g class="sm-shape" transform="translate(360 200)">' +
                  '<path d="M 0 -12 L 11.4 -3.7 L 7 9.7 L -7 9.7 L -11.4 -3.7 Z" fill="rgba(8,8,18,0.95)" stroke="rgba(125,245,245,0.95)" stroke-width="1.3" stroke-linejoin="round"/>' +
                  '<circle cx="0" cy="0" r="1.8" fill="rgba(200,250,250,1)"/>' +
                '</g>' +
              '</g>' +

              // ORBITAL 2 (triangle, clockwise) — radius 135
              '<g class="sm-orbit sm-orbit-2">' +
                '<g class="sm-shape" transform="translate(335 200)">' +
                  '<path d="M 0 -10 L 8.7 5 L -8.7 5 Z" fill="rgba(8,8,18,0.95)" stroke="rgba(125,245,245,0.95)" stroke-width="1.3" stroke-linejoin="round"/>' +
                  '<circle cx="0" cy="0" r="1.8" fill="rgba(200,250,250,1)"/>' +
                '</g>' +
              '</g>' +

              // ORBITAL 3 (square, counter-clockwise) — radius 115
              '<g class="sm-orbit sm-orbit-3">' +
                '<g class="sm-shape" transform="translate(315 200)">' +
                  '<rect x="-9" y="-9" width="18" height="18" fill="rgba(8,8,18,0.95)" stroke="rgba(125,245,245,0.95)" stroke-width="1.3" stroke-linejoin="round" rx="1"/>' +
                  '<circle cx="0" cy="0" r="1.8" fill="rgba(200,250,250,1)"/>' +
                '</g>' +
              '</g>' +

              // ORBITAL 4 (hexagon, clockwise faster) — radius 95
              '<g class="sm-orbit sm-orbit-4">' +
                '<g class="sm-shape" transform="translate(295 200)">' +
                  '<path d="M 8 0 L 4 6.93 L -4 6.93 L -8 0 L -4 -6.93 L 4 -6.93 Z" fill="rgba(8,8,18,0.95)" stroke="rgba(125,245,245,0.95)" stroke-width="1.3" stroke-linejoin="round"/>' +
                  '<circle cx="0" cy="0" r="1.8" fill="rgba(200,250,250,1)"/>' +
                '</g>' +
              '</g>' +

              // ORBITAL 5 (innermost, circle-with-ring, counter-clockwise) — radius 78
              '<g class="sm-orbit sm-orbit-5">' +
                '<g class="sm-shape" transform="translate(278 200)">' +
                  '<circle cx="0" cy="0" r="7" fill="rgba(8,8,18,0.95)" stroke="rgba(125,245,245,0.95)" stroke-width="1.3"/>' +
                  '<circle cx="0" cy="0" r="3" fill="rgba(200,250,250,1)"/>' +
                '</g>' +
              '</g>' +

              // PARTICLE LAYER — energy particles spawn here, animated by JS
              '<g class="sm-particles" id="smParticles"></g>' +

              // THE EYE — center stays fixed
              '<g class="sm-eye" filter="url(#sigilGlow)">' +
                // All elements that close during blink go in this inner group
                '<g class="sm-eye-lids">' +
                  '<path class="sm-eyelid sm-eyelid-upper" d="M 140 200 Q 200 165, 260 200" fill="none" stroke="rgba(197,184,255,0.55)" stroke-width="0.8" stroke-linecap="round"/>' +
                  '<path class="sm-eyelid sm-eyelid-lower" d="M 140 200 Q 200 235, 260 200" fill="none" stroke="rgba(197,184,255,0.55)" stroke-width="0.8" stroke-linecap="round"/>' +
                  '<ellipse class="sm-eye-halo" cx="200" cy="200" rx="55" ry="28" fill="url(#eyeGrad)" opacity="0.6"/>' +
                  '<path class="sm-eye-upper" d="M 156 200 Q 200 178, 244 200" fill="none" stroke="rgba(240,232,255,1)" stroke-width="1.8" stroke-linecap="round"/>' +
                  '<path class="sm-eye-lower" d="M 156 200 Q 200 222, 244 200" fill="none" stroke="rgba(240,232,255,1)" stroke-width="1.8" stroke-linecap="round"/>' +
                  '<circle class="sm-iris-ring" cx="200" cy="200" r="12" fill="none" stroke="rgba(224,216,240,0.5)" stroke-width="0.6"/>' +
                  '<circle class="sm-pupil" id="smPupil" cx="200" cy="200" r="5" fill="rgba(245,238,255,1)"/>' +
                  '<circle class="sm-eye-bright" cx="200" cy="200" r="1.8" fill="#ffffff"/>' +
                '</g>' +
              '</g>' +
            '</svg>' +
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
    sigilEl = document.getElementById('guideSigilWrap');
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

    // Tap-to-skip: clicking the dialogue box or the Sentinel Mark itself will
    // fast-forward through typing (or advance, if typing is complete). This
    // lets users pace the conversation themselves. The dim background and the
    // X button still dismiss the Guide entirely. Menu buttons and the
    // Continue button ignore these taps (closest() check).
    function handleSkipTap(e){
      if(e.target.closest('.guide-menu-btn, #guideContinue, .guide-close, a, button')) return;
      if(typewriterTimeout){
        completeCurrentTyping();
        return;
      }
      if(mode === 'dialogue'){
        advanceDialogue();
      }
    }
    if(dialogueBoxEl) dialogueBoxEl.addEventListener('click', handleSkipTap);
    if(sigilEl) sigilEl.addEventListener('click', handleSkipTap);

    // Called by handleSkipTap when user taps mid-typing. Cancels the active
    // typewriter, fills the dialogue with its full text, and runs whatever
    // completion callback the caller registered (which handles state cleanup,
    // menu reveal, dismiss chain, etc. depending on which typewriter was running).
    function completeCurrentTyping(){
      if(typewriterTimeout){
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }
      if(currentTypingCompletion){
        var cb = currentTypingCompletion;
        currentTypingCompletion = null;
        cb();
      }
    }

    startEmbers();
    startParticleFeeding();
    startEyeTracking();
    startBlinking();
  }

  function renderMenu(){
    speakerNameEl.textContent = 'The Guide';
    dialogueTextEl.innerHTML = '';
    if(footerEl) footerEl.classList.remove('active');

    if(sigilEl) sigilEl.classList.add('speaking');
    if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

    var greeting = 'How may I be of assistance, ascendant?';
    var i = 0;
    if(typewriterTimeout) clearTimeout(typewriterTimeout);

    // Register for tap-to-skip
    currentTypingFullText = greeting;
    currentTypingCompletion = function(){
      dialogueTextEl.innerHTML = greeting;
      if(sigilEl) sigilEl.classList.remove('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
      showMenuOptions();
    };

    function tick(){
      if(i <= greeting.length){
        dialogueTextEl.innerHTML = greeting.substring(0, i) + '<span class="guide-cursor"></span>';
        i++;
        typewriterTimeout = setTimeout(tick, 28);
      } else {
        typewriterTimeout = null;
        currentTypingCompletion();
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
    if(sigilEl) sigilEl.classList.add('speaking');
    if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

    var i = 0;
    if(typewriterTimeout) clearTimeout(typewriterTimeout);

    // Register for tap-to-skip
    currentTypingFullText = text;
    currentTypingCompletion = function(){
      dialogueTextEl.innerHTML = text;
      if(sigilEl) sigilEl.classList.remove('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
      setTimeout(callback, 600);
    };

    function tick(){
      if(i <= text.length){
        dialogueTextEl.innerHTML = text.substring(0, i) + '<span class="guide-cursor"></span>';
        i++;
        typewriterTimeout = setTimeout(tick, 28);
      } else {
        typewriterTimeout = null;
        currentTypingCompletion();
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

    if(sigilEl) sigilEl.classList.add('speaking');
    if(dialogueBoxEl) dialogueBoxEl.classList.add('guide-pulsing-text');

    var full = line.text;
    var i = 0;
    if(typewriterTimeout) clearTimeout(typewriterTimeout);

    // Register for tap-to-skip
    currentTypingFullText = full;
    currentTypingCompletion = function(){
      dialogueTextEl.innerHTML = full;
      continueBtn.disabled = false;
      if(sigilEl) sigilEl.classList.remove('speaking');
      if(dialogueBoxEl) dialogueBoxEl.classList.remove('guide-pulsing-text');
      if(dialogueIndex === config.script.length - 1){
        continueBtn.textContent = 'Dismiss';
      }
    };

    function tick(){
      if(i <= full.length){
        dialogueTextEl.innerHTML = full.substring(0, i) + '<span class="guide-cursor"></span>';
        i++;
        typewriterTimeout = setTimeout(tick, 22);
      } else {
        typewriterTimeout = null;
        currentTypingCompletion();
      }
    }
    tick();
  }

  function advanceDialogue(){
    if(continueBtn.disabled){
      if(typewriterTimeout) clearTimeout(typewriterTimeout);
      dialogueTextEl.innerHTML = config.script[dialogueIndex].text;
      continueBtn.disabled = false;
      if(sigilEl) sigilEl.classList.remove('speaking');
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

  // Energy particle feeding: periodically a random orbital shape releases a particle
  // that travels to the eye. We compute the shape's live position from elapsed time
  // and orbital period, since the SVG rotation is driven by CSS.
  var ORBITALS = [
    { radius: 160, period: 52000, dir:  1 },  // pentagon
    { radius: 135, period: 44000, dir: -1 },  // triangle
    { radius: 115, period: 36000, dir:  1 },  // square
    { radius:  95, period: 28000, dir: -1 },  // hexagon
    { radius:  78, period: 20000, dir:  1 }   // circle-with-ring
  ];

  function getShapePosition(orbitalIndex){
    var elapsed = Date.now() - stylesInjectedAt;
    var orb = ORBITALS[orbitalIndex];
    // Angle in radians based on elapsed time and orbital period
    var angleRad = orb.dir * (elapsed / orb.period) * 2 * Math.PI;
    var x = 200 + orb.radius * Math.cos(angleRad);
    var y = 200 + orb.radius * Math.sin(angleRad);
    return { x: x, y: y };
  }

  // Blinking — slow, contemplative eye closure
  var blinkingActive = false;

  function startBlinking(){
    if(blinkingActive) return;
    blinkingActive = true;

    function performBlink(onComplete){
      var eye = document.querySelector('.sm-eye');
      if(!eye){
        if(onComplete) setTimeout(onComplete, 0);
        return;
      }
      // Close
      eye.classList.remove('blink-opening');
      eye.classList.add('blinking');
      // Hold closed briefly at bottom of the blink, then open
      setTimeout(function(){
        eye.classList.remove('blinking');
        eye.classList.add('blink-opening');
        setTimeout(function(){
          eye.classList.remove('blink-opening');
          if(onComplete) onComplete();
        }, 500);
      }, 420);
    }

    function scheduleNextBlink(){
      if(!isOpen){
        setTimeout(scheduleNextBlink, 2000);
        return;
      }
      // Longer intervals for a contemplative being — 6 to 12 seconds between blinks
      var delay = 6000 + Math.random() * 6000;
      setTimeout(function(){
        performBlink(scheduleNextBlink);
      }, delay);
    }

    setTimeout(scheduleNextBlink, 3000);
  }

  // Eye tracking — pupil follows cursor, reverts to idle drift after inactivity
  var eyeTrackingActive = false;
  var pupilTargetX = 0, pupilTargetY = 0;
  var pupilCurrentX = 0, pupilCurrentY = 0;
  var lastMouseMoveTime = 0;
  var IDLE_TIMEOUT_MS = 1500;

  function startEyeTracking(){
    if(eyeTrackingActive) return;
    eyeTrackingActive = true;

    var svgEl = null;
    function getSvg(){
      if(!svgEl) svgEl = document.querySelector('.guide-sigil');
      return svgEl;
    }

    document.addEventListener('mousemove', function(e){
      if(!isOpen) return;
      var svg = getSvg();
      if(!svg) return;
      lastMouseMoveTime = Date.now();
      var rect = svg.getBoundingClientRect();
      var svgCenterX = rect.left + rect.width / 2;
      var svgCenterY = rect.top + rect.height / 2;
      var dx = e.clientX - svgCenterX;
      var dy = e.clientY - svgCenterY;
      var scaleX = 400 / rect.width;
      var scaleY = 400 / rect.height;
      var targetX = dx * scaleX;
      var targetY = dy * scaleY;
      var maxRange = 6;
      var dist = Math.sqrt(targetX * targetX + targetY * targetY);
      if(dist > 0){
        var eased = Math.min(dist / 150, 1);
        var factor = (maxRange * eased) / dist;
        pupilTargetX = targetX * factor;
        pupilTargetY = targetY * factor;
      } else {
        pupilTargetX = 0;
        pupilTargetY = 0;
      }
    });

    // Idle drift pattern: slow elliptical wander, returns cyclically
    // Generated parametrically from elapsed time so it's smooth and endless
    function computeIdleTarget(){
      var t = Date.now() / 1000;
      // Two overlapping sine waves at different frequencies — creates organic wandering
      var x = Math.sin(t * 0.35) * 3 + Math.sin(t * 0.17) * 1.5;
      var y = Math.cos(t * 0.29) * 2.2 + Math.sin(t * 0.13) * 1;
      return { x: x, y: y };
    }

    // Smooth follow loop — lerps current position toward either cursor target or idle target
    function followLoop(){
      if(!isOpen){
        requestAnimationFrame(followLoop);
        return;
      }
      var pupil = document.getElementById('smPupil');
      if(pupil){
        var now = Date.now();
        var isIdle = (now - lastMouseMoveTime) > IDLE_TIMEOUT_MS;
        var tx, ty;
        if(isIdle){
          var idle = computeIdleTarget();
          tx = idle.x;
          ty = idle.y;
        } else {
          tx = pupilTargetX;
          ty = pupilTargetY;
        }
        // Lerp: faster catch-up when tracking (0.08), slower when drifting (0.04) for calm feel
        var lerp = isIdle ? 0.04 : 0.08;
        pupilCurrentX += (tx - pupilCurrentX) * lerp;
        pupilCurrentY += (ty - pupilCurrentY) * lerp;
        pupil.style.transform = 'translate(' + pupilCurrentX.toFixed(2) + 'px,' + pupilCurrentY.toFixed(2) + 'px)';
      }
      requestAnimationFrame(followLoop);
    }
    requestAnimationFrame(followLoop);
  }

  function startParticleFeeding(){
    var svgNS = 'http://www.w3.org/2000/svg';

    // Fire one particle from a specific orbital toward the eye
    function fireParticle(idx, opts){
      opts = opts || {};
      var particleLayer = document.getElementById('smParticles');
      var pupil = document.getElementById('smPupil');
      if(!particleLayer || !pupil) return;
      if(idx < 0 || idx >= ORBITALS.length) return;

      var startPos = getShapePosition(idx);

      // Mark the source shape as "giving" so it dims briefly
      var sourceShape = document.querySelector('.sm-orbit-' + (idx + 1) + ' .sm-shape');
      if(sourceShape){
        sourceShape.classList.remove('giving');
        void sourceShape.offsetWidth; // reflow to restart animation
        sourceShape.classList.add('giving');
        setTimeout(function(){
          if(sourceShape) sourceShape.classList.remove('giving');
        }, 1600);
      }

      // Create particle at source position
      var particle = document.createElementNS(svgNS, 'circle');
      particle.setAttribute('class', 'sm-particle');
      particle.setAttribute('cx', startPos.x);
      particle.setAttribute('cy', startPos.y);
      particle.setAttribute('r', opts.startR || 2);
      particle.setAttribute('fill', 'url(#particleGrad)');
      particle.setAttribute('opacity', 0);
      particleLayer.appendChild(particle);

      var duration = opts.duration || 1800;
      var start = performance.now();
      var isBurst = !!opts.isBurst;
      var onArrive = opts.onArrive;

      function animate(now){
        var elapsed = now - start;
        var t = Math.min(elapsed / duration, 1);
        // Ease-in for gravitational "pull" feel
        var eased = t * t;
        var cx = startPos.x + (200 - startPos.x) * eased;
        var cy = startPos.y + (200 - startPos.y) * eased;
        particle.setAttribute('cx', cx);
        particle.setAttribute('cy', cy);

        // Opacity curve
        var op;
        if(t < 0.15) op = t / 0.15 * 0.9;
        else if(t < 0.85) op = 0.9 + (t - 0.15) / 0.7 * 0.1;
        else op = 1;
        particle.setAttribute('opacity', op);

        particle.setAttribute('r', (opts.startR || 2) + t * 2);

        if(t < 1){
          requestAnimationFrame(animate);
        } else {
          // Arrived — trigger pupil flash (unless burst handler takes over)
          if(!isBurst){
            pupil.classList.remove('absorbing');
            void pupil.offsetWidth;
            pupil.classList.add('absorbing');
            setTimeout(function(){
              if(pupil) pupil.classList.remove('absorbing');
            }, 500);
          }
          if(onArrive) onArrive();
          if(particle) particle.remove();
        }
      }
      requestAnimationFrame(animate);
    }

    // Fire a single random particle
    function fireSingle(){
      var idx = Math.floor(Math.random() * ORBITALS.length);
      fireParticle(idx);
    }

    // Fire from 3 random shapes with small stagger
    function fireMiniBurst(){
      var indices = [0,1,2,3,4].sort(function(){ return Math.random() - 0.5; }).slice(0, 3);
      indices.forEach(function(idx, i){
        setTimeout(function(){
          fireParticle(idx, { isBurst: true });
        }, i * 120);
      });
      // Eye flashes after last particle arrives (~1.8s + stagger)
      setTimeout(triggerBigAbsorb, 1800 + 240);
    }

    // Fire from ALL 5 shapes simultaneously — the full burst moment
    function fireFullBurst(){
      for(var i = 0; i < ORBITALS.length; i++){
        (function(idx){
          setTimeout(function(){
            fireParticle(idx, { isBurst: true, startR: 2.5 });
          }, idx * 60);
        })(i);
      }
      // Big absorb flash after particles arrive
      setTimeout(triggerBigAbsorb, 1800 + 300);
    }

    function triggerBigAbsorb(){
      var pupil = document.getElementById('smPupil');
      if(!pupil) return;
      pupil.classList.remove('absorbing');
      pupil.classList.remove('big-absorbing');
      void pupil.offsetWidth;
      pupil.classList.add('big-absorbing');
      setTimeout(function(){
        if(pupil) pupil.classList.remove('big-absorbing');
      }, 900);
    }

    // Scheduler — randomly picks event type on each tick
    function scheduleNext(){
      if(!isOpen){
        setTimeout(scheduleNext, 2000);
        return;
      }
      var roll = Math.random();
      // 45% single, 35% mini-burst, 20% full burst
      var delay;
      if(roll < 0.45){
        fireSingle();
        delay = 3500 + Math.random() * 3000;    // 3.5–6.5s
      } else if(roll < 0.80){
        fireMiniBurst();
        delay = 7000 + Math.random() * 4000;    // 7–11s
      } else {
        fireFullBurst();
        delay = 11000 + Math.random() * 6000;   // 11–17s
      }
      setTimeout(scheduleNext, delay);
    }

    // Initial delay before first event — shorter now
    setTimeout(scheduleNext, 2500);
  }


  var stylesInjected = false;
  var stylesInjectedAt = 0;
  function injectStyles(){
    if(stylesInjected) return;
    stylesInjected = true;
    stylesInjectedAt = Date.now();

    var style = document.createElement('style');
    style.id = 'guide-styles';
    style.textContent = '' +
      // Reset — defeat any inherited borders/outlines/shadows on Guide containers
      '.guide-stage,.guide-shard,.guide-shard-img,.guide-sigil-wrap{' +
        'border:none!important;outline:none!important;box-shadow:none!important;' +
        'background:transparent!important}' +

      '.guide-summon{position:fixed;bottom:20px;right:20px;width:64px;height:64px;' +
        'background:transparent;border:none;cursor:pointer;z-index:9998;padding:0;' +
        'display:flex;align-items:center;justify-content:center;' +
        'filter:drop-shadow(0 0 12px rgba(157,139,255,0.35));' +
        'transition:filter .3s,transform .3s;will-change:filter,transform}' +
      '.guide-summon:hover{filter:drop-shadow(0 0 20px rgba(201,168,76,0.55));transform:scale(1.08)}' +
      '.guide-summon.guide-pulsing{animation:guide-summon-pulse 2.4s ease-in-out infinite}' +
      '@keyframes guide-summon-pulse{0%,100%{filter:drop-shadow(0 0 12px rgba(157,139,255,0.35))}' +
        '50%{filter:drop-shadow(0 0 24px rgba(201,168,76,0.65)) drop-shadow(0 0 40px rgba(157,139,255,0.4))}}' +
      '.guide-summon .guide-summon-sigil{width:100%;height:100%;display:block;overflow:visible;' +
        'filter:drop-shadow(0 0 4px rgba(255,235,170,0.6)) drop-shadow(0 0 8px rgba(201,168,76,0.4))}' +
      '.guide-summon .guide-summon-ring{transform-origin:50px 50px;animation:guide-summon-ring-rotate 20s linear infinite}' +
      '@keyframes guide-summon-ring-rotate{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +

      '.guide-overlay{position:fixed;inset:0;z-index:9999;opacity:0;pointer-events:none;' +
        'transition:opacity .6s ease;padding:0;overflow:hidden}' +
      '.guide-overlay.active{opacity:1;pointer-events:auto}' +
      '.guide-overlay.guide-fading{opacity:0;transition:opacity .8s ease}' +
      '.guide-overlay-bg{position:absolute;inset:0;background:rgba(4,4,10,0.92);' +
        'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:0;cursor:pointer}' +
      '.guide-close{position:absolute;top:16px;right:16px;width:36px;height:36px;' +
        'background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.55);' +
        'border-radius:50%;font-size:20px;cursor:pointer;z-index:2;transition:all .2s;' +
        'display:flex;align-items:center;justify-content:center;line-height:1;padding:0;' +
        'font-family:sans-serif;outline:none;box-shadow:none}' +
      '.guide-close:focus,.guide-close:focus-visible{outline:none;box-shadow:none}' +
      '.guide-close:hover{border-color:rgba(201,168,76,0.5);color:#c9a84c}' +

      // Stage: ABSOLUTELY positioned at the top — never moves regardless of dialogue content
      '.guide-stage{position:absolute;top:12%;left:50%;transform:translateX(-50%);' +
        'width:min(380px,78vw);height:min(500px,54vh);' +
        'display:flex;align-items:center;justify-content:center;z-index:1;' +
        'border:none;outline:none;background:transparent;box-shadow:none;' +
        'contain:layout style;pointer-events:none}' +
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
        'animation:guide-shard-float 7s ease-in-out infinite;' +
        'border:none;outline:none;background:transparent;box-shadow:none}' +
      '.guide-shard-img{width:100%;height:100%;object-fit:contain;display:block;' +
        'border:none;outline:none;box-shadow:none;background:transparent;' +
        'mix-blend-mode:normal}' +
      '@keyframes guide-shard-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}' +
        '50%{transform:translate(-50%,-50%) translateY(-8px)}}' +

      // SENTINEL MARK: the Guide as a living sigil, contained within the stage
      '.guide-sigil-wrap{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:85%;height:85%;z-index:3;pointer-events:none;' +
        'display:flex;align-items:center;justify-content:center;' +
        'contain:layout style;' +
        'animation:sm-float 8s ease-in-out infinite}' +
      '@keyframes sm-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}' +
        '50%{transform:translate(-50%,-50%) translateY(-5px)}}' +

      // Ambient glow behind the whole mark — violet
      '.guide-sigil-glow{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'width:140%;height:140%;border-radius:50%;pointer-events:none;' +
        'background:radial-gradient(circle,' +
          'rgba(197,184,255,0.3) 0%,' +
          'rgba(157,139,255,0.18) 25%,' +
          'rgba(122,106,217,0.1) 55%,' +
          'rgba(80,60,160,0.05) 75%,' +
          'transparent 90%);' +
        'filter:blur(22px);mix-blend-mode:screen;' +
        'opacity:0.75;transition:opacity 1.5s ease;' +
        'animation:sm-glow-breathe 6s ease-in-out infinite}' +
      '@keyframes sm-glow-breathe{0%,100%{transform:translate(-50%,-50%) scale(1)}' +
        '50%{transform:translate(-50%,-50%) scale(1.04)}}' +
      '.guide-sigil-wrap.speaking .guide-sigil-glow{opacity:0.95}' +

      // The whole SVG — gentle opacity breathing only
      '.guide-sigil{position:relative;width:100%;height:100%;z-index:2;overflow:visible;' +
        'filter:drop-shadow(0 0 4px rgba(197,184,255,0.55)) drop-shadow(0 0 12px rgba(157,139,255,0.35));' +
        'will-change:filter;transition:filter 1.5s ease;' +
        'animation:sm-wrap-breathe 9s ease-in-out infinite}' +
      '@keyframes sm-wrap-breathe{0%,100%{opacity:0.92}50%{opacity:1}}' +
      '.guide-sigil-wrap.speaking .guide-sigil{filter:drop-shadow(0 0 6px rgba(224,216,240,0.85)) drop-shadow(0 0 16px rgba(197,184,255,0.5)) drop-shadow(0 0 28px rgba(157,139,255,0.3))}' +

      // ===== 5 ORBITALS — invisible paths, shapes orbit around the eye =====
      // Each orbital is a group that rotates around center (200, 200).
      // The shape inside is positioned at the orbit radius from center.
      // Alternating directions so adjacent orbitals counter-rotate.
      '.sm-orbit{transform-origin:200px 200px}' +
      '.sm-orbit-1{animation:sm-rot-cw 52s linear infinite}' +    // pentagon, outermost, slowest
      '.sm-orbit-2{animation:sm-rot-ccw 44s linear infinite}' +   // triangle, counter-rotating
      '.sm-orbit-3{animation:sm-rot-cw 36s linear infinite}' +    // square
      '.sm-orbit-4{animation:sm-rot-ccw 28s linear infinite}' +   // hexagon
      '.sm-orbit-5{animation:sm-rot-cw 20s linear infinite}' +    // circle-with-ring, innermost, fastest
      '@keyframes sm-rot-cw{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes sm-rot-ccw{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}' +

      // Speaking state does NOT change orbital speeds — changing animation-duration
      // mid-animation causes position jumps. Keep orbits constant, express speaking
      // through the glow/filter/particles only.

      // Shapes rotate naturally with their orbit — no counter-rotation
      // (Previously had counter-rotation but it conflicted with the translate transform)

      // Shapes subtly fade — but NOT in lockstep
      '.sm-orbit-1 .sm-shape{opacity:0.85}' +
      '.sm-orbit-2 .sm-shape{opacity:0.9}' +
      '.sm-orbit-3 .sm-shape{opacity:0.85}' +
      '.sm-orbit-4 .sm-shape{opacity:0.9}' +
      '.sm-orbit-5 .sm-shape{opacity:0.9}' +

      // Shape "giving" state — when a particle spawns from them, they dim briefly
      '.sm-shape.giving{animation:sm-shape-give 1.6s ease-out}' +
      '@keyframes sm-shape-give{0%{opacity:1}30%{opacity:0.35}100%{opacity:0.9}}' +

      // ===== PARTICLES =====
      '.sm-particle{animation:sm-particle-travel 1.8s ease-in forwards}' +
      '@keyframes sm-particle-travel{' +
        '0%{opacity:0;r:1}' +
        '15%{opacity:0.9;r:3}' +
        '85%{opacity:1;r:4}' +
        '100%{opacity:0;r:1}' +
      '}' +

      // When particle arrives, eye pupil flashes
      '.sm-pupil.absorbing{animation:sm-pupil-absorb 0.5s ease-out !important}' +
      '@keyframes sm-pupil-absorb{' +
        '0%{r:5;fill:rgba(245,238,255,1);filter:brightness(1)}' +
        '40%{r:7.5;fill:rgba(255,255,255,1);filter:brightness(1.8)}' +
        '100%{r:5;fill:rgba(245,238,255,1);filter:brightness(1)}' +
      '}' +

      // Big absorb — fires when a mini-burst or full burst of particles lands
      '.sm-pupil.big-absorbing{animation:sm-pupil-big-absorb 0.9s ease-out !important}' +
      '@keyframes sm-pupil-big-absorb{' +
        '0%{r:5;fill:rgba(245,238,255,1);filter:brightness(1)}' +
        '30%{r:11;fill:rgba(255,255,255,1);filter:brightness(2.5) drop-shadow(0 0 12px rgba(200,250,250,1))}' +
        '60%{r:8;fill:rgba(240,252,255,1);filter:brightness(1.6)}' +
        '100%{r:5;fill:rgba(245,238,255,1);filter:brightness(1)}' +
      '}' +

      // ===== RUNES drift on perimeter =====
      '.sm-runes{transform-origin:200px 200px;animation:sm-runes-drift 90s linear infinite}' +
      '@keyframes sm-runes-drift{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '.sm-rune{animation:sm-rune-fade 6s ease-in-out infinite}' +
      '.sm-rune-1{animation-delay:0s}' +
      '.sm-rune-2{animation-delay:1.2s}' +
      '.sm-rune-3{animation-delay:2.4s}' +
      '.sm-rune-4{animation-delay:3.6s}' +
      '.sm-rune-5{animation-delay:4.8s}' +
      '@keyframes sm-rune-fade{0%,100%{opacity:0.45}50%{opacity:0.9}}' +

      // ===== ANCHORS =====
      '.sm-anchor{transform-origin:center;animation:sm-anchor-breathe 5s ease-in-out infinite}' +
      '.sm-anchor-ne{animation-delay:0s}' +
      '.sm-anchor-se{animation-delay:1.25s}' +
      '.sm-anchor-sw{animation-delay:2.5s}' +
      '.sm-anchor-nw{animation-delay:3.75s}' +
      '@keyframes sm-anchor-breathe{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.1)}}' +

      // ===== THREADS (quieter without the pulse-along-line flashiness) =====
      '.sm-thread{animation:sm-thread-fade 8s ease-in-out infinite}' +
      '.sm-thread-ne{animation-delay:0s}' +
      '.sm-thread-se{animation-delay:2s}' +
      '.sm-thread-sw{animation-delay:4s}' +
      '.sm-thread-nw{animation-delay:6s}' +
      '@keyframes sm-thread-fade{0%,100%{opacity:0.4}50%{opacity:0.8}}' +

      // ===== EYELIDS =====
      '.sm-eyelid{transform-origin:200px 200px;animation:sm-eyelid-drift 11s ease-in-out infinite}' +
      '.sm-eyelid-lower{animation-delay:5.5s}' +
      '@keyframes sm-eyelid-drift{0%,100%{opacity:0.55}50%{opacity:0.85}}' +

      // ===== EYE stays fixed =====
      '.sm-eye{transform-origin:200px 200px}' +

      // ===== PUPIL — position driven by JS (eye tracking); transform-origin centered =====
      '.sm-pupil{transform-origin:200px 200px;transition:r 0.3s ease,fill 0.3s ease}' +

      // ===== BLINK MECHANICS =====
      // Slow, gradual close — reads as "contemplative" rather than human snap-blink
      '.sm-eye-lids{transform-origin:200px 200px;transform-box:view-box;transition:transform 360ms ease-in-out}' +
      '.sm-eye.blinking .sm-eye-lids{transform:scaleY(0.02);transition:transform 360ms ease-in-out}' +
      '.sm-eye.blink-opening .sm-eye-lids{transform:scaleY(1);transition:transform 480ms ease-in-out}' +


      '.guide-ember-layer{position:absolute;inset:0;pointer-events:none;z-index:5;overflow:visible}' +
      '.guide-ember{position:absolute;width:3px;height:3px;border-radius:50%;' +
        'background:radial-gradient(circle,rgba(255,230,170,0.95) 0%,rgba(201,168,76,0.6) 50%,transparent 100%);' +
        'filter:blur(0.4px);opacity:0;animation:guide-ember-rise 7s ease-out forwards}' +
      '@keyframes guide-ember-rise{0%{opacity:0;transform:translate(0,0) scale(0.6)}' +
        '15%{opacity:0.9}60%{opacity:0.6}' +
        '100%{opacity:0;transform:translate(var(--drift,0px),-180px) scale(0.3)}}' +

      // TIER 3 DIALOGUE BOX
      // Dialogue: ABSOLUTELY anchored to bottom of overlay, independent of stage
      '.guide-dialogue-box{position:absolute;bottom:5%;left:50%;transform:translateX(-50%);' +
        'width:calc(100% - 40px);max-width:680px;' +
        'min-height:180px;' +
        'background:linear-gradient(180deg,rgba(15,12,28,0.92) 0%,rgba(8,8,20,0.92) 100%);' +
        'border:1px solid rgba(201,168,76,0.35);border-radius:4px;padding:26px 30px 22px;' +
        'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:1;' +
        'box-shadow:0 0 40px rgba(157,139,255,0.2),' +
          '0 0 80px rgba(157,139,255,0.1),' +
          'inset 0 1px 0 rgba(255,240,200,0.08),' +
          'inset 0 0 60px rgba(157,139,255,0.05);' +
        'transition:box-shadow .4s ease;' +
        'display:flex;flex-direction:column}' +

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
        '.guide-stage{width:min(320px,80vw);height:min(460px,52vh)}' +
        '.guide-dialogue-box{padding:20px 22px 18px}' +
        '.guide-text{font-size:14.5px}' +
        '.guide-menu-btn{font-size:12.5px;padding:11px 14px}' +
      '}';

    document.head.appendChild(style);
  }

  global.Guide = Guide;

})(typeof window !== 'undefined' ? window : this);
