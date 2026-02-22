import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

const STUB_TRANSCRIPT_MSG = '[Stub transcript: install faster-whisper and add audio]';

export default function Diagnosis() {
  const location = useLocation();
  const { transcript: initialTranscript } = location.state || {};
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const normalizedInitial = (initialTranscript && initialTranscript !== STUB_TRANSCRIPT_MSG) ? initialTranscript : '';
  const [transcript, setTranscript] = useState(normalizedInitial);
  const [analysis, setAnalysis] = useState(null);
  const [patientTwin, setPatientTwin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [twinLoading, setTwinLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [prescription, setPrescription] = useState({ medication: '', dosage: '', instructions: '' });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'twin'

  useEffect(() => {
    if (initialTranscript && initialTranscript !== STUB_TRANSCRIPT_MSG) setTranscript(initialTranscript);
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

  const generatePatientTwin = async () => {
    if (!transcript.trim()) return;
    setTwinLoading(true);
    setError('');
    try {
      const { data } = await api.post('/diagnosis/patient-twin', { 
        transcript: transcript.trim(),
        patient_id: user?.id 
      });
      setPatientTwin(data.patient_twin);
      setActiveTab('twin');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Patient Twin generation failed');
    } finally {
      setTwinLoading(false);
    }
  };

  const confirmDiagnosis = async (e) => {
    e.preventDefault();
    if (!patientEmail.trim() || !finalDiagnosis.trim()) {
      setError('Patient email and final diagnosis required');
      return;
    }
    setConfirmLoading(true);
    setError('');
    try {
      await api.post('/diagnosis/confirm', {
        patient_email: patientEmail.trim(),
        final_diagnosis: finalDiagnosis.trim(),
        prescription: prescription,
        symptoms: analysis?.symptoms || patientTwin?.extracted_symptoms?.map(s => s.symptom) || [],
        predictions: analysis?.predictions || patientTwin?.diagnosis_predictions || [],
      });
      setConfirmSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Save failed');
    } finally {
      setConfirmLoading(false);
    }
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Diagnosis & Patient Twin</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{user?.email}</span>
          <button
            onClick={() => navigate('/record')}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
          >
            New record
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">
        {/* Transcript Input */}
        <div className="rounded-xl bg-gray-800 p-8">
          <h2 className="font-semibold text-lg mb-3">Transcript</h2>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
            placeholder="Paste or type transcript..."
          />
          <div className="flex gap-4 mt-2">
            <button
              onClick={runAnalysis}
              disabled={loading || !transcript.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Basic Analysis'}
            </button>
            <button
              onClick={generatePatientTwin}
              disabled={twinLoading || !transcript.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {twinLoading ? 'Generating...' : 'Generate Patient Twin'}
            </button>
          </div>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {/* Tabs */}
        {(analysis || patientTwin) && (
          <div className="border-b border-gray-700">
            <div className="flex gap-4">
              {analysis && (
                <button
                  onClick={() => setActiveTab('analysis')}
                  className={`pb-2 px-1 ${activeTab === 'analysis' ? 'border-b-2 border-blue-500 text-blue-400' : 'text-gray-400'}`}
                >
                  Basic Analysis
                </button>
              )}
              {patientTwin && (
                <button
                  onClick={() => setActiveTab('twin')}
                  className={`pb-2 px-1 ${activeTab === 'twin' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`}
                >
                  Patient Twin
                </button>
              )}
            </div>
          </div>
        )}

        {/* Basic Analysis View */}
        {activeTab === 'analysis' && analysis && (
          <>
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Extracted symptoms</h2>
              <p className="text-gray-300">{analysis.symptoms?.join(', ') || 'None'}</p>
            </div>
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Predictions (common vs edge)</h2>
              <p className="text-gray-400 text-sm mb-2">Common: {analysis.common?.join(', ') || '—'}</p>
              <p className="text-gray-400 text-sm mb-3">Edge cases: {analysis.edge_cases?.join(', ') || '—'}</p>
              <ul className="space-y-2">
                {analysis.predictions?.map((p, i) => (
                  <li key={i} className="flex items-center justify-between p-2 bg-gray-700 rounded-lg">
                    <span className="text-gray-200 capitalize">{p.disease}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-600 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${(p.confidence || 0) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">
                        {((p.confidence || 0) * 100).toFixed(0)}%
                      </span>
                      {p.is_edge_case && (
                        <span className="text-xs bg-yellow-600 px-2 py-1 rounded">edge</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Patient Twin View */}
        {activeTab === 'twin' && patientTwin && (
          <>
            {/* Risk Score */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Risk Assessment</h2>
              <p className={`text-2xl font-bold ${getRiskColor(patientTwin.risk_score)}`}>
                {patientTwin.risk_score} RISK
              </p>
            </div>

            {/* Symptoms with Confidence */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Extracted Symptoms with Confidence</h2>
              <div className="flex flex-wrap gap-2">
                {patientTwin.extracted_symptoms?.map((s, i) => (
                  <span key={i} className="bg-gray-700 text-gray-200 px-3 py-1 rounded-full text-sm">
                    {s.symptom} ({(s.confidence * 100).toFixed(0)}%)
                  </span>
                ))}
              </div>
            </div>

            {/* Diagnosis Predictions */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">AI Diagnosis Predictions</h2>
              <ul className="space-y-3">
                {patientTwin.diagnosis_predictions?.map((d, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span className="capitalize">{d.disease}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-700 rounded-full">
                        <div 
                          className="h-2 bg-purple-500 rounded-full"
                          style={{ width: `${d.probability * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-400">
                        {(d.probability * 100).toFixed(0)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Patient Story */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Patient-Friendly Summary</h2>
              <p className="text-gray-300 leading-relaxed">{patientTwin.patient_story}</p>
            </div>

            {/* Audio Summary */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Audio Summary Snippet</h2>
              <p className="text-gray-400 italic">"{patientTwin.audio_summary}"</p>
            </div>

            {/* QR Code Data */}
            <div className="rounded-xl bg-gray-800 p-8">
              <h2 className="font-semibold text-lg mb-3">Patient Access</h2>
              <div className="flex items-center gap-6">
                <div className="bg-white p-2 rounded-lg">
                  <div className="w-24 h-24 bg-gray-300 flex items-center justify-center text-gray-600">
                    QR
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  <p><span className="text-gray-300">Patient Twin ID:</span> {patientTwin.qr_data.patient_twin_id}</p>
                  <p><span className="text-gray-300">Timestamp:</span> {new Date(patientTwin.qr_data.timestamp).toLocaleString()}</p>
                  <p><span className="text-gray-300">Top diagnosis:</span> {patientTwin.qr_data.top_diagnosis}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Confirmation Form */}
        {!confirmSuccess && (analysis || patientTwin) && (
          <form onSubmit={confirmDiagnosis} className="rounded-xl bg-gray-800 p-8 space-y-5">
            <h2 className="font-semibold text-lg">Confirm diagnosis & prescription</h2>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Patient email</label>
              <input
                type="email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                placeholder="patient@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">Diagnosis will appear on the patient's dashboard when they log in.</p>
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
                list="diagnosis-suggestions"
              />
              <datalist id="diagnosis-suggestions">
                {patientTwin?.diagnosis_predictions?.map((d, i) => (
                  <option key={i} value={d.disease} />
                ))}
              </datalist>
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
                placeholder="e.g., 500mg twice daily"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">Instructions</label>
              <textarea
                value={prescription.instructions}
                onChange={(e) => setPrescription((p) => ({ ...p, instructions: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-600 bg-gray-700 text-white px-3 py-2"
                placeholder="Take with food. Complete full course..."
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
        )}

        {confirmSuccess && (
          <div className="rounded-xl bg-gray-800 p-8 text-center">
            <p className="text-green-400 font-medium text-lg mb-4">✓ Diagnosis and prescription saved successfully!</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/record')}
                className="rounded-lg bg-blue-600 px-6 py-2 font-medium hover:bg-blue-700"
              >
                New consultation
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="rounded-lg border border-gray-600 px-6 py-2 hover:bg-gray-700"
              >
                View as patient
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}