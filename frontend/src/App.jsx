import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
import Record from './pages/Record';
import Diagnosis from './pages/Diagnosis';
import PatientDashboard from './pages/PatientDashboard';
import PatientProfile from './pages/PatientProfile';
import PatientAppointments from './pages/PatientAppointments';
import Profile from './pages/Profile';
import Appointment from './pages/Appointment';
import './App.css';

/** Renders Profile or PatientProfile based on user role. Must be used inside AuthProvider. */
function ProfileRoute() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <PatientProfile />;
  return <Profile />;
}

/** Renders Appointment or PatientAppointments based on user role. Must be used inside AuthProvider. */
function AppointmentsRoute() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <PatientAppointments />;
  return <Appointment />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          
          {/* Doctor Routes */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute role="doctor">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/appointments"
            element={
              <ProtectedRoute>
                <AppointmentsRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path="/record"
            element={
              <ProtectedRoute role="doctor">
                <Record />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diagnosis"
            element={
              <ProtectedRoute role="doctor">
                <Diagnosis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diagnosis/:id"
            element={
              <ProtectedRoute role="doctor">
                <Diagnosis />
              </ProtectedRoute>
            }
          />
          
          {/* Patient Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/:id"
            element={
              <ProtectedRoute role="patient">
                <PatientDashboard />
              </ProtectedRoute>
            }
          />
          
          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;