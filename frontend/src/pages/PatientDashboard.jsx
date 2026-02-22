import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CornerNav from '../components/CornerNav';
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

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white px-8 py-8">
        <div className="flex items-center border-b border-gray-800 pb-4 mb-4">
          <CornerNav />
        </div>
        <p className="text-gray-400">Not logged in as patient.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <CornerNav />
          <h1 className="text-2xl font-bold">My dashboard</h1>
        </div>
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
        {loading && <p className="text-gray-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {data && !loading && (
          <div className="space-y-8">
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Diagnosis</h2>
              <p className="text-gray-300">{data.explanation || 'No diagnosis on file.'}</p>
            </div>
            {data.edge_cases?.length > 0 && (
              <div className="rounded-xl bg-gray-800 p-8">
                <h2 className="font-semibold text-lg mb-3">Edge cases considered</h2>
                <p className="text-gray-300">{data.edge_cases.join(', ')}</p>
              </div>
            )}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Prescriptions</h2>
              {data.prescriptions?.length ? (
                <ul className="space-y-3">
                  {data.prescriptions.map((p) => (
                    <li key={p.id} className="text-gray-300 border-b border-gray-700 pb-2">
                      <span className="font-medium text-white">{p.medication}</span>
                      {p.dosage && ` — ${p.dosage}`}
                      {p.instructions && <p className="text-sm mt-1">{p.instructions}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No prescriptions on file.</p>
              )}
            </div>
            {data.diagnoses?.length > 0 && (
              <div className="rounded-xl bg-gray-800 p-8">
                <h2 className="font-semibold text-lg mb-3">Visit history</h2>
                <ul className="space-y-2 text-gray-400 text-sm">
                  {data.diagnoses.map((d) => (
                    <li key={d.id}>
                      {d.final_diagnosis} — {d.symptoms?.length ? d.symptoms.join(', ') : '—'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
