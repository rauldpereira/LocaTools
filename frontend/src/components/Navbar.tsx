import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import NotificationBell from './NotificationBell';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
    const { isLoggedIn, logout, user } = useAuth();
    const { cartItems } = useCart();
    const { searchTerm, setSearchTerm } = useSearch();
    const totalItems = cartItems.reduce((total, item) => total + item.quantidade, 0);
    const location = useLocation();
    const navigate = useNavigate();
    const showAuthLinks = location.pathname !== '/auth';
    const isHomePage = location.pathname === '/';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">LocaTools</Link>
            </div>

            {/* BUSCA NA NAVBAR - SÓ APARECE NA HOME */}
            {isHomePage && (
                <div className="navbar-search">
                    <input 
                        type="text" 
                        placeholder="Buscar produto..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="navbar-search-input"
                    />
                    <button className="btn-search-nav" type="submit" aria-label="Buscar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="feather feather-search" aria-hidden="true">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </button>
                </div>
            )}

            <div className="navbar-links-container">
                <ul className="navbar-links">
                    <li>
                        <Link to="/">Equipamentos</Link>
                    </li>
                    
                    <li>
                        <Link to="/cart">Carrinho ({totalItems})</Link>
                    </li>

                    {isLoggedIn ? (
                        <>
                            <li>
                                <Link to="/profile">Olá, {user?.nome}</Link>
                            </li>
                            <li>
                                <Link to="/my-reservations">Minhas Reservas</Link>
                            </li>
                            
                            {(user?.tipo_usuario === 'admin' || user?.tipo_usuario === 'funcionario') && (
                                <li>
                                    <Link to="/admin">Painel Interno</Link>
                                </li>
                            )}
                            <li style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
                                <NotificationBell />
                            </li>
                            <li>
                                <button onClick={handleLogout} className="navbar-button">Sair</button>
                            </li>
                        </>
                    ) : (
                        showAuthLinks && (
                            <>
                                <li>
                                    <Link to="/auth?mode=login">Entrar</Link>
                                </li>
                                <li>
                                    <Link to="/auth?mode=register">Registrar</Link>
                                </li>
                            </>
                        )
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;