import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import { motion } from 'framer-motion';
import { User, Mail, Shield, ChevronDown, ChevronUp } from 'lucide-react';

export default function PatientProfile() {
  const { user, getDisplayName } = useAuth();
  const [expandedSection, setExpandedSection] = useState('contact');

  const sections = [
    {
      id: 'contact',
      label: 'Contact information',
      icon: User,
      content: [
        { label: 'Name', value: getDisplayName(), icon: User },
        { label: 'Email', value: user?.email || '—', icon: Mail },
      ],
    },
    {
      id: 'account',
      label: 'Account & security',
      icon: Shield,
      content: [
        { label: 'Account type', value: 'Patient', icon: Shield },
        { label: 'Signed in as', value: user?.email || '—', icon: Mail },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header portalType="patient" title="Patient Portal" />
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          <div className="rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <User className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">{getDisplayName()}</h1>
                <p className="text-sm text-gray-400">Patient account</p>
              </div>
            </div>
          </div>

          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const Icon = section.icon;
            return (
              <motion.div
                key={section.id}
                layout
                className="rounded-2xl bg-slate-800/80 border border-white/5 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <span className="font-medium text-white">{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <motion.div
                  initial={false}
                  animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-0 border-t border-white/5">
                    <ul className="space-y-3 pt-4">
                      {section.content.map((row) => {
                        const RowIcon = row.icon;
                        return (
                          <li
                            key={row.label}
                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5"
                          >
                            <RowIcon className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-500 uppercase tracking-wider">{row.label}</p>
                              <p className="text-gray-200 font-medium truncate">{row.value}</p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}

          <p className="text-center text-xs text-gray-500 pt-4">
            Need to update your details? Contact your care team.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
