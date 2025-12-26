
// ======================================================================
// script.js — small interactivity helpers (no frameworks)
// - Smooth scrolling for internal links
// - Dynamic year in footer
// - Optional: theme toggle example (uncomment to enable button)
// ======================================================================

/* Smooth scroll behavior for in-page links */
document.querySelectorAll('a[href^="#"]').forEach(el => {
  el.addEventListener('click', (e) => {
    const href = el.getAttribute('href');
    if (href.length > 1) {
      e.preventDefault();
      document.querySelector(href).scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', href);
    }
  });
});

/* Update copyright year */
document.getElementById('year').textContent = new Date().getFullYear();

/* Optional theme toggle (prefers-color-scheme is respected by default)
   To enable:
   1) Add a button with id="themeToggle" in the header.
   2) Uncomment the code below.  */
// const toggle = document.getElementById('themeToggle');
// if (toggle) {
//   toggle.addEventListener('click', () => {
//     document.documentElement.toggleAttribute('data-force-dark');
//     document.body.classList.toggle('dark');
//   });
// }
