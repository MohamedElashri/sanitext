document.addEventListener('DOMContentLoaded', () => {
    let basePath = 'partials/';
    // Check if the current page is within the 'pages' subdirectory
    if (window.location.pathname.includes('/pages/')) {
        basePath = '../partials/';
    } else {
        // Check if current path is like /somecontext/ (ends with /) but not root /
        // or /somecontext/index.html. This implies it's an index page in a subdirectory
        // or if it's just /index.html (root index page)
        // For these, partials are in 'partials/' relative to current dir
        // For pages like /pages/about.html, it's '../partials/'
        // This logic seems okay: if '/pages/' is in path, it's one level down.
        // Otherwise, assume it's at a level where 'partials/' is a direct subdirectory.
    }

    loadHTML(basePath + 'header.html', 'header-placeholder')
        .then(() => {
            setActiveNav(); // Call after header HTML is loaded
        })
        .catch(error => {
            console.error('Error loading header:', error);
            // Optionally display an error message in the header-placeholder
            const headerElement = document.getElementById('header-placeholder');
            if (headerElement) {
                headerElement.innerHTML = '<p style="color:red;">Failed to load header.</p>';
            }
        });

    loadHTML(basePath + 'footer.html', 'footer-placeholder')
        .catch(error => {
            console.error('Error loading footer:', error);
            const footerElement = document.getElementById('footer-placeholder');
            if (footerElement) {
                footerElement.innerHTML = '<p style="color:red;">Failed to load footer.</p>';
            }
        });
});

async function loadHTML(url, elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.error(`Element with ID '${elementId}' not found. Cannot load HTML from ${url}.`);
        return Promise.reject(new Error(`Element with ID '${elementId}' not found.`));
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();
        element.innerHTML = html;
        // console.log(`Successfully loaded HTML from ${url} into #${elementId}`);
    } catch (error) {
        console.error(`Error loading HTML from ${url} into #${elementId}:`, error);
        element.innerHTML = `<p style="color: red;">Error loading content. Details: ${error.message}</p>`;
        throw error; // Re-throw so the caller's .catch can also handle it if needed
    }
}

function setActiveNav() {
    const navLinks = document.querySelectorAll('header.main-header nav ul li a');
    if (!navLinks || navLinks.length === 0) {
        console.warn('No navigation links found for setActiveNav. Ensure header is loaded, selectors are correct (header.main-header nav ul li a), and header HTML contains these links.');
        return;
    }

    const currentPageFullHref = window.location.href;

    // Normalizes a URL for comparison:
    // - Removes trailing 'index.html'.
    // - Removes trailing slash (unless it's the root path).
    // - Ensures consistent scheme and host (by using 'new URL()').
    const normalizeUrl = (urlStr) => {
        try {
            let url = new URL(urlStr, window.location.origin); // Ensure base for relative URLs if any passed
            let path = url.pathname;

            // Remove 'index.html' from the end of the path
            if (path.endsWith('/index.html')) {
                path = path.substring(0, path.length - 'index.html'.length);
            }

            // Remove trailing slash, unless the path is just "/"
            if (path.length > 1 && path.endsWith('/')) {
                path = path.substring(0, path.length - 1);
            }
            
            // After stripping /index.html, a path like "/index.html" becomes "", ensure it's "/"
            if (path === '') {
                path = '/';
            }

            return url.origin + path + url.search + url.hash;
        } catch (e) {
            console.error("Error normalizing URL:", urlStr, e);
            return urlStr; // Return original on error
        }
    };

    const normalizedCurrentHref = normalizeUrl(currentPageFullHref);
    // console.log(`Normalized current page: ${normalizedCurrentHref}`);

    navLinks.forEach(link => {
        const linkFullHref = link.href; // link.href is the fully resolved URL
        const normalizedLinkHref = normalizeUrl(linkFullHref);
        // console.log(`Link: ${link.textContent}, Original Href: ${link.getAttribute('href')}, Full Href: ${linkFullHref}, Normalized: ${normalizedLinkHref}`);

        if (normalizedLinkHref === normalizedCurrentHref) {
            link.classList.add('active');
            // console.log(`ACTIVATED LINK: ${link.textContent}`);
        } else {
            link.classList.remove('active');
        }
    });
}
