import { api } from './apiConfig';

/**
 * Cliente HTTP centralizado que maneja automáticamente:
 * - Tokens de autenticación
 * - Manejo de errores
 * - Logging consistente
 */

class ApiClient {
    /**
     * Obtiene el token de autenticación del localStorage
     */
    getToken() {
        return localStorage.getItem('token');
    }

    /**
     * Obtiene los headers por defecto, incluyendo autenticación si existe
     */
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    /**
     * Maneja errores de respuesta HTTP
     */
    async handleResponse(response, url) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');

        let data;
        try {
            data = isJson ? await response.json() : await response.text();
        } catch (e) {
            data = {};
        }

        // Log para debugging
        console.log(`[API] ${response.status} ${url}`, data);

        // Si la respuesta es exitosa
        if (response.ok) {
            return data;
        }

        // Manejo de errores de autenticación
        if (response.status === 401) {
            console.warn('[API] Sesión expirada o no autorizada');
            // Limpiar sesión
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirigir al login si no estamos ya ahí
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
            throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
        }

        // Otros errores
        const errorMessage = data.msg || data.detail || data.message || `Error ${response.status}`;
        throw new Error(errorMessage);
    }

    /**
     * Realiza una petición GET
     */
    async get(endpoint, options = {}) {
        const url = api(endpoint);
        console.log(`[API] GET ${url}`);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.getHeaders(options.headers),
                ...options
            });

            return await this.handleResponse(response, url);
        } catch (error) {
            console.error(`[API] GET ${url} failed:`, error);
            throw error;
        }
    }

    /**
     * Realiza una petición POST
     */
    async post(endpoint, body = null, options = {}) {
        const url = api(endpoint);
        console.log(`[API] POST ${url}`, body);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this.getHeaders(options.headers),
                body: body ? JSON.stringify(body) : null,
                ...options
            });

            return await this.handleResponse(response, url);
        } catch (error) {
            console.error(`[API] POST ${url} failed:`, error);
            throw error;
        }
    }

    /**
     * Realiza una petición PUT
     */
    async put(endpoint, body = null, options = {}) {
        const url = api(endpoint);
        console.log(`[API] PUT ${url}`, body);

        try {
            const response = await fetch(url, {
                method: 'PUT',
                headers: this.getHeaders(options.headers),
                body: body ? JSON.stringify(body) : null,
                ...options
            });

            return await this.handleResponse(response, url);
        } catch (error) {
            console.error(`[API] PUT ${url} failed:`, error);
            throw error;
        }
    }

    /**
     * Realiza una petición DELETE
     */
    async delete(endpoint, options = {}) {
        const url = api(endpoint);
        console.log(`[API] DELETE ${url}`);

        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: this.getHeaders(options.headers),
                ...options
            });

            return await this.handleResponse(response, url);
        } catch (error) {
            console.error(`[API] DELETE ${url} failed:`, error);
            throw error;
        }
    }

    /**
     * Realiza una petición con FormData (para uploads)
     */
    async postFormData(endpoint, formData, options = {}) {
        const url = api(endpoint);
        console.log(`[API] POST (FormData) ${url}`);

        try {
            // No establecer Content-Type para FormData, el navegador lo hace automáticamente
            const headers = {};
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: { ...headers, ...options.headers },
                body: formData,
                ...options
            });

            return await this.handleResponse(response, url);
        } catch (error) {
            console.error(`[API] POST (FormData) ${url} failed:`, error);
            throw error;
        }
    }
}

// Exportar una instancia única
export const apiClient = new ApiClient();

// También exportar la clase por si se necesita crear instancias personalizadas
export default ApiClient;
