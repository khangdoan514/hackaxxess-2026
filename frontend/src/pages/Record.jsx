import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { Mic, Square, ArrowRight, LogOut, User, Clock, Activity, ChevronLeft } from 'lucide-react';

export default function Record() {
  const [recording, setRecording] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTranscriptSection, setShowTranscriptSection] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const navigate = useNavigate();
  const { user, logout, getDisplayName } = useAuth();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      
      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      
      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setLoading(true);
        setError('');
        setShowTranscriptSection(true);
        
        try {
          const form = new FormData();
          form.append('file', blob, 'recording.webm');
          const { data } = await api.post('/record/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setUploadId(data.upload_id);
          
          const trans = await api.post('/record/transcribe', { upload_id: data.upload_id });
          const isStub = trans.data?.is_stub === true;
          const raw = trans.data?.transcript ?? '';
          const stubMsg = '[Stub transcript: install faster-whisper and add audio]';
          const text = isStub || raw === stubMsg ? '' : (raw || '[No speech detected]');
          setTranscript(text);
        } catch (err) {
          const msg = err.response?.data?.detail ?? err.message ?? 'Upload/transcribe failed';
          setError(Array.isArray(msg) ? msg.join(' ') : msg);
          setTranscript('');
        } finally {
          setLoading(false);
        }
      };
      
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied or unavailable');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const goToDiagnosis = () => {
    navigate('/diagnosis', { 
      state: { 
        transcript, 
        uploadId,
        autoGenerate: true 
      } 
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header - Matching Doctor Dashboard */}
      <Header 
        portalType="record"
        title="Record Consultation"
        showBack={true}
      />

      {/* Main Content - Keep existing recording UI */}
      <div className="max-w-4xl mx-auto px-3 py-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">New Consultation</h2>
          <p className="text-gray-400">Record doctor-patient conversation for AI analysis</p>
        </div>

        {/* Recording Card - Keep the circular button effect */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-6">
          <div className="flex flex-col items-center">
            {!recording ? (
              <button
                onClick={startRecording}
                disabled={loading}
                className="group relative mb-4"
              >
                {/* Outer ring animation - matching dashboard */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 opacity-75 group-hover:opacity-100 blur-xl transition-opacity"></div>
                
                {/* Main button */}
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center">
                  <Mic className="w-12 h-12 text-white" />
                </div>
                
                {/* Pulsing rings */}
                <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping opacity-20"></div>
                <div className="absolute -inset-2 rounded-full border border-blue-500/30 animate-pulse"></div>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="group relative mb-4"
              >
                {/* Outer ring animation for stop */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-500 to-pink-500 opacity-75 group-hover:opacity-100 blur-xl transition-opacity"></div>
                
                <div className="relative w-32 h-32 rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center">
                  <Square className="w-12 h-12 text-white" />
                </div>
                
                <div className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20"></div>
                <div className="absolute -inset-2 rounded-full border border-red-500/30 animate-pulse"></div>
              </button>
            )}

            {recording && (
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-red-400 font-mono text-xl">{formatTime(recordingTime)}</span>
              </div>
            )}

            <p className="text-gray-400 text-center max-w-md">
              {recording 
                ? 'Recording in progress... Click stop when finished' 
                : 'Click the microphone to start recording the consultation'}
            </p>
          </div>
        </div>

        {/* Transcript Section - Keep existing */}
        {showTranscriptSection && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-blue-400" />
              Transcription Result
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-4"></div>
                <p className="text-gray-400">Processing audio with Whisper AI...</p>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                <p className="text-red-400 mb-2">{error}</p>
                <p className="text-gray-400 text-sm">You can still proceed with manual entry.</p>
                <button
                  onClick={() => navigate('/diagnosis', { state: { transcript: '' } })}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Go to Manual Entry
                </button>
              </div>
            ) : transcript ? (
              <>
                <div className="bg-white/5 rounded-xl p-6 mb-4 border border-white/10">
                  <p className="text-gray-300 leading-relaxed">"{transcript}"</p>
                </div>
                <button
                  onClick={goToDiagnosis}
                  className="flex items-center justify-center space-x-2 w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-600 transition-all transform hover:scale-[1.02]"
                >
                  <span>Analyze & Diagnose</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No transcript generated. Try recording again or enter manually.</p>
                <button
                  onClick={() => navigate('/diagnosis', { state: { transcript: '' } })}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Manual Entry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}