import axios from 'axios';

const API_BASE_URL = 'https://buunychatapp-backend-production.up.railway.app';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                }
            } catch {
                // Refresh failed, clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: async (name: string, email: string, password: string) => {
        const response = await api.post('/auth/register', { name, email, password });
        return response.data;
    },

    login: async (email: string, password: string) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    logout: async (email: string) => {
        const response = await api.post('/auth/logout', { email });
        return response.data;
    },

    refresh: async (refreshToken: string) => {
        const response = await api.post('/auth/refresh', { refreshToken });
        return response.data;
    },
};

// User API
export const userApi = {
    getMe: async () => {
        const response = await api.get('/user/me');
        return response.data;
    },

    updateUser: async (email: string, name: string) => {
        const response = await api.patch('/user/update', { email, name });
        return response.data;
    },

    updatePassword: async (email: string, password: string) => {
        const response = await api.patch('/user/updatePassword', { email, password });
        return response.data;
    },
};

export default api;
