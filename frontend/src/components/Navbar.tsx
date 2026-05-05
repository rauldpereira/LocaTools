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
                    {isLoggedIn ? (
                        <>
                            <li>
                                <Link to="/profile">Olá, {user?.nome?.split(' ')[0]}</Link>
                            </li>
                            {user?.tipo_usuario !== 'admin' && user?.tipo_usuario !== 'funcionario' && (
                                <>
                                    <li>
                                        <Link to="/my-reservations">Minhas Reservas</Link>
                                    </li>
                                    <li>
                                        <Link to="/cart" style={{ display: 'flex', alignItems: 'center', position: 'relative', padding: '5px' }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2c3e50', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#0056b3'} onMouseOut={(e) => e.currentTarget.style.color = '#2c3e50'}>
                                                <circle cx="9" cy="21" r="1"></circle>
                                                <circle cx="20" cy="21" r="1"></circle>
                                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                            </svg>
                                            {totalItems > 0 && (
                                                <span style={{
                                                    position: 'absolute', top: '0px', right: '-5px',
                                                    backgroundColor: '#e03131', color: 'white',
                                                    borderRadius: '12px', padding: '2px 5px',
                                                    fontSize: '0.7rem', fontWeight: 'bold',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                    minWidth: '18px', textAlign: 'center', lineHeight: '12px',
                                                    border: '2px solid #fff'
                                                }}>
                                                    {totalItems > 99 ? '99+' : totalItems}
                                                </span>
                                            )}
                                        </Link>
                                    </li>
                                </>
                            )}
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
                                    <Link to="/cart" style={{ display: 'flex', alignItems: 'center', position: 'relative', padding: '5px' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#2c3e50', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#0056b3'} onMouseOut={(e) => e.currentTarget.style.color = '#2c3e50'}>
                                            <circle cx="9" cy="21" r="1"></circle>
                                            <circle cx="20" cy="21" r="1"></circle>
                                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                                        </svg>
                                        {totalItems > 0 && (
                                            <span style={{
                                                position: 'absolute', top: '0px', right: '-5px',
                                                backgroundColor: '#e03131', color: 'white',
                                                borderRadius: '12px', padding: '2px 5px',
                                                fontSize: '0.7rem', fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                minWidth: '18px', textAlign: 'center', lineHeight: '12px',
                                                border: '2px solid #fff'
                                            }}>
                                                {totalItems > 99 ? '99+' : totalItems}
                                            </span>
                                        )}
                                    </Link>
                                </li>
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