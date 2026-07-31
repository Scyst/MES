import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import CheckInPassenger from './pages/CheckInPassenger';

import DriverLayout from './components/DriverLayout';
import DriverLogin from './pages/driver/DriverLogin';
import DriverTrips from './pages/driver/DriverTrips';
import DriverTripDetails from './pages/driver/DriverTripDetails';

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
        
        {/* Driver App */}
        <Route path="/driver" element={<DriverLayout />}>
          <Route index element={<Navigate to="/driver/trips" replace />} />
          <Route path="trips" element={<DriverTrips />} />
          <Route path="trips/:tripId" element={<DriverTripDetails />} />
        </Route>
        <Route path="/driver/login" element={<DriverLogin />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          
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
