import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="max-w-6xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Patient Twin
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            AI-powered diagnostic assistant that transforms doctor-patient conversations 
            into structured data, diagnoses, and personalized care plans.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <FeatureCard
            title="Speech Recognition"
            description="Convert conversations to text using Whisper AI"
          />
          <FeatureCard
            title="AI Analysis"
            description="Extract symptoms and predict diseases with KNN"
          />
          <FeatureCard
            title="Patient Twin"
            description="Generate patient-friendly summaries and QR codes"
          />
        </div>

        <div className="flex justify-center gap-6">
          <Link
            to="/login"
            className="px-8 py-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
          <a
            href="#"
            className="px-8 py-3 border border-gray-600 rounded-lg font-medium hover:bg-gray-800 transition"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }) {
  return (
    <div className="bg-gray-800 p-6 rounded-xl">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}