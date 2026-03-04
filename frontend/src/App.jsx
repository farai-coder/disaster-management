import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import ReportIncident from './pages/ReportIncident';
import LiveMap from './pages/LiveMap';
import ViewAlerts from './pages/ViewAlerts';
import TrackIncident from './pages/TrackIncident';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/report" element={<ReportIncident />} />
          <Route path="/map" element={<LiveMap />} />
          <Route path="/alerts" element={<ViewAlerts />} />
          <Route path="/track" element={<TrackIncident />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
