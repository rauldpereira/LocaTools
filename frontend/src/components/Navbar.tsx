import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
    const { isLoggedIn, logout, user } = useAuth();
    const { cartItems } = useCart();
    const totalItems = cartItems.reduce((total, item) => total + item.quantidade, 0);
    const location = useLocation();
    const showAuthLinks = location.pathname !== '/auth';

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
                            <li>
                                <Link to="/profile">Olá, {user?.nome}</Link>
                            </li>
                            {user?.tipo_usuario === 'admin' && (
                                <li>
                                    <Link to="/admin">Painel Admin</Link>
                                </li>
                            )}
                            <li>
                                <Link to="/cart">Carrinho ({totalItems})</Link>
                            </li>
                            <li>
                                <button onClick={logout} className="navbar-button">Sair</button>
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