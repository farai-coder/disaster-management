import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthorityLayout from './components/AuthorityLayout';
import AuthorityLogin from './pages/AuthorityLogin';
import Dashboard from './pages/Dashboard';
import ManageIncidents from './pages/ManageIncidents';
import CreateAlert from './pages/CreateAlert';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthorityLogin />} />
        <Route element={<AuthorityLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/incidents" element={<ManageIncidents />} />
          <Route path="/alerts" element={<CreateAlert />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
