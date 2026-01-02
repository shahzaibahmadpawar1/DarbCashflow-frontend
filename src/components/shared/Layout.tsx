import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  // Removed isSM and isAM because they were unused
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Petroleum Station System</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/dashboard"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/dashboard')
                    ? 'border-primary-foreground'
                    : 'border-transparent text-primary-foreground/80 hover:border-primary-foreground/50 hover:text-primary-foreground'
                    }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/cash-flow"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/cash-flow')
                    ? 'border-primary-foreground'
                    : 'border-transparent text-primary-foreground/80 hover:border-primary-foreground/50 hover:text-primary-foreground'
                    }`}
                >
                  Cash Flow
                </Link>
                <Link
                  to="/inventory"
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/inventory')
                    ? 'border-primary-foreground'
                    : 'border-transparent text-primary-foreground/80 hover:border-primary-foreground/50 hover:text-primary-foreground'
                    }`}
                >
                  Inventory
                </Link>
                {isAdmin && (
                  <Link
                    to="/floating-cash"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/floating-cash')
                      ? 'border-primary-foreground'
                      : 'border-transparent text-primary-foreground/80 hover:border-primary-foreground/50 hover:text-primary-foreground'
                      }`}
                  >
                    Floating Cash
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/employees"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/employees')
                      ? 'border-primary-foreground'
                      : 'border-transparent text-primary-foreground/80 hover:border-primary-foreground/50 hover:text-primary-foreground'
                      }`}
                  >
                    Employees
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/stations"
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${isActive('/stations')
                      ? 'border-primary-foreground'
                      : 'border-transparent text-primary-foreground/80 hover:border-primary-foreground/50 hover:text-primary-foreground'
                      }`}
                  >
                    Stations
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm mr-4">{user?.name} ({user?.role})</span>
              <button
                onClick={handleLogout}
                className="bg-primary/90 hover-elevate active-elevate-2 px-4 py-2 rounded-md text-sm font-medium text-primary-foreground border border-primary-border"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};