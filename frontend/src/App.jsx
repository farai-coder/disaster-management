import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import { NotificationsProvider } from './components/Notifications';
import Home from './pages/Home';
import ReportIncident from './pages/ReportIncident';
import LiveMap from './pages/LiveMap';
import ViewAlerts from './pages/ViewAlerts';
import TrackIncident from './pages/TrackIncident';
import ResponderReport from './pages/ResponderReport';

function App() {
  return (
    <NotificationsProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportIncident />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/alerts" element={<ViewAlerts />} />
          <Route path="/track" element={<TrackIncident />} />
          <Route path="/respond/:incidentId" element={<ResponderReport />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </NotificationsProvider>
  );
}

export default App;
