import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import api from '../lib/api';
import { 
  Mic, 
  FileText, 
  Users, 
  Clock, 
  Search,
  Filter,
  Calendar,
  Download,
  Eye,
  PlusCircle,
  Activity,
  TrendingUp,
  AlertCircle,
  Bell,
  User,
  LogOut
} from 'lucide-react';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const { user, logout, getDisplayName } = useAuth();
  const [recentRecords, setRecentRecords] = useState([]);
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingDiagnoses: 0,
    completedToday: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showRecordModal, setShowRecordModal] = useState(false);

  // Load doctor's records on mount
  useEffect(() => {
    loadDoctorRecords();
  }, []);

  const loadDoctorRecords = async () => {
    setLoading(true);
    try {
        // Try to fetch from API first
        const response = await api.get('/doctor/records').catch(() => null);
        
        if (response?.data?.records && response.data.records.length > 0) {
        // If we have real records, combine them with mock data
        // Put real records first, then mock data
        const combinedRecords = [
            ...response.data.records,
            ...mockRecords.map(mock => ({ ...mock, isMock: true })) // Mark as mock
        ];
        setRecentRecords(combinedRecords);
        setStats(response.data.stats || {
            totalPatients: response.data.records.length + mockRecords.length,
            todayAppointments: 8,
            pendingDiagnoses: 3,
            completedToday: 5
        });
        } else {
        // If no real records, just show mock data
        setRecentRecords(mockRecords.map(mock => ({ ...mock, isMock: true })));
        setStats({
            totalPatients: mockRecords.length,
            todayAppointments: 8,
            pendingDiagnoses: 3,
            completedToday: 5
        });
        }
    } catch (error) {
        console.error('Failed to load records:', error);
        // On error, still show mock data
        setRecentRecords(mockRecords.map(mock => ({ ...mock, isMock: true })));
        setStats({
        totalPatients: mockRecords.length,
        todayAppointments: 8,
        pendingDiagnoses: 3,
        completedToday: 5
        });
    } finally {
        setLoading(false);
    }
    };

  const startNewConsultation = () => {
    navigate('/record');
  };

  const viewRecord = (record) => {
    setSelectedRecord(record);
    setShowRecordModal(true);
  };

  const downloadPDF = async (record) => {
    try {
      // If record has PDF data, download it
      if (record.pdfData) {
        const byteCharacters = atob(record.pdfData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${record.patientName}_prescription.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Mock download for demo
        alert(`Downloading PDF for ${record.patientName}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const addNewRecord = (newRecord) => {
    // Add new record to the top, but keep mock data at the bottom
    setRecentRecords(prev => {
        // Separate real records from mock records
        const realRecords = prev.filter(r => !r.isMock);
        const mockRecords_only = prev.filter(r => r.isMock);
        
        // Add new record to real records
        const updatedRealRecords = [newRecord, ...realRecords];
        
        // Combine: real records first, then mock records
        return [...updatedRealRecords, ...mockRecords_only];
    });
    
    setStats(prev => ({
        ...prev,
        totalPatients: prev.totalPatients + 1,
        completedToday: prev.completedToday + 1
    }));
    };

  const filteredRecords = recentRecords.filter(record =>
    record.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.symptoms?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Listen for new records from diagnosis page
  useEffect(() => {
    const handleNewRecord = (event) => {
      if (event.detail) {
        addNewRecord(event.detail);
      }
    };

    window.addEventListener('newPatientRecord', handleNewRecord);
    return () => window.removeEventListener('newPatientRecord', handleNewRecord);
  }, []);

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'HIGH': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <Header 
        portalType="doctor"
        title="Doctor Portal"
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        {/* Welcome Section */}
        <div className="mb-4">
					<h2 className="text-xl font-bold text-white mb-1">
						Welcome back, {getDisplayName()}!
					</h2>
					<p className="text-sm text-gray-400">
						{new Date().toLocaleDateString('en-US', { 
						weekday: 'long', 
						year: 'numeric', 
						month: 'long', 
						day: 'numeric' 
						})}
					</p>
				</div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <StatCard
            icon={<Users className="w-5 h-5 text-blue-400" />}
            label="Total Patients"
            value={stats.totalPatients}
            trend="+12 this month"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-green-400" />}
            label="Today's Appointments"
            value={stats.todayAppointments}
            trend="3 remaining"
          />
          <StatCard
            icon={<FileText className="w-5 h-5 text-yellow-400" />}
            label="Pending Diagnoses"
            value={stats.pendingDiagnoses}
            trend="Requires attention"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-purple-400" />}
            label="Completed Today"
            value={stats.completedToday}
            trend="On track"
          />
        </div>

        {/* Main Action */}
        <div className="flex flex-col items-center justify-center mb-6">
          <button
            onClick={startNewConsultation}
            className="group relative mb-2"
          >
            {/* Outer ring animation */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-75 group-hover:opacity-100 blur-xl transition-opacity"></div>
            
            {/* Main button */}
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center">
              <Mic className="w-12 h-12 text-white" />
            </div>
            
            {/* Pulsing rings */}
            <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20"></div>
            <div className="absolute -inset-2 rounded-full border border-blue-500/30 animate-pulse"></div>
          </button>
          <p className="text-base font-medium text-white">Start New Consultation</p>
          <p className="text-xs text-gray-400 mt-0.5">Record and analyze patient conversation</p>
        </div>

        {/* Records Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <div>
              <h3 className="text-xl font-semibold text-white">Recent Consultations</h3>
              <p className="text-xs text-gray-400 mt-0.5">View and manage your patient records</p>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                />
              </div>
              
              <button className="p-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                <Filter className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <RecordCard
                    key={record.id}
                    record={record}
                    onView={() => viewRecord(record)}
                    onDownload={() => downloadPDF(record)}
                    getRiskColor={getRiskColor}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No records found</p>
                  <button
                    onClick={startNewConsultation}
                    className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Start First Consultation</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Record Detail Modal */}
      {showRecordModal && selectedRecord && (
        <RecordModal
          record={selectedRecord}
          onClose={() => setShowRecordModal(false)}
          onDownload={() => downloadPDF(selectedRecord)}
          getRiskColor={getRiskColor}
        />
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, trend }) {
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 bg-white/5 rounded-lg">
          {icon}
        </div>
        <span className="text-xs text-gray-500">{trend}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

function RecordCard({ record, onView, onDownload, getRiskColor }) {
  const statusColors = {
    completed: 'bg-green-500/20 text-green-300 border-green-500/30',
    pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    reviewed: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
  };

  // Generate consistent gradient based on patient name - matching portal style
  const getPatientStyle = (name) => {
    return {
      bg: 'bg-blue-500/20',
      text: 'text-blue-300',
      border: 'border-blue-500/30'
    };
  };

	const style = getPatientStyle(record.patientName);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4 hover:bg-white/10 transition-colors">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div className="flex items-start space-x-4 flex-1">
          <div className={`w-9 h-9 text-white rounded-lg ${style.bg} border ${style.border} flex items-center justify-center font-semibold text-base shadow-lg`}>
            {record.patientName?.charAt(0) || 'P'}
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h4 className="font-medium text-white">{record.patientName}</h4>
              {record.risk && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${getRiskColor(record.risk)}`}>
                  {record.risk} RISK
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-sm text-gray-400">{record.date}</span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span className="text-sm text-gray-400">{record.time}</span>
              {record.diagnosis && (
                <>
                  <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                  <span className="text-sm text-gray-400">{record.diagnosis}</span>
                </>
              )}
            </div>
            {record.symptoms && (
              <div className="flex flex-wrap gap-1 mt-2">
                {record.symptoms.slice(0, 3).map((symptom, i) => (
                  <span key={i} className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">
                    {symptom}
                  </span>
                ))}
                {record.symptoms.length > 3 && (
                  <span className="text-xs bg-white/5 text-gray-400 px-2 py-0.5 rounded-full border border-white/10">
                    +{record.symptoms.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 mt-3 sm:mt-0">
          <span className={`text-xs px-2 py-1 rounded-full border ${statusColors[record.status] || statusColors.completed}`}>
            {record.status || 'Completed'}
          </span>
          <button
            onClick={onView}
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
            title="View Record"
          >
            <Eye className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={onDownload}
            className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/10"
            title="Download PDF"
          >
            <Download className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Record Modal Component
function RecordModal({ record, onClose, onDownload, getRiskColor }) {
  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-800/95 backdrop-blur-sm border-b border-white/10 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Diagnostic Assessment</h2>
            <p className="text-gray-400 text-sm mt-1">{record.patientName} • {record.date} at {record.time}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-400 rotate-90" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Risk Score */}
          {record.risk && (
            <div className={`rounded-xl border p-4 ${getRiskColor(record.risk)}`}>
              <p className="text-sm font-medium mb-1">Risk Assessment</p>
              <p className={`text-2xl font-bold ${getRiskColor(record.risk).split(' ')[0]}`}>
                {record.risk} RISK
              </p>
            </div>
          )}

          {/* Symptoms */}
          {record.symptoms && record.symptoms.length > 0 && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Presenting Symptoms</h3>
              <div className="flex flex-wrap gap-2">
                {record.symptoms.map((symptom, i) => (
                  <span key={i} className="bg-white/10 text-gray-200 px-3 py-1 rounded-full text-sm">
                    {symptom}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis Predictions */}
          {record.predictions && record.predictions.length > 0 && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white mb-4">AI Diagnostic Suggestions</h3>
              <div className="space-y-4">
                {record.predictions.map((pred, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="capitalize text-gray-200">{pred.disease}</span>
                      <span className="text-sm text-gray-400">
                        {(pred.probability * 100).toFixed(0)}% probability
                      </span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${pred.probability * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Final Diagnosis */}
          {record.diagnosis && (
            <div className="bg-green-500/10 rounded-xl border border-green-500/30 p-4">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Final Diagnosis</h3>
              <p className="text-white text-lg">{record.diagnosis}</p>
            </div>
          )}

          {/* Prescription */}
          {record.prescription && (
            <div className="bg-blue-500/10 rounded-xl border border-blue-500/30 p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">Prescription</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">Medication</p>
                  <p className="text-white font-medium">{record.prescription.medication}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Dosage</p>
                  <p className="text-white">{record.prescription.dosage}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Instructions</p>
                  <p className="text-white">{record.prescription.instructions}</p>
                </div>
              </div>
            </div>
          )}

          {/* Patient Summary */}
          {record.summary && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Plain Language Summary</h3>
              <p className="text-gray-300">{record.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Enhanced mock data with more details
const mockRecords = [
  {
    id: 'mock-1',
    patientName: 'Sarah Johnson',
    date: '2026-02-22',
    time: '09:30 AM',
    diagnosis: 'Acute Bronchitis',
    risk: 'MEDIUM',
    status: 'completed',
    symptoms: ['persistent cough', 'chest congestion', 'fatigue', 'low grade fever'],
    predictions: [
      { disease: 'Acute Bronchitis', probability: 0.82 },
      { disease: 'Pneumonia', probability: 0.45 },
      { disease: 'Upper Respiratory Infection', probability: 0.38 }
    ],
    prescription: {
      medication: 'Amoxicillin',
      dosage: '500mg three times daily',
      instructions: 'Take with food for 7 days. Complete full course even if feeling better.'
    },
    summary: 'Patient presented with persistent cough and chest congestion lasting 5 days.'
  },
  {
    id: 'mock-2',
    patientName: 'Michael Chen',
    date: '2026-02-22',
    time: '11:00 AM',
    diagnosis: 'Hypertension',
    risk: 'HIGH',
    status: 'pending',
    symptoms: ['headache', 'dizziness', 'blurred vision', 'chest tightness'],
    predictions: [
      { disease: 'Hypertension', probability: 0.88 },
      { disease: 'Anxiety', probability: 0.32 },
      { disease: 'Migraine', probability: 0.28 }
    ],
    prescription: {
      medication: 'Lisinopril',
      dosage: '10mg once daily',
      instructions: 'Take in the morning. Monitor blood pressure daily.'
    },
    summary: 'Patient reports frequent headaches and dizziness. Blood pressure 150/95.'
  },
  {
    id: 'mock-3',
    patientName: 'Emily Rodriguez',
    date: '2026-02-21',
    time: '02:30 PM',
    diagnosis: 'Migraine',
    risk: 'LOW',
    status: 'completed',
    symptoms: ['throbbing headache', 'light sensitivity', 'nausea', 'visual aura'],
    predictions: [
      { disease: 'Migraine', probability: 0.91 },
      { disease: 'Tension Headache', probability: 0.42 },
      { disease: 'Cluster Headache', probability: 0.25 }
    ],
    prescription: {
      medication: 'Sumatriptan',
      dosage: '50mg at onset',
      instructions: 'Take at first sign of migraine. Rest in dark room.'
    },
    summary: 'Patient experiences recurrent throbbing headaches with aura and nausea.'
  },
  {
    id: 'mock-4',
    patientName: 'James Wilson',
    date: '2026-02-21',
    time: '10:00 AM',
    diagnosis: 'Type 2 Diabetes',
    risk: 'MEDIUM',
    status: 'reviewed',
    symptoms: ['excessive thirst', 'frequent urination', 'fatigue', 'blurred vision'],
    predictions: [
      { disease: 'Type 2 Diabetes', probability: 0.94 },
      { disease: 'Prediabetes', probability: 0.38 },
      { disease: 'Metabolic Syndrome', probability: 0.35 }
    ],
    prescription: {
      medication: 'Metformin',
      dosage: '500mg twice daily',
      instructions: 'Take with meals. Monitor blood glucose.'
    },
    summary: 'New diagnosis of Type 2 Diabetes based on elevated HbA1c (7.8%).'
  },
  {
    id: 'mock-5',
    patientName: 'Maria Garcia',
    date: '2026-02-20',
    time: '03:45 PM',
    diagnosis: 'Seasonal Allergies',
    risk: 'LOW',
    status: 'completed',
    symptoms: ['sneezing', 'itchy eyes', 'runny nose', 'nasal congestion'],
    predictions: [
      { disease: 'Seasonal Allergies', probability: 0.96 },
      { disease: 'Common Cold', probability: 0.28 },
      { disease: 'Sinusitis', probability: 0.22 }
    ],
    prescription: {
      medication: 'Cetirizine',
      dosage: '10mg once daily',
      instructions: 'Take in evening. Use nasal spray as needed.'
    },
    summary: 'Classic allergy symptoms during spring season.'
  }
];