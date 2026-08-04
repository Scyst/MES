import React, { Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';
import DriverLayout from './components/DriverLayout';
import PageLoader from './components/PageLoader';

// Lazy loaded pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const CheckInPassenger = React.lazy(() => import('./pages/CheckInPassenger'));
const DriverLogin = React.lazy(() => import('./pages/driver/DriverLogin'));
const DriverTrips = React.lazy(() => import('./pages/driver/DriverTrips'));
const DriverTripDetails = React.lazy(() => import('./pages/driver/DriverTripDetails'));
const ManageSchedules = React.lazy(() => import('./pages/admin/ManageSchedules'));
const ScheduleDetails = React.lazy(() => import('./pages/admin/ScheduleDetails'));
const BookingHome = React.lazy(() => import('./pages/employee/BookingHome'));
const MyTicket = React.lazy(() => import('./pages/employee/MyTicket'));
const BookingHistory = React.lazy(() => import('./pages/employee/BookingHistory'));
const ProfilePage = React.lazy(() => import('./pages/employee/ProfilePage'));
const MasterData = React.lazy(() => import('./pages/admin/MasterData'));
const Portal = React.lazy(() => import('./pages/Portal'));

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Main Landing Page */}
          <Route path="/" element={<Portal />} />
          
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
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
