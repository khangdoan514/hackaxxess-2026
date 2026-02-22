import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const patientId = user?.id || user?.sub;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!patientId) {
      setLoading(false);
      return;
    }
    api
      .get(`/patient/${patientId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || err.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [patientId]);

  const getRiskBadge = (risk) => {
    switch(risk) {
      case 'HIGH': return 'bg-red-900 text-red-200';
      case 'MEDIUM': return 'bg-yellow-900 text-yellow-200';
      default: return 'bg-green-900 text-green-200';
    }
  };

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white px-8 py-8">
        <p className="text-gray-400">Not logged in as patient.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">My Health Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{user?.email}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-8 py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="rounded-xl bg-red-900/20 border border-red-800 p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {data && !loading && (
          <div className="space-y-6">
            {/* Latest Diagnosis Card */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="text-xl font-semibold mb-4">Latest Diagnosis</h2>
              {data.diagnoses?.[0] ? (
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-lg text-white">{data.diagnoses[0].final_diagnosis}</p>
                  </div>
                  
                  {/* Patient-Friendly Explanation */}
                  {data.explanation && (
                    <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                      <h3 className="text-blue-400 font-medium mb-2">What this means:</h3>
                      <p className="text-gray-300">{data.explanation}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">No diagnosis on file.</p>
              )}
            </div>

            {/* Edge Cases to Monitor */}
            {data.edge_cases?.length > 0 && (
              <div className="rounded-xl bg-gray-800 p-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <span className="text-yellow-500">⚠️</span>
                  Things to Watch For
                </h2>
                <ul className="space-y-2">
                  {data.edge_cases.map((edge, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-300">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>{edge}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prescriptions */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="text-xl font-semibold mb-4">Your Prescriptions</h2>
              {data.prescriptions?.length ? (
                <div className="space-y-4">
                  {data.prescriptions.map((p) => (
                    <div key={p.id} className="border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-lg text-white">{p.medication}</h3>
                        {p.dosage && (
                          <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">
                            {p.dosage}
                          </span>
                        )}
                      </div>
                      {p.instructions && (
                        <p className="text-gray-400 text-sm mt-2">{p.instructions}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No active prescriptions.</p>
              )}
            </div>

            {/* Visit History */}
            {data.diagnoses?.length > 1 && (
              <div className="rounded-xl bg-gray-800 p-8">
                <h2 className="text-xl font-semibold mb-4">Visit History</h2>
                <div className="space-y-3">
                  {data.diagnoses.slice(1).map((d) => (
                    <div key={d.id} className="border-b border-gray-700 pb-3">
                      <p className="font-medium text-white">{d.final_diagnosis}</p>
                      {d.symptoms?.length > 0 && (
                        <p className="text-sm text-gray-400 mt-1">
                          Symptoms: {d.symptoms.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}