import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import { 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  ChevronRight, 
  Layout, 
  FileText,
  Shield,
  Eye,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { canReviewApplications } from '../../lib/auth';
import LoginScreen from '../../components/auth/LoginScreen';

export default function ManageApplicationTypes() {
  const { data: session, status } = useSession();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState(null);
  
  // Form State for New/Edit
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    requiredRole: '',
    fields: []
  });

  useEffect(() => {
    if (session && canReviewApplications(session)) {
      fetch('/api/applications/types')
        .then(r => r.json())
        .then(data => {
          // If no staff app exists, add the default one so it can be edited
          const hasStaff = data.find(t => t.slug === 'staff');
          if (!hasStaff) {
            data.unshift({
              name: 'Staff Application',
              slug: 'staff',
              description: 'Apply to join the Georgia State Roleplay staff team',
              fields: [
                { id: 'roblox_user', label: 'Roblox username', type: 'text', subtitle: 'Username, not display name.', required: true },
                { id: 'pd_rank', label: 'In game PD rank?', type: 'text', subtitle: 'What rank are you in game (e.g. Major, Commander etc.)', required: true },
                { id: 'rdm', label: 'What is RDM?', type: 'textarea', subtitle: 'Elaborate, What is RDM? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'vdm', label: 'What is VDM?', type: 'textarea', subtitle: 'Elaborate, What is VDM? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'frp', label: 'What is FRP?', type: 'textarea', subtitle: 'Elaborate, What is FRP? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'ltap', label: 'What is LTAP?', type: 'textarea', subtitle: 'Elaborate, What is LTAP? What may be a valid punishment for offenders?', sentences: 2, required: true },
                { id: 'scen_1', label: 'Scenario: Spawn Shooting', type: 'textarea', subtitle: 'A player is shooting inside civilian spawn, which is a safezone. What would you do to this player?', sentences: 2, required: true },
                { id: 'scen_2', label: 'Scenario: Arrest Button', type: 'textarea', subtitle: 'A police officer is arresting criminals through the "arrest" button. What is this classified as and what will you do in this situation?', sentences: 2, required: true },
                { id: 'scen_3', label: 'Scenario: Sniper', type: 'textarea', subtitle: 'A sniper on a roof is killing people for no reason. What would you do?', sentences: 2, required: true },
                { id: 'scen_4', label: 'Scenario: Stop Sticks', type: 'textarea', subtitle: 'A player is spamming stop sticks. What is this classified as and what would you do?', sentences: 2, required: true },
                { id: 'scen_5', label: 'Scenario: No Response', type: 'textarea', subtitle: 'A player does not respond for more than 2 minutes on a mod call. What is your decision?', sentences: 2, required: true },
                { id: 'scen_6', label: 'Scenario: Threats', type: 'textarea', subtitle: 'A player is threatening to jump off a building, what is this classified as and what would your first instinct be?', sentences: 2, required: true },
                { id: 'scen_7', label: 'Scenario: Swearing', type: 'textarea', subtitle: 'A player is saying swear words bypassing the roblox filter. What is your decision?', sentences: 2, required: true },
                { id: 'scen_8', label: 'Scenario: Exploiting', type: 'textarea', subtitle: 'You see a player exploiting. What would you do?', sentences: 2, required: true },
                { id: 'timezone', label: 'What is your Time zone?', type: 'textarea', required: true },
                { id: 'agree_tiring', label: 'Do you understand that moderation can become tiring and frustrating?', type: 'radio', options: ['Yes I do, and I am ready for it.', 'I don\'t think I can do that'], required: true },
                { id: 'agree_spag', label: 'Do you understand that on shift, you are obliged to use utmost SPaG?', type: 'radio', options: ['I do', 'I cannot do that.'], required: true },
                { id: 'agree_quota', label: 'Do you understand that you Have to meet a 4 hour quota per Week?', type: 'radio', options: ['Yes', 'No'], required: true },
                { id: 'agree_check', label: 'Procced after checking responses?', type: 'radio', options: ['Yes!'], required: true },
                { id: 'questions', label: 'Questions?', type: 'text', subtitle: 'Note, asking for an update on your application will result in an instant denial + Blacklist.', required: true },
                { id: 'agree_no_ask', label: 'Do you agree to not ask anyone when your application will be read?', type: 'radio', options: ['Yes', 'No'], required: true },
                { id: 'melonly', label: 'How familiar are you with melonly?', type: 'radio', options: ['1 (What the hell?)', '2', '3', '4', '5 (Expert)'], required: true },
              ]
            });
          }
          setTypes(data);
          setLoading(false);
        });
    }
  }, [session]);

  const handleSave = async () => {
    const res = await fetch('/api/applications/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    if (res.ok) {
      window.location.reload();
    }
  };

  const handleDelete = async (slug) => {
    if (!confirm('Are you sure you want to delete this application type?')) return;
    const res = await fetch(`/api/applications/types?slug=${slug}`, { method: 'DELETE' });
    if (res.ok) {
      setTypes(types.filter(t => t.slug !== slug));
    }
  };

  const addField = () => {
    setForm({
      ...form,
      fields: [...form.fields, { id: Date.now().toString(), label: '', type: 'text', subtitle: '', sentences: 0, required: true }]
    });
  };

  const updateField = (id, updates) => {
    setForm({
      ...form,
      fields: form.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const removeField = (id) => {
    setForm({
      ...form,
      fields: form.fields.filter(f => f.id !== id)
    });
  };

  if (status === 'loading') return null;
  if (!session) return <LoginScreen />;
  if (!canReviewApplications(session)) return <div>Access Denied</div>;

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <Head>
        <title>Manage Application Types | GSRP</title>
      </Head>

      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Settings className="text-gsrp-orange" />
            Application Management
          </h1>
          <p className="text-gsrp-teal-light/40 text-sm mt-1">Configure your server's application types and forms.</p>
        </div>
        
        <button 
          onClick={() => {
            setEditingType('new');
            setForm({ name: '', slug: '', description: '', requiredRole: '', fields: [] });
          }}
          className="bg-gsrp-orange hover:bg-gsrp-orange-light text-white px-6 py-3 rounded-xl font-black text-sm transition-all flex items-center gap-2 shadow-lg shadow-gsrp-orange/20"
        >
          <Plus size={18} />
          Create New Type
        </button>
      </div>

      {editingType ? (
        <div className="bg-gsrp-dark-card border border-white/10 rounded-3xl p-8 animate-fade-in-up">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-white">{editingType === 'new' ? 'New Application Type' : 'Edit Application Type'}</h2>
            <button onClick={() => setEditingType(null)} className="text-white/20 hover:text-white"><X /></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Display Name</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="e.g. Staff Application"
                className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gsrp-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">URL Slug (no spaces)</label>
              <input 
                type="text" 
                value={form.slug} 
                onChange={e => setForm({...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                placeholder="e.g. staff"
                className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gsrp-orange focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Required Role ID (Optional)</label>
            <input 
              type="text" 
              value={form.requiredRole} 
              onChange={e => setForm({...form, requiredRole: e.target.value})}
              placeholder="e.g. 1372491512709124106"
              className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gsrp-orange focus:outline-none"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gsrp-orange uppercase tracking-widest">Form Fields</h3>
              <button onClick={addField} className="text-[10px] font-black uppercase bg-white/5 px-4 py-2 rounded-lg hover:bg-white/10 transition-all">+ Add Field</button>
            </div>

            {form.fields.map((field, i) => (
              <div key={field.id} className="p-6 bg-gsrp-dark-surface/50 border border-white/5 rounded-2xl relative group">
                <button onClick={() => removeField(field.id)} className="absolute top-4 right-4 text-white/10 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[9px] font-black uppercase text-white/20 mb-1">Question Label</label>
                    <input 
                      type="text" 
                      value={field.label} 
                      onChange={e => updateField(field.id, { label: e.target.value })}
                      className="w-full bg-gsrp-dark-surface border border-white/5 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase text-white/20 mb-1">Type</label>
                    <select 
                      value={field.type} 
                      onChange={e => updateField(field.id, { type: e.target.value })}
                      className="w-full bg-gsrp-dark-surface border border-white/5 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="text">Input (Short)</option>
                      <option value="textarea">TextArea (Long)</option>
                      <option value="radio">Radio Buttons (Yes/No)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleSave}
            className="w-full mt-10 bg-gsrp-orange py-4 rounded-2xl text-white font-black hover:bg-gsrp-orange-light transition-all shadow-xl shadow-gsrp-orange/20"
          >
            Save Application Type
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {types.map(type => (
            <div key={type.slug} className="bg-gsrp-dark-card border border-white/10 rounded-3xl p-6 group hover:border-gsrp-orange/30 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gsrp-orange/10 flex items-center justify-center text-gsrp-orange">
                  <FileText />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setForm(type);
                      setEditingType('edit');
                    }}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/20 hover:text-white transition-all"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(type.slug)}
                    className="p-2 rounded-lg hover:bg-white/5 text-white/20 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-white font-black text-lg mb-1">{type.name}</h3>
              <p className="text-[10px] font-mono text-gsrp-teal-light/30 uppercase tracking-widest mb-6">/apply/{type.slug}</p>
              
              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{type.fields?.length || 0} Fields</span>
                <Link href={`/apply/${type.slug}`} className="text-[10px] font-black text-gsrp-orange uppercase tracking-widest hover:underline flex items-center gap-1">
                  Preview <ChevronRight size={10} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
