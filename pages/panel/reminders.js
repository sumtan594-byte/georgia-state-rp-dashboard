import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Clock, MessageSquare, Megaphone, ArrowLeft, Save, Users, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import LoginScreen from '../../components/auth/LoginScreen';

const REMINDERS_ROLE_ID = '1394297547597680670';

export default function RemindersPage() {
  const { data: session, status } = useSession();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newReminder, setNewReminder] = useState({ type: 'h', message: '', delayMinutes: 5 });
  const [workerState, setWorkerState] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (session && session.user.roles.includes(REMINDERS_ROLE_ID)) {
      fetchReminders();
      fetchStatus();
      const statusInterval = setInterval(fetchStatus, 5000);
      return () => clearInterval(statusInterval);
    }
  }, [session]);

  useEffect(() => {
    if (!workerState?.nextRunAt) return;
    const timer = setInterval(() => {
      const diff = workerState.nextRunAt - Date.now();
      if (diff <= 0) {
        setTimeLeft('Processing...');
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs}s`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [workerState]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/panel/reminders/status');
      if (res.ok) setWorkerState(await res.json());
    } catch (e) {}
  };

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/panel/reminders');
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (e) {
      console.error('Failed to fetch reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const res = await fetch('/api/panel/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReminder),
      });
      if (res.ok) {
        setNewReminder({ type: 'h', message: '', delayMinutes: 5 });
        await fetchReminders();
      }
    } catch (e) {
      console.error('Failed to add reminder');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/panel/reminders?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchReminders();
      }
    } catch (e) {
      console.error('Failed to delete reminder');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-gsrp-orange animate-spin mb-4" />
          <span className="text-white/40 font-mono text-xs uppercase tracking-[0.3em]">Loading Reminders</span>
        </div>
      </div>
    );
  }

  if (!session) return <LoginScreen />;
  if (!session.user.roles.includes(REMINDERS_ROLE_ID)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 className="text-white font-black text-2xl mb-4">Access Denied</h1>
        <p className="text-gsrp-teal-light/40 text-sm mb-8 max-w-md">You do not have the required permissions to manage in-game reminders.</p>
        <Link href="/" className="px-6 py-2.5 rounded-xl bg-gsrp-orange text-white font-bold hover:bg-gsrp-orange-light transition-all">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange transition-colors text-xs font-bold uppercase tracking-wider mb-2">
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
          <h1 className="text-white font-black text-2xl md:text-3xl">In-Game <span className="text-gsrp-orange">Reminders</span></h1>
          <p className="text-gsrp-teal-light/40 text-sm mt-1">Configure sequential automated messages for the ERLC server.</p>
        </div>

        {workerState && (
          <div className="hidden md:flex items-center gap-6 card-glass px-6 py-3 rounded-2xl border border-gsrp-orange/20 glow-orange">
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/30">Next Reminder</span>
              <span className="text-xs font-bold text-gsrp-orange flex items-center gap-1.5">
                <Clock size={12} /> {timeLeft}
              </span>
            </div>
            <div className="w-[1px] h-8 bg-gsrp-dark-border/50" />
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/30">Server Status</span>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Users size={12} className="text-gsrp-teal-light/40" /> {workerState.playerCount} active
              </span>
            </div>
          </div>
        )}
      </div>

      {workerState && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
           <div className="md:col-span-1 card-glass rounded-2xl p-4 border border-gsrp-dark-border/50 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                workerState.status === 'sending' ? 'bg-gsrp-orange/10 text-gsrp-orange animate-pulse' : 'bg-green-500/10 text-green-400'
              }`}>
                {workerState.status === 'sending' ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30">Worker Status</span>
                <span className="text-sm font-bold text-white capitalize">{workerState.status}</span>
              </div>
           </div>

           <div className="md:col-span-3 card-glass rounded-2xl p-4 border border-gsrp-dark-border/50 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gsrp-orange/10 flex items-center justify-center text-gsrp-orange">
                <MessageSquare size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30">Queueing Next</span>
                <span className="text-sm font-bold text-white truncate block">{workerState.nextReminder || 'No reminders queued'}</span>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="card-glass rounded-2xl p-6 border border-gsrp-dark-border/50 sticky top-8">
            <h2 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <Plus size={20} className="text-gsrp-orange" />
              Add Reminder
            </h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30 mb-2">Command Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewReminder({ ...newReminder, type: 'h' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                      newReminder.type === 'h' 
                        ? 'bg-gsrp-orange/10 border-gsrp-orange text-gsrp-orange' 
                        : 'bg-gsrp-dark-surface/40 border-gsrp-dark-border/50 text-gsrp-teal-light/40'
                    }`}
                  >
                    <Megaphone size={14} /> :H Command
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewReminder({ ...newReminder, type: 'm' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-xs font-bold ${
                      newReminder.type === 'm' 
                        ? 'bg-gsrp-orange/10 border-gsrp-orange text-gsrp-orange' 
                        : 'bg-gsrp-dark-surface/40 border-gsrp-dark-border/50 text-gsrp-teal-light/40'
                    }`}
                  >
                    <MessageSquare size={14} /> :M Command
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30 mb-2">Message</label>
                <textarea
                  required
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                  placeholder="Enter reminder message..."
                  className="w-full bg-gsrp-dark-surface/40 border border-gsrp-dark-border/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gsrp-teal-light/20 focus:outline-none focus:border-gsrp-orange/50 transition-all min-h-[100px]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30 mb-2">Delay (Minutes)</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gsrp-teal-light/20" />
                  <input
                    type="number"
                    required
                    min="1"
                    value={newReminder.delayMinutes}
                    onChange={(e) => setNewReminder({ ...newReminder, delayMinutes: e.target.value })}
                    className="w-full bg-gsrp-dark-surface/40 border border-gsrp-dark-border/50 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-gsrp-orange/50 transition-all"
                  />
                </div>
                <p className="text-[10px] text-gsrp-teal-light/20 mt-2 italic">Delay from the previous reminder in the queue.</p>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="w-full bg-gsrp-orange text-white font-bold py-3 rounded-xl hover:bg-gsrp-orange-light transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {adding ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Save Reminder
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gsrp-orange mb-6 flex items-center gap-4 px-2">
              Queue Order
              <div className="h-[1px] flex-1 bg-gradient-to-r from-gsrp-orange/20 to-transparent" />
            </h2>
            
            {reminders.length === 0 ? (
              <div className="card-glass rounded-2xl p-12 border border-gsrp-dark-border/30 text-center">
                <MessageSquare size={48} className="text-gsrp-teal-light/10 mx-auto mb-4" />
                <p className="text-gsrp-teal-light/30 text-sm">No reminders configured yet.</p>
              </div>
            ) : (
              reminders.map((reminder, idx) => (
                <div key={reminder._id} className="card-glass rounded-2xl p-5 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 transition-all group relative animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      reminder.type === 'h' ? 'bg-gsrp-orange/10 text-gsrp-orange' : 'bg-gsrp-teal/10 text-gsrp-teal'
                    }`}>
                      {reminder.type === 'h' ? <Megaphone size={18} /> : <MessageSquare size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/30">
                          {reminder.type === 'h' ? 'Hint Command' : 'Message Command'}
                        </span>
                        <div className="flex items-center gap-2 text-gsrp-orange font-bold text-xs">
                          <Clock size={12} />
                          {reminder.delayMinutes}m delay
                        </div>
                      </div>
                      <p className="text-white text-sm leading-relaxed pr-8">{reminder.message}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(reminder._id)}
                    className="absolute top-4 right-4 p-2 rounded-lg text-gsrp-teal-light/20 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {reminders.length > 0 && (
            <div className="mt-8 p-6 rounded-2xl bg-gsrp-orange/5 border border-gsrp-orange/20">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gsrp-orange/10 flex items-center justify-center flex-shrink-0 text-gsrp-orange">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-gsrp-orange font-bold text-sm mb-1">How it works</h3>
                  <p className="text-gsrp-teal-light/50 text-xs leading-relaxed">
                    The bot will loop through these reminders in order. Once the first reminder is sent, it will wait its configured delay before sending the next one. After reaching the end of the queue, it will loop back to the beginning.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
