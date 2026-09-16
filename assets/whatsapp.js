/* Botón flotante de WhatsApp · P.O.D.D.E.R
   Abre el chat de Felipe con un mensaje prellenado. Se usa en la landing
   y en /pulso. Registra el clic en GA4 (evento whatsapp_click) y en Meta
   Pixel (Contact) si están cargados; nunca bloquea la navegación. */
(function () {
  var NUMBER = '573112049992';
  var MESSAGE = 'Hola Felipe, vi el programa P.O.D.D.E.R y quiero más información.';
  var url = 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(MESSAGE);

  var css = '' +
    '.wa-float{position:fixed;right:20px;bottom:20px;z-index:60;width:58px;height:58px;border-radius:50%;' +
    'background:#25D366;display:flex;align-items:center;justify-content:center;text-decoration:none;' +
    'box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 0 rgba(37,211,102,.55);' +
    'transition:transform .15s ease,box-shadow .15s ease;animation:wa-pulse 2.4s ease-out infinite}' +
    '.wa-float:hover{transform:translateY(-2px) scale(1.04);animation:none}' +
    '.wa-float svg{width:30px;height:30px;fill:#fff;display:block}' +
    '.wa-float .wa-tip{position:absolute;right:68px;top:50%;transform:translateY(-50%);white-space:nowrap;' +
    'background:#0E2236;color:#F2F6F9;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:8px 12px;' +
    'font:600 .85rem Inter,sans-serif;opacity:0;pointer-events:none;transition:opacity .15s ease}' +
    '.wa-float:hover .wa-tip{opacity:1}' +
    '@keyframes wa-pulse{0%{box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 0 rgba(37,211,102,.55)}' +
    '70%{box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 16px rgba(37,211,102,0)}' +
    '100%{box-shadow:0 10px 30px rgba(0,0,0,.45),0 0 0 0 rgba(37,211,102,0)}}' +
    '@media(max-width:520px){.wa-float{right:16px;bottom:16px;width:54px;height:54px}.wa-float .wa-tip{display:none}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var a = document.createElement('a');
  a.className = 'wa-float';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.setAttribute('aria-label', 'Escribir a Felipe por WhatsApp');
  a.innerHTML =
    '<span class="wa-tip">Escríbele a Felipe</span>' +
    '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C8.8 3 3 8.7 3 15.8c0 2.5.7 4.9 2 7L3 29l6.4-1.9c2 1.1 4.3 1.7 6.6 1.7 7.2 0 13-5.7 13-12.8S23.2 3 16 3zm0 23.4c-2.1 0-4.1-.6-5.8-1.6l-.4-.2-3.8 1.1 1.1-3.6-.3-.4c-1.2-1.8-1.8-3.8-1.8-5.9 0-5.9 4.9-10.6 10.9-10.6s10.9 4.8 10.9 10.6S22 26.4 16 26.4zm6-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.4.3-.6.1-.2 0-.4 0-.6l-1-2.3c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.8 5 .8.3 1.4.5 1.9.7.8.3 1.6.2 2.2.1.7-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z"/></svg>';

  a.addEventListener('click', function () {
    try { if (typeof gtag === 'function') gtag('event', 'whatsapp_click'); } catch (e) {}
    try { if (typeof fbq === 'function') fbq('track', 'Contact'); } catch (e) {}
  });

  function mount() { document.body.appendChild(a); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
