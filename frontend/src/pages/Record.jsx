import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SAMPLE_TRANSCRIPT = `Good morning. What brings you in today?

For the past week, I've been getting this heavy pressure in my chest whenever I walk fast or climb stairs at work. It feels tight, and sometimes it spreads to my left arm. I also get short of breath and sweaty when it happens. I have to stop and rest, and after a few minutes it goes away.

When did this start?

About a week ago. I've never had this before.

Do you have any medical conditions?

I have high blood pressure, and I take Lisinopril. I was also prescribed cholesterol medication, but I stopped taking it because it caused muscle pain.

Do you smoke?

I used to. I quit 10 years ago, but I smoked for about 20 years before that.

Any family history of heart problems?

Yes. My dad had a heart attack at 62, and my brother had one at 60.

Thank you for telling me. We need to evaluate your heart. I'm going to order some tests like an ECG, blood work, and possibly a stress test to find out what's causing this.

Okay. Thank you.`;

export default function Record() {
  const [recording, setRecording] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTranscriptSection, setShowTranscriptSection] = useState(false);
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
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setError('');
        setShowTranscriptSection(true);
        setTranscript(SAMPLE_TRANSCRIPT);
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
              <p className="text-gray-400">Uploading and transcribing...</p>
            ) : error ? (
              <>
                <p className="text-red-400 mb-2">{error}</p>
                <p className="text-gray-500 text-sm">You can still go to Diagnosis and paste or type a transcript manually.</p>
                <button
                  onClick={() => navigate('/diagnosis', { state: { transcript: '' } })}
                  className="mt-4 rounded-lg border border-gray-600 px-4 py-2 hover:bg-gray-700"
                >
                  Go to Diagnosis (enter transcript manually)
                </button>
              </>
            ) : transcript ? (
              <>
                <p className="text-gray-300 whitespace-pre-wrap">{transcript}</p>
                <button
                  onClick={goToDiagnosis}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
                >
                  Analyze & diagnose
                </button>
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
