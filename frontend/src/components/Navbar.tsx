import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import NotificationBell from './NotificationBell';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
    const { isLoggedIn, logout, user } = useAuth();
    const { cartItems } = useCart();
    const totalItems = cartItems.reduce((total, item) => total + item.quantidade, 0);
    const location = useLocation();
    const navigate = useNavigate();
    const showAuthLinks = location.pathname !== '/auth';

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-logo">
                <Link to="/">LocaTools</Link>
            </div>
            <div className="navbar-links-container">
                <ul className="navbar-links">
                    <li>
                        <Link to="/">Equipamentos</Link>
                    </li>
                    {isLoggedIn ? (
                        <>
                            <li style={{ display: 'flex', alignItems: 'center', marginRight: '10px' }}>
                                <NotificationBell />
                            </li>

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
                            
                            <li>
                                <Link to="/cart">Carrinho ({totalItems})</Link>
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