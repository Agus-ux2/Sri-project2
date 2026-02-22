const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010/api';

class API {
    static getToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('sri_token');
        }
        return null;
    }

    static getHeaders(includeAuth = true) {
        const headers: any = {
            'Content-Type': 'application/json'
        };

        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        return headers;
    }

    static async handleResponse(response: Response) {
        if (response.status === 401 || response.status === 403) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('sri_token');
                localStorage.removeItem('sri_user');
                window.location.href = '/login';
            }
            throw new Error('No autorizado');
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Error HTTP ${response.status}`);
        }

        return data;
    }

    static async get(endpoint: string, options: any = {}) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: this.getHeaders(options.auth !== false),
            ...options
        });
        return this.handleResponse(response);
    }

    static async post(endpoint: string, body: any, options: any = {}) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: this.getHeaders(options.auth !== false),
            body: JSON.stringify(body),
            ...options
        });
        return this.handleResponse(response);
    }
}

export default API;
