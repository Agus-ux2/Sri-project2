/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * SESSION MANAGER - Gestión de sesión y autenticación
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

class Session {
    /**
     * Guarda token y datos de usuario
     */
    static login(token, user) {
        localStorage.setItem('sri_token', token);
        localStorage.setItem('sri_user', JSON.stringify(user));
    }

    /**
     * Elimina sesión
     */
    static logout() {
        localStorage.removeItem('sri_token');
        localStorage.removeItem('sri_user');
        window.location.href = '/auth/login.html';
    }

    /**
     * Verifica si hay sesión activa
     */
    static isAuthenticated() {
        return !!localStorage.getItem('sri_token');
    }

    /**
     * Obtiene usuario actual
     */
    static getUser() {
        const userStr = localStorage.getItem('sri_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Obtiene token
     */
    static getToken() {
        return localStorage.getItem('sri_token');
    }

    /**
     * Verifica si el usuario es admin
     */
    static isAdmin() {
        const user = this.getUser();
        return user && user.role === 'admin';
    }

    /**
     * Requiere autenticación (redirige si no está autenticado)
     */
    static requireAuth() {
        if (!this.isAuthenticated()) {
            console.warn('No autenticado. Redirigiendo a login...');
            window.location.href = '/auth/login.html';
            return false;
        }
        return true;
    }

    /**
     * Requiere rol admin
     */
    static requireAdmin() {
        if (!this.isAuthenticated() || !this.isAdmin()) {
            console.warn('Acceso denegado. Requiere rol admin.');
            window.location.href = '/dashboard/dashboard.html';
            return false;
        }
        return true;
    }
}

// Exportar para uso global
window.Session = Session;
