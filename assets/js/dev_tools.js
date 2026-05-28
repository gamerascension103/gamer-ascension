/**
 * dev_tools.js — floating dev panel, gated by ?dev=1 in the URL.
 * Mount on every chamber page after all other scripts.
 */
(function(){
  'use strict';

  function isDevMode(){
    try {
      return new URLSearchParams(window.location.search).get('dev') === '1';
    } catch(e){ return false; }
  }

  if(!isDevMode()) return;

  var isAtheneum = window.location.pathname.indexOf('atheneum') !== -1;

  function devResetAll(){
    console.log('[dev] devResetAll: clearing all storage and navigating to evermark');
    try { localStorage.clear(); } catch(e){}
    try { sessionStorage.clear(); } catch(e){}
    window.location.href = '/evermark.html';
  }

  function injectPanel(){
    var style = document.createElement('style');
    style.textContent = [
      '.dev-panel{position:fixed;bottom:16px;right:16px;z-index:999999;',
        'background:rgba(8,8,20,0.92);border:1px solid rgba(255,80,80,0.5);',
        'border-radius:6px;padding:10px 12px;font-family:monospace;font-size:11px;',
        'color:#ff8080;min-width:180px;box-shadow:0 4px 24px rgba(0,0,0,0.6)}',
      '.dev-panel-title{font-weight:700;letter-spacing:0.06em;margin-bottom:8px;',
        'color:#ff6060;text-transform:uppercase;font-size:10px}',
      '.dev-btn{display:block;width:100%;margin-top:6px;padding:5px 8px;',
        'background:rgba(255,60,60,0.15);border:1px solid rgba(255,80,80,0.4);',
        'border-radius:3px;color:#ffaaaa;font-family:monospace;font-size:11px;',
        'cursor:pointer;text-align:left;transition:background 0.15s}',
      '.dev-btn:hover{background:rgba(255,60,60,0.3)}'
    ].join('');
    document.head.appendChild(style);

    var panel = document.createElement('div');
    panel.className = 'dev-panel';

    var title = document.createElement('div');
    title.className = 'dev-panel-title';
    title.textContent = '\u26a0 Dev Mode';
    panel.appendChild(title);

    var resetBtn = document.createElement('button');
    resetBtn.className = 'dev-btn';
    resetBtn.textContent = 'Reset to start';
    resetBtn.addEventListener('click', function(e){
      e.stopPropagation();
      if(confirm('[dev] Clear ALL storage and return to evermark.html?')){
        devResetAll();
      }
    });
    panel.appendChild(resetBtn);

    if(isAtheneum){
      var completeBtn = document.createElement('button');
      completeBtn.className = 'dev-btn';
      completeBtn.textContent = 'Complete modules \u2192 fire sequence';
      completeBtn.addEventListener('click', function(e){
        e.stopPropagation();
        if(typeof window.devCompleteModulesAndContinue === 'function'){
          window.devCompleteModulesAndContinue();
        } else {
          console.warn('[dev] window.devCompleteModulesAndContinue is not defined');
        }
      });
      panel.appendChild(completeBtn);
    }

    document.body.appendChild(panel);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectPanel);
  } else {
    injectPanel();
  }

})();
