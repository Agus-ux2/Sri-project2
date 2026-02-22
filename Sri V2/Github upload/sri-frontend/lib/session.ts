class Session {
    static login(token: string, user: any) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('sri_token', token);
            localStorage.setItem('sri_user', JSON.stringify(user));
        }
    }

    static logout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('sri_token');
            localStorage.removeItem('sri_user');
            window.location.href = '/login';
        }
    }

    static getUser() {
        if (typeof window !== 'undefined') {
            const user = localStorage.getItem('sri_user');
            return user ? JSON.parse(user) : null;
        }
        return null;
    }

    static getToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sri_token');
        }
        return null;
    }

    static isAuthenticated() {
        if (typeof window !== 'undefined') {
            return !!localStorage.getItem('sri_token');
        }
        return false;
    }

    static async exchangeOTT(ott: string): Promise<boolean> {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api';
            const res = await fetch(`${API_URL}/auth/exchange`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ott })
            });

            if (!res.ok) return false;

            const data = await res.json();
            if (data.token && data.user) {
                Session.login(data.token, data.user);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }
}

export default Session;
