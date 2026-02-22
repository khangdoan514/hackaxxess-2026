import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { 
  User,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Award,
  BookOpen,
  Globe,
  Twitter,
  Linkedin,
  Instagram,
  Edit2,
  Save,
  Camera,
  CheckCircle,
  XCircle,
  Shield,
  Stethoscope,
  Activity
} from 'lucide-react';

export default function Profile() {
  const navigate = useNavigate();
  const { user, getDisplayName } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'schedule', 'settings'
  
  // Profile data state
  const [profileData, setProfileData] = useState({
    firstName: 'Khang',
    lastName: 'Doan',
    email: 'khangdoan@gmail.com',
    phone: '+1 (555) 123-4567',
    specialty: 'Cardiology',
    licenseNumber: 'MD123456',
    hospital: 'City General Hospital',
    address: '123 Medical Center Dr, Suite 100',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94105',
    bio: 'Board-certified cardiologist with over 10 years of experience in interventional cardiology. Specializing in preventive cardiovascular medicine and patient-centered care.',
    education: [
      'Stanford University School of Medicine - MD, 2012',
      'Harvard Medical School - Residency in Internal Medicine, 2015',
      'Johns Hopkins Hospital - Fellowship in Cardiology, 2018'
    ],
    certifications: [
      'American Board of Internal Medicine',
      'American Board of Cardiology',
      'Advanced Cardiac Life Support (ACLS)'
    ],
    languages: ['English', 'Spanish', 'Vietnamese'],
    yearsOfExperience: 10,
    patientsTreated: 2500,
    rating: 4.9,
    reviews: 328
  });

  // Work schedule
  const [schedule, setSchedule] = useState([
    { day: 'Monday', hours: '9:00 AM - 5:00 PM', available: true },
    { day: 'Tuesday', hours: '9:00 AM - 5:00 PM', available: true },
    { day: 'Wednesday', hours: '9:00 AM - 5:00 PM', available: true },
    { day: 'Thursday', hours: '9:00 AM - 5:00 PM', available: true },
    { day: 'Friday', hours: '9:00 AM - 3:00 PM', available: true },
    { day: 'Saturday', hours: '10:00 AM - 2:00 PM', available: false },
    { day: 'Sunday', hours: 'Closed', available: false }
  ]);

  // Recent activity
  const recentActivity = [
    { action: 'Completed diagnosis for Sarah Johnson', time: '30 minutes ago', type: 'diagnosis' },
    { action: 'Prescribed medication for Michael Chen', time: '2 hours ago', type: 'prescription' },
    { action: 'Reviewed lab results for Emily Rodriguez', time: '5 hours ago', type: 'lab' },
    { action: 'Updated profile information', time: '1 day ago', type: 'profile' },
    { action: 'Added new appointment slot', time: '2 days ago', type: 'schedule' }
  ];

  const handleSave = () => {
    setIsEditing(false);
    // Here you would save to backend
  };

  const getInitials = () => {
    return `${profileData.firstName[0]}${profileData.lastName[0]}`;
  };

  const StatCard = ({ icon, label, value }) => (
    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header 
        portalType="doctor"
        title="Profile"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        {/* Profile Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Profile Picture */}
              <div className="relative">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{getInitials()}</span>
                </div>
                <button className="absolute -bottom-1 -right-1 p-1.5 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              
              {/* Basic Info */}
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-2xl font-bold text-white">
                    Dr. {profileData.firstName} {profileData.lastName}
                  </h2>
                  <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full border border-green-500/30">
                    Active
                  </span>
                </div>
                <p className="text-blue-300 text-sm mt-1">{profileData.specialty}</p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-xs text-gray-400 flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    {profileData.email}
                  </span>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  <span className="text-xs text-gray-400 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {profileData.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="mt-4 md:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </>
              )}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <StatCard 
              icon={<Calendar className="w-5 h-5 text-blue-400" />}
              label="Years Experience"
              value={profileData.yearsOfExperience}
            />
            <StatCard 
              icon={<Users className="w-5 h-5 text-green-400" />}
              label="Patients Treated"
              value={profileData.patientsTreated}
            />
            <StatCard 
              icon={<Award className="w-5 h-5 text-yellow-400" />}
              label="Rating"
              value={profileData.rating}
            />
            <StatCard 
              icon={<MessageSquare className="w-5 h-5 text-purple-400" />}
              label="Reviews"
              value={profileData.reviews}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-white/10 mb-4">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'overview' 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Overview
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'schedule' 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Work Schedule
              {activeTab === 'schedule' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-3 px-1 font-medium transition-colors relative ${
                activeTab === 'settings' 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Settings
              {activeTab === 'settings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column - Personal Info */}
              <div className="lg:col-span-2 space-y-4">
                {/* Bio */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <User className="w-4 h-4 mr-2 text-blue-400" />
                    About
                  </h3>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                      rows={4}
                    />
                  ) : (
                    <p className="text-gray-300 text-sm leading-relaxed">{profileData.bio}</p>
                  )}
                </div>

                {/* Education & Certifications */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-blue-400" />
                    Education & Certifications
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs text-gray-400 mb-2">Education</h4>
                      <ul className="space-y-2">
                        {profileData.education.map((edu, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start">
                            <span className="text-blue-400 mr-2">•</span>
                            {edu}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-xs text-gray-400 mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {profileData.certifications.map((cert, i) => (
                          <span key={i} className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-500/30">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <Globe className="w-4 h-4 mr-2 text-blue-400" />
                    Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.languages.map((lang, i) => (
                      <span key={i} className="bg-white/10 text-gray-300 text-xs px-2 py-1 rounded-full border border-white/10">
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Contact & Stats */}
              <div className="space-y-4">
                {/* Contact Info */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3">Contact Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-sm">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{profileData.email}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{profileData.phone}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">
                        {profileData.address}, {profileData.city}, {profileData.state} {profileData.zipCode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hospital Info */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3">Practice Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300">{profileData.hospital}</p>
                    <p className="text-xs text-gray-400">License: {profileData.licenseNumber}</p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3">Social Profiles</h3>
                  <div className="flex space-x-3">
                    <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <Twitter className="w-4 h-4 text-blue-400" />
                    </button>
                    <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <Linkedin className="w-4 h-4 text-blue-400" />
                    </button>
                    <button className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                      <Instagram className="w-4 h-4 text-blue-400" />
                    </button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
                  <h3 className="text-white font-medium mb-3 flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-blue-400" />
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {recentActivity.map((activity, i) => (
                      <div key={i} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5"></div>
                        <div>
                          <p className="text-xs text-gray-300">{activity.action}</p>
                          <p className="text-xs text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <h3 className="text-white font-medium mb-4">Weekly Schedule</h3>
              <div className="space-y-2">
                {schedule.map((day, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-white w-24">{day.day}</span>
                      <span className="text-sm text-gray-300">{day.hours}</span>
                    </div>
                    {day.available ? (
                      <span className="flex items-center text-xs text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Available
                      </span>
                    ) : (
                      <span className="flex items-center text-xs text-gray-500">
                        <XCircle className="w-3 h-3 mr-1" />
                        Unavailable
                      </span>
                    )}
                  </div>
                ))}
              </div>
              
              {isEditing && (
                <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                  Update Schedule
                </button>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <h3 className="text-white font-medium mb-4">Account Settings</h3>
              
              <div className="space-y-4">
                {/* Notification Settings */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-3">Notifications</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="form-checkbox bg-white/5 border border-white/10 rounded" defaultChecked />
                      <span className="text-sm text-gray-300">Email notifications for new appointments</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="form-checkbox bg-white/5 border border-white/10 rounded" defaultChecked />
                      <span className="text-sm text-gray-300">SMS reminders for upcoming appointments</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="form-checkbox bg-white/5 border border-white/10 rounded" defaultChecked />
                      <span className="text-sm text-gray-300">Weekly summary reports</span>
                    </label>
                  </div>
                </div>

                {/* Privacy Settings */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-3">Privacy</h4>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="form-checkbox bg-white/5 border border-white/10 rounded" defaultChecked />
                      <span className="text-sm text-gray-300">Show profile to other doctors</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input type="checkbox" className="form-checkbox bg-white/5 border border-white/10 rounded" />
                      <span className="text-sm text-gray-300">Make email visible to patients</span>
                    </label>
                  </div>
                </div>

                {/* Security */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <h4 className="text-sm font-medium text-white mb-3 flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-blue-400" />
                    Security
                  </h4>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
                    Change Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add MessageSquare icon since it's used
function MessageSquare(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}