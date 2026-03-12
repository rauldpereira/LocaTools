import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import axios from 'axios';

interface UserData {
    id: number;
    nome: string;
    email: string;
    tipo_usuario: 'cliente' | 'admin' | 'funcionario'; 
    permissoes?: string[];
}

interface AuthContextType {
    user: UserData | null;
    token: string | null;
    isLoggedIn: boolean;
    isLoadingAuth: boolean;
    login: (token: string) => Promise<void>;
    logout: (redirectToLogin?: boolean) => void;
    updateUser: (newUser: { nome: string; email: string }) => void;
    hasPermission: (permission: string) => boolean; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

    const updateUser = (newUser: { nome: string; email: string }) => {
        setUser(prevUser => (prevUser ? { ...prevUser, ...newUser } : null));
    };

    const logout = (redirectToLogin = false) => {
        delete axios.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsLoggedIn(false);

        // madnda o usuário para a tela de login com o aviso de expirado
        if (redirectToLogin) {
            window.location.href = '/auth?expired=true'; 
        }
    };

    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.tipo_usuario === 'admin') return true;
        return Array.isArray(user.permissoes) && user.permissoes.includes(permission);
    };

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            response => response, 
            error => {
                // Se o backend devolver 401 e não for na rota de login...
                if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
                    console.warn('⚠️ Token expirado ou inválido. Redirecionando para o login...');
                    logout(true); // Aciona o logout forçado!
                }
                return Promise.reject(error);
            }
        );

        // Limpa o interceptador se o componente desmontar
        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, []);

    useEffect(() => {
        const fetchUser = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    const response = await axios.get('http://localhost:3001/api/profile');
                    setUser(response.data);
                    setToken(storedToken);
                    setIsLoggedIn(true);
                } catch (error) {
                    console.error('Erro ao carregar o perfil:', error);
                    logout(false); 
                } finally {
                    setIsLoadingAuth(false); 
                }
            } else {
                setIsLoadingAuth(false);
            }
        };
        fetchUser();
    }, []);

    const login = async (newToken: string) => {
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        localStorage.setItem('token', newToken);
        setToken(newToken);

        try {
            const response = await axios.get('http://localhost:3001/api/profile');
            setUser(response.data);
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Erro ao buscar perfil após login:', error);
            logout(false);
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            isLoggedIn, 
            isLoadingAuth,
            login, 
            logout, 
            updateUser,
            hasPermission
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};

export default AuthProvider;