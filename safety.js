<script>
  document.title = 'NxxN-BugCrowd' + Date.now();
  // Enumerate keys, not values
  console.log({
    origin: location.origin,
    cookieCount: document.cookie ? document.cookie.split(';').length : 0,
    localStorageKeys: Object.keys(localStorage),
    sessionStorageKeys: Object.keys(sessionStorage),
    parentReachable: (() => { try { return window.parent !== window; } catch(e){ return 'blocked'; }})(),
    openerReachable: !!window.opener
  });
</script>
