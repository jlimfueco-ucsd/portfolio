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

for (let p of pages) {
  let url = p.url.startsWith('http') ? p.url : BASE_PATH + p.url;
  let li = document.createElement('li');
  let a  = document.createElement('a');
  a.href = url;
  a.textContent = p.title;
  li.appendChild(a);
  ul.appendChild(li);
}

// Lab 3.3.2