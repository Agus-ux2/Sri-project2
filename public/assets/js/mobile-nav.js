/**
 * Mobile Navigation Controller
 * Handles drawer menu, bottom nav, and mobile-specific interactions
 */

class MobileNavigation {
    constructor() {
        this.drawer = null;
        this.overlay = null;
        this.menuBtn = null;
        this.isDrawerOpen = false;

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.createMobileNavigation();
        this.attachEventListeners();
        this.setActiveNavItem();
        this.setupOfflineIndicator();
    }

    createMobileNavigation() {
        // Check if already created
        if (document.querySelector('.mobile-top-bar')) {
            return;
        }

        const body = document.body;

        // Create top bar
        const topBar = this.createTopBar();
        body.insertBefore(topBar, body.firstChild);

        // Create bottom nav
        const bottomNav = this.createBottomNav();
        body.appendChild(bottomNav);

        // Create drawer
        const { drawer, overlay } = this.createDrawer();
        body.appendChild(overlay);
        body.appendChild(drawer);

        this.drawer = drawer;
        this.overlay = overlay;
        this.menuBtn = document.querySelector('.mobile-menu-btn');
    }

    createTopBar() {
        const topBar = document.createElement('div');
        topBar.className = 'mobile-top-bar';
        topBar.innerHTML = `
            <div class="mobile-top-bar-left">
                <button class="mobile-menu-btn" aria-label="Abrir menú">
                    ☰
                </button>
                <div class="mobile-logo">
                    <img src="/assets/images/sri-logo.png" alt="SRI">
                    <span class="mobile-logo-text">SRI</span>
                </div>
            </div>
            <div class="mobile-top-bar-right">
                <div class="mobile-user-avatar" id="mobileUserAvatar">U</div>
            </div>
        `;
        return topBar;
    }

    createBottomNav() {
        const bottomNav = document.createElement('div');
        bottomNav.className = 'mobile-bottom-nav';
        bottomNav.innerHTML = `
            <div class="mobile-bottom-nav-inner">
                <a href="/dashboard/dashboard.html" class="mobile-nav-item" data-page="dashboard">
                    <span class="mobile-nav-item-icon">📊</span>
                    <span>Inicio</span>
                </a>
                <a href="/dashboard/upload.html" class="mobile-nav-item" data-page="upload">
                    <span class="mobile-nav-item-icon">📄</span>
                    <span>Cargar</span>
                </a>
                <a href="/dashboard/contracts.html" class="mobile-nav-item" data-page="contracts">
                    <span class="mobile-nav-item-icon">📋</span>
                    <span>Contratos</span>
                </a>
                <a href="/dashboard/providers.html" class="mobile-nav-item" data-page="providers">
                    <span class="mobile-nav-item-icon">🏢</span>
                    <span>Empresas</span>
                </a>
            </div>
        `;
        return bottomNav;
    }

    createDrawer() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-drawer-overlay';

        const drawer = document.createElement('div');
        drawer.className = 'mobile-drawer';
        drawer.innerHTML = `
            <div class="mobile-drawer-header">
                <div class="mobile-drawer-avatar" id="drawerUserAvatar">U</div>
                <div class="mobile-drawer-user-info">
                    <div class="mobile-drawer-user-name" id="drawerUserName">Usuario</div>
                    <div class="mobile-drawer-user-company" id="drawerUserCompany">Mi Empresa</div>
                </div>
                <button class="mobile-drawer-close" aria-label="Cerrar menú">×</button>
            </div>
            <nav class="mobile-drawer-nav">
                <a href="/dashboard/dashboard.html" class="mobile-drawer-item">
                    <span class="mobile-drawer-item-icon">📊</span>
                    <span>Dashboard</span>
                </a>
                <a href="/dashboard/upload.html" class="mobile-drawer-item">
                    <span class="mobile-drawer-item-icon">📄</span>
                    <span>Carga de Documentos</span>
                </a>
                <a href="/dashboard/contracts.html" class="mobile-drawer-item">
                    <span class="mobile-drawer-item-icon">📋</span>
                    <span>Contratos</span>
                </a>
                <a href="/dashboard/providers.html" class="mobile-drawer-item">
                    <span class="mobile-drawer-item-icon">🏢</span>
                    <span>Proveedores</span>
                </a>
                <a href="#" class="mobile-drawer-item">
                    <span class="mobile-drawer-item-icon">🌾</span>
                    <span>Mis Granos</span>
                </a>
            </nav>
            <div class="mobile-drawer-footer">
                <a href="#" class="mobile-drawer-item" id="mobileLogoutBtn">
                    <span class="mobile-drawer-item-icon">🚪</span>
                    <span>Cerrar Sesión</span>
                </a>
            </div>
        `;

        return { drawer, overlay };
    }

    attachEventListeners() {
        // Menu button - open drawer
        const menuBtn = document.querySelector('.mobile-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => this.openDrawer());
        }

        // Close button - close drawer
        const closeBtn = document.querySelector('.mobile-drawer-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeDrawer());
        }

        // Overlay - close drawer
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeDrawer());
        }

        // Swipe to close drawer
        this.setupSwipeGestures();

        // Logout button
        const logoutBtn = document.getElementById('mobileLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('¿Está seguro que desea cerrar sesión?')) {
                    if (window.Session) {
                        window.Session.logout();
                    }
                    window.location.href = '/auth/login.html';
                }
            });
        }

        // Update user info
        this.updateUserInfo();
    }

    openDrawer() {
        if (this.drawer && this.overlay) {
            this.drawer.classList.add('active');
            this.overlay.classList.add('active');
            this.isDrawerOpen = true;
            document.body.style.overflow = 'hidden';
        }
    }

    closeDrawer() {
        if (this.drawer && this.overlay) {
            this.drawer.classList.remove('active');
            this.overlay.classList.remove('active');
            this.isDrawerOpen = false;
            document.body.style.overflow = '';
        }
    }

    setupSwipeGestures() {
        let touchStartX = 0;
        let touchEndX = 0;

        const drawer = this.drawer;
        if (!drawer) return;

        drawer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        drawer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        const handleSwipe = () => {
            if (touchStartX - touchEndX > 50) {
                // Swipe left - close drawer
                this.closeDrawer();
            }
        };

        this.handleSwipe = handleSwipe;
    }

    setActiveNavItem() {
        const currentPath = window.location.pathname;

        // Bottom nav
        const bottomNavItems = document.querySelectorAll('.mobile-nav-item');
        bottomNavItems.forEach(item => {
            if (item.getAttribute('href') === currentPath) {
                item.classList.add('active');
            }
        });

        // Drawer nav
        const drawerItems = document.querySelectorAll('.mobile-drawer-item');
        drawerItems.forEach(item => {
            if (item.getAttribute('href') === currentPath) {
                item.classList.add('active');
            }
        });
    }

    updateUserInfo() {
        if (!window.Session) return;

        const user = window.Session.getUser();
        if (!user) return;

        const name = user.name || 'Usuario';
        const company = user.company || 'Mi Empresa';
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        // Update top bar avatar
        const topBarAvatar = document.getElementById('mobileUserAvatar');
        if (topBarAvatar) {
            topBarAvatar.textContent = initials;
        }

        // Update drawer
        const drawerName = document.getElementById('drawerUserName');
        const drawerCompany = document.getElementById('drawerUserCompany');

        if (drawerName) drawerName.textContent = name;
        if (drawerCompany) drawerCompany.textContent = company;
    }

    setupOfflineIndicator() {
        // Create offline indicator
        const indicator = document.createElement('div');
        indicator.className = 'offline-indicator';
        indicator.textContent = '📡 Sin conexión - Modo offline';
        document.body.appendChild(indicator);

        // Monitor online/offline status
        window.addEventListener('online', () => {
            indicator.classList.remove('show');
        });

        window.addEventListener('offline', () => {
            indicator.classList.add('show');
        });

        // Check initial state
        if (!navigator.onLine) {
            indicator.classList.add('show');
        }
    }
}

// Initialize mobile navigation
if (typeof window !== 'undefined') {
    window.MobileNav = new MobileNavigation();
}
