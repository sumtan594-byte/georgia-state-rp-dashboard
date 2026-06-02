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
import { useRefreshedUser } from '../../lib/UserRefreshContext';
import AccessDenied from '../../components/auth/AccessDenied';
import { useToast } from '../../lib/ToastContext';
import LoginScreen from '../../components/auth/LoginScreen';
import { useRouter } from 'next/router';

export default function ManageApplicationTypes() {
  const { data: session, status } = useSession();
  const { session: refreshedSession, hasRefreshed, accessDenied } = useRefreshedUser();
  const { addToast } = useToast();
  const effectiveSession = refreshedSession || session;
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingType, setEditingType] = useState(null);
  const [serverRoles, setServerRoles] = useState([]);
  const [originalForm, setOriginalForm] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const router = useRouter();
  
  // Form State for New/Edit
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    requiredRole: '',
    blacklistedRole: [],
    roleAddAccepted: [],
    roleRemoveAccepted: [],
    roleAddDenied: [],
    roleRemoveDenied: [],
    fields: []
  });

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!hasRefreshed || !canReviewApplications(effectiveSession)) return;
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
      fetch('/api/applications/roles')
        .then(r => r.ok ? r.json() : [])
        .then(data => setServerRoles(data));
  }, [status, hasRefreshed, effectiveSession]);

  const hasChanges = editingType && JSON.stringify(form) !== JSON.stringify(originalForm);

  useEffect(() => {
    const handleWindowClose = (e) => {
      if (!hasChanges) return;
      e.preventDefault();
      return (e.returnValue = 'You have unsaved changes. Are you sure you want to leave?');
    };

    const handleBrowseAway = (url) => {
      if (!hasChanges) return;
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      router.events.emit('routeChangeError');
      if (confirm('All unsaved changes will be lost. Do you want to leave?')) {
        return true;
      }
      throw 'routeChange aborted';
    };

    window.addEventListener('beforeunload', handleWindowClose);
    router.events.on('routeChangeStart', handleBrowseAway);

    return () => {
      window.removeEventListener('beforeunload', handleWindowClose);
      router.events.off('routeChangeStart', handleBrowseAway);
    };
  }, [hasChanges]);

  const CustomSelect = ({ value, onChange, options, placeholder = "Select..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div className="relative">
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-gsrp-dark-surface border border-white/10 rounded-xl px-4 py-3 text-white text-sm cursor-pointer flex items-center justify-between hover:border-gsrp-orange/50 transition-all"
        >
          <span className={value ? 'text-white' : 'text-white/20'}>
            {options.find(o => o.value === value)?.label || placeholder}
          </span>
          <ChevronRight size={16} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </div>
        {isOpen && (
          <div className="absolute top-full left-0 w-full mt-2 bg-gsrp-dark-card border border-white/10 rounded-xl overflow-hidden z-50 shadow-2xl">
            {options.map(opt => (
              <div 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className="px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const RoleSelector = ({ label, value, onChange, placeholder = "+ Add Role" }) => {
    const selectedRoles = Array.isArray(value) ? value : (value ? [value] : []);
    const [isOpen, setIsOpen] = useState(false);
    
    return (
      <div className="mb-4">
        <label className="block text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-2">{label}</label>
        <div className="flex flex-wrap gap-2 p-3 bg-gsrp-dark-surface border border-white/5 rounded-xl min-h-[50px] relative">
          {selectedRoles.map(roleId => {
            const role = serverRoles.find(r => r.id === roleId);
            if (!role) return null;
            return (
              <div 
                key={roleId} 
                className="flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border border-white/5 animate-fade-in"
                style={{ backgroundColor: `${role.color ? `rgba(${role.color >> 16 & 255}, ${role.color >> 8 & 255}, ${role.color & 255}, 0.15)` : 'rgba(255,255,255,0.05)'}`, color: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#fff' }}
              >
                {role.icon && <img src={`https://cdn.discordapp.com/role-icons/${roleId}/${role.icon}.png`} className="w-3 h-3 rounded-sm" />}
                {role.name}
                <button onClick={() => onChange(selectedRoles.filter(id => id !== roleId))} className="ml-1 hover:text-white"><X size={12} /></button>
              </div>
            );
          })}
          
          <div className="flex-1 relative">
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="text-xs text-white/20 hover:text-gsrp-orange transition-colors h-full flex items-center px-2 min-w-[100px]"
            >
              {placeholder}
            </button>
            
            {isOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-gsrp-dark-card border border-white/10 rounded-xl z-[60] shadow-2xl animate-fade-in-up">
                {serverRoles.filter(r => !selectedRoles.includes(r.id)).map(role => (
                  <div 
                    key={role.id}
                    onClick={() => { onChange([...selectedRoles, role.id]); setIsOpen(false); }}
                    className="px-4 py-2 text-xs flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#666' }} />
                    <span className="text-white/80">{role.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    const res = await fetch('/api/applications/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    
    if (res.ok) {
      setOriginalForm(JSON.parse(JSON.stringify(form)));
      addToast('Changes saved successfully!', 'success');
    } else {
      addToast('Failed to save changes', 'error');
    }
  };

  const handleDiscard = () => {
    setForm(JSON.parse(JSON.stringify(originalForm)));
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

  if (status === 'loading' || !hasRefreshed) return null;
  if (!session) return <LoginScreen />;
  if (accessDenied) return <AccessDenied roleId={accessDenied.roleId} />;
  if (!canReviewApplications(effectiveSession)) return <AccessDenied roleId="1372491512709124106" />;

  return (
    <div className={`max-w-6xl mx-auto py-12 px-4 md:px-6 transition-transform duration-500 ${isShaking ? 'animate-shake' : ''}`}>
      <Head>
        <title>Manage Application Types | GSRP</title>
      </Head>

      {/* Floating Action Bar */}
      {hasChanges && (
        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] flex flex-wrap items-center gap-4 bg-gsrp-dark-card border-2 ${isShaking ? 'border-gsrp-orange' : 'border-white/10'} p-4 rounded-2xl shadow-2xl animate-fade-in-up max-w-[calc(100vw-32px)]`}>
          <div className="px-4 border-r border-white/5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gsrp-orange">Unsaved Changes</p>
            <p className="text-[9px] text-white/40 font-bold">You have modified the application structure.</p>
          </div>
          <button 
            onClick={handleDiscard}
            className="px-6 py-2 rounded-xl text-xs font-black text-white/40 hover:text-white hover:bg-white/5 transition-all"
          >
            Discard
          </button>
          <button 
            onClick={handleSave}
            className="px-8 py-2.5 bg-gsrp-orange hover:bg-gsrp-orange-light text-white font-black rounded-xl text-xs shadow-lg shadow-gsrp-orange/20 transition-all flex items-center gap-2"
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      )}

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
            const initial = { 
              name: '', 
              slug: '', 
              description: '', 
              requiredRole: [], 
              blacklistedRole: [], 
              roleAddAccepted: [], 
              roleRemoveAccepted: [], 
              roleAddDenied: [], 
              roleRemoveDenied: [], 
              fields: [] 
            };
            setEditingType('new');
            setForm(initial);
            setOriginalForm(JSON.parse(JSON.stringify(initial)));
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mb-8">
            <div className="md:col-span-2">
              <RoleSelector 
                label="Required Role ID to Apply (Optional)"
                value={form.requiredRole}
                onChange={val => setForm({...form, requiredRole: val})}
                placeholder="+ Add Required Role"
              />
            </div>

            <div className="md:col-span-2">
              <RoleSelector 
                label="Blacklisted Roles"
                value={form.blacklistedRole}
                onChange={val => setForm({...form, blacklistedRole: val})}
                placeholder="+ Add Blacklisted Role"
              />
            </div>

            <RoleSelector 
              label="Roles to GIVE on Approval"
              value={form.roleAddAccepted}
              onChange={val => setForm({...form, roleAddAccepted: val})}
              placeholder="+ Add Role"
            />
            <RoleSelector 
              label="Roles to REMOVE on Approval"
              value={form.roleRemoveAccepted}
              onChange={val => setForm({...form, roleRemoveAccepted: val})}
              placeholder="+ Add Role"
            />

            <RoleSelector 
              label="Roles to GIVE on Denial"
              value={form.roleAddDenied}
              onChange={val => setForm({...form, roleAddDenied: val})}
              placeholder="+ Add Role"
            />
            <RoleSelector 
              label="Roles to REMOVE on Denial"
              value={form.roleRemoveDenied}
              onChange={val => setForm({...form, roleRemoveDenied: val})}
              placeholder="+ Add Role"
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
                    <CustomSelect 
                      value={field.type} 
                      onChange={val => updateField(field.id, { type: val })}
                      options={[
                        { value: 'text', label: 'Input (Short)' },
                        { value: 'textarea', label: 'TextArea (Long)' },
                        { value: 'radio', label: 'Multiple Choice (Radio)' },
                        { value: 'checkbox', label: 'Checkboxes (Multi-select)' },
                        { value: 'slider', label: 'Slider (Range)' }
                      ]}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-6 items-end">
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={field.required} 
                      onChange={e => updateField(field.id, { required: e.target.checked })}
                      id={`req-${field.id}`}
                      className="w-4 h-4 rounded border-white/10 bg-gsrp-dark-surface accent-gsrp-orange"
                    />
                    <label htmlFor={`req-${field.id}`} className="text-[10px] font-black uppercase text-white/40 cursor-pointer">Required Question</label>
                  </div>

                  {(field.type === 'radio' || field.type === 'checkbox') && (
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-[9px] font-black uppercase text-white/20 mb-1">Options (Comma separated)</label>
                      <input 
                        type="text" 
                        value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')} 
                        onChange={e => updateField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="Option 1, Option 2, Option 3"
                        className="w-full bg-gsrp-dark-surface border border-white/5 rounded-lg px-3 py-2 text-white text-sm"
                      />
                    </div>
                  )}

                  {field.type === 'slider' && (
                    <div className="flex flex-wrap gap-4 items-end">
                      <div>
                        <label className="block text-[9px] font-black uppercase text-white/20 mb-1">Min</label>
                        <input 
                          type="number" 
                          value={field.min || 0} 
                          onChange={e => updateField(field.id, { min: parseInt(e.target.value) })}
                          className="w-16 bg-gsrp-dark-surface border border-white/5 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase text-white/20 mb-1">Max</label>
                        <input 
                          type="number" 
                          value={field.max || 10} 
                          onChange={e => updateField(field.id, { max: parseInt(e.target.value) })}
                          className="w-16 bg-gsrp-dark-surface border border-white/5 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[9px] font-black uppercase text-white/20 mb-1">Slider Cues (e.g. 1:Poor, 10:Expert)</label>
                        <input 
                          type="text" 
                          value={field.cues || ''} 
                          onChange={e => updateField(field.id, { cues: e.target.value })}
                          placeholder="1:Noob, 5:Mid, 10:Pro"
                          className="w-full bg-gsrp-dark-surface border border-white/5 rounded-lg px-3 py-2 text-white text-sm"
                        />
                      </div>
                    </div>
                  )}
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
                      const initial = JSON.parse(JSON.stringify(type));
                      setForm(initial);
                      setOriginalForm(initial);
                      setEditingType(type.slug);
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
