import { useState, useEffect } from 'react';

const STORAGE_KEY = 'transport_system_v2_data';

const getInitialData = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return {
    businessUnits: ['Toolbox', 'OEM', 'Pipe', 'Sheet Metal', 'Plastic', 'Corporate'],
    vehicles: [
      { id: 'V-001', name: 'รถตู้สายระยอง-พัทยา', licensePlate: 'ฮท-1234', capacity: 12 },
      { id: 'V-002', name: 'รถบัสสายศรีราชา', licensePlate: '30-4567', capacity: 40 }
    ],
    scans: [
      // { id, vehicleId, name, bu, timestamp }
    ],
    tripBillings: [
      // { id, vehicleId, date, startTime, endTime, cost, passengers: [] }
    ]
  };
};

export const saveToStore = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('store_updated'));
};

export const useStore = () => {
  const [data, setData] = useState(getInitialData);

  useEffect(() => {
    const handleStorageChange = () => {
      setData(getInitialData());
    };
    
    window.addEventListener('store_updated', handleStorageChange);
    return () => window.removeEventListener('store_updated', handleStorageChange);
  }, []);

  // Vehicles
  const addVehicle = (vehicle) => {
    const newData = { ...data, vehicles: [...data.vehicles, { ...vehicle, id: `V-${Date.now()}` }] };
    saveToStore(newData);
  };

  const deleteVehicle = (id) => {
    const newData = { ...data, vehicles: data.vehicles.filter(v => v.id !== id) };
    saveToStore(newData);
  };

  // Scans (Passenger Check-in)
  const checkInPassenger = (vehicleId, passenger) => {
    const scan = {
      id: `S-${Date.now()}`,
      vehicleId,
      name: passenger.name,
      bu: passenger.bu,
      timestamp: new Date().toISOString()
    };
    const newData = { ...data, scans: [...data.scans, scan] };
    saveToStore(newData);
  };

  // Trip Billings
  const addTripBilling = (trip) => {
    // trip contains: vehicleId, date, startTime, endTime, cost
    // Find all scans for this vehicle within the date and time window
    const startDateTime = new Date(`${trip.date}T${trip.startTime}:00`).getTime();
    const endDateTime = new Date(`${trip.date}T${trip.endTime}:00`).getTime();
    
    const relevantScans = data.scans.filter(s => {
      if (s.vehicleId !== trip.vehicleId) return false;
      const scanTime = new Date(s.timestamp).getTime();
      return scanTime >= startDateTime && scanTime <= endDateTime;
    });

    // Deduplicate by name (in case someone scanned twice)
    const uniquePassengers = [];
    const seenNames = new Set();
    for (const scan of relevantScans) {
      if (!seenNames.has(scan.name.toLowerCase().trim())) {
        seenNames.add(scan.name.toLowerCase().trim());
        uniquePassengers.push(scan);
      }
    }

    const newTrip = {
      ...trip,
      id: `TB-${Date.now()}`,
      passengers: uniquePassengers
    };

    const newData = { ...data, tripBillings: [...data.tripBillings, newTrip] };
    saveToStore(newData);
  };

  const deleteTripBilling = (id) => {
    const newData = { ...data, tripBillings: data.tripBillings.filter(t => t.id !== id) };
    saveToStore(newData);
  };

  const getTripBilling = (id) => {
    return data.tripBillings.find(t => t.id === id);
  };

  return { 
    data, 
    addVehicle, 
    deleteVehicle, 
    checkInPassenger, 
    addTripBilling, 
    deleteTripBilling, 
    getTripBilling 
  };
};
