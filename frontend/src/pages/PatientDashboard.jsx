import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  FileText,
  Pill,
  AlertTriangle,
  History,
  LayoutDashboard,
  Stethoscope,
  Sparkles,
  Calendar,
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const patientId = user?.id || user?.sub;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedPrescriptionId, setExpandedPrescriptionId] = useState(null);
  const [expandedEdgeIndex, setExpandedEdgeIndex] = useState(null);
  const [expandedVisitIndex, setExpandedVisitIndex] = useState(null);

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

  const prescriptions = (data?.prescriptions ?? []).filter(
    (p) => (p.medication ?? '').trim() !== ''
  );
  const hasDiagnosis = data?.diagnoses?.[0];
  const hasEdgeCases = (data?.edge_cases?.length ?? 0) > 0;
  const hasPrescriptions = prescriptions.length > 0;
  const hasHistory = (data?.diagnoses?.length ?? 0) > 1;

  if (!patientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white px-8 py-8">
        <p className="text-gray-400">Not logged in as patient.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header portalType="patient" title="Patient Portal" />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 gap-4"
          >
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500/30 border-t-emerald-400" />
            <p className="text-gray-400 text-sm">Loading your health summary…</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-red-900/20 border border-red-500/30 p-4 flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-300">{error}</p>
          </motion.div>
        )}

        {data && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="text-white space-y-6"
          >
            {/* Tab navigation */}
            <nav
              className="sticky top-[4.5rem] z-10 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-slate-900/80 backdrop-blur-md border-b border-white/5 rounded-xl"
              aria-label="Dashboard sections"
            >
              <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
                  { id: 'diagnosis', label: 'Diagnosis & care', icon: Stethoscope },
                  { id: 'prescriptions', label: 'Prescriptions', icon: Pill },
                  { id: 'history', label: 'History', icon: History },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      activeTab === id
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </nav>

            <AnimatePresence mode="wait">
              {/* Overview tab */}
              {activeTab === 'overview' && (
                <motion.section
                  key="overview"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                  aria-label="Overview"
                >
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2 px-1">
                    <LayoutDashboard className="w-5 h-5 text-emerald-400" />
                    Overview
                  </h2>
                  {/* Hero summary */}
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-slate-800 border border-emerald-500/20 p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/20">
                        <Sparkles className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">Your care at a glance</h3>
                        {hasDiagnosis ? (
                          <>
                            <p className="text-emerald-200/90 text-base mb-3">
                              Latest: {data.diagnoses[0].final_diagnosis}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('diagnosis')}
                                className="text-sm px-3 py-1.5 rounded-lg bg-white/10 text-gray-200 hover:bg-white/15 transition-colors"
                              >
                                View full diagnosis
                              </button>
                              {hasPrescriptions && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('prescriptions')}
                                  className="text-sm px-3 py-1.5 rounded-lg bg-white/10 text-gray-200 hover:bg-white/15 transition-colors"
                                >
                                  Your medications
                                </button>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-gray-400">No diagnosis on file yet. After your visit, your summary will appear here.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'diagnosis', label: 'Diagnosis', icon: FileText, count: hasDiagnosis ? 1 : 0 },
                      { id: 'prescriptions', label: 'Prescriptions', icon: Pill, count: prescriptions.length },
                      { id: 'diagnosis', sub: 'edge', label: 'Things to watch', icon: AlertTriangle, count: data?.edge_cases?.length ?? 0 },
                      { id: 'history', label: 'Past visits', icon: History, count: Math.max(0, (data?.diagnoses?.length ?? 0) - 1) },
                    ].map(({ id, sub, label, icon: Icon, count }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setActiveTab(id)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/80 border border-white/5 hover:border-emerald-500/30 hover:bg-slate-800 transition-all text-left"
                      >
                        <Icon className="w-5 h-5 text-emerald-400/80" />
                        <span className="text-sm font-medium text-white">{label}</span>
                        <span className="text-xs text-gray-400">{count} {count === 1 ? 'item' : 'items'}</span>
                      </button>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Diagnosis & care tab */}
              {activeTab === 'diagnosis' && (
                <motion.section
                  key="diagnosis"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden">
                    <div className="p-6 border-b border-white/5">
                      <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-emerald-400" />
                        Latest Diagnosis
                      </h2>
                    </div>
                    <div className="p-6 pt-0">
                      {hasDiagnosis ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-slate-700/50 border border-white/5">
                            <p className="text-lg text-white font-medium">{data.diagnoses[0].final_diagnosis}</p>
                          </div>
                          {data.explanation && (
                            <div className="p-4 rounded-xl bg-blue-900/20 border border-blue-500/30">
                              <h3 className="text-blue-300 font-medium mb-2">What this means</h3>
                              <p className="text-gray-300 text-sm leading-relaxed">{data.explanation}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400">No diagnosis on file.</p>
                      )}
                    </div>
                  </div>

                  {/* Edge cases – accordion */}
                  {hasEdgeCases && (
                    <div className="rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden">
                      <div className="p-6 border-b border-white/5">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-400" />
                          Things to watch for
                        </h2>
                      </div>
                      <ul className="divide-y divide-white/5">
                        {data.edge_cases.map((edge, i) => {
                          const name = typeof edge === 'string' ? edge : edge?.name;
                          const furtherSteps = typeof edge === 'object' && edge?.further_steps ? edge.further_steps : '';
                          const isExpanded = expandedEdgeIndex === i;
                          return (
                            <li key={i}>
                              <button
                                type="button"
                                onClick={() => setExpandedEdgeIndex(isExpanded ? null : i)}
                                className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-white/5 transition-colors"
                              >
                                <span className="font-medium text-amber-200">{name}</span>
                                <motion.span
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                </motion.span>
                              </button>
                              <AnimatePresence>
                                {isExpanded && furtherSteps && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-6 pb-4 pt-0">
                                      <p className="text-sm text-gray-300 whitespace-pre-wrap pl-0">{furtherSteps}</p>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </motion.section>
              )}

              {/* Prescriptions tab */}
              {activeTab === 'prescriptions' && (
                <motion.section
                  key="prescriptions"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2 px-1">
                    <Pill className="w-5 h-5 text-emerald-400" />
                    Your prescriptions
                  </h2>
                  {hasPrescriptions ? (
                    <div className="space-y-3">
                      {prescriptions.map((p) => {
                        const id = p.id ?? p._id ?? p.medication;
                        const isExpanded = expandedPrescriptionId === id;
                        return (
                          <motion.div
                            key={id}
                            layout
                            className="rounded-xl bg-slate-800/80 border border-white/5 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedPrescriptionId(isExpanded ? null : id)}
                              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-lg bg-emerald-500/20">
                                  <Pill className="w-4 h-4 text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-white truncate">{p.medication}</p>
                                  {p.dosage && (
                                    <p className="text-sm text-gray-400">{p.dosage}</p>
                                  )}
                                </div>
                              </div>
                              <motion.span
                                animate={{ rotate: isExpanded ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                              </motion.span>
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-white/5"
                                >
                                  <div className="px-5 py-4 bg-slate-800/50">
                                    {p.instructions ? (
                                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{p.instructions}</p>
                                    ) : (
                                      <p className="text-sm text-gray-500">No additional instructions.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-8 text-center">
                      <Pill className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">No active prescriptions.</p>
                    </div>
                  )}
                </motion.section>
              )}

              {/* History tab */}
              {activeTab === 'history' && (
                <motion.section
                  key="history"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2 px-1">
                    <History className="w-5 h-5 text-emerald-400" />
                    Visit history
                  </h2>
                  {hasHistory ? (
                    <div className="space-y-3">
                      {data.diagnoses.slice(1).map((d, i) => {
                        const isExpanded = expandedVisitIndex === i;
                        return (
                          <motion.div
                            key={d.id ?? i}
                            layout
                            className="rounded-xl bg-slate-800/80 border border-white/5 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setExpandedVisitIndex(isExpanded ? null : i)}
                              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                                <p className="font-medium text-white truncate">{d.final_diagnosis}</p>
                              </div>
                              <ChevronDown
                                className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </button>
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-white/5"
                                >
                                  <div className="px-5 py-4 bg-slate-800/50">
                                    {d.symptoms?.length > 0 ? (
                                      <p className="text-sm text-gray-400">
                                        <span className="text-gray-500">Symptoms noted: </span>
                                        {d.symptoms.join(', ')}
                                      </p>
                                    ) : (
                                      <p className="text-sm text-gray-500">No symptoms recorded.</p>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-slate-800/50 border border-white/5 p-8 text-center">
                      <History className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400">No past visits yet.</p>
                    </div>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
