import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function Record() {
  const [recording, setRecording] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTranscriptSection, setShowTranscriptSection] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState(''); // 'uploading', 'transcribing', 'done'
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setLoading(true);
        setError('');
        setShowTranscriptSection(true);
        setTranscribeStatus('uploading');
        
        try {
          // Upload audio
          const form = new FormData();
          form.append('file', blob, 'recording.webm');
          const { data } = await api.post('/record/upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          setUploadId(data.upload_id);
          
          setTranscribeStatus('transcribing');
          
          // Set a timeout for transcription (30 seconds)
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Transcription timeout - try again or enter manually')), 30000);
          });
          
          const transcribePromise = api.post('/record/transcribe', { upload_id: data.upload_id });
          
          const trans = await Promise.race([transcribePromise, timeoutPromise]);
          
          const isStub = trans.data?.is_stub === true;
          const raw = trans.data?.transcript ?? '';
          const stubMsg = '[Stub transcript: install faster-whisper and add audio]';
          
          if (isStub || raw === stubMsg) {
            setError('Speech-to-text not fully configured. Please enter transcript manually.');
            setTranscript('');
          } else {
            const text = raw || '[No speech detected]';
            setTranscript(text);
            setTranscribeStatus('done');
          }
        } catch (err) {
          console.error('Transcription error:', err);
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
    navigate('/diagnosis', { state: { transcript, uploadId } });
  };

  const getStatusMessage = () => {
    if (transcribeStatus === 'uploading') return '📤 Uploading audio...';
    if (transcribeStatus === 'transcribing') return '🤖 Transcribing with AI (may take 30-60s first time)...';
    return 'Uploading and transcribing...';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex justify-between items-center px-8 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Record consultation</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">{user?.email}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-600 px-3 py-1.5 text-sm hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-8 py-8 space-y-8">
        <div className="rounded-xl bg-gray-800 p-8">
          <p className="text-gray-400 mb-4">Record doctor–patient conversation. Then transcribe and analyze.</p>
          {!recording ? (
            <button
              onClick={startRecording}
              disabled={loading}
              className="rounded-lg bg-red-600 px-6 py-3 font-medium hover:bg-red-700 disabled:opacity-50"
            >
              Start recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="rounded-lg bg-gray-600 px-6 py-3 font-medium hover:bg-gray-500"
            >
              Stop recording
            </button>
          )}
        </div>

        {showTranscriptSection && (
          <div className="rounded-xl bg-gray-800 p-8">
            <h2 className="font-semibold text-lg mb-3">Transcript</h2>
            {loading ? (
              <div className="space-y-3">
                <p className="text-gray-400">{getStatusMessage()}</p>
                <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-gray-500">
                  First time may take longer to download AI model. Please wait...
                </p>
              </div>
            ) : error ? (
              <>
                <p className="text-red-400 mb-2">{error}</p>
                <p className="text-gray-500 text-sm">You can still go to Diagnosis and paste or type a transcript manually.</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => navigate('/diagnosis', { state: { transcript: '' } })}
                    className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700"
                  >
                    Go to Diagnosis
                  </button>
                  <button
                    onClick={() => {
                      setShowTranscriptSection(false);
                      setError('');
                      setLoading(false);
                    }}
                    className="rounded-lg border border-gray-600 px-4 py-2 hover:bg-gray-700"
                  >
                    Try Again
                  </button>
                </div>
              </>
            ) : transcript ? (
              <>
                <div className="bg-gray-700 p-4 rounded-lg mb-4">
                  <p className="text-gray-300 whitespace-pre-wrap">{transcript}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={goToDiagnosis}
                    className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
                  >
                    Analyze & diagnose
                  </button>
                  <button
                    onClick={() => navigate('/diagnosis', { state: { transcript: '' } })}
                    className="rounded-lg border border-gray-600 px-4 py-2 hover:bg-gray-700"
                  >
                    Enter manually
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-400 mb-2">Speech-to-text is not set up on this server. Go to Diagnosis and paste or type the consultation transcript to analyze.</p>
                <button
                  onClick={() => navigate('/diagnosis', { state: { transcript: '' } })}
                  className="rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
                >
                  Go to Diagnosis
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}