import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Video,
  MapPin,
  Phone,
  Mail,
  Plus,
  Filter,
  Search
} from 'lucide-react';

export default function Appointment() {
  const navigate = useNavigate();
  const { user, getDisplayName } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // 'month', 'week', 'day'

  // Sample appointments data
  const appointments = [
    {
      id: 1,
      patientName: 'Sarah Johnson',
      time: '09:00 AM',
      duration: '30 min',
      type: 'In-person',
      status: 'confirmed',
      reason: 'Follow-up - Hypertension',
      location: 'Room 205',
      patientId: 'P-1001'
    },
    {
      id: 2,
      patientName: 'Michael Chen',
      time: '10:00 AM',
      duration: '45 min',
      type: 'Video Call',
      status: 'confirmed',
      reason: 'New Patient - Chest Pain',
      location: 'Virtual',
      patientId: 'P-1002'
    },
    {
      id: 3,
      patientName: 'Emily Rodriguez',
      time: '11:30 AM',
      duration: '30 min',
      type: 'In-person',
      status: 'checked-in',
      reason: 'Medication Review',
      location: 'Room 210',
      patientId: 'P-1003'
    },
    {
      id: 4,
      patientName: 'James Wilson',
      time: '01:00 PM',
      duration: '60 min',
      type: 'In-person',
      status: 'scheduled',
      reason: 'Annual Physical',
      location: 'Room 215',
      patientId: 'P-1004'
    },
    {
      id: 5,
      patientName: 'Maria Garcia',
      time: '02:30 PM',
      duration: '30 min',
      type: 'Phone Call',
      status: 'scheduled',
      reason: 'Test Results Discussion',
      location: 'Phone',
      patientId: 'P-1005'
    },
    {
      id: 6,
      patientName: 'David Kim',
      time: '03:30 PM',
      duration: '45 min',
      type: 'Video Call',
      status: 'scheduled',
      reason: 'Diabetes Management',
      location: 'Virtual',
      patientId: 'P-1006'
    },
    {
      id: 7,
      patientName: 'Lisa Thompson',
      time: '04:30 PM',
      duration: '30 min',
      type: 'In-person',
      status: 'scheduled',
      reason: 'Allergy Consultation',
      location: 'Room 208',
      patientId: 'P-1007'
    }
  ];

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Handle month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Handle date selection
  const handleDateClick = (day) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  // Check if a date has appointments
  const hasAppointments = (day) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // For demo, assume some days have appointments
    return [5, 6, 12, 13, 19, 20, 26, 27].includes(day);
  };

  // Get appointment count for a date
  const getAppointmentCount = (day) => {
    if ([5, 6, 12, 13, 19, 20, 26, 27].includes(day)) {
      return Math.floor(Math.random() * 3) + 1;
    }
    return 0;
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'checked-in': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'scheduled': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Get type icon
  const getTypeIcon = (type) => {
    switch(type) {
      case 'Video Call': return <Video className="w-3.5 h-3.5" />;
      case 'Phone Call': return <Phone className="w-3.5 h-3.5" />;
      default: return <MapPin className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header 
        portalType="doctor"
        title="Appointments"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        {/* Header with date and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Schedule</h2>
            <p className="text-xs text-gray-400">Manage your appointments and patient visits</p>
          </div>
          
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            {/* View Toggle */}
            <div className="flex bg-white/5 rounded-lg border border-white/10 p-0.5">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  view === 'month' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  view === 'week' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  view === 'day' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                Day
              </button>
            </div>

            {/* New Appointment Button */}
            <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
              <Plus className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Calendar and Appointments Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Calendar Section */}
          <div className="lg:col-span-1">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">
                  {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={prevMonth}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={nextMonth}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-xs text-gray-500 py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square p-1"></div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                  const day = i + 1;
                  const isSelected = selectedDate.getDate() === day && 
                                    selectedDate.getMonth() === currentDate.getMonth() &&
                                    selectedDate.getFullYear() === currentDate.getFullYear();
                  const isToday = new Date().getDate() === day &&
                                 new Date().getMonth() === currentDate.getMonth() &&
                                 new Date().getFullYear() === currentDate.getFullYear();
                  const hasAppt = hasAppointments(day);
                  const apptCount = getAppointmentCount(day);

                  return (
                    <button
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`aspect-square p-1 rounded-lg transition-all relative group ${
                        isSelected
                          ? 'bg-blue-500 text-white'
                          : isToday
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <span className="text-xs font-medium">{day}</span>
                      {hasAppt && !isSelected && (
                        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-0.5">
                          {Array.from({ length: Math.min(apptCount, 3) }).map((_, j) => (
                            <div
                              key={j}
                              className={`w-1 h-1 rounded-full ${
                                isToday ? 'bg-blue-400' : 'bg-blue-500/50'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center space-x-4 mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-400">Today</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500/50 rounded-full"></div>
                  <span className="text-xs text-gray-400">Has appointments</span>
                </div>
              </div>
            </div>

            {/* Upcoming Summary */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 mt-3">
              <h3 className="text-sm font-medium text-white mb-3">Today's Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Total Appointments</span>
                  <span className="text-sm text-white font-medium">7</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Completed</span>
                  <span className="text-sm text-green-400">3</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Remaining</span>
                  <span className="text-sm text-yellow-400">4</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full mt-2 overflow-hidden">
                  <div className="h-full w-1/2 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="lg:col-span-2">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              {/* Date Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-medium">
                    Appointments for {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h3>
                </div>
                
                {/* Search and Filter */}
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search patients..."
                      className="pl-7 pr-2 py-1 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 sm:w-40"
                    />
                  </div>
                  <button className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Appointments List */}
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="bg-white/5 rounded-lg border border-white/10 p-3 hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {/* Time indicator */}
                        <div className="flex flex-col items-center min-w-[60px]">
                          <span className="text-sm font-medium text-white">{appointment.time}</span>
                          <span className="text-xs text-gray-500">{appointment.duration}</span>
                        </div>

                        {/* Patient info */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white text-sm">{appointment.patientName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full border ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-xs text-gray-400 flex items-center">
                              <User className="w-3 h-3 mr-1" />
                              {appointment.patientId}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center">
                              {getTypeIcon(appointment.type)}
                              <span className="ml-1">{appointment.type}</span>
                            </span>
                          </div>

                          <p className="text-xs text-gray-300 mt-1">{appointment.reason}</p>
                          
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">
                              {appointment.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1">
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No appointments message */}
              {appointments.length === 0 && (
                <div className="text-center py-12">
                  <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No appointments scheduled for this day</p>
                  <button className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    Schedule New Appointment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
}