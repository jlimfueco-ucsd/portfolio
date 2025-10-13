// Lab 3.1
console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

//removed for 3.3.1
// // Lab 3.2.1
// let navLinks = $$('nav a');
// console.log(navLinks);

// // Lab 3.2.2
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
// console.log('Current page URL: ',currentLink)

// // Lab 3.2.3
// if (currentLink) {
//   // or if (currentLink !== undefined)
//   currentLink.classList.add('current');
// }


// Lab 3.3.1
let pages = [
  { url: '',          title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/',  title: 'Contact' },
  { url: 'https://github.com/jlimfueco-ucsd', title: 'Profile' }, // actual URL
  { url: 'resume/',   title: 'Resume' }
];

// last step of Lab 3.3.1
const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/'              // Live Server
    : '/portfolio/'; // GitHub Pages repo name -- use 

//making the nav
let nav = document.createElement('nav');
let ul = document.createElement('ul');
nav.appendChild(ul);
document.body.prepend(nav);

// NOTE: lab 3 provided a insertAdjacentHTML code, i didn't use that and use prior url appending knowing because 
// hardcoding isn't future proof.
for (let p of pages) {
  let url = p.url.startsWith('http') ? p.url : BASE_PATH + p.url; 
  let li = document.createElement('li');
  let a  = document.createElement('a');
  a.href = url;
  a.textContent = p.title;

  // Lab 3.3.2 most of it is url sanity checks and adding functions to particular links
  a.classList.toggle(
  'current',
  a.host === location.host && a.pathname === location.pathname, // makes it so that the class 'current' is added so that the css work for current is enabled
  );
  // open external links in new tab with the a.target
  const isExternal = a.host !== location.host;
  if (isExternal) {
    a.target = '_blank';
    a.rel = 'noopener noreferrer'; // this is very much a security vulnerability tldr sever realtions to my portfolio site leading into the github
  }

  li.appendChild(a);
  ul.appendChild(li);
}

// Lab 3.4.2 adding the dark mode switch
document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="theme-select">
      <option value="auto">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
  `
);

// Lab 3.4.4 enforce the switch and make the theme swap
// Lab 3.4.5 we add root to the mix, and change up some of the logic using a function

const select = document.querySelector('#theme-select');
const root = document. documentElement;

// function logic, keeping original work below it from 3.4.4

function setTheme(mode) {
  if (mode === 'auto') {
    root.style.removeProperty('color-scheme'); // 'auto' choice
  } else {
    root.style.setProperty('color-scheme', mode); // 'light' | 'dark'
  }
  localStorage.setItem('colorScheme', mode); // persistant choice
  select.value = mode;
  console.log('color scheme changed to', mode);
}

// use function to react to the helper function
select.addEventListener('input', (e) => setTheme(e.target.value));  // active script to listen in memory
setTheme(localStorage.getItem('colorScheme') || 'auto'); // load in theme

// Lab 3.4.4 logic but no saved state
// select.addEventListener('input', (event) => {
//   const newTheme = event.target.value;
//   console.log('color scheme changed to', newTheme);

//   if (newTheme === 'auto') {
//     // make AUTO actually work
//     document.documentElement.style.removeProperty('color-scheme');
//   } else {
//     // Force the selected scheme
//     document.documentElement.style.setProperty('color-scheme', newTheme);
//   }
// });