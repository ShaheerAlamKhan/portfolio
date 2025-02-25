console.log('IT\'S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// navigation pages
const pages = [
  { url: 'index.html', title: 'Home' },
  { url: 'projects/index.html', title: 'Projects' },
  { url: 'contact/index.html', title: 'Contact' },
  { url: 'resume/index.html', title: 'Resume' },
  { url: "meta/index.html", title: 'Meta' }
];

// Check if we're on the home page by looking for the 'home' class
const ARE_WE_HOME = document.documentElement.classList.contains('home');

// Determine the correct base URL for both local development and GitHub Pages
function getBaseURL() {
  // Check if we're on GitHub Pages
  const isGitHub = location.hostname.includes('github.io');
  
  // For GitHub Pages, we need the /portfolio/ prefix
  // For local development, we start from the root
  const baseURL = isGitHub ? '/portfolio/' : '/';
  
  console.log('Current environment:', isGitHub ? 'GitHub Pages' : 'Local development');
  console.log('Using base URL:', baseURL);
  
  return baseURL;
}

// Theme switcher implementation
function addThemeSwitcher() {
  console.log('Initializing theme switcher...');
  
  //insert the theme switcher
  document.body.insertAdjacentHTML(
    'afterbegin',
    `<label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>`
  );

  const select = document.querySelector('.color-scheme select');

  // Function to handle theme changes
  function setColorScheme(scheme) {
    try {
      document.documentElement.setAttribute('color-scheme', scheme);
      select.value = scheme;
      localStorage.colorScheme = scheme;
      console.log('Theme set to:', scheme);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }

  // Set initial theme - default to dark if no preference saved
  if ("colorScheme" in localStorage) {
    setColorScheme(localStorage.colorScheme);
  } else {
    setColorScheme('dark');
  }

  // Listen for theme changes
  select.addEventListener('input', e => {
    setColorScheme(e.target.value);
  });
}

// Navigation creation
function createNavigation() {
  const nav = document.createElement('nav');
  
  for (let p of pages) {
    const a = document.createElement('a');
    
    // Construct the URL with proper path handling
    let url;
    if (location.hostname.includes('github.io')) {
      // For GitHub Pages
      url = '/portfolio/' + p.url;
    } else {
      // For local dev
      url = ARE_WE_HOME ? p.url : '../' + p.url;
    }
    
    a.href = url;
    a.textContent = p.title;
    
    if (a.pathname === location.pathname) {
      a.classList.add('current');
    }
    
    nav.append(a);
  }
  
  document.body.prepend(nav);
}

// Enhanced contact form handling
function enhanceContactForm() {
  const form = document.querySelector('form');

  form?.addEventListener('submit', e => {
    e.preventDefault();
    try {
      const data = new FormData(form);
      let url = form.action + '?';
      
      for (let [name, value] of data) {
        url += `${name}=${encodeURIComponent(value)}&`;
      }
      
      // Remove trailing & and navigate
      location.href = url.slice(0, -1);
    } catch (error) {
      console.error('Error processing form:', error);
    }
  });
}

//fetch json function
export async function fetchJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
  }
}

export async function fetchGitHubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}

// Add project count functionality
export function updateProjectCount(projects) {
  const title = document.querySelector('.projects-title');
  if (title) {
    title.textContent = `My Projects (${projects.length})`;
  }
}

// renderProjects function
export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';
  projects.forEach(project => {
    const article = document.createElement('article');
    
    // Create the inner HTML content
    const innerContent = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <p>${project.year}</p>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}</p>
    `;
    
    // If the project has a link, wrap the entire content in an anchor tag
    if (project.link) {
      article.classList.add('clickable');
      article.innerHTML = `
        <a href="${project.link}" target="_blank" class="project-link">
          ${innerContent}
        </a>
      `;
    } else {
      article.innerHTML = innerContent;
    }
    
    containerElement.appendChild(article);
  });
}

// Initialize everything when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    console.log('Initializing portfolio features...');
    createNavigation();
    addThemeSwitcher();
    enhanceContactForm();
    console.log('Portfolio initialization complete');
  } catch (error) {
    console.error('Error during initialization:', error);
  }
});