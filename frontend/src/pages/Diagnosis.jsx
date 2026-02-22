import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { 
  Activity, 
  User, 
  LogOut, 
  ArrowRight, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Stethoscope,
  Brain,
  FileText,
  Pill,
  AlertTriangle,
  HeartPulse,
  Shield,
  Plus,
  X
} from 'lucide-react';

const STUB_TRANSCRIPT_MSG = '[Stub transcript: install faster-whisper and add audio]';

export default function Diagnosis() {
  const location = useLocation();
  const { transcript: initialTranscript, autoGenerate } = location.state || {};
  const navigate = useNavigate();
  const { user, logout, getDisplayName } = useAuth();

  const normalizedInitial = (initialTranscript && initialTranscript !== STUB_TRANSCRIPT_MSG) ? initialTranscript : '';
  const [transcript, setTranscript] = useState(normalizedInitial);
  const [analysis, setAnalysis] = useState(null);
  const [patientTwin, setPatientTwin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [finalDiagnosis, setFinalDiagnosis] = useState('');
  const [prescription, setPrescription] = useState({ medication: '', dosage: '', instructions: '' });
  const [edgeCases, setEdgeCases] = useState([]);
  const [edgeCaseInput, setEdgeCaseInput] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'clinical', 'prescribe'

  // Auto-generate both analyses when page loads
  useEffect(() => {
    if (initialTranscript && initialTranscript !== STUB_TRANSCRIPT_MSG) {
      setTranscript(initialTranscript);
      
      // Generate both analyses automatically
      const generateBoth = async () => {
        setLoading(true);
        setError('');
        
        try {
          // Run both API calls in parallel
          const [twinResponse, analysisResponse] = await Promise.all([
            api.post('/diagnosis/patient-twin', { 
              transcript: initialTranscript.trim(),
              patient_id: user?.id 
            }),
            api.post('/diagnosis/analyze', { 
              transcript: initialTranscript.trim() 
            })
          ]);
          
          setPatientTwin(twinResponse.data.patient_twin);
          setAnalysis(analysisResponse.data);
          // Initialize edge cases from AI analysis (doctor can add/remove and set further steps later)
          const fromAnalysis = analysisResponse.data?.edge_cases || [];
          const fromTwin = (twinResponse.data.patient_twin?.diagnosis_predictions || [])
            .filter((p) => p.is_edge_case && p.disease)
            .map((p) => p.disease);
          const combined = [...new Set([...fromAnalysis, ...fromTwin])].map((name) => ({ name, further_steps: '' }));
          setEdgeCases(combined);
        } catch (err) {
          setError(err.response?.data?.detail || err.message || 'Analysis failed');
        } finally {
          setLoading(false);
        }
      };
      
      if (autoGenerate) {
        generateBoth();
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, [initialTranscript, autoGenerate, user?.id]);

  const confirmDiagnosis = async (e) => {
    e.preventDefault();
    if (!patientEmail.trim() || !finalDiagnosis.trim()) {
      setError('Patient email and final diagnosis required');
      return;
    }
    
    setConfirmLoading(true);
    setError('');
    
    try {
      // First save to database
      await api.post('/diagnosis/confirm', {
        patient_email: patientEmail.trim(),
        final_diagnosis: finalDiagnosis.trim(),
        prescription: prescription,
        symptoms: analysis?.symptoms || patientTwin?.extracted_symptoms?.map(s => s.symptom) || [],
        predictions: analysis?.predictions || patientTwin?.diagnosis_predictions || [],
        edge_cases: edgeCases,
      });

      // Generate PDF and trigger download with Save As dialog
      const pdfResponse = await api.post('/diagnosis/generate-pdf', {
        patient_email: patientEmail.trim(),
        final_diagnosis: finalDiagnosis.trim(),
        prescription: prescription,
        symptoms: analysis?.symptoms || patientTwin?.extracted_symptoms?.map(s => s.symptom) || [],
        predictions: analysis?.predictions || patientTwin?.diagnosis_predictions || [],
        edge_cases: edgeCases,
      }, { responseType: 'blob' });
      
      // Create blob from PDF data
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Suggest filename based on patient and date
      const date = new Date();
      const dateStr = date.toISOString().slice(0,10);
      const patientPrefix = patientEmail.split('@')[0];
      link.download = `prescription_${patientPrefix}_${dateStr}.pdf`;
      
      // This triggers the native Save As dialog
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // After successful save, add to dashboard records
      const newRecord = {
        id: Date.now().toString(),
        patientName: patientEmail.split('@')[0],
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        diagnosis: finalDiagnosis,
        risk: patientTwin?.risk_score || 'LOW',
        status: 'completed',
        symptoms: patientTwin?.extracted_symptoms?.map(s => s.symptom) || [],
        predictions: patientTwin?.diagnosis_predictions || [],
        prescription: prescription,
        summary: patientTwin?.patient_story || ''
      };

      // Dispatch event for dashboard to listen
      window.dispatchEvent(new CustomEvent('newPatientRecord', { detail: newRecord }));

      // Show success
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

  const getRiskBg = (risk) => {
    switch(risk) {
      case 'HIGH': return 'bg-red-500/10 border-red-500/30';
      case 'MEDIUM': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-green-500/10 border-green-500/30';
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Header 
          portalType="diagnosis"
          title="Diagnosis Portal"
          showBack={true}
        />
        
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-12 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
              <div className="relative z-10">
                <Brain className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
              </div>
            </div>
            <p className="text-gray-300 text-lg mt-8">Analyzing patient conversation...</p>
            <p className="text-gray-500 text-sm mt-2">Generating comprehensive diagnostic report</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !confirmSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Header 
          portalType="diagnosis"
          title="Diagnosis Portal"
          showBack={true}
        />
        
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-red-500/10 backdrop-blur-sm rounded-2xl border border-red-500/30 p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-red-400 text-lg mb-4">{error}</p>
            <button
              onClick={() => navigate('/record')}
              className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              <ArrowRight className="w-5 h-5" />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state
  if (confirmSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <Header 
          portalType="diagnosis"
          title="Diagnosis Portal"
          showBack={true}
        />
        
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl border border-green-500/30 p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Diagnosis Complete</h2>
            <p className="text-green-400 font-medium text-lg mb-6">Prescription saved and downloaded</p>
            
            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-gray-300 text-sm mb-2">📄 PDF downloaded - check your downloads folder</p>
              <p className="text-xs text-gray-500">The save dialog allowed you to choose the location and filename</p>
            </div>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate('/record')}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                <span>New Consultation</span>
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/doctor')}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-white/5 text-white rounded-xl font-medium hover:bg-white/10 transition-all border border-white/10"
              >
                <span>Return to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show results with three tabs
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Header 
        portalType="diagnosis"
        title="Diagnosis Portal"
        showBack={true}
      />

      <div className="max-w-7xl mx-auto px-3 py-4">
        {/* Patient Info Header */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Diagnostic Assessment</h2>
              <p className="text-gray-400">Based on the patient consultation transcript</p>
            </div>
            <div className={`px-4 py-2 rounded-xl border ${getRiskBg(patientTwin?.risk_score || 'LOW')}`}>
              <span className={`text-sm font-medium ${getRiskColor(patientTwin?.risk_score || 'LOW')}`}>
                {patientTwin?.risk_score || 'LOW'} RISK
              </span>
            </div>
          </div>
          
          {/* Transcript Summary */}
          <div className="mt-4 bg-white/5 rounded-xl p-4">
            <p className="text-gray-300 italic text-sm">"{transcript}"</p>
          </div>
        </div>

        {/* Three Tab Navigation */}
        <div className="border-b border-white/10 mb-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-1 font-medium transition-colors relative flex items-center space-x-2 ${
                activeTab === 'overview' 
                  ? 'text-purple-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <HeartPulse className="w-5 h-5" />
              <span>Patient Overview</span>
              {activeTab === 'overview' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 rounded-full"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('clinical')}
              className={`pb-4 px-1 font-medium transition-colors relative flex items-center space-x-2 ${
                activeTab === 'clinical' 
                  ? 'text-blue-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Stethoscope className="w-5 h-5" />
              <span>Clinical Analysis</span>
              {activeTab === 'clinical' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"></div>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('prescribe')}
              className={`pb-4 px-1 font-medium transition-colors relative flex items-center space-x-2 ${
                activeTab === 'prescribe' 
                  ? 'text-green-400' 
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Pill className="w-5 h-5" />
              <span>Prescribe & Finalize</span>
              {activeTab === 'prescribe' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500 rounded-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab - Combines Patient Twin and Key Clinical Info */}
          {activeTab === 'overview' && patientTwin && (
            <div className="space-y-6">
              {/* Extracted Symptoms */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mr-2" />
                  Presenting Symptoms
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {patientTwin.extracted_symptoms?.map((s, i) => (
                    <div key={i} className="bg-white/5 rounded-xl p-3 border border-white/10">
                      <p className="text-gray-200 font-medium">{s.symptom}</p>
                      <p className="text-xs text-gray-400 mt-1">Confidence: {(s.confidence * 100).toFixed(0)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnosis Predictions */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Brain className="w-5 h-5 text-purple-400 mr-2" />
                  AI Diagnostic Suggestions
                </h3>
                <div className="space-y-4">
                  {patientTwin.diagnosis_predictions?.map((d, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="capitalize text-gray-200 font-medium">{d.disease}</span>
                        <span className="text-sm text-gray-400">
                          {(d.probability * 100).toFixed(0)}% probability
                        </span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${d.probability * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Patient Summary */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 text-blue-400 mr-2" />
                  Plain Language Summary
                </h3>
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-gray-300 leading-relaxed">{patientTwin.patient_story}</p>
                </div>
              </div>

              {/* Edge Cases & Considerations */}
              {analysis?.edge_cases?.length > 0 && (
                <div className="bg-yellow-500/10 backdrop-blur-sm rounded-2xl border border-yellow-500/30 p-6">
                  <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Clinical Considerations
                  </h3>
                  <ul className="space-y-2">
                    {analysis.edge_cases.map((edge, i) => (
                      <li key={i} className="flex items-start text-gray-300">
                        <span className="text-yellow-400 mr-2">•</span>
                        {edge}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Clinical Analysis Tab - Detailed Medical Analysis */}
          {activeTab === 'clinical' && analysis && (
            <div className="space-y-6">
              {/* Differential Diagnosis */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Stethoscope className="w-5 h-5 text-blue-400 mr-2" />
                  Differential Diagnosis
                </h3>
                <div className="space-y-4">
                  {analysis.predictions?.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-3">
                        <span className="capitalize text-gray-200">{p.disease}</span>
                        {p.is_edge_case && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30">
                            Consider
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${(p.confidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-400 w-12 text-right">
                          {((p.confidence || 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Common Diagnoses */}
              {analysis.common?.length > 0 && (
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Common Diagnoses</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.common.map((diag, i) => (
                      <span key={i} className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm border border-green-500/30">
                        {diag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Factors */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-red-400 mr-2" />
                  Risk Factors
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Patient Age Group</p>
                    <p className="text-white font-medium">Adult (30-50)</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <p className="text-sm text-gray-400 mb-1">Symptom Duration</p>
                    <p className="text-white font-medium">~1 week</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Prescribe Tab - Final Diagnosis and Prescription */}
          {activeTab === 'prescribe' && (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                <Pill className="w-6 h-6 text-green-400 mr-2" />
                Finalize Diagnosis & Prescription
              </h2>
              
              <form onSubmit={confirmDiagnosis} className="space-y-6">
                {/* Patient Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Patient Email
                  </label>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="patient@example.com"
                  />
                </div>
                
                {/* Final Diagnosis with Suggestions */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Final Diagnosis
                  </label>
                  <input
                    type="text"
                    value={finalDiagnosis}
                    onChange={(e) => setFinalDiagnosis(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="Enter final diagnosis"
                    list="diagnosis-suggestions"
                  />
                  <datalist id="diagnosis-suggestions">
                    {patientTwin?.diagnosis_predictions?.map((d, i) => (
                      <option key={i} value={d.disease} />
                    ))}
                  </datalist>
                </div>

                {/* Edge cases to monitor (doctor or AI) + further steps */}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <label className="block text-sm font-medium text-yellow-200 mb-2 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Edge cases / things to watch for
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Add conditions to monitor and the further steps the patient should take. These will appear on the patient portal.
                  </p>
                  {/* Current list with further steps */}
                  {edgeCases.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {edgeCases.map((edge, i) => (
                        <div
                          key={i}
                          className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="font-medium text-yellow-200 text-sm">{edge.name}</span>
                            <button
                              type="button"
                              onClick={() => setEdgeCases((prev) => prev.filter((_, j) => j !== i))}
                              className="hover:bg-yellow-500/30 rounded p-1 shrink-0"
                              aria-label="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <label className="block text-xs text-gray-400 mb-1">Further steps for patient</label>
                          <textarea
                            value={edge.further_steps}
                            onChange={(e) =>
                              setEdgeCases((prev) =>
                                prev.map((ec, j) => (j === i ? { ...ec, further_steps: e.target.value } : ec))
                              )
                            }
                            rows={2}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-y"
                            placeholder="e.g. Return if fever &gt; 101°F, or if symptoms worsen within 48 hours"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  {/* AI-recommended (not already added) */}
                  {(() => {
                    const aiSuggested = [...new Set([
                      ...(analysis?.edge_cases || []),
                      ...(patientTwin?.diagnosis_predictions || []).filter((p) => p.is_edge_case && p.disease).map((p) => p.disease)
                    ])].filter((s) => !edgeCases.some((e) => e.name === s));
                    return aiSuggested.length > 0 ? (
                      <div className="mb-3">
                        <p className="text-xs text-gray-400 mb-2">AI suggested:</p>
                        <div className="flex flex-wrap gap-2">
                          {aiSuggested.map((s, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setEdgeCases((prev) => [...prev, { name: s, further_steps: '' }])}
                              className="text-sm px-2.5 py-1 rounded-lg border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/20 transition-colors"
                            >
                              + {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()}
                  {/* Add custom */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={edgeCaseInput}
                      onChange={(e) => setEdgeCaseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (edgeCaseInput.trim()) {
                            setEdgeCases((prev) => [...prev, { name: edgeCaseInput.trim(), further_steps: '' }]);
                            setEdgeCaseInput('');
                          }
                        }
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="Add custom edge case or thing to monitor"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (edgeCaseInput.trim()) {
                          setEdgeCases((prev) => [...prev, { name: edgeCaseInput.trim(), further_steps: '' }]);
                          setEdgeCaseInput('');
                        }
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-200 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                </div>
                
                {/* Medication and Dosage */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Medication
                    </label>
                    <input
                      type="text"
                      value={prescription.medication}
                      onChange={(e) => setPrescription((p) => ({ ...p, medication: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Medication name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Dosage
                    </label>
                    <input
                      type="text"
                      value={prescription.dosage}
                      onChange={(e) => setPrescription((p) => ({ ...p, dosage: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., 500mg twice daily"
                    />
                  </div>
                </div>
                
                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Instructions
                  </label>
                  <textarea
                    value={prescription.instructions}
                    onChange={(e) => setPrescription((p) => ({ ...p, instructions: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Take with food. Complete full course. Follow up in 1 week if symptoms persist."
                  />
                </div>
                
                {/* Summary of AI Findings */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-2 flex items-center">
                    <Brain className="w-4 h-4 mr-2" />
                    AI Summary
                  </h4>
                  <p className="text-sm text-gray-300">
                    Based on the analysis, top suggested diagnoses: {
                      patientTwin?.diagnosis_predictions?.slice(0, 3).map(d => d.disease).join(', ')
                    }
                  </p>
                </div>
                
                {/* Save Button */}
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-sm text-green-300 flex items-center mb-3">
                    <Download className="w-4 h-4 mr-2" />
                    When you save, your browser will open a dialog to choose where to save the PDF and what to name it.
                  </p>
                  
                  <button
                    type="submit"
                    disabled={confirmLoading}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-medium hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
                  >
                    {confirmLoading ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Processing...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        <Download className="w-5 h-5 mr-2" />
                        Finalize Diagnosis & Save Prescription
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}