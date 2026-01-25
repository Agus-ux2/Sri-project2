/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * API WRAPPER - Centraliza todas las llamadas HTTP
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Responsabilidades:
 * - Agregar headers de autenticación automáticamente
 * - Manejar errores 401/403 (redirect a login)
 * - Parsear respuestas JSON
 * - Logging centralizado de errores
 */

const API_BASE_URL = '/api';

class API {
  /**
   * Obtiene el token JWT del localStorage
   */
  static getToken() {
    return localStorage.getItem('sri_token');
  }

  /**
   * Construye headers con autenticación
   */
  static getHeaders(includeAuth = true) {
    const headers = {
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

  /**
   * Maneja respuestas HTTP
   */
  static async handleResponse(response) {
    // Errores de autenticación
    if (response.status === 401 || response.status === 403) {
      console.warn('No autorizado. Redirigiendo a login...');
      localStorage.removeItem('sri_token');
      localStorage.removeItem('sri_user');
      window.location.href = '/auth/login.html';
      throw new Error('No autorizado');
    }

    // Intentar parsear JSON
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Error HTTP
    if (!response.ok) {
      const error = new Error(data.message || `Error HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * GET request
   */
  static async get(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(options.auth !== false),
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * POST request
   */
  static async post(endpoint, body = {}, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(options.auth !== false),
        body: JSON.stringify(body),
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * POST con FormData (para archivos)
   */
  static async postFormData(endpoint, formData, options = {}) {
    try {
      const token = this.getToken();
      const headers = {};

      if (token && options.auth !== false) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: headers,
        body: formData,
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`POST ${endpoint} (FormData) failed:`, error);
      throw error;
    }
  }

  /**
   * PUT request
   */
  static async put(endpoint, body = {}, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(options.auth !== false),
        body: JSON.stringify(body),
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * DELETE request
   */
  static async delete(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(options.auth !== false),
        ...options
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Exportar para uso global
window.API = API;
