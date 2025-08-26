import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import axios from 'axios';


interface AuthContextType {
    user: { nome: string; email: string } | null;
    token: string | null;
    isLoggedIn: boolean;
    login: (token: string, user: { nome: string; email: string }) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<{ nome: string; email: string } | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

    useEffect(() => {
        const fetchUser = async () => {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const response = await axios.get('http://localhost:3001/api/profile', {
                        headers: {
                            Authorization: `Bearer ${storedToken}`,
                        },
                    });
                    setUser(response.data);
                    setToken(storedToken);
                    setIsLoggedIn(true);
                } catch (error) {
                    console.error('Erro ao carregar o perfil:', error);
                    logout();
                }
            }
        };
        fetchUser();
    }, []);


    const login = (newToken: string, newUser: { nome: string; email: string }) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        setIsLoggedIn(true);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setIsLoggedIn(false);
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoggedIn, login, logout }}>
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