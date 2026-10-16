// Aurelia Bistro & Lounge - Supabase Authentication System
// Handles: Supabase Mail Login (Magic Link & OTP), Email/Password, User State, & Account UI

(function () {
  'use strict';

  // Global namespace
  window.AureliaAuth = {
    user: null,
    session: null,
    initialized: false,
    otpEmailPending: null
  };

  // Helper to ensure Supabase client is ready
  async function ensureClient() {
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      return window.getSupabaseClient();
    }

    if (window.supabase && typeof window.supabase.createClient === 'function') {
      const config = window.AURELIA_CONFIG || {
        supabaseUrl: 'https://ethjhohikzkjkvbqzvgm.supabase.co',
        supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aGpob2hpa3pramt2YnF6dmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTUwODAsImV4cCI6MjEwNzU3MTA4MH0.qYb1h9R2cbm76tJYzF6gxEfi2MlI2KKE7Usf9SeA1-E'
      };
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
      window.supabaseClient = client;
      return client;
    }

    // Load supabase-js dynamically if not already on the page
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.onload = () => {
        const config = window.AURELIA_CONFIG || {
          supabaseUrl: 'https://ethjhohikzkjkvbqzvgm.supabase.co',
          supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0aGpob2hpa3pramt2YnF6dmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5OTUwODAsImV4cCI6MjEwNzU3MTA4MH0.qYb1h9R2cbm76tJYzF6gxEfi2MlI2KKE7Usf9SeA1-E'
        };
        const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        });
        window.supabaseClient = client;
        resolve(client);
      };
      script.onerror = () => reject(new Error('Failed to load Supabase JS SDK'));
      document.head.appendChild(script);
    });
  }

  // Toast Notification helper (falls back to custom if main.js toast not yet loaded)
  function showAuthToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
      return;
    }
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span style="font-size: 0.95rem; font-weight: 500;">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
    }, 4000);
  }

  // ==========================================
  // AUTH CORE METHODS
  // ==========================================

  // 1. Supabase Mail Login (Magic Link & OTP)
  async function signInWithEmailOtp(email) {
    const supabase = await ensureClient();
    const cleanEmail = email.trim().toLowerCase();
    
    // Redirect URL back to current page
    const emailRedirectTo = window.location.origin + window.location.pathname;

    const { data, error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: emailRedirectTo,
        shouldCreateUser: true
      }
    });

    if (error) throw error;
    window.AureliaAuth.otpEmailPending = cleanEmail;
    return data;
  }

  // 2. Verify Email OTP Code
  async function verifyEmailOtp(email, token) {
    const supabase = await ensureClient();
    const cleanEmail = (email || window.AureliaAuth.otpEmailPending || '').trim().toLowerCase();
    const cleanToken = token.trim();

    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email'
    });

    if (error) throw error;
    return data;
  }

  // 3. Email & Password Sign In
  async function signInWithPassword(email, password) {
    const supabase = await ensureClient();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password
    });

    if (error) throw error;
    return data;
  }

  // 4. Email & Password Sign Up
  async function signUpWithPassword(email, password, fullName) {
    const supabase = await ensureClient();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: {
          full_name: fullName || cleanEmail.split('@')[0]
        },
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });

    if (error) throw error;
    return data;
  }

  // 5. Send Password Reset
  async function sendPasswordReset(email) {
    const supabase = await ensureClient();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) throw error;
    return data;
  }

  // 5b. Google OAuth Sign In
  async function signInWithGoogle() {
    const supabase = await ensureClient();
    const redirectTo = window.location.origin + window.location.pathname;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) throw error;
    return data;
  }

  // 6. Sign Out
  async function signOut() {
    const supabase = await ensureClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    window.AureliaAuth.user = null;
    window.AureliaAuth.session = null;
    updateHeaderUI();
    showAuthToast('You have signed out successfully.', 'info');
  }

  // 7. Fetch user's saved reservations
  async function fetchUserReservations(userEmail) {
    const supabase = await ensureClient();
    const emailToQuery = userEmail || window.AureliaAuth.user?.email;
    if (!emailToQuery) return [];

    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .ilike('email', emailToQuery)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching reservations:', error);
      return [];
    }
    return data || [];
  }

  // ==========================================
  // UI INJECTION & DOM MANAGEMENT
  // ==========================================

  function injectAuthModalHTML() {
    if (document.getElementById('aureliaAuthModal')) return;

    const modalHTML = `
      <div id="aureliaAuthModal" class="auth-modal-overlay" aria-hidden="true" role="dialog" aria-modal="true">
        <div class="auth-modal-container">
          <button class="auth-modal-close" id="authModalCloseBtn" aria-label="Close dialog">&times;</button>
          
          <div class="auth-modal-header">
            <div class="auth-modal-brand-badge">AURELIA BISTRO & LOUNGE</div>
            <h2 id="authModalTitle" class="auth-modal-title">Sign In to Your Account</h2>
            <p id="authModalSubtitle" class="auth-modal-subtitle">Access your table reservations, dining preferences, and exclusive invitations.</p>
          </div>

          <!-- Social OAuth Section -->
          <div class="auth-social-section">
            <button type="button" class="btn-google" id="googleAuthBtn">
              <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div class="auth-divider-text">
            <span>or sign in with email</span>
          </div>

          <!-- Tabs Navigation -->
          <div class="auth-tabs-nav">
            <button type="button" class="auth-tab-btn active" data-tab="magic-link">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
              <span>Email Magic Link / OTP</span>
            </button>
            <button type="button" class="auth-tab-btn" data-tab="password">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <span>Password Login</span>
            </button>
          </div>

          <!-- Alert / Feedback Box -->
          <div id="authAlertBox" class="auth-alert" style="display: none;"></div>

          <!-- Tab 1: Supabase Mail Login (Magic Link / OTP Code) -->
          <div class="auth-tab-content active" id="tabMagicLink">
            <!-- Step 1: Request Email -->
            <form id="magicLinkForm" class="auth-form-view">
              <div class="form-group">
                <label for="magicEmailInput">Your Email Address</label>
                <input 
                  type="email" 
                  id="magicEmailInput" 
                  class="auth-input" 
                  placeholder="name@example.com" 
                  required 
                  autocomplete="email"
                >
                <span class="auth-input-hint">We will email you a secure one-click sign-in link and a 6-digit verification code.</span>
              </div>

              <button type="submit" id="magicLinkSubmitBtn" class="btn btn-primary btn-block">
                <span>Send Login Email / Code</span>
              </button>
            </form>

            <!-- Step 2: Verification View (shown after email is sent) -->
            <div id="otpVerifySection" class="auth-verify-view" style="display: none;">
              <div class="auth-email-sent-card">
                <div class="auth-email-sent-icon">✉</div>
                <h4>Check Your Inbox!</h4>
                <p>We've sent a magic login link and a 6-digit code to:</p>
                <div class="auth-email-highlight" id="otpSentEmailDisplay">user@example.com</div>
              </div>

              <div class="auth-verify-divider">
                <span>Option A: Click the link in your email</span>
              </div>
              <p class="auth-sub-instruction">Clicking the login link in your email will automatically sign you in right here.</p>

              <div class="auth-verify-divider">
                <span>Option B: Or enter the 6-digit code</span>
              </div>

              <form id="otpVerifyForm">
                <div class="form-group">
                  <label for="otpCodeInput">6-Digit Verification Code</label>
                  <input 
                    type="text" 
                    id="otpCodeInput" 
                    class="auth-input otp-code-input" 
                    placeholder="123456" 
                    maxlength="6" 
                    pattern="[0-9]{6}"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    required
                  >
                </div>
                <button type="submit" id="otpVerifySubmitBtn" class="btn btn-primary btn-block">
                  <span>Verify Code & Sign In</span>
                </button>
              </form>

              <div class="auth-switch-links">
                <button type="button" class="auth-text-link" id="otpResendBtn">Resend Email</button>
                <span class="dot-separator">•</span>
                <button type="button" class="auth-text-link" id="otpChangeEmailBtn">Use a different email</button>
              </div>
            </div>
          </div>

          <!-- Tab 2: Password Sign In / Sign Up -->
          <div class="auth-tab-content" id="tabPassword" style="display: none;">
            <div class="auth-subtoggle">
              <button type="button" class="subtoggle-btn active" id="subtoggleSignIn">Sign In</button>
              <button type="button" class="subtoggle-btn" id="subtoggleSignUp">Create Account</button>
            </div>

            <form id="passwordAuthForm" class="auth-form-view">
              <!-- Full Name (Only for signup) -->
              <div class="form-group" id="fullNameGroup" style="display: none;">
                <label for="passwordFullNameInput">Full Name</label>
                <input 
                  type="text" 
                  id="passwordFullNameInput" 
                  class="auth-input" 
                  placeholder="e.g. Eleanor Vance" 
                  autocomplete="name"
                >
              </div>

              <div class="form-group">
                <label for="passwordEmailInput">Email Address</label>
                <input 
                  type="email" 
                  id="passwordEmailInput" 
                  class="auth-input" 
                  placeholder="name@example.com" 
                  required 
                  autocomplete="email"
                >
              </div>

              <div class="form-group">
                <div style="display: flex; justify-content: space-between; align-items: baseline;">
                  <label for="passwordInput">Password</label>
                  <button type="button" class="auth-text-link" id="forgotPasswordBtn" style="font-size: 0.8rem;">Forgot password?</button>
                </div>
                <input 
                  type="password" 
                  id="passwordInput" 
                  class="auth-input" 
                  placeholder="••••••••" 
                  required 
                  minlength="6"
                  autocomplete="current-password"
                >
              </div>

              <button type="submit" id="passwordSubmitBtn" class="btn btn-primary btn-block">
                <span>Sign In</span>
              </button>
            </form>
          </div>

          <div class="auth-modal-footer">
            <p>Protected with 256-bit Supabase secure authentication. By continuing, you agree to Aurelia's dining policies and terms.</p>
          </div>
        </div>
      </div>

      <!-- User Reservations Modal / Drawer -->
      <div id="aureliaReservationsModal" class="auth-modal-overlay" aria-hidden="true" role="dialog">
        <div class="auth-modal-container reservations-container">
          <button class="auth-modal-close" id="resModalCloseBtn" aria-label="Close dialog">&times;</button>
          
          <div class="auth-modal-header">
            <div class="auth-modal-brand-badge">GUEST PROFILE</div>
            <h2 class="auth-modal-title">My Dining Reservations</h2>
            <p class="auth-modal-subtitle" id="resModalSubtitle">Upcoming and past bookings at Aurelia Bistro & Lounge.</p>
          </div>

          <div id="reservationsListContainer" class="reservations-list-container">
            <div class="auth-spinner-box">
              <div class="auth-spinner"></div>
              <p>Loading your reservations...</p>
            </div>
          </div>

          <div class="reservations-modal-footer">
            <a href="reservation.html" class="btn btn-primary btn-sm">Reserve Another Table</a>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = modalHTML;
    document.body.appendChild(wrapper);

    setupModalEvents();
  }

  // Setup click listeners and form handlers for the modal
  function setupModalEvents() {
    const modal = document.getElementById('aureliaAuthModal');
    const closeBtn = document.getElementById('authModalCloseBtn');
    const alertBox = document.getElementById('authAlertBox');
    
    function showAlert(msg, type = 'error') {
      if (!alertBox) return;
      alertBox.textContent = msg;
      alertBox.className = `auth-alert auth-alert-${type}`;
      alertBox.style.display = 'block';
    }

    function hideAlert() {
      if (alertBox) alertBox.style.display = 'none';
    }

    // Close button & outside click
    if (closeBtn) {
      closeBtn.addEventListener('click', closeModal);
    }
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
        closeReservationsModal();
      }
    });

    // Reservations modal close
    const resModal = document.getElementById('aureliaReservationsModal');
    const resCloseBtn = document.getElementById('resModalCloseBtn');
    if (resCloseBtn) resCloseBtn.addEventListener('click', closeReservationsModal);
    if (resModal) {
      resModal.addEventListener('click', (e) => {
        if (e.target === resModal) closeReservationsModal();
      });
    }

    // Tabs switching
    const tabBtns = document.querySelectorAll('.auth-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        hideAlert();
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const tab = btn.getAttribute('data-tab');
        const magicContent = document.getElementById('tabMagicLink');
        const passwordContent = document.getElementById('tabPassword');

        if (tab === 'magic-link') {
          magicContent.style.display = 'block';
          passwordContent.style.display = 'none';
          document.getElementById('authModalTitle').textContent = 'Sign In to Your Account';
          document.getElementById('authModalSubtitle').textContent = 'Passwordless Supabase email login via instant magic link or verification code.';
        } else {
          magicContent.style.display = 'none';
          passwordContent.style.display = 'block';
          document.getElementById('authModalTitle').textContent = 'Email & Password Login';
          document.getElementById('authModalSubtitle').textContent = 'Sign in to access your saved reservations and preferences.';
        }
      });
    });

    // Google Sign-In button event
    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        hideAlert();
        setButtonLoading(googleBtn, true, 'Connecting to Google...');
        try {
          await signInWithGoogle();
        } catch (err) {
          console.error('Google sign in error:', err);
          showAlert(err.message || 'Google sign-in could not be initiated.');
          setButtonLoading(googleBtn, false, 'Continue with Google');
        }
      });
    }

    // Password Subtoggle (Sign In vs Sign Up)
    let isSignUpMode = false;
    const subtoggleSignIn = document.getElementById('subtoggleSignIn');
    const subtoggleSignUp = document.getElementById('subtoggleSignUp');
    const fullNameGroup = document.getElementById('fullNameGroup');
    const passwordSubmitBtn = document.getElementById('passwordSubmitBtn');

    if (subtoggleSignIn && subtoggleSignUp) {
      subtoggleSignIn.addEventListener('click', () => {
        isSignUpMode = false;
        subtoggleSignIn.classList.add('active');
        subtoggleSignUp.classList.remove('active');
        if (fullNameGroup) fullNameGroup.style.display = 'none';
        if (passwordSubmitBtn) passwordSubmitBtn.querySelector('span').textContent = 'Sign In';
        hideAlert();
      });

      subtoggleSignUp.addEventListener('click', () => {
        isSignUpMode = true;
        subtoggleSignUp.classList.add('active');
        subtoggleSignIn.classList.remove('active');
        if (fullNameGroup) fullNameGroup.style.display = 'block';
        if (passwordSubmitBtn) passwordSubmitBtn.querySelector('span').textContent = 'Create Account';
        hideAlert();
      });
    }

    // Magic Link form submission
    const magicLinkForm = document.getElementById('magicLinkForm');
    const magicEmailInput = document.getElementById('magicEmailInput');
    const magicLinkSubmitBtn = document.getElementById('magicLinkSubmitBtn');
    const otpVerifySection = document.getElementById('otpVerifySection');
    const otpSentEmailDisplay = document.getElementById('otpSentEmailDisplay');

    if (magicLinkForm) {
      magicLinkForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        const email = magicEmailInput.value.trim();
        if (!email) return;

        setButtonLoading(magicLinkSubmitBtn, true, 'Sending email...');
        try {
          await signInWithEmailOtp(email);
          magicLinkForm.style.display = 'none';
          otpVerifySection.style.display = 'block';
          if (otpSentEmailDisplay) otpSentEmailDisplay.textContent = email;
          showAuthToast(`Magic link and verification code sent to ${email}`, 'success');
        } catch (err) {
          console.error('Magic link error:', err);
          showAlert(err.message || 'Failed to send login email. Please verify your address and try again.');
        } finally {
          setButtonLoading(magicLinkSubmitBtn, false, 'Send Login Email / Code');
        }
      });
    }

    // OTP Verify Form submission
    const otpVerifyForm = document.getElementById('otpVerifyForm');
    const otpCodeInput = document.getElementById('otpCodeInput');
    const otpVerifySubmitBtn = document.getElementById('otpVerifySubmitBtn');

    if (otpVerifyForm) {
      otpVerifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        const token = otpCodeInput.value.trim();
        const email = window.AureliaAuth.otpEmailPending || magicEmailInput.value.trim();

        if (!token) return;
        setButtonLoading(otpVerifySubmitBtn, true, 'Verifying...');

        try {
          const { session } = await verifyEmailOtp(email, token);
          showAuthToast('Signed in successfully! Welcome to Aurelia.', 'success');
          closeModal();
        } catch (err) {
          console.error('OTP error:', err);
          showAlert(err.message || 'Invalid or expired code. Please check your email and try again.');
        } finally {
          setButtonLoading(otpVerifySubmitBtn, false, 'Verify Code & Sign In');
        }
      });
    }

    // OTP Resend & Change buttons
    const otpResendBtn = document.getElementById('otpResendBtn');
    const otpChangeEmailBtn = document.getElementById('otpChangeEmailBtn');

    if (otpResendBtn) {
      otpResendBtn.addEventListener('click', async () => {
        const email = window.AureliaAuth.otpEmailPending || magicEmailInput.value.trim();
        if (!email) return;
        otpResendBtn.disabled = true;
        otpResendBtn.textContent = 'Sending...';
        try {
          await signInWithEmailOtp(email);
          showAuthToast(`A fresh login link & code was sent to ${email}`, 'success');
          otpResendBtn.textContent = 'Sent!';
          setTimeout(() => {
            otpResendBtn.disabled = false;
            otpResendBtn.textContent = 'Resend Email';
          }, 5000);
        } catch (err) {
          showAlert(err.message);
          otpResendBtn.disabled = false;
          otpResendBtn.textContent = 'Resend Email';
        }
      });
    }

    if (otpChangeEmailBtn) {
      otpChangeEmailBtn.addEventListener('click', () => {
        otpVerifySection.style.display = 'none';
        magicLinkForm.style.display = 'block';
        hideAlert();
        magicEmailInput.focus();
      });
    }

    // Password Form submission
    const passwordAuthForm = document.getElementById('passwordAuthForm');
    const passwordEmailInput = document.getElementById('passwordEmailInput');
    const passwordInput = document.getElementById('passwordInput');
    const passwordFullNameInput = document.getElementById('passwordFullNameInput');

    if (passwordAuthForm) {
      passwordAuthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();
        const email = passwordEmailInput.value.trim();
        const password = passwordInput.value;
        const fullName = passwordFullNameInput ? passwordFullNameInput.value.trim() : '';

        if (!email || !password) return;

        setButtonLoading(passwordSubmitBtn, true, isSignUpMode ? 'Creating account...' : 'Signing in...');

        try {
          if (isSignUpMode) {
            const data = await signUpWithPassword(email, password, fullName);
            if (data.session) {
              showAuthToast('Account created and signed in! Welcome to Aurelia.', 'success');
              closeModal();
            } else {
              // Confirmation email required
              showAlert('Account created! Please check your email to confirm your registration before signing in.', 'success');
            }
          } else {
            await signInWithPassword(email, password);
            showAuthToast('Welcome back! You are now signed in.', 'success');
            closeModal();
          }
        } catch (err) {
          console.error('Password auth error:', err);
          showAlert(err.message || 'Authentication failed. Please check your credentials.');
        } finally {
          setButtonLoading(passwordSubmitBtn, false, isSignUpMode ? 'Create Account' : 'Sign In');
        }
      });
    }

    // Forgot password link
    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
      forgotPasswordBtn.addEventListener('click', async () => {
        const email = passwordEmailInput.value.trim();
        if (!email) {
          showAlert('Please type your email address above to receive password reset instructions.');
          passwordEmailInput.focus();
          return;
        }

        try {
          await sendPasswordReset(email);
          showAuthToast(`Password reset link sent to ${email}`, 'success');
          showAlert(`Password reset email sent to ${email}. Follow the instructions in the email.`, 'success');
        } catch (err) {
          showAlert(err.message || 'Could not send reset email. Please try again.');
        }
      });
    }
  }

  function setButtonLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    const span = btn.querySelector('span') || btn;
    if (isLoading) {
      btn.setAttribute('data-orig-text', span.textContent);
      span.innerHTML = `<span class="auth-btn-spinner"></span> ${text}`;
    } else {
      const orig = btn.getAttribute('data-orig-text');
      span.textContent = text || orig || 'Submit';
    }
  }

  function openModal(defaultTab = 'magic-link') {
    injectAuthModalHTML();
    const modal = document.getElementById('aureliaAuthModal');
    if (!modal) return;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Switch to specified tab
    const targetTabBtn = document.querySelector(`.auth-tab-btn[data-tab="${defaultTab}"]`);
    if (targetTabBtn) targetTabBtn.click();
  }

  function closeModal() {
    const modal = document.getElementById('aureliaAuthModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Open user reservations list modal
  async function openReservationsModal() {
    injectAuthModalHTML();
    const modal = document.getElementById('aureliaReservationsModal');
    const container = document.getElementById('reservationsListContainer');
    if (!modal || !container) return;

    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    container.innerHTML = `
      <div class="auth-spinner-box">
        <div class="auth-spinner"></div>
        <p>Loading your reservations...</p>
      </div>
    `;

    try {
      const reservations = await fetchUserReservations();
      if (!reservations || reservations.length === 0) {
        container.innerHTML = `
          <div class="reservations-empty-state">
            <div class="empty-icon">🍽</div>
            <h4>No Active Reservations</h4>
            <p>You have not made any dining reservations yet with this email address.</p>
            <a href="reservation.html" class="btn btn-primary btn-sm" style="margin-top: 1rem;">Book a Table Today</a>
          </div>
        `;
        return;
      }

      let html = '<div class="reservations-cards-grid">';
      reservations.forEach(res => {
        const dateStr = res.reservation_date || 'Date not specified';
        const timeStr = res.reservation_time || '7:00 PM';
        const guestsStr = res.guests || '2 Guests';
        const areaStr = res.seating_area || 'Main Dining';
        const statusStr = res.status || 'Confirmed';

        html += `
          <div class="res-card-item">
            <div class="res-card-header">
              <span class="res-card-badge status-${statusStr.toLowerCase()}">${statusStr}</span>
              <span class="res-card-date">${dateStr}</span>
            </div>
            <div class="res-card-body">
              <div class="res-card-time">${timeStr} • ${guestsStr}</div>
              <div class="res-card-detail">Seating: <strong>${areaStr}</strong></div>
              ${res.notes ? `<div class="res-card-notes">Notes: "${res.notes}"</div>` : ''}
            </div>
            <div class="res-card-footer">
              <span>Guest: ${res.name || 'Valued Guest'}</span>
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (err) {
      console.error('Failed to load reservations:', err);
      container.innerHTML = `
        <div class="reservations-empty-state">
          <p style="color: var(--warning);">Could not load reservations at this moment.</p>
        </div>
      `;
    }
  }

  function closeReservationsModal() {
    const modal = document.getElementById('aureliaReservationsModal');
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ==========================================
  // HEADER NAVIGATION BAR INTEGRATION
  // ==========================================

  function updateHeaderUI() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    // Remove any previously injected auth elements
    const oldAuthBtn = document.getElementById('headerAuthBtn');
    const oldUserMenu = document.getElementById('userProfileMenu');
    if (oldAuthBtn) oldAuthBtn.remove();
    if (oldUserMenu) oldUserMenu.remove();

    const mobileToggle = headerActions.querySelector('.mobile-toggle');

    if (window.AureliaAuth.user) {
      const user = window.AureliaAuth.user;
      const email = user.email || 'guest';
      const name = user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0];
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
      const initial = (name.charAt(0) || email.charAt(0) || 'U').toUpperCase();
      const displayName = name.length > 14 ? name.substring(0, 12) + '...' : name;

      const avatarMarkup = avatarUrl 
        ? `<img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
        : initial;

      const avatarLargeMarkup = avatarUrl
        ? `<img src="${avatarUrl}" alt="${name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` 
        : initial;

      const userMenu = document.createElement('div');
      userMenu.className = 'user-profile-menu';
      userMenu.id = 'userProfileMenu';
      userMenu.innerHTML = `
        <button class="user-avatar-btn" id="userAvatarBtn" aria-label="Open User Menu" aria-expanded="false">
          <span class="user-avatar-initial" style="overflow: hidden;">${avatarMarkup}</span>
          <span class="user-display-email" style="font-weight: 700;">${displayName}</span>
          <svg class="chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>

        <div class="user-dropdown-card" id="userDropdownCard" style="display: none;">
          <div class="user-dropdown-header">
            <div class="user-avatar-large" style="overflow: hidden;">${avatarLargeMarkup}</div>
            <div class="user-details">
              <strong class="user-dropdown-name">${name}</strong>
              <span class="user-dropdown-email">${email}</span>
              <span class="user-badge-status">★ Gold Connoisseur</span>
            </div>
          </div>
          <div class="user-dropdown-divider"></div>
          <div class="user-dropdown-links">
            <a href="account.html" class="user-dropdown-link" id="navMyAccountBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              <span>VIP Account & Preferences</span>
            </a>
            <button type="button" class="user-dropdown-link" id="navMyReservationsBtn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              <span>My Reservations</span>
            </button>
            <a href="reservation.html" class="user-dropdown-link">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"></path></svg>
              <span>Book a Table</span>
            </a>
          </div>
          <div class="user-dropdown-divider"></div>
          <button type="button" class="user-dropdown-signout" id="navSignOutBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
            <span>Sign Out</span>
          </button>
        </div>
      `;

      if (mobileToggle) {
        headerActions.insertBefore(userMenu, mobileToggle);
      } else {
        headerActions.appendChild(userMenu);
      }

      // Attach dropdown events
      const avatarBtn = userMenu.querySelector('#userAvatarBtn');
      const dropdownCard = userMenu.querySelector('#userDropdownCard');
      const navMyReservationsBtn = userMenu.querySelector('#navMyReservationsBtn');
      const navSignOutBtn = userMenu.querySelector('#navSignOutBtn');

      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropdownCard.style.display === 'block';
        dropdownCard.style.display = isOpen ? 'none' : 'block';
        avatarBtn.setAttribute('aria-expanded', !isOpen);
      });

      document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target)) {
          dropdownCard.style.display = 'none';
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });

      if (navMyReservationsBtn) {
        navMyReservationsBtn.addEventListener('click', () => {
          dropdownCard.style.display = 'none';
          openReservationsModal();
        });
      }

      if (navSignOutBtn) {
        navSignOutBtn.addEventListener('click', async () => {
          dropdownCard.style.display = 'none';
          await signOut();
        });
      }
    } else {
      // Logged out button
      const authBtn = document.createElement('button');
      authBtn.type = 'button';
      authBtn.className = 'btn btn-outline btn-sm auth-btn-signin';
      authBtn.id = 'headerAuthBtn';
      authBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span>Sign In</span>
      `;

      authBtn.addEventListener('click', () => {
        openModal();
      });

      if (mobileToggle) {
        headerActions.insertBefore(authBtn, mobileToggle);
      } else {
        headerActions.appendChild(authBtn);
      }
    }

    // Update reservation page form if active
    enhanceReservationPage();
  }

  // Pre-fill and link reservations on reservation.html
  function enhanceReservationPage() {
    const resForm = document.getElementById('reservationForm');
    const nameInput = document.getElementById('resName');
    const emailInput = document.getElementById('resEmail');

    if (!resForm || !emailInput) return;

    let banner = document.getElementById('authReservationBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'authReservationBanner';
      banner.className = 'auth-reservation-banner';
      resForm.parentNode.insertBefore(banner, resForm);
    }

    if (window.AureliaAuth.user) {
      const user = window.AureliaAuth.user;
      const fullName = user.user_metadata?.full_name || '';
      
      if (!emailInput.value) emailInput.value = user.email || '';
      if (nameInput && !nameInput.value && fullName) nameInput.value = fullName;

      banner.innerHTML = `
        <div class="auth-banner-content logged-in">
          <span class="auth-banner-icon">✓</span>
          <div>
            <strong>Booking as signed-in guest:</strong> ${user.email}
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 2px;">
              This reservation will be permanently saved to your account.
            </div>
          </div>
        </div>
      `;
    } else {
      banner.innerHTML = `
        <div class="auth-banner-content logged-out">
          <span class="auth-banner-icon">ℹ</span>
          <div>
            <strong>Have an Aurelia guest account?</strong>
            <button type="button" class="auth-text-link" id="bannerSignInTrigger" style="margin-left: 6px; font-weight: 600; text-decoration: underline;">
              Sign in with email
            </button> 
            <span style="font-size: 0.85rem; color: var(--text-secondary); display: block;">
              to auto-fill your details and track your dining reservations.
            </span>
          </div>
        </div>
      `;

      const trigger = document.getElementById('bannerSignInTrigger');
      if (trigger) {
        trigger.addEventListener('click', () => openModal());
      }
    }

    // Intercept reservation submit to write into Supabase table public.reservations
    if (!resForm.dataset.supabaseAttached) {
      resForm.dataset.supabaseAttached = 'true';
      resForm.addEventListener('submit', async () => {
        try {
          const supabase = await ensureClient();
          const guests = document.getElementById('resGuests')?.value || '2 Guests';
          const date = document.getElementById('resDate')?.value || new Date().toISOString().split('T')[0];
          const time = document.getElementById('resTime')?.value || '7:00 PM';
          const seating = document.querySelector('input[name="seating"]:checked')?.value || 'Indoor Dining';
          const name = document.getElementById('resName')?.value || 'Valued Guest';
          const email = document.getElementById('resEmail')?.value || (window.AureliaAuth.user?.email || '');
          const notes = document.getElementById('resNotes')?.value || '';
          const experience = document.querySelector('input[name="experience"]:checked')?.value || 'A La Carte';

          if (email) {
            await supabase.from('reservations').insert([{
              user_id: window.AureliaAuth.user?.id || null,
              name: name,
              email: email,
              location: 'San Francisco Flagship',
              seating_area: seating,
              reservation_date: date,
              reservation_time: time,
              guests: guests,
              experience: experience,
              notes: notes,
              status: 'Confirmed'
            }]);
          }
        } catch (err) {
          console.warn('Could not save reservation to Supabase:', err);
        }
      }, true); // capture phase
    }
  }

  // ==========================================
  // INITIALIZATION & URL LISTENER
  // ==========================================

  async function init() {
    try {
      const supabase = await ensureClient();

      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (!error && session) {
        window.AureliaAuth.session = session;
        window.AureliaAuth.user = session.user;
      }

      // Listen for auth state changes (Google OAuth, Magic link, sign-in, sign-out)
      supabase.auth.onAuthStateChange((event, session) => {
        window.AureliaAuth.session = session;
        window.AureliaAuth.user = session ? session.user : null;
        updateHeaderUI();

        if (event === 'SIGNED_IN' && session?.user) {
          closeModal();
          const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Guest';
          showAuthToast(`Welcome, ${name}! You are now signed in.`, 'success');
          
          // Clear hash if magic link or OAuth tokens were in URL
          if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type='))) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }

          // If on auth page, redirect to account dashboard
          const currentPath = window.location.pathname;
          if (currentPath.endsWith('auth.html') || currentPath.endsWith('/auth')) {
            const params = new URLSearchParams(window.location.search);
            const targetRedirect = params.get('redirect') || 'account.html';
            setTimeout(() => {
              window.location.href = targetRedirect;
            }, 700);
          }
        }
      });

      // Inject UI
      injectAuthModalHTML();
      updateHeaderUI();
      window.AureliaAuth.initialized = true;

      // Handle direct magic link verification or errors in URL query/hash
      const params = new URLSearchParams(window.location.search);
      if (params.get('error_description')) {
        showAuthToast(params.get('error_description'), 'error');
      }

    } catch (err) {
      console.error('Aurelia Auth initialization error:', err);
    }
  }

  // Expose API
  window.AureliaAuth.openModal = openModal;
  window.AureliaAuth.closeModal = closeModal;
  window.AureliaAuth.openReservationsModal = openReservationsModal;
  window.AureliaAuth.closeReservationsModal = closeReservationsModal;
  window.AureliaAuth.signInWithEmailOtp = signInWithEmailOtp;
  window.AureliaAuth.verifyEmailOtp = verifyEmailOtp;
  window.AureliaAuth.signInWithPassword = signInWithPassword;
  window.AureliaAuth.signUpWithPassword = signUpWithPassword;
  window.AureliaAuth.signInWithGoogle = signInWithGoogle;
  window.AureliaAuth.sendPasswordReset = sendPasswordReset;
  window.AureliaAuth.signOut = signOut;
  window.AureliaAuth.fetchUserReservations = fetchUserReservations;

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
