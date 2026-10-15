// Main JavaScript for Aurelia Bistro & Lounge

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initActiveNavLink();
  initNewsletterForm();
  initMenuFilters();
  initReservationEngine();
  initContactForm();
  initFaqAccordion();
});

// Mobile navigation toggle
function initMobileMenu() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const isOpen = navLinks.classList.contains('active');
      toggleBtn.setAttribute('aria-expanded', isOpen);
      toggleBtn.innerHTML = isOpen ? '&#10005;' : '&#9776;';
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('active');
        toggleBtn.innerHTML = '&#9776;';
      }
    });
  }
}

// Highlight active navigation link based on current page
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// Menu filtering & search
function initMenuFilters() {
  const categoryBtns = document.querySelectorAll('.category-btn');
  const menuItems = document.querySelectorAll('.menu-dish-card');
  const tagFilters = document.querySelectorAll('.filter-tag-btn');
  const searchInput = document.getElementById('menuSearch');

  if (!categoryBtns.length && !menuItems.length) return;

  let currentCategory = 'all';
  let activeTag = 'all';
  let searchQuery = '';

  function applyFilters() {
    menuItems.forEach(item => {
      const itemCategory = item.getAttribute('data-category');
      const itemTags = item.getAttribute('data-tags') || '';
      const itemTitle = (item.querySelector('.dish-name')?.textContent || '').toLowerCase();
      const itemDesc = (item.querySelector('.dish-desc')?.textContent || '').toLowerCase();

      const matchCategory = currentCategory === 'all' || itemCategory === currentCategory;
      const matchTag = activeTag === 'all' || itemTags.includes(activeTag);
      const matchSearch = !searchQuery || itemTitle.includes(searchQuery) || itemDesc.includes(searchQuery);

      if (matchCategory && matchTag && matchSearch) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.getAttribute('data-filter') || 'all';
      applyFilters();
    });
  });

  tagFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      tagFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTag = btn.getAttribute('data-tag') || 'all';
      applyFilters();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }
}

// Interactive Reservation Engine
function initReservationEngine() {
  const form = document.getElementById('reservationForm');
  const dateInput = document.getElementById('resDate');

  // Set min date to today
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    if (!dateInput.value) {
      dateInput.value = today;
    }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const guests = document.getElementById('resGuests')?.value || '2 Guests';
      const date = document.getElementById('resDate')?.value || 'Today';
      const time = document.getElementById('resTime')?.value || '7:00 PM';
      const seating = document.querySelector('input[name="seating"]:checked')?.value || 'Indoor Dining';
      const name = document.getElementById('resName')?.value || 'Valued Guest';
      const email = document.getElementById('resEmail')?.value || '';
      const phone = document.getElementById('resPhone')?.value || '';
      const notes = document.getElementById('resNotes')?.value || 'None';

      const bookingRef = 'AB-' + Math.floor(100000 + Math.random() * 900000);

      // Populate confirmation modal
      const modal = document.getElementById('bookingModal');
      if (modal) {
        document.getElementById('modalRef').textContent = bookingRef;
        document.getElementById('modalName').textContent = name;
        document.getElementById('modalDetails').textContent = `${guests} • ${date} at ${time}`;
        document.getElementById('modalSeating').textContent = seating;
        document.getElementById('modalContact').textContent = `${phone} (${email})`;

        modal.classList.add('show');
      } else {
        showToast(`Table confirmed! Reference: ${bookingRef}`, 'success');
      }

      form.reset();
      if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    });
  }

  // Close modal button
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modal = document.getElementById('bookingModal');
  if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => {
      modal.classList.remove('show');
      showToast('Reservation confirmed. We look forward to hosting you!', 'success');
    });
  }
}

// Contact form handling
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('contactName')?.value || 'Guest';
      showToast(`Thank you, ${name}! Your message has been sent. We'll reply within 4 hours.`, 'success');
      form.reset();
    });
  }
}

// Newsletter subscription
function initNewsletterForm() {
  const forms = document.querySelectorAll('.newsletter-form');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = form.querySelector('input[type="email"]');
      if (emailInput && emailInput.value) {
        showToast(`Thank you for subscribing! Seasonal updates will be sent to ${emailInput.value}.`, 'success');
        form.reset();
      }
    });
  });
}

// Global Toast message system
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span style="font-size: 1.2rem;">${type === 'success' ? '✓' : 'ℹ'}</span>
    <span style="font-size: 0.95rem; font-weight: 500;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 300);
  }, 4000);
}

// FAQ Accordion
function initFaqAccordion() {
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      const answer = parent.querySelector('.faq-answer');
      const icon = btn.querySelector('.faq-icon');

      const isOpen = answer.style.display === 'block';
      if (isOpen) {
        answer.style.display = 'none';
        if (icon) icon.textContent = '+';
      } else {
        answer.style.display = 'block';
        if (icon) icon.textContent = '−';
      }
    });
  });
}
