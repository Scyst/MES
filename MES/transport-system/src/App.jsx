import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageTrips from './pages/admin/ManageTrips';
import ManageVehicles from './pages/admin/ManageVehicles';
import TripDetails from './pages/admin/TripDetails';
import CheckInPassenger from './pages/CheckInPassenger';

import ManageSchedules from './pages/admin/ManageSchedules';
import ScheduleDetails from './pages/admin/ScheduleDetails';
import BookingHome from './pages/employee/BookingHome';
import MyTicket from './pages/employee/MyTicket';
import BookingHistory from './pages/employee/BookingHistory';
import ProfilePage from './pages/employee/ProfilePage';
import MasterData from './pages/admin/MasterData';
import { initializeSeedData } from './utils/seedData';

initializeSeedData();

function App() {
  return (
    <Router>
      <Routes>
        {/* Passenger Check-in (QR landing) */}
        <Route path="/checkin" element={<CheckInPassenger />} />
        
        {/* Employee App — wrapped in EmployeeLayout for bottom nav */}
        <Route path="/booking" element={<EmployeeLayout />}>
          <Route index element={<BookingHome />} />
          <Route path="ticket/:ticketId" element={<MyTicket />} />
          <Route path="history" element={<BookingHistory />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="vehicles" element={<ManageVehicles />} />
          <Route path="trips" element={<ManageTrips />} />
          <Route path="trips/:tripId" element={<TripDetails />} />
          
          <Route path="schedules" element={<ManageSchedules />} />
          <Route path="schedules/:scheduleId" element={<ScheduleDetails />} />
          
          <Route path="master" element={<MasterData />} />
        </Route>
        
        {/* Redirect root to admin for this prototype */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
