(function () {
  'use strict';
  var loader = document.querySelector('.stackly-loader');
  if (loader) {
    var dismiss = function () { loader.classList.add('is-loaded'); setTimeout(function () { loader.remove(); }, 300); };
    if (document.readyState === 'complete') setTimeout(dismiss, 450);
    else window.addEventListener('load', function () { setTimeout(dismiss, 450); }, {once:true});
    setTimeout(dismiss, 3500);
  }
  var main = document.querySelector('.dashboard-main');
  if (!main) return;
  var heading = main.querySelector('h1');
  var title = heading ? heading.textContent.trim() : 'Dashboard';
  if (/user-dashboard\.html$/.test(location.pathname)) title = 'My Dashboard';
  var header = document.createElement('header');
  header.className = 'dashboard-fixed-header';
  header.setAttribute('aria-label', 'Dashboard header');
  var label = document.createElement('p');
  label.className = 'dashboard-fixed-header__title';
  label.textContent = title;
  header.appendChild(label);
  var profile = document.createElement('div');
  profile.className = 'dashboard-fixed-header__profile';
  var identity = main.querySelector('.dashboard-identity');
  var avatar = main.querySelector('.dashboard-avatar');
  if (avatar) profile.appendChild(avatar);
  if (identity) profile.appendChild(identity);
  header.appendChild(profile);
  document.body.appendChild(header);
  var mobile = document.querySelector('.dashboard-mobilebar');
  if (mobile) {
    /* A direct body child remains fixed even when an inner panel scrolls. */
    document.body.prepend(mobile);
    var mobileTitle = document.createElement('span');
    mobileTitle.className = 'dashboard-mobile-title';
    mobileTitle.textContent = title;
    mobile.insertBefore(mobileTitle, mobile.querySelector('button'));
  }
})();
