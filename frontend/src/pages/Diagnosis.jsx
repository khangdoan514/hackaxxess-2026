import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Diagnosis() {
  const location = useLocation();
  const { transcript: initialTranscript } = location.state || {};
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [transcript, setTranscript] = useState(initialTranscript || '');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientId, setPatientId] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [prescription, setPrescription] = useState({ medication: '', dosage: '', instructions: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  useEffect(() => {
    if (initialTranscript) setTranscript(initialTranscript);
  }, [initialTranscript]);

  const runAnalysis = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/diagnosis/analyze', { transcript: transcript.trim() });
      setAnalysis(data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const confirmDiagnosis = async (e) => {
    e.preventDefault();
    if (!patientId.trim() || !finalDiagnosis.trim()) {
      setError('Patient ID and final diagnosis required');
      return;
    }
    setConfirmLoading(true);
    setError('');
    try {
      await api.post('/diagnosis/confirm', {
        patient_id: patientId.trim(),
        final_diagnosis: finalDiagnosis.trim(),
        prescription: prescription,
        symptoms: analysis?.symptoms || [],
        predictions: analysis?.predictions || [],
      });
      setConfirmSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Save failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-xl font-bold">Diagnosis</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{user?.email}</span>
          <button
            onClick={() => navigate('/record')}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
          >
            New record
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto space-y-6">
        <div className="rounded-xl bg-gray-800 p-6">
          <h2 className="font-semibold mb-2">Transcript</h2>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
            placeholder="Paste or type transcript..."
          />
          <button
            onClick={runAnalysis}
            disabled={loading || !transcript.trim()}
            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Analyze'}
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {analysis && (
          <>
            <div className="rounded-xl bg-gray-800 p-6">
              <h2 className="font-semibold mb-2">Extracted symptoms</h2>
              <p className="text-gray-300">{analysis.symptoms?.join(', ') || 'None'}</p>
            </div>
            <div className="rounded-xl bg-gray-800 p-6">
              <h2 className="font-semibold mb-2">Predictions (common vs edge)</h2>
              <p className="text-gray-400 text-sm mb-2">Common: {analysis.common?.join(', ') || '—'}</p>
              <p className="text-gray-400 text-sm">Edge cases: {analysis.edge_cases?.join(', ') || '—'}</p>
              <ul className="mt-2 space-y-1">
                {analysis.predictions?.map((p, i) => (
                  <li key={i} className="text-gray-300">
                    {p.disease} ({p.confidence != null ? (p.confidence * 100).toFixed(0) : '?'}%)
                    {p.is_edge_case && ' (edge)'}
                  </li>
                ))}
              </ul>
            </div>

            {!confirmSuccess ? (
              <form onSubmit={confirmDiagnosis} className="rounded-xl bg-gray-800 p-6 space-y-4">
                <h2 className="font-semibold">Confirm diagnosis & prescription</h2>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Patient ID</label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                    placeholder="Patient ID"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Final diagnosis</label>
                  <input
                    type="text"
                    value={finalDiagnosis}
                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                    placeholder="Final diagnosis"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Medication</label>
                  <input
                    type="text"
                    value={prescription.medication}
                    onChange={(e) => setPrescription((p) => ({ ...p, medication: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                    placeholder="Medication"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={prescription.dosage}
                    onChange={(e) => setPrescription((p) => ({ ...p, dosage: e.target.value }))}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                    placeholder="Dosage"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Instructions</label>
                  <textarea
                    value={prescription.instructions}
                    onChange={(e) => setPrescription((p) => ({ ...p, instructions: e.target.value }))}
                    rows={2}
                    className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                    placeholder="Instructions"
                  />
                </div>
                <button
                  type="submit"
                  disabled={confirmLoading}
                  className="rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {confirmLoading ? 'Saving...' : 'Save diagnosis & prescription'}
                </button>
              </form>
            ) : (
              <div className="rounded-xl bg-gray-800 p-6">
                <p className="text-green-400 font-medium">Diagnosis and prescription saved.</p>
                <button
                  onClick={() => navigate('/record')}
                  className="mt-2 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
                >
                  New record
                </button>
                <button
                  onClick={() => (window.location.href = `/dashboard`)}
                  className="mt-2 ml-2 rounded-lg border border-gray-600 px-4 py-2 hover:bg-gray-700"
                >
                  Patient dashboard (if patient)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
