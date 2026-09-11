import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import FarmerDashboard from './components/FarmerDashboard';
import MyFarms from './components/MyFarms';
import AddFarm from './components/AddFarm';
import BrowseResources from './components/BrowseResources';
import ResourceDetails from './components/ResourceDetails';
import MyRequests from './components/MyRequests';
import RequestDetails from './components/RequestDetails';
import NewRequestPage from './components/NewRequestPage';
import ResourceOwnerDashboard from './components/ResourceOwnerDashboard';

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main>
        <Routes>
          {/* Farmer Routes */}
          <Route path="/" element={<FarmerDashboard />} />
          <Route path="/dashboard" element={<FarmerDashboard />} />
          <Route path="/farms" element={<MyFarms />} />
          <Route path="/farms/add" element={<AddFarm />} />
          <Route path="/resources" element={<BrowseResources />} />
          <Route path="/resources/:id" element={<ResourceDetails />} />
          <Route path="/requests" element={<MyRequests />} />
          <Route path="/requests/:id" element={<RequestDetails />} />
          <Route path="/requests/new" element={<NewRequestPage />} />

          {/* Resource Owner Routes */}
          <Route path="/owner" element={<ResourceOwnerDashboard defaultTab="overview" />} />
          <Route path="/owner/dashboard" element={<ResourceOwnerDashboard defaultTab="overview" />} />
          <Route path="/owner/resources" element={<ResourceOwnerDashboard defaultTab="resources" />} />
          <Route path="/owner/resources/add" element={<ResourceOwnerDashboard defaultTab="add" />} />
          <Route path="/owner/schedules" element={<ResourceOwnerDashboard defaultTab="schedules" />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
