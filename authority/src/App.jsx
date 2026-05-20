import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthorityLayout from './components/AuthorityLayout';
import { NotificationsProvider } from './components/Notifications';
import AuthorityLogin from './pages/AuthorityLogin';
import AuthoritySignup from './pages/AuthoritySignup';
import Dashboard from './pages/Dashboard';
import ManageIncidents from './pages/ManageIncidents';
import AlertsManager from './pages/AlertsManager';
import Reports from './pages/Reports';
import Responders from './pages/Responders';
import Attendance from './pages/Attendance';
import AccountSettings from './pages/AccountSettings';

function App() {
  return (
    <NotificationsProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthorityLogin />} />
        <Route path="/signup" element={<AuthoritySignup />} />
        <Route element={<AuthorityLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<ManageIncidents />} />
          <Route path="/alerts" element={<AlertsManager />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/responders" element={<Responders />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/settings" element={<AccountSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </NotificationsProvider>
  );
}

export default App;
