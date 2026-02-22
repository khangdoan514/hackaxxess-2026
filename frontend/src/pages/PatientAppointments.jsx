import { useState } from 'react';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { Calendar, Clock, Plus, CalendarCheck, ChevronRight } from 'lucide-react';

export default function PatientAppointments() {
  const [activeSubTab, setActiveSubTab] = useState('upcoming');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header portalType="patient" title="Patient Portal" />
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold text-white flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-400" />
              Appointments
            </h1>
          </div>

          {/* Sub-tabs */}
          <nav className="flex gap-2 p-1 rounded-xl bg-slate-800/80 border border-white/5 w-fit">
            <button
              type="button"
              onClick={() => setActiveSubTab('upcoming')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === 'upcoming'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <Clock className="w-4 h-4" />
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('past')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeSubTab === 'past'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-gray-400 hover:text-white border border-transparent'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              Past
            </button>
          </nav>

          {activeSubTab === 'upcoming' && (
            <motion.div
              key="upcoming"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden"
            >
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">No upcoming appointments</h2>
                <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                  When you have an appointment scheduled, it will appear here.
                </p>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Request appointment
                </button>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'past' && (
            <motion.div
              key="past"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden"
            >
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                  <CalendarCheck className="w-8 h-8 text-gray-500" />
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">No past appointments</h2>
                <p className="text-gray-400 text-sm max-w-sm mx-auto">
                  Your visit history will show here after appointments.
                </p>
              </div>
            </motion.div>
          )}

          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 flex items-start gap-3">
            <ChevronRight className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-emerald-200">Need to schedule?</p>
              <p className="text-xs text-gray-400 mt-1">
                Contact your provider or use the request button above to ask for an appointment.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
