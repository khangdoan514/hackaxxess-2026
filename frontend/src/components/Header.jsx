import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  LogOut, 
  ChevronLeft, 
  LayoutDashboard, 
  Calendar,
  User,
  Bell,
  Mic,
  FileText
} from 'lucide-react';

export default function Header({ 
  showBack = false, 
  onBack, 
  portalType = 'doctor',
  title 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, getDisplayName } = useAuth();

  const getPortalColors = () => {
    switch(portalType) {
      case 'doctor':
        return {
          text: 'text-blue-300',
          border: 'border-blue-500/30',
          badgeBg: 'bg-blue-500/20',
          icon: <Activity className="w-8 h-8 text-blue-400" />
        };
      case 'diagnosis':
        return {
          text: 'text-purple-300',
          border: 'border-purple-500/30',
          badgeBg: 'bg-purple-500/20',
          icon: <FileText className="w-8 h-8 text-purple-400" />
        };
      case 'record':
        return {
          text: 'text-indigo-300',
          border: 'border-indigo-500/30',
          badgeBg: 'bg-indigo-500/20',
          icon: <Mic className="w-8 h-8 text-indigo-400" />
        };
      case 'patient':
        return {
          text: 'text-green-300',
          border: 'border-green-500/30',
          badgeBg: 'bg-green-500/20',
          icon: <Activity className="w-8 h-8 text-green-400" />
        };
      default:
        return {
          text: 'text-blue-300',
          border: 'border-blue-500/30',
          badgeBg: 'bg-blue-500/20',
          icon: <Activity className="w-8 h-8 text-blue-400" />
        };
    }
  };

  const colors = getPortalColors();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const doctorNavItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', path: '/doctor', active: location.pathname === '/doctor' },
    { icon: <Calendar className="w-4 h-4" />, label: 'Appointments', path: '/appointments', active: location.pathname === '/appointments' },
    { icon: <User className="w-4 h-4" />, label: 'Profile', path: '/profile', active: location.pathname === '/profile' },
  ];
  const patientNavItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: 'Dashboard', path: '/dashboard', active: location.pathname === '/dashboard' },
    { icon: <User className="w-4 h-4" />, label: 'Profile', path: '/profile', active: location.pathname === '/profile' },
    { icon: <Calendar className="w-4 h-4" />, label: 'Appointments', path: '/appointments', active: location.pathname === '/appointments' },
  ];
  const navItems = portalType === 'patient' ? patientNavItems : doctorNavItems;
  const dashboardPath = portalType === 'patient' ? '/dashboard' : '/doctor';

  const goToDashboard = () => navigate(dashboardPath);

  return (
    <header className="bg-white/5 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex justify-between items-center h-16">
          
          {/* Left section - logo and title clickable to dashboard */}
          <div className="flex items-center space-x-3">
            {showBack && (
              <button
                onClick={onBack || (() => navigate(-1))}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
            )}
            <button
              type="button"
              onClick={goToDashboard}
              className="flex items-center space-x-3 rounded-lg hover:bg-white/10 transition-colors px-1 py-1 -mx-1"
              aria-label="Go to dashboard"
            >
              {colors.icon}
              <h1 className="text-xl font-bold text-white">Diffinitive</h1>
              <span className={`${colors.badgeBg} ${colors.text} text-xs px-2 py-1 rounded-full border ${colors.border} hidden sm:inline-block`}>
                {title || portalType.charAt(0).toUpperCase() + portalType.slice(1) + ' Portal'}
              </span>
            </button>
          </div>

          {/* Center Navigation - Added navbar in the middle */}
          <nav className="absolute left-1/2 transform -translate-x-1/2 hidden md:flex items-center space-x-1">
            {navItems.map((item, index) => (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-all text-sm ${
                  item.active 
                    ? 'text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Right section - Exact same as your original */}
          <div className="flex items-center space-x-4">
            <button className="p-1.5 hover:bg-white/10 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-2 bg-white/5 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-sm text-gray-300">{getDisplayName()}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Sign out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}