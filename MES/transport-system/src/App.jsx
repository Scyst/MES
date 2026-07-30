import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageTrips from './pages/admin/ManageTrips';
import ManageVehicles from './pages/admin/ManageVehicles';
import TripDetails from './pages/admin/TripDetails';
import CheckInPassenger from './pages/CheckInPassenger';

import ManageSchedules from './pages/admin/ManageSchedules';
import ScheduleDetails from './pages/admin/ScheduleDetails';
import BookingHome from './pages/employee/BookingHome';
import MyTicket from './pages/employee/MyTicket';

function App() {
  return (
    <Router>
      <Routes>
        {/* Passenger Route */}
        <Route path="/checkin" element={<CheckInPassenger />} />
        
        {/* Pre-Booking Employee Routes */}
        <Route path="/booking" element={<BookingHome />} />
        <Route path="/booking/ticket/:ticketId" element={<MyTicket />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="vehicles" element={<ManageVehicles />} />
          <Route path="trips" element={<ManageTrips />} />
          <Route path="trips/:tripId" element={<TripDetails />} />
          
          <Route path="schedules" element={<ManageSchedules />} />
          <Route path="schedules/:scheduleId" element={<ScheduleDetails />} />
        </Route>
        
        {/* Redirect root to admin for this prototype */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
