/*
 * Aurelius — Gamer Ascension
 *
 * Astral vessel of the Crafted (species shared with The Guide), assigned
 * to the Scriptorium. Where Guide is the teacher in the Atheneum,
 * Aurelius is the steward of reflective practice here in the Scriptorium.
 *
 * Deep canon notes:
 *   - Same species as Guide. The structural anatomy is parallel:
 *     anchors/threads, runic perimeter marks, orbital shapes, a central eye.
 *   - Visually differentiated by purpose. Guide's palette is violet/cyan
 *     (starlight/cerebral); Aurelius's is amber/gold (firelight/contemplative).
 *     Guide's orbitals are varied polygons (pentagon/triangle/square/hexagon/
 *     inner-circle) representing the variety of what is taught; Aurelius's
 *     orbitals are concentric rings of varying thickness, each breathing at a
 *     different rate, because he holds a single kind of space rather than
 *     teaching varied content.
 *   - Eye is vertical slit (inward-watching) rather than horizontal almond
 *     (outward-teaching). Guide sees the Ascendant; Aurelius watches the
 *     writing happen.
 *   - Three anchors in triangle (writer, page, witness) rather than Guide's
 *     four cardinal anchors.
 *   - Seven runic perimeter marks for the seven days of the week (the
 *     cyclical daily-return of the journaling practice).
 *   - Animation rhythm is slow and breath-like rather than Guide's counter-
 *     rotating complexity. Aurelius is a meditative presence, not an active
 *     agent.
 *
 * Usage:
 *   Include via script tag: src equals "aurelius.js"
 *   Then call Aurelius.init with config:
 *     - chamber: unique storage key (e.g. "scriptorium")
 *     - chamberName: display name ("The Scriptorium")
 *     - script: array of dialogue lines for first visit
 *     - autoSummonDelay: ms delay for first-visit auto-summon (default 1500)
 *
 *   For one-off dialogues at milestones:
 *     Aurelius.summonOneOff([{speaker: 'Aurelius', text: '...'}, ...])
 */

(function(global){
  'use strict';

  var config = null;
  var dialogueIndex = 0;
  var typewriterTimeout = null;
  var isOpen = false;

  // Tap-to-skip: typewriter functions set these so the completion handler
  // can finish the current line instantly if the user taps mid-typing.
  var currentTypingFullText = '';
  var currentTypingCompletion = null;

  var summonEl = null;
  var overlayEl = null;
  var dialogueTextEl = null;
  var speakerNameEl = null;
  var progressEl = null;
  var continueBtn = null;
  var sigilEl = null;

  var Aurelius = {
    init: function(userConfig){
      config = userConfig || {};
      if(!config.chamber || !Array.isArray(config.script)){
        console.warn('Aurelius.init: missing chamber or script');
        return;
      }

      injectStyles();
      buildDOM();
      bindEvents();

      // Auto-summon on first visit. Subsequent visits are quiet — no
      // auto-dialogue, the user can summon by clicking the persistent
      // sigil if they want him.
      try {
        var seen = localStorage.getItem('ga_aurelius_seen_' + config.chamber);
        if(seen !== '1'){
          var delay = (typeof config.autoSummonDelay === 'number') ? config.autoSummonDelay : 1500;
          setTimeout(function(){ Aurelius.summon(); }, delay);
        }
      } catch(e){}
    },

    // Summon the vessel with the default first-visit script.
    summon: function(){
      if(!overlayEl || isOpen) return;
      isOpen = true;
      dialogueIndex = 0;

      overlayEl.classList.add('active');
      document.body.classList.add('aurelius-active');

      // Mark as seen so subsequent page loads don't auto-summon.
      try { localStorage.setItem('ga_aurelius_seen_' + config.chamber, '1'); } catch(e){}

      setTimeout(renderDialogueLine, 500);
    },

    // Play a custom dialogue line set (e.g., session milestone lines).
    // Does not overwrite the default script.
    summonOneOff: function(scriptLines){
      if(!overlayEl || isOpen) return;
      if(!Array.isArray(scriptLines) || scriptLines.length === 0) return;

      isOpen = true;
      dialogueIndex = 0;

      // Temporarily swap in the one-off script. Restored on dismiss.
      var savedScript = config.script;
      config.script = scriptLines;
      config._restoreScriptOnDismiss = savedScript;

      overlayEl.classList.add('active');
      document.body.classList.add('aurelius-active');

      setTimeout(renderDialogueLine, 500);
    },

    // Manually clear the "seen" flag. Useful for dev reset.
    reset: function(){
      try { localStorage.removeItem('ga_aurelius_seen_' + config.chamber); } catch(e){}
      location.reload();
    }
  };

  // ==================================================================
  // DOM construction
  // ==================================================================

  function buildDOM(){
    // Persistent summon button — a small sigil in a fixed corner, always
    // visible on Scriptorium pages. Clicking re-invokes Aurelius.
    summonEl = document.createElement('button');
    summonEl.className = 'aurelius-summon';
    summonEl.id = 'aureliusSummon';
    summonEl.setAttribute('aria-label', 'Summon Aurelius');
    summonEl.setAttribute('title', 'Summon Aurelius');
    summonEl.innerHTML =
      '<svg class="aurelius-summon-sigil" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="aureliusSummonIris" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0%" stop-color="#fff4c8" stop-opacity="1"/>' +
            '<stop offset="18%" stop-color="#f5c85a" stop-opacity="1"/>' +
            '<stop offset="50%" stop-color="#b58a2f" stop-opacity="1"/>' +
            '<stop offset="85%" stop-color="#6b4818" stop-opacity="1"/>' +
            '<stop offset="100%" stop-color="#2a1a08" stop-opacity="1"/>' +
          '</radialGradient>' +
        '</defs>' +
        // Concentric gold rings with black underlay (matches main sigil aesthetic)
        '<circle cx="50" cy="50" r="38" fill="none" stroke="#000000" stroke-width="2" opacity="0.7"/>' +
        '<circle cx="50" cy="50" r="38" fill="none" stroke="rgba(229,197,116,0.5)" stroke-width="1"/>' +
        '<circle cx="50" cy="50" r="28" fill="none" stroke="#000000" stroke-width="1.8" opacity="0.7"/>' +
        '<circle cx="50" cy="50" r="28" fill="none" stroke="rgba(229,197,116,0.7)" stroke-width="0.9"/>' +
        // Socket backing for the eye
        '<ellipse cx="50" cy="50" rx="8" ry="15" fill="#0a0604" opacity="0.85"/>' +
        // Sclera + iris
        '<ellipse cx="50" cy="50" rx="5" ry="11" fill="url(#aureliusSummonIris)"/>' +
        // Pupil
        '<ellipse cx="50" cy="50" rx="1.5" ry="5" fill="#000000"/>' +
        // Highlight
        '<circle cx="50.8" cy="47.5" r="0.6" fill="#ffffff"/>' +
        // Eye outline
        '<path d="M 50 39 Q 42 50, 50 61 Q 58 50, 50 39 Z" fill="none" stroke="rgba(245,238,204,0.9)" stroke-width="0.8"/>' +
      '</svg>';
    document.body.appendChild(summonEl);

    // The full overlay — stage + dialogue box. Hidden by default, active
    // class shown on summon. Body-level so it sits above all Scriptorium UI.
    overlayEl = document.createElement('div');
    overlayEl.className = 'aurelius-overlay';
    overlayEl.id = 'aureliusOverlay';
    overlayEl.innerHTML =
      '<div class="aurelius-overlay-bg"></div>' +
      '<button class="aurelius-close" aria-label="Dismiss Aurelius" title="Dismiss">&times;</button>' +
      '<div class="aurelius-stage">' +
        '<div class="aurelius-aura"></div>' +
        '<div class="aurelius-sigil-wrap" id="aureliusSigilWrap">' +
          '<div class="aurelius-sigil-glow"></div>' +
          '<svg class="aurelius-sigil" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">' +
            '<defs>' +
              '<filter id="aureliusSigilGlow" x="-50%" y="-50%" width="200%" height="200%">' +
                '<feGaussianBlur stdDeviation="2.5" result="blur"/>' +
                '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
              '</filter>' +
              // Ambient halo behind the eye — warm firelight bleed. Sits
              // behind the whole eye assembly to give it presence.
              '<radialGradient id="aureliusEyeGrad" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#fff4c8" stop-opacity="1"/>' +
                '<stop offset="35%" stop-color="#e5c574" stop-opacity="0.85"/>' +
                '<stop offset="100%" stop-color="#8a6020" stop-opacity="0.25"/>' +
              '</radialGradient>' +
              // Dragon iris gradient — bright gold core around pupil,
              // mid-amber midband, dark amber at outer rim. This is the
              // core of the dragon-eye aesthetic.
              '<radialGradient id="aureliusIrisGrad" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#fff4c8" stop-opacity="1"/>' +
                '<stop offset="18%" stop-color="#f5c85a" stop-opacity="1"/>' +
                '<stop offset="50%" stop-color="#b58a2f" stop-opacity="1"/>' +
                '<stop offset="85%" stop-color="#6b4818" stop-opacity="1"/>' +
                '<stop offset="100%" stop-color="#2a1a08" stop-opacity="1"/>' +
              '</radialGradient>' +
              // Eye socket — dark radial behind the eye for depth.
              '<radialGradient id="aureliusEyeSocket" cx="50%" cy="50%" r="50%">' +
                '<stop offset="0%" stop-color="#000000" stop-opacity="0.9"/>' +
                '<stop offset="70%" stop-color="#0a0604" stop-opacity="0.7"/>' +
                '<stop offset="100%" stop-color="#1a0f05" stop-opacity="0"/>' +
              '</radialGradient>' +
              // Clip path matching the iris ellipse — used to constrain
              // the striation lines to stay inside the iris.
              '<clipPath id="aureliusIrisClip">' +
                '<ellipse cx="200" cy="200" rx="11" ry="22"/>' +
              '</clipPath>' +
            '</defs>' +

            // THREE ANCHORS in triangle formation — writer, page, witness.
            // Top (200,60), bottom-left (90,300), bottom-right (310,300).
            // Rendered as iron rivets: black fill with gold rim, holding
            // the form together like blacksmith's work.
            '<g class="au-anchors">' +
              '<line class="au-thread" x1="200" y1="60" x2="200" y2="140" stroke="rgba(229,197,116,0.5)" stroke-width="1" stroke-linecap="round"/>' +
              '<line class="au-thread" x1="90" y1="300" x2="155" y2="240" stroke="rgba(229,197,116,0.5)" stroke-width="1" stroke-linecap="round"/>' +
              '<line class="au-thread" x1="310" y1="300" x2="245" y2="240" stroke="rgba(229,197,116,0.5)" stroke-width="1" stroke-linecap="round"/>' +
              '<path class="au-anchor" d="M 200 50 L 210 60 L 200 70 L 190 60 Z" fill="#0a0604" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-linejoin="round"/>' +
              '<path class="au-anchor" d="M 90 290 L 100 300 L 90 310 L 80 300 Z" fill="#0a0604" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-linejoin="round"/>' +
              '<path class="au-anchor" d="M 310 290 L 320 300 L 310 310 L 300 300 Z" fill="#0a0604" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-linejoin="round"/>' +
              // Small bright center on each anchor — a gold nail-head dot
              '<circle cx="200" cy="60" r="1.5" fill="#f5eecc"/>' +
              '<circle cx="90" cy="300" r="1.5" fill="#f5eecc"/>' +
              '<circle cx="310" cy="300" r="1.5" fill="#f5eecc"/>' +
            '</g>' +

            // SEVEN RUNIC PERIMETER MARKS — one for each day of the
            // weekly cycle. Spaced 360/7 ≈ 51.4 degrees apart. Each rune
            // is a gold mark set in a small black socket, giving them
            // the feel of iron-riveted studs around the perimeter.
            '<g class="au-runes">' +
              '<g class="au-rune" transform="rotate(0 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(51.4 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(102.8 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(154.2 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(205.6 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(257 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
              '<g class="au-rune" transform="rotate(308.4 200 200)"><circle cx="360" cy="200" r="4" fill="#0a0604" stroke="rgba(229,197,116,0.7)" stroke-width="0.6"/><circle cx="360" cy="200" r="1.6" fill="rgba(245,238,204,1)"/></g>' +
            '</g>' +

            // FIVE CONCENTRIC RINGS — not polygons like Guide. Each ring
            // rotates slowly at a different rate (slower than Guide's),
            // with gap positions arranged so visually a "pulse" of gaps
            // runs through the layers. Rings use stroke-dasharray to
            // create the opening. Each ring is paired with a black
            // underlay stroke at slightly wider width, giving it the
            // relief of gold inlaid in black iron.
            // Ring 1 (outermost) — radius 160, slowest
            '<g class="au-orbit au-orbit-1">' +
              '<circle cx="200" cy="200" r="160" fill="none" stroke="#000000" stroke-width="2.6" stroke-dasharray="940 65" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="160" fill="none" stroke="rgba(229,197,116,0.85)" stroke-width="1.4" stroke-dasharray="940 65" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 2 — radius 135
            '<g class="au-orbit au-orbit-2">' +
              '<circle cx="200" cy="200" r="135" fill="none" stroke="#000000" stroke-width="2.5" stroke-dasharray="790 55" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="135" fill="none" stroke="rgba(229,197,116,0.9)" stroke-width="1.3" stroke-dasharray="790 55" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 3 — radius 115
            '<g class="au-orbit au-orbit-3">' +
              '<circle cx="200" cy="200" r="115" fill="none" stroke="#000000" stroke-width="2.4" stroke-dasharray="670 50" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="115" fill="none" stroke="rgba(229,197,116,0.95)" stroke-width="1.2" stroke-dasharray="670 50" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 4 — radius 95
            '<g class="au-orbit au-orbit-4">' +
              '<circle cx="200" cy="200" r="95" fill="none" stroke="#000000" stroke-width="2.3" stroke-dasharray="550 45" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="95" fill="none" stroke="rgba(245,215,140,1)" stroke-width="1.1" stroke-dasharray="550 45" stroke-linecap="round"/>' +
            '</g>' +
            // Ring 5 (innermost) — radius 78, fastest
            '<g class="au-orbit au-orbit-5">' +
              '<circle cx="200" cy="200" r="78" fill="none" stroke="#000000" stroke-width="2.2" stroke-dasharray="450 40" stroke-linecap="round" opacity="0.75"/>' +
              '<circle cx="200" cy="200" r="78" fill="none" stroke="rgba(245,238,204,1)" stroke-width="1" stroke-dasharray="450 40" stroke-linecap="round"/>' +
            '</g>' +

            // THE EYE — dragon eye, regal and watchful. Vertical slit
            // pupil, detailed amber iris with radial striations, sharp
            // black outer rim, bright specular highlight, subtle upper
            // brow ridge. Inward-watching but calm — the eye of something
            // ancient and patient, not predatory.
            '<g class="au-eye" filter="url(#aureliusSigilGlow)">' +
              '<g class="au-eye-lids">' +
                // Ambient halo — warm firelight bleed behind the eye
                '<ellipse class="au-eye-halo" cx="200" cy="200" rx="30" ry="56" fill="url(#aureliusEyeGrad)" opacity="0.55"/>' +
                // Eye socket — dark radial gives the eye a backing so
                // the iris gold pops against it
                '<ellipse class="au-eye-socket" cx="200" cy="200" rx="20" ry="44" fill="url(#aureliusEyeSocket)"/>' +
                // Black outer rim of the eye opening — inside-drawn,
                // creates the hard edge that makes it read as dragon
                '<path class="au-eye-rim-outer" d="M 200 152 Q 180 200, 200 248 Q 220 200, 200 152 Z" fill="#000000" stroke="none"/>' +
                // The lens opening — slightly smaller than the rim, fills
                // with a cream-gold that represents the sclera
                '<path class="au-eye-sclera" d="M 200 156 Q 182 200, 200 244 Q 218 200, 200 156 Z" fill="#2a1a08" stroke="none"/>' +
                // Iris — large vertical ellipse with radial gradient.
                // The gradient runs from bright gold center to dark amber
                // outer edge, which is the core of the dragon-eye look.
                '<ellipse class="au-eye-iris" cx="200" cy="200" rx="11" ry="22" fill="url(#aureliusIrisGrad)"/>' +
                // Iris striations — 16 fine radial lines from the pupil
                // edge to the iris edge. Clipped to stay inside the iris.
                // These are what make the eye read as living/textured
                // rather than flat.
                '<g class="au-iris-striations" clip-path="url(#aureliusIrisClip)">' +
                  '<line x1="200" y1="182" x2="200" y2="178" stroke="#2a1a08" stroke-width="0.5" opacity="0.75"/>' +
                  '<line x1="200" y1="218" x2="200" y2="222" stroke="#2a1a08" stroke-width="0.5" opacity="0.75"/>' +
                  '<line x1="204" y1="184" x2="205.5" y2="180" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="196" y1="184" x2="194.5" y2="180" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="204" y1="216" x2="205.5" y2="220" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="196" y1="216" x2="194.5" y2="220" stroke="#2a1a08" stroke-width="0.4" opacity="0.65"/>' +
                  '<line x1="207" y1="190" x2="210" y2="186" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="193" y1="190" x2="190" y2="186" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="207" y1="210" x2="210" y2="214" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="193" y1="210" x2="190" y2="214" stroke="#2a1a08" stroke-width="0.4" opacity="0.6"/>' +
                  '<line x1="208" y1="196" x2="211" y2="194" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="192" y1="196" x2="189" y2="194" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="208" y1="204" x2="211" y2="206" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="192" y1="204" x2="189" y2="206" stroke="#2a1a08" stroke-width="0.4" opacity="0.55"/>' +
                  '<line x1="208" y1="200" x2="211" y2="200" stroke="#2a1a08" stroke-width="0.4" opacity="0.5"/>' +
                  '<line x1="192" y1="200" x2="189" y2="200" stroke="#2a1a08" stroke-width="0.4" opacity="0.5"/>' +
                '</g>' +
                // Iris outer ring — thin dark line defining the iris edge
                '<ellipse class="au-iris-ring" cx="200" cy="200" rx="11" ry="22" fill="none" stroke="#1a0f05" stroke-width="0.8"/>' +
                // Inner iris hot ring — bright thin ring just around the
                // pupil, intensifies the glow at the center
                '<ellipse class="au-iris-hot" cx="200" cy="200" rx="4.5" ry="10" fill="none" stroke="#fff4c8" stroke-width="0.5" opacity="0.8"/>' +
                // Pupil — sharp-edged deep black vertical ellipse. The
                // defining feature of a dragon eye.
                '<ellipse class="au-pupil" id="auPupil" cx="200" cy="200" rx="2.8" ry="9" fill="#000000"/>' +
                // Specular highlight — small bright off-center dot that
                // makes the eye look wet and alive
                '<ellipse class="au-eye-bright" cx="201.5" cy="195" rx="0.9" ry="1.6" fill="#ffffff" opacity="0.95"/>' +
                // Upper brow ridge — thin dark arc above the eye, adds
                // gravity without aggression. Subtle.
                '<path class="au-brow" d="M 184 148 Q 200 140, 216 148" fill="none" stroke="#1a0f05" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>' +
                // Lens-opening outline — pointed top and bottom, not
                // rounded almond. This shape is what makes it read as
                // dragon rather than cat/snake.
                '<path class="au-eye-outline" d="M 200 152 Q 180 200, 200 248 Q 220 200, 200 152 Z" fill="none" stroke="rgba(245,238,204,0.9)" stroke-width="1.4" stroke-linejoin="round"/>' +
              '</g>' +
            '</g>' +
          '</svg>' +
        '</div>' +
      '</div>' +
      '<div class="aurelius-dialogue-box" id="aureliusDialogueBox">' +
        '<div class="aurelius-box-corners">' +
          '<span class="aurelius-corner aurelius-corner-tl"></span>' +
          '<span class="aurelius-corner aurelius-corner-tr"></span>' +
          '<span class="aurelius-corner aurelius-corner-bl"></span>' +
          '<span class="aurelius-corner aurelius-corner-br"></span>' +
        '</div>' +
        '<div class="aurelius-speaker" id="aureliusSpeaker">Aurelius</div>' +
        '<div class="aurelius-text" id="aureliusText"></div>' +
        '<div class="aurelius-footer">' +
          '<div class="aurelius-progress" id="aureliusProgress"></div>' +
          '<button class="aurelius-continue" id="aureliusContinue">Continue</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlayEl);

    dialogueTextEl = document.getElementById('aureliusText');
    speakerNameEl = document.getElementById('aureliusSpeaker');
    progressEl = document.getElementById('aureliusProgress');
    continueBtn = document.getElementById('aureliusContinue');
    sigilEl = document.getElementById('aureliusSigilWrap');
  }

  function bindEvents(){
    // Summon button click — re-invoke Aurelius
    summonEl.addEventListener('click', function(){
      if(isOpen) return;
      Aurelius.summon();
    });

    // Continue button — advance dialogue
    continueBtn.addEventListener('click', advanceDialogue);

    // Close button
    var closeBtn = overlayEl.querySelector('.aurelius-close');
    closeBtn.addEventListener('click', dismiss);

    // Tap-to-skip: if typewriter is running, tapping the dialogue box
    // (or the overlay background) completes the current line instantly.
    var dialogueBox = document.getElementById('aureliusDialogueBox');
    dialogueBox.addEventListener('click', function(e){
      // Don't intercept clicks on the continue button.
      if(e.target === continueBtn || continueBtn.contains(e.target)) return;
      completeCurrentTyping();
    });

    // ESC to dismiss
    document.addEventListener('keydown', function(e){
      if(!isOpen) return;
      if(e.key === 'Escape') dismiss();
      else if(e.key === 'Enter' || e.key === ' '){
        if(typewriterTimeout){
          completeCurrentTyping();
        } else {
          advanceDialogue();
        }
      }
    });
  }

  // ==================================================================
  // Dialogue rendering
  // ==================================================================

  function renderDialogueLine(){
    var line = config.script[dialogueIndex];
    if(!line){ dismiss(); return; }

    speakerNameEl.textContent = line.speaker || 'Aurelius';
    progressEl.textContent = (dialogueIndex + 1) + ' / ' + config.script.length;

    // Continue button shows "Continue" or "Close" on last line.
    continueBtn.textContent = (dialogueIndex === config.script.length - 1) ? 'Close' : 'Continue';
    continueBtn.style.visibility = 'hidden'; // hidden until typing completes

    typeOut(line.text, function(){
      continueBtn.style.visibility = 'visible';
    });
  }

  function typeOut(text, onComplete){
    dialogueTextEl.textContent = '';
    var i = 0;
    var speed = 24; // ms per character

    currentTypingFullText = text;
    currentTypingCompletion = onComplete;

    function tick(){
      if(i >= text.length){
        currentTypingFullText = '';
        currentTypingCompletion = null;
        typewriterTimeout = null;
        if(onComplete) onComplete();
        return;
      }
      dialogueTextEl.textContent += text.charAt(i);
      i++;
      typewriterTimeout = setTimeout(tick, speed);
    }
    tick();
  }

  function completeCurrentTyping(){
    if(!typewriterTimeout) return;
    clearTimeout(typewriterTimeout);
    typewriterTimeout = null;
    if(currentTypingFullText){
      dialogueTextEl.textContent = currentTypingFullText;
    }
    var cb = currentTypingCompletion;
    currentTypingFullText = '';
    currentTypingCompletion = null;
    if(cb) cb();
  }

  function advanceDialogue(){
    dialogueIndex++;
    if(dialogueIndex >= config.script.length){
      dismiss();
      return;
    }
    renderDialogueLine();
  }

  function dismiss(){
    // Cancel any in-flight typing.
    if(typewriterTimeout){
      clearTimeout(typewriterTimeout);
      typewriterTimeout = null;
    }
    currentTypingFullText = '';
    currentTypingCompletion = null;

    overlayEl.classList.remove('active');
    document.body.classList.remove('aurelius-active');
    isOpen = false;
    dialogueIndex = 0;

    // If a one-off script was swapped in, restore the original.
    if(config._restoreScriptOnDismiss){
      config.script = config._restoreScriptOnDismiss;
      config._restoreScriptOnDismiss = null;
    }
  }

  // ==================================================================
  // Styles — injected once on init
  // ==================================================================

  function injectStyles(){
    if(document.getElementById('aurelius-styles')) return;
    var style = document.createElement('style');
    style.id = 'aurelius-styles';
    style.textContent =
      // Summon button — persistent sigil in bottom-right corner
      '.aurelius-summon{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:50%;background:rgba(13,10,4,0.8);border:1px solid rgba(229,197,116,0.45);cursor:pointer;padding:0;z-index:90;transition:all 0.3s;backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;animation:aurelius-summon-breathe 4.5s ease-in-out infinite}' +
      '.aurelius-summon:hover{border-color:rgba(229,197,116,0.85);background:rgba(25,18,8,0.9);transform:scale(1.08);box-shadow:0 0 24px rgba(229,197,116,0.35)}' +
      '.aurelius-summon-sigil{width:44px;height:44px}' +
      '@keyframes aurelius-summon-breathe{0%,100%{box-shadow:0 0 12px rgba(229,197,116,0.2)}50%{box-shadow:0 0 18px rgba(229,197,116,0.4)}}' +

      // Overlay — full screen, hidden by default
      '.aurelius-overlay{position:fixed;inset:0;z-index:300;opacity:0;pointer-events:none;transition:opacity 0.5s ease}' +
      '.aurelius-overlay.active{opacity:1;pointer-events:auto}' +
      '.aurelius-overlay-bg{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(40,25,10,0.7) 0%,rgba(8,6,3,0.95) 70%);backdrop-filter:blur(12px)}' +

      // Close button
      '.aurelius-close{position:absolute;top:16px;right:16px;width:40px;height:40px;border-radius:50%;background:transparent;border:1px solid rgba(229,197,116,0.35);color:rgba(245,238,204,0.7);font-size:22px;cursor:pointer;transition:all 0.2s;z-index:10;display:flex;align-items:center;justify-content:center}' +
      '.aurelius-close:hover{border-color:rgba(229,197,116,0.75);color:rgba(245,238,204,1);background:rgba(229,197,116,0.1)}' +

      // Stage — holds the sigil
      '.aurelius-stage{position:absolute;top:50%;left:50%;transform:translate(-50%,-55%);width:400px;height:400px;display:flex;align-items:center;justify-content:center}' +
      '@media(max-width:640px){.aurelius-stage{width:300px;height:300px;transform:translate(-50%,-60%)}}' +

      // Ambient aura — warm firelight glow behind the sigil
      '.aurelius-aura{position:absolute;top:50%;left:50%;width:480px;height:480px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(229,197,116,0.18) 0%,rgba(205,127,50,0.08) 40%,transparent 70%);animation:aurelius-aura-breathe 6s ease-in-out infinite}' +
      '@keyframes aurelius-aura-breathe{0%,100%{opacity:0.55;transform:translate(-50%,-50%) scale(1)}50%{opacity:0.85;transform:translate(-50%,-50%) scale(1.08)}}' +

      // Sigil wrap — the container that floats
      '.aurelius-sigil-wrap{position:absolute;top:50%;left:50%;width:400px;height:400px;transform:translate(-50%,-50%);animation:aurelius-float 7s ease-in-out infinite;opacity:0.92}' +
      '@media(max-width:640px){.aurelius-sigil-wrap{width:300px;height:300px}}' +
      '@keyframes aurelius-float{0%,100%{transform:translate(-50%,-50%) translateY(0)}50%{transform:translate(-50%,-50%) translateY(-6px)}}' +

      // Sigil inner glow
      '.aurelius-sigil-glow{position:absolute;top:50%;left:50%;width:280px;height:280px;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(245,238,204,0.25) 0%,rgba(229,197,116,0.1) 50%,transparent 70%);animation:aurelius-glow-breathe 5s ease-in-out infinite}' +
      '@keyframes aurelius-glow-breathe{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.7}50%{transform:translate(-50%,-50%) scale(1.1);opacity:1}}' +

      '.aurelius-sigil{width:100%;height:100%;position:relative;z-index:2}' +

      // ORBITAL RING ROTATIONS — slower than Guide, breath-like
      '.au-orbit{transform-origin:200px 200px}' +
      '.au-orbit-1{animation:au-rot-cw 68s linear infinite}' +
      '.au-orbit-2{animation:au-rot-ccw 56s linear infinite}' +
      '.au-orbit-3{animation:au-rot-cw 48s linear infinite}' +
      '.au-orbit-4{animation:au-rot-ccw 42s linear infinite}' +
      '.au-orbit-5{animation:au-rot-cw 36s linear infinite}' +
      '@keyframes au-rot-cw{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}' +
      '@keyframes au-rot-ccw{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}' +

      // Runic marks — very slow collective rotation
      '.au-runes{transform-origin:200px 200px;animation:au-rot-ccw 180s linear infinite}' +

      // Anchor lines — subtle pulse
      '.au-thread{animation:au-thread-pulse 8s ease-in-out infinite}' +
      '@keyframes au-thread-pulse{0%,100%{opacity:0.5}50%{opacity:0.85}}' +

      // Eye — periodic slow blink. For a vertical slit eye, a blink
      // scales the Y axis down, mimicking an upper and lower lid meeting
      // at the horizontal center line (not scaling X like a normal eye).
      '.au-eye{transform-origin:200px 200px;animation:au-breath 4.5s ease-in-out infinite}' +
      '@keyframes au-breath{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}' +
      '.au-eye-lids{transform-origin:200px 200px;animation:au-blink 11s ease-in-out infinite}' +
      '@keyframes au-blink{' +
        '0%,47%,53%,100%{transform:scaleY(1)}' +
        '50%{transform:scaleY(0.05)}' +
      '}' +

      // Pupil — tiny drift so the eye looks alive
      '.au-pupil{animation:au-pupil-drift 9s ease-in-out infinite}' +
      '@keyframes au-pupil-drift{' +
        '0%,100%{transform:translate(0,0)}' +
        '25%{transform:translate(0.8px,-1px)}' +
        '50%{transform:translate(-0.5px,1px)}' +
        '75%{transform:translate(-1px,-0.5px)}' +
      '}' +

      // Dialogue box — anchored lower portion of screen
      '.aurelius-dialogue-box{position:absolute;bottom:40px;left:50%;transform:translateX(-50%);width:min(92%,620px);background:rgba(13,10,4,0.88);border:1px solid rgba(229,197,116,0.4);border-radius:5px;padding:22px 26px 18px;backdrop-filter:blur(20px);box-shadow:0 0 40px rgba(229,197,116,0.15)}' +

      // Corner decorations
      '.aurelius-box-corners{position:absolute;inset:0;pointer-events:none}' +
      '.aurelius-corner{position:absolute;width:10px;height:10px;border-color:rgba(229,197,116,0.65)}' +
      '.aurelius-corner-tl{top:-1px;left:-1px;border-top:1px solid;border-left:1px solid}' +
      '.aurelius-corner-tr{top:-1px;right:-1px;border-top:1px solid;border-right:1px solid}' +
      '.aurelius-corner-bl{bottom:-1px;left:-1px;border-bottom:1px solid;border-left:1px solid}' +
      '.aurelius-corner-br{bottom:-1px;right:-1px;border-bottom:1px solid;border-right:1px solid}' +

      '.aurelius-speaker{font-family:"Cinzel",serif;font-size:11px;letter-spacing:.22em;color:rgba(229,197,116,0.9);text-transform:uppercase;margin-bottom:10px}' +
      '.aurelius-text{font-family:"Crimson Pro",serif;font-size:17px;line-height:1.65;color:rgba(245,238,228,0.92);min-height:60px}' +
      '.aurelius-footer{display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid rgba(229,197,116,0.15)}' +
      '.aurelius-progress{font-family:"DM Sans",sans-serif;font-size:11px;color:rgba(245,238,204,0.45);letter-spacing:.1em}' +
      '.aurelius-continue{font-family:"Cinzel",serif;font-size:12px;letter-spacing:.14em;text-transform:uppercase;background:linear-gradient(180deg,rgba(229,197,116,0.2),rgba(229,197,116,0.08));border:1px solid rgba(229,197,116,0.5);color:rgba(245,238,204,0.95);padding:8px 18px;border-radius:3px;cursor:pointer;transition:all 0.25s}' +
      '.aurelius-continue:hover{background:linear-gradient(180deg,rgba(229,197,116,0.3),rgba(229,197,116,0.14));border-color:rgba(229,197,116,0.75);color:#fff4c8;box-shadow:0 0 20px rgba(229,197,116,0.25)}' +

      '@media(max-width:640px){' +
        '.aurelius-dialogue-box{padding:18px 20px 14px;bottom:20px}' +
        '.aurelius-text{font-size:15px}' +
      '}';
    document.head.appendChild(style);
  }

  global.Aurelius = Aurelius;
})(typeof window !== 'undefined' ? window : this);
