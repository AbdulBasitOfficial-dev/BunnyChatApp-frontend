import api from './api';

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
    bio: string;
    status: string;
    profileColor: string;
    avatar: string;
}

export const userApi = {
    // Get current user profile
    getMe: async (): Promise<UserProfile> => {
        const response = await api.get('/user/me');
        return response.data;
    },

    // Update profile
    updateProfile: async (updates: {
        name?: string;
        bio?: string;
        status?: string;
        profileColor?: string;
        avatar?: string;
    }): Promise<UserProfile> => {
        const response = await api.patch('/user/profile', updates);
        return response.data;
    },

    // Change password
    changePassword: async (currentPassword: string, newPassword: string) => {
        const response = await api.patch('/user/password', { currentPassword, newPassword });
        return response.data;
    },
};
