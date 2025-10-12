// Lab 3.1
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Lab 3.2.1
let navLinks = $$('nav a');
console.log(navLinks);

// Lab 3.2.2
let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname,
);
console.log('Current page URL: ',currentLink)

// Lab 3.2.3
if (currentLink) {
  // or if (currentLink !== undefined)
  currentLink.classList.add('current');
}
