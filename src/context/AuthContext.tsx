import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { socketService } from '../services/socket';

interface User {
    id: string;
    name: string;
    email: string;
    role: 'user' | 'admin';
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');

        if (storedUser && accessToken) {
            setUser(JSON.parse(storedUser));
            // Connect to WebSocket when user is already logged in
            socketService.connect();
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const response = await authApi.login(email, password);

        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));

        setUser(response.user);

        // 🔌 Connect to WebSocket after login
        socketService.connect();
    };

    const register = async (name: string, email: string, password: string) => {
        const response = await authApi.register(name, email, password);

        localStorage.setItem('accessToken', response.accessToken);
        localStorage.setItem('refreshToken', response.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.user));

        setUser(response.user);

        // 🔌 Connect to WebSocket after registration
        socketService.connect();
    };

    const logout = async () => {
        try {
            if (user?.email) {
                await authApi.logout(user.email);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // 🔌 Disconnect from WebSocket
            socketService.disconnect();

            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated: !!user,
                login,
                register,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
