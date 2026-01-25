/**
 * PWA Installation Handler
 * Manages PWA installation prompts for both Android and iOS
 */

class PWAInstaller {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;

        this.init();
    }

    init() {
        // Check if already installed
        if (this.isStandalone) {
            this.isInstalled = true;
            console.log('[PWA] App is running in standalone mode');
            return;
        }

        // Setup installation prompt
        this.setupInstallPrompt();

        // Show appropriate banner
        if (this.isIOS) {
            this.showIOSInstallPrompt();
        }
    }

    setupInstallPrompt() {
        // Capture the install prompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt detected');
            // Prevent the default browser prompt
            e.preventDefault();
            // Store the event for later use
            this.deferredPrompt = e;
            // Show custom install button
            this.showInstallButton();
        });

        // Track installation
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            this.isInstalled = true;
            this.hideInstallPrompts();
            this.trackInstallation('android-chrome');
        });
    }

    async showInstallPrompt() {
        if (!this.deferredPrompt) {
            console.log('[PWA] Install prompt not available');
            return false;
        }

        try {
            // Show the install prompt
            this.deferredPrompt.prompt();

            // Wait for user response
            const { outcome } = await this.deferredPrompt.userChoice;
            console.log(`[PWA] User response: ${outcome}`);

            if (outcome === 'accepted') {
                this.trackInstallation('android-accepted');
            } else {
                this.trackInstallation('android-dismissed');
            }

            // Clear the deferred prompt
            this.deferredPrompt = null;

            return outcome === 'accepted';
        } catch (error) {
            console.error('[PWA] Install prompt error:', error);
            return false;
        }
    }

    showInstallButton() {
        // Check if button already exists
        if (document.getElementById('pwa-install-btn')) {
            return;
        }

        // Check if mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

        // Only show strictly on mobile devices
        if (!isMobile) {
            console.log('[PWA] Skipping install button - not a mobile device');
            return;
        }

        // Create install button
        const button = document.createElement('button');
        button.id = 'pwa-install-btn';
        button.className = 'pwa-install-btn';
        button.innerHTML = `
            <span class="pwa-install-icon">📱</span>
            <span class="pwa-install-text">Instalar App</span>
        `;
        button.addEventListener('click', () => this.showInstallPrompt());

        // Add styles
        this.addInstallButtonStyles();

        // Add to page
        document.body.appendChild(button);
    }

    showIOSInstallPrompt() {
        // Don't show if already installed or prompt was dismissed
        if (this.isStandalone || localStorage.getItem('ios-install-dismissed')) {
            return;
        }

        // Create iOS install instructions
        const banner = document.createElement('div');
        banner.id = 'ios-install-banner';
        banner.className = 'ios-install-banner';
        banner.innerHTML = `
            <div class="ios-install-content">
                <div class="ios-install-icon">📱</div>
                <div class="ios-install-message">
                    <strong>Instalar SRI Agro</strong>
                    <p>Toca <span class="ios-share-icon">⎋</span> y luego "Agregar a pantalla de inicio"</p>
                </div>
                <button class="ios-install-close" aria-label="Cerrar">×</button>
            </div>
        `;

        // Add close functionality
        const closeBtn = banner.querySelector('.ios-install-close');
        closeBtn.addEventListener('click', () => {
            banner.remove();
            localStorage.setItem('ios-install-dismissed', 'true');
            this.trackInstallation('ios-dismissed');
        });

        // Add styles
        this.addIOSBannerStyles();

        // Add to page
        document.body.appendChild(banner);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (banner.parentNode) {
                banner.style.opacity = '0';
                setTimeout(() => banner.remove(), 300);
            }
        }, 10000);
    }

    hideInstallPrompts() {
        const installBtn = document.getElementById('pwa-install-btn');
        const iosBanner = document.getElementById('ios-install-banner');

        if (installBtn) installBtn.remove();
        if (iosBanner) iosBanner.remove();
    }

    addInstallButtonStyles() {
        if (document.getElementById('pwa-install-styles')) return;

        const style = document.createElement('style');
        style.id = 'pwa-install-styles';
        style.textContent = `
            .pwa-install-btn {
                position: fixed;
                bottom: 80px;
                right: 16px;
                background: var(--color-primary);
                color: white;
                border: none;
                border-radius: 24px;
                padding: 12px 20px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                font-size: 14px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                z-index: 1000;
                transition: all 0.3s ease;
            }

            .pwa-install-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            }

            .pwa-install-btn:active {
                transform: translateY(0);
            }

            .pwa-install-icon {
                font-size: 20px;
            }

            @media (max-width: 768px) {
                .pwa-install-btn {
                    bottom: 72px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    addIOSBannerStyles() {
        if (document.getElementById('ios-install-styles')) return;

        const style = document.createElement('style');
        style.id = 'ios-install-styles';
        style.textContent = `
            .ios-install-banner {
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: white;
                border-top: 1px solid var(--color-neutral-200);
                box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.1);
                z-index: 1001;
                padding: 16px;
                padding-bottom: max(16px, env(safe-area-inset-bottom));
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from { transform: translateY(100%); }
                to { transform: translateY(0); }
            }

            .ios-install-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                max-width: 600px;
                margin: 0 auto;
            }

            .ios-install-icon {
                font-size: 32px;
                flex-shrink: 0;
            }

            .ios-install-message {
                flex: 1;
            }

            .ios-install-message strong {
                display: block;
                margin-bottom: 4px;
                color: var(--color-neutral-900);
            }

            .ios-install-message p {
                margin: 0;
                font-size: 14px;
                color: var(--color-neutral-600);
            }

            .ios-share-icon {
                display: inline-block;
                font-size: 18px;
                vertical-align: middle;
                color: var(--color-primary);
                font-weight: bold;
            }

            .ios-install-close {
                background: none;
                border: none;
                font-size: 28px;
                color: var(--color-neutral-500);
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                flex-shrink: 0;
            }
        `;
        document.head.appendChild(style);
    }

    trackInstallation(action) {
        // Track installation events (integrate with analytics)
        console.log(`[PWA] Installation event: ${action}`);

        // You can integrate with Google Analytics, etc.
        if (window.gtag) {
            window.gtag('event', 'pwa_install', {
                event_category: 'PWA',
                event_label: action
            });
        }
    }

    // Public method to manually trigger install
    static install() {
        if (window.pwaInstaller) {
            return window.pwaInstaller.showInstallPrompt();
        }
        return Promise.resolve(false);
    }
}

// Initialize PWA installer
if (typeof window !== 'undefined') {
    window.pwaInstaller = new PWAInstaller();
}

// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('[SW] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[SW] New service worker found');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker available
                            console.log('[SW] New content available, please refresh');
                            // You can show a notification to user here
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('[SW] Service Worker registration failed:', error);
            });
    });
}
