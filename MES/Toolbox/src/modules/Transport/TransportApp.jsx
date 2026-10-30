import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider as TransportAuthProvider } from './contexts/AuthContext';
import AdminLayout from './components/AdminLayout';
import EmployeeLayout from './components/EmployeeLayout';
import DriverLayout from './components/DriverLayout';
import PageLoader from './components/PageLoader';

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

export default function TransportApp() {
  return (
    <TransportAuthProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route index element={<Portal />} />
          <Route path="checkin" element={<CheckInPassenger />} />

          <Route path="booking" element={<EmployeeLayout />}>
            <Route index element={<BookingHome />} />
            <Route path="ticket/:ticketId" element={<MyTicket />} />
            <Route path="history" element={<BookingHistory />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          <Route path="driver" element={<DriverLayout />}>
            <Route index element={<Navigate to="trips" replace />} />
            <Route path="trips" element={<DriverTrips />} />
            <Route path="trips/:tripId" element={<DriverTripDetails />} />
          </Route>
          <Route path="driver/login" element={<DriverLogin />} />

          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="schedules" element={<ManageSchedules />} />
            <Route path="schedules/:scheduleId" element={<ScheduleDetails />} />
            <Route path="master" element={<MasterData />} />
          </Route>

          <Route path="*" element={<Navigate to="/transport" replace />} />
        </Routes>
      </Suspense>
    </TransportAuthProvider>
  );
}
