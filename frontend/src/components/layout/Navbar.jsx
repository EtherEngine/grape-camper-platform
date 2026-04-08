import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    setMenuOpen(false);
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setDropdownOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => { setDropdownOpen(false); setMenuOpen(false); }, [location.pathname]);

  const navLink = (to, label, className = 'navbar__link') => (
    <NavLink to={to} className={className} onClick={closeMenu}>
      {label}
    </NavLink>
  );

  const dropdownLink = (to, label) => (
    <NavLink to={to} className="navbar__dropdown-link" onClick={closeMenu}>
      {label}
    </NavLink>
  );

  return (
    <nav className="navbar">
      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" onClick={closeMenu}>
          GRAPE
        </Link>

        <button
          type="button"
          className={`navbar__burger ${menuOpen ? 'navbar__burger--open' : ''}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menü"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`navbar__menu ${menuOpen ? 'navbar__menu--open' : ''}`}>
          {navLink('/vehicles', 'Fahrzeuge')}

          {isAuthenticated ? (
            <>
              {navLink('/dashboard', 'Dashboard')}

              {/* Dropdown for additional links */}
              <div className="navbar__dropdown" ref={dropdownRef}>
                <button
                  type="button"
                  className={`navbar__dropdown-trigger ${dropdownOpen ? 'navbar__dropdown-trigger--open' : ''}`}
                  onClick={() => setDropdownOpen((o) => !o)}
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  {user.first_name}
                  <svg className="navbar__dropdown-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="navbar__dropdown-menu">
                    {dropdownLink('/my-bookings', 'Buchungen')}
                    {hasRole('owner') && dropdownLink('/owner/vehicles', 'Meine Fahrzeuge')}
                    {hasRole('owner') && dropdownLink('/owner/bookings', 'Anfragen')}
                    {hasRole('owner') && dropdownLink('/owner/swaps', 'Tauschangebote')}
                    {hasRole('admin') && dropdownLink('/admin', 'Admin')}
                    {hasRole('admin') && dropdownLink('/admin/users', 'Nutzerverwaltung')}
                    {hasRole('admin') && dropdownLink('/admin/bookings', 'Buchungsmonitoring')}
                    {hasRole('admin') && dropdownLink('/admin/reports', 'Reports')}
                    {hasRole('admin') && dropdownLink('/admin/swap-unlock', 'Tauschoption')}
                    <div className="navbar__dropdown-divider" />
                    <button onClick={handleLogout} className="navbar__dropdown-link navbar__dropdown-link--danger">
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {navLink('/login', 'Login')}
              {navLink('/register', 'Registrieren', 'navbar__link navbar__link--cta')}
            </>
          )}
        </div>

        {menuOpen && <div className="navbar__backdrop" onClick={closeMenu} />}
      </div>
    </nav>
  );
}