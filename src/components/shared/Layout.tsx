import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { user, logout, isAdmin, isAM, isSM, isOfficeUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Always default to true (open) for better UX
    // Users can close it if they want, and it will persist
    try {
      const saved = localStorage.getItem('sidebarOpen');
      // If explicitly set to false, respect that, otherwise default to true
      return saved !== null ? JSON.parse(saved) : true;
    } catch (error) {
      console.error('Error reading sidebar state:', error);
      return true; // Default to open on error
    }
  });
  const [scrollY, setScrollY] = useState(0);

  // Persist sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    console.log('Sidebar state:', sidebarOpen); // Debug log
  }, [sidebarOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['Admin', 'AM', 'SM', 'OU', 'Accountant', 'ViewOnly'] },
    { path: '/cash-flow', label: 'Cash Flow', icon: '💰', roles: ['Admin', 'AM', 'SM'] },
    { path: '/inventory', label: 'Inventory', icon: '📦', roles: ['Admin', 'AM', 'SM', 'OU', 'ViewOnly'] },
    { path: '/purchase-requests', label: 'Purchase Requests', icon: '📝', roles: ['Admin', 'OU', 'Accountant'] },
    { path: '/floating-cash', label: 'Floating Cash', icon: '💵', roles: ['Admin'] },
    { path: '/employees', label: 'Employees', icon: '👥', roles: ['Admin'] },
    { path: '/stations', label: 'Stations', icon: '🏢', roles: ['Admin'] },
    { path: '/organization', label: 'Organization', icon: '🌳', roles: ['Admin'] },
  ];

  // Fallback: Try to get user from localStorage if useAuth hasn't loaded yet
  const getUserRole = () => {
    if (user?.role) return user.role;
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.role;
      }
    } catch (e) {
      console.error('Error reading user from localStorage:', e);
    }
    return null;
  };

  const userRole = getUserRole();
  const effectiveIsAdmin = userRole === 'Admin' || isAdmin;
  const effectiveIsAM = userRole === 'AM' || isAM;
  const effectiveIsSM = userRole === 'SM' || isSM;
  const effectiveIsOU = userRole === 'OU' || isOfficeUser;
  const effectiveIsAccountant = userRole === 'Accountant';
  const effectiveIsViewOnly = userRole === 'ViewOnly';

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles.includes('Admin') && effectiveIsAdmin) return true;
    if (item.roles.includes('AM') && effectiveIsAM) return true;
    if (item.roles.includes('SM') && effectiveIsSM) return true;
    if (item.roles.includes('OU') && effectiveIsOU) return true;
    if (item.roles.includes('Accountant') && effectiveIsAccountant) return true;
    if (item.roles.includes('ViewOnly') && effectiveIsViewOnly) return true;
    return false;
  });

  // Debug logging
  useEffect(() => {
    console.log('=== Sidebar Debug Info ===');
    console.log('User:', user);
    console.log('User Role:', user?.role);
    console.log('isAdmin:', isAdmin, '| effectiveIsAdmin:', effectiveIsAdmin);
    console.log('isAM:', isAM, '| effectiveIsAM:', effectiveIsAM);
    console.log('isSM:', isSM, '| effectiveIsSM:', effectiveIsSM);
    console.log('User Role from fallback:', userRole);
    console.log('Filtered Menu Items:', filteredMenuItems);
    console.log('Total Menu Items:', filteredMenuItems.length);
  }, [user, isAdmin, isAM, isSM, filteredMenuItems, userRole, effectiveIsAdmin, effectiveIsAM, effectiveIsSM]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-16">
          {/* Logo Section with Hamburger Menu */}
          <div className="flex items-center gap-3">
            {/* Hamburger Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-gray-600 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Darb Station</h1>
              <p className="text-xs text-gray-500">Cash Flow Management System</p>
            </div>
          </div>

          {/* Right Navigation */}
          <div className="flex items-center gap-6">
            <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              Role: {
                user?.role === 'Admin' ? 'Admin' :
                  user?.role === 'AM' ? 'Area Manager' :
                    user?.role === 'OU' ? 'Office User' :
                      user?.role === 'Accountant' ? 'Accountant' :
                        user?.role === 'ViewOnly' ? 'View Only' :
                          'Station Manager'
              }
            </div>
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-sm font-medium">Dashboard</span>
            </Link>
            {isAdmin && (
              <Link
                to="/employees"
                className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm font-medium">Accounts</span>
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={`${sidebarOpen ? 'w-64' : 'w-0'
            } bg-white border-r border-gray-200 text-gray-900 transition-all duration-300 ease-in-out relative min-h-screen flex-shrink-0 ${!sidebarOpen ? 'overflow-hidden' : ''
            }`}
        >
          <div className="relative z-10 h-full flex flex-col min-h-screen">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold whitespace-nowrap text-gray-900">Navigation</h2>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 whitespace-nowrap ${isActive(item.path)
                      ? 'bg-primary text-white shadow-lg'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 px-4">
                  <p className="text-gray-400 text-sm mb-2">No menu items available</p>
                  <p className="text-gray-500 text-xs">
                    {user ? `Role: ${user.role}` : 'Please log in'}
                  </p>
                </div>
              )}
            </nav>

            {/* User Info at Bottom */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.employeeId || user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen relative">
          {/* Background Image */}
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: 'url("/bg.jpg")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
            }}
          />

          {/* White overlay that fades as we scroll - more white at top, less as we scroll */}
          <div
            className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-300"
            style={{
              background: `linear-gradient(to bottom, rgba(255,255,255,${Math.max(0.95 - scrollY / 800, 0.3)}) 0%, rgba(255,255,255,${Math.max(0.85 - scrollY / 600, 0.1)}) 50%, rgba(255,255,255,${Math.max(0.7 - scrollY / 400, 0)}) 100%)`,
            }}
          />

          <div className="relative z-10 p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md border-t border-gray-200/50 py-4 px-6 text-center relative z-10">
        <p className="text-xs text-gray-500">
          Developed and Powered by{' '}
          <a
            href="https://www.nocastra.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            Nocastra
          </a>
        </p>
      </footer>

      {/* Sidebar Toggle Button (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-20 bg-primary text-white p-2 rounded-lg shadow-lg hover:bg-primary/90 transition-colors z-40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
    </div>
  );
};
