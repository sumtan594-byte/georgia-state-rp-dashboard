import { useSession } from "next-auth/react";
import { ArrowLeft, Lock, Download, Loader2, Clock, Tag, FileText, Sparkles, Sun, Sunset, Users, X, Plus, Trash2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

const LOGO = "https://i.imgur.com/70GfmYd.gif";
const BG_IMAGE = "https://i.imgur.com/QVVQSK2.png";

const TYPE_COLORS = {
  GENERAL:      "text-gsrp-teal-light bg-gsrp-teal/10 border-gsrp-teal/30",
  DEPARTMENTAL: "text-gsrp-cyan bg-gsrp-cyan/10 border-gsrp-cyan/30",
  MANAGEMENT:   "text-gsrp-orange-light bg-gsrp-orange/10 border-gsrp-orange/30",
  DIRECTIVE:    "text-gsrp-gold bg-gsrp-gold/10 border-gsrp-gold/30",
};

function parseMeta(id) {
  if (!id) return {};
  const p = id.split('__');
  return {
    type:        p[0] || 'UNKNOWN',
    ownerId:     p[1] || 'UNKNOWN',
    channelName: p[2] || 'Unknown',
    date:        p[3] || '',
    reason:      p[4] || '',
    time:        p[5] ? p[5].replace(/-/g, ':') : '',
  };
}

function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function renderDiscordMarkdown(text) {
  let out = text;
  out = out.replace(/```(?:\w+\n)?([\s\S]*?)```/g, (_, code) =>
    `<span class="discord-md-codeblock">${escHtml(code.trim())}</span>`);
  out = out.split('\n').map(line => {
    if (/^### (.+)/.test(line)) return `<span class="discord-md-h3">${line.replace(/^### /, '')}</span>`;
    if (/^## (.+)/.test(line))  return `<span class="discord-md-h2">${line.replace(/^## /, '')}</span>`;
    if (/^# (.+)/.test(line))   return `<span class="discord-md-h1">${line.replace(/^# /, '')}</span>`;
    if (/^> (.*)/.test(line))   return (
      `<span class="discord-md-blockquote"><span class="discord-md-blockquote-bar"></span><span class="discord-md-blockquote-content">${line.replace(/^> /, '')}</span></span>`);
    return line;
  }).join('\n');
  out = out.replace(/\*\*\*(.+?)\*\*\*/g, '<strong class="discord-md-bold"><em class="discord-md-italic">$1</em></strong>');
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong class="discord-md-bold">$1</strong>');
  out = out.replace(/\*(.+?)\*/g, '<em class="discord-md-italic">$1</em>');
  out = out.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em class="discord-md-italic">$1</em>');
  out = out.replace(/__(.+?)__/g, '<span class="discord-md-underline">$1</span>');
  out = out.replace(/~~(.+?)~~/g, '<span class="discord-md-strikethrough">$1</span>');
  out = out.replace(/`([^`]+)`/g, '<span class="discord-md-code">$1</span>');
  out = out.replace(/\|\|(.+?)\|\|/g, '<span class="discord-md-spoiler">$1</span>');
  return out;
}

function applyDiscordMarkdown(html) {
  if (!html) return html;
  return html.replace(/(>)([^<]+)(<)/g, (_, open, text, close) => {
    if (!text.trim()) return _;
    return `${open}${renderDiscordMarkdown(text)}${close}`;
  });
}

const DISCORD_MD_STYLES = `
  discord-messages { background: #0F1629 !important; --discord-background-primary: #0F1629 !important; }
  discord-message { --discord-background-message-hover: rgba(249, 115, 22, 0.03) !important; }
  .transcript-meta-info { background: #0A0E1A !important; border-bottom: 1px solid rgba(30, 42, 74, 0.5) !important; }
  .discord-md-h1 { font-size:1.75rem;font-weight:800;color:#f2f3f5;line-height:1.2;margin:0.5rem 0 0.25rem;display:block; }
  .discord-md-h2 { font-size:1.375rem;font-weight:700;color:#f2f3f5;line-height:1.25;margin:0.4rem 0 0.2rem;display:block; }
  .discord-md-h3 { font-size:1.125rem;font-weight:700;color:#f2f3f5;line-height:1.3;margin:0.3rem 0 0.15rem;display:block; }
  .discord-md-blockquote { display:flex;align-items:stretch;margin:2px 0; }
  .discord-md-blockquote-bar { width:4px;border-radius:4px;background:linear-gradient(180deg,#F97316,#0D9488);flex-shrink:0;margin-right:10px; }
  .discord-md-blockquote-content { color:#dbdee1;padding:2px 0; }
  .discord-md-bold { font-weight:700;color:#f2f3f5; }
  .discord-md-italic { font-style:italic; }
  .discord-md-underline { text-decoration:underline; }
  .discord-md-strikethrough { text-decoration:line-through; }
  .discord-md-code { background:#151D35;border-radius:3px;padding:0 4px;font-family:'Consolas','Courier New',monospace;font-size:0.85em;color:#f2f3f5; }
  .discord-md-codeblock { background:#151D35;border-radius:6px;padding:8px 12px;font-family:'Consolas','Courier New',monospace;font-size:0.85em;color:#f2f3f5;white-space:pre-wrap;display:block;margin:4px 0;border:1px solid rgba(30,42,74,0.5); }
  .discord-md-spoiler { background:#1E2A4A;border-radius:3px;padding:0 4px;cursor:pointer;color:transparent;transition:color 0.15s; }
  .discord-md-spoiler:hover { color:#dbdee1; }
`;

function AccessModal({ transcriptId, isOpen, onClose }) {
  const [data, setData] = useState({ accesses: [], denies: [], admins: [], canManage: false, canRemoveAdmins: false });
  const [loading, setLoading] = useState(true);
  const [newId, setNewId] = useState('');
  const [newType, setNewType] = useState('user');
  const [error, setError] = useState('');

  const fetchAccesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/transcripts/access?transcriptId=${transcriptId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {}
    setLoading(false);
  }, [transcriptId]);

  useEffect(() => {
    if (isOpen) fetchAccesses();
  }, [isOpen, fetchAccesses]);

  const handleAdd = async () => {
    if (!newId.trim()) return;
    setError('');
    try {
      const res = await fetch(`/api/transcripts/access?transcriptId=${transcriptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granteeId: newId.trim(), granteeType: newType }),
      });
      if (res.ok) {
        setNewId('');
        await fetchAccesses();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to grant access');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleRemove = async (granteeId) => {
    setError('');
    try {
      const res = await fetch(`/api/transcripts/access?transcriptId=${transcriptId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granteeId }),
      });
      if (res.ok) {
        await fetchAccesses();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to revoke access');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleDenyAdmin = async (adminId) => {
    setError('');
    try {
      const res = await fetch(`/api/transcripts/access?transcriptId=${transcriptId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granteeId: adminId }),
      });
      if (res.ok) {
        await fetchAccesses();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to revoke admin access');
      }
    } catch {
      setError('Network error');
    }
  };

  const handleRestoreAdmin = async (adminId) => {
    setError('');
    try {
      const res = await fetch(`/api/transcripts/access?transcriptId=${transcriptId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granteeId: adminId, restore: true }),
      });
      if (res.ok) {
        await fetchAccesses();
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to restore admin access');
      }
    } catch {
      setError('Network error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gsrp-dark-card border border-gsrp-dark-border/60 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gsrp-dark-border/50">
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-gsrp-teal-light" />
            <h2 className="text-white font-black text-sm tracking-tight">Manage Access</h2>
          </div>
          <button onClick={onClose} className="text-gsrp-teal-light/40 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={16} className="text-gsrp-orange animate-spin" />
            </div>
          ) : (
            <>
              {/* System Administrators */}
              {data.admins.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gsrp-gold mb-2 flex items-center gap-2">
                    <ShieldCheck size={11} /> System Administrators
                  </p>
                  <div className="space-y-1.5">
                    {data.admins.map(admin => (
                      <div key={admin.id} className="flex items-center justify-between bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {admin.avatarUrl ? (
                            <img src={admin.avatarUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gsrp-dark-border flex-shrink-0" />
                          )}
                          <span className="text-white text-sm font-bold truncate">{admin.name}</span>
                          {admin.isDenied && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-gsrp-sunset bg-gsrp-sunset/10 px-1.5 py-0.5 rounded flex-shrink-0">Denied</span>
                          )}
                        </div>
                        {data.canRemoveAdmins && (
                          admin.isDenied ? (
                            <button onClick={() => handleRestoreAdmin(admin.id)} className="flex items-center gap-1 text-gsrp-teal-light/60 hover:text-gsrp-teal-light transition-colors text-[9px] font-bold uppercase tracking-widest cursor-pointer px-2 py-1 rounded-lg hover:bg-gsrp-teal/10 flex-shrink-0">
                              <Plus size={10} /> Restore
                            </button>
                          ) : (
                            <button onClick={() => handleDenyAdmin(admin.id)} className="flex items-center gap-1 text-gsrp-sunset/60 hover:text-gsrp-sunset transition-colors text-[9px] font-bold uppercase tracking-widest cursor-pointer px-2 py-1 rounded-lg hover:bg-gsrp-sunset/10 flex-shrink-0">
                              <Trash2 size={10} /> Revoke
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Granted Access */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gsrp-teal-light mb-2">Granted Access</p>
                {data.accesses.length === 0 ? (
                  <p className="text-gsrp-teal-light/30 text-[10px] font-bold uppercase tracking-widest text-center py-4">No custom access granted</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.accesses.map(a => (
                      <div key={a.id} className="flex items-center justify-between bg-gsrp-dark-surface/50 border border-gsrp-dark-border/50 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {a.grantee_type === 'role' ? (
                            <>
                              {a.iconUrl ? (
                                <img src={a.iconUrl} alt="" className="w-5 h-5 flex-shrink-0" />
                              ) : a.color ? (
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                              ) : null}
                              <span className="text-white text-sm font-bold truncate" style={a.color ? { color: a.color } : {}}>{a.name}</span>
                              <span className="text-[8px] font-black uppercase tracking-widest text-gsrp-gold bg-gsrp-gold/10 px-1.5 py-0.5 rounded flex-shrink-0">Role</span>
                            </>
                          ) : (
                            <>
                              {a.avatarUrl ? (
                                <img src={a.avatarUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gsrp-dark-border flex-shrink-0" />
                              )}
                              <span className="text-white text-sm font-bold truncate">{a.name}</span>
                            </>
                          )}
                        </div>
                        <button onClick={() => handleRemove(a.grantee_id)} className="text-gsrp-sunset/60 hover:text-gsrp-sunset transition-colors cursor-pointer p-1 flex-shrink-0">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-gsrp-dark-border/50">
          {error && <p className="text-gsrp-sunset text-[10px] font-bold mb-2">{error}</p>}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={newId}
                onChange={e => setNewId(e.target.value)}
                placeholder="Discord user or role ID"
                className="w-full bg-gsrp-dark border border-gsrp-dark-border/60 rounded-xl px-3.5 py-2.5 outline-none focus:border-gsrp-orange/40 text-sm text-gray-200 placeholder:text-gsrp-teal-light/20"
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
              />
            </div>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="bg-gsrp-dark border border-gsrp-dark-border/60 rounded-xl px-3 py-2.5 outline-none text-[10px] font-bold text-gsrp-teal-light/70 uppercase tracking-wider cursor-pointer"
            >
              <option value="user" className="bg-gsrp-dark-card">User</option>
              <option value="role" className="bg-gsrp-dark-card">Role</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={!newId.trim()}
              className="flex items-center gap-1.5 bg-gradient-to-r from-gsrp-orange to-gsrp-gold text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40 cursor-pointer"
            >
              <Plus size={12} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Viewer({ htmlContent, id, meta: serverMeta, canManage, error }) {
  const { status } = useSession();
  const [loaded, setLoaded] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const meta = serverMeta || parseMeta(id);
  const typeColor = TYPE_COLORS[meta.type] || TYPE_COLORS.GENERAL;

  useEffect(() => {
    if (!id || error) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/transcripts/access?transcriptId=${id}&check=1`);
        if (res.ok) {
          const data = await res.json();
          if (!data.hasAccess) setAccessRevoked(true);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [id, error]);

  useEffect(() => {
    if (!htmlContent) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const profilesData = doc.getElementById('discord-profiles-data');
    if (profilesData) {
      try { window.$discordMessage = { profiles: JSON.parse(profilesData.textContent) }; } catch (_) {}
    }
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.jsdelivr.net/npm/@derockdev/discord-components-core@^3.6.1/dist/derockdev-discord-components-core/derockdev-discord-components-core.esm.js";
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, [htmlContent]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Transcript - ${meta.channelName}</title></head><body>${htmlContent}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (status === "loading") return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="w-7 h-7 text-gsrp-orange animate-spin mb-4" />
      <span className="text-gsrp-teal-light/40 font-mono text-[9px] uppercase tracking-[0.3em]">Loading Record</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center py-20">
      <div className="card-glass rounded-[2rem] p-12 max-w-sm w-full text-center shadow-2xl animate-scale-in">
        <div className="w-14 h-14 rounded-2xl bg-gsrp-sunset/10 border border-gsrp-sunset/20 flex items-center justify-center mx-auto mb-6"><Lock size={24} className="text-gsrp-sunset" /></div>
        <h1 className="text-white font-black text-lg mb-2 tracking-tight">Access Denied</h1>
        <p className="text-gsrp-teal-light/40 text-sm mb-8">You do not have permission to view this transcript or it does not exist.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-gsrp-dark-card/60 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"><ArrowLeft size={14} /> Back to Dashboard</Link>
      </div>
    </div>
  );

  if (accessRevoked) return (
    <div className="flex items-center justify-center py-20">
      <div className="card-glass rounded-[2rem] p-12 max-w-sm w-full text-center shadow-2xl animate-scale-in">
        <div className="w-14 h-14 rounded-2xl bg-gsrp-sunset/10 border border-gsrp-sunset/20 flex items-center justify-center mx-auto mb-6"><Lock size={24} className="text-gsrp-sunset" /></div>
        <h1 className="text-white font-black text-lg mb-2 tracking-tight">Access Revoked</h1>
        <p className="text-gsrp-teal-light/40 text-sm mb-8">Your access to this transcript has been removed.</p>
        <Link href="/" className="inline-flex items-center gap-2 bg-gsrp-dark-card/60 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer"><ArrowLeft size={14} /> Back to Dashboard</Link>
      </div>
    </div>
  );

  return (
    <div>
      <nav className="sticky top-0 z-50 bg-gsrp-dark/80 backdrop-blur-xl border-b border-gsrp-dark-border/50 -mx-4 md:-mx-6 lg:-mx-8 px-6 lg:px-10 py-4 flex items-center justify-between animate-fade-in-down">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer"><ArrowLeft size={13} /> Dashboard</Link>
          <div className="w-px h-5 bg-gsrp-dark-border/50" />
          <div className="flex items-center gap-3">
            <div className="relative"><div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/20 to-gsrp-teal/20 rounded-lg blur-sm" /><img src={LOGO} className="relative w-6 h-6 rounded-lg border border-white/10" alt="GSRP" /></div>
            <div>
              <div className="flex items-center gap-1"><Sparkles size={8} className="text-gsrp-gold" /><span className="text-[8px] text-gsrp-teal-light/40 font-bold uppercase tracking-widest">Transcript</span></div>
              <div className="text-xs font-black text-white leading-none">{meta.channelName || id}</div>
            </div>
          </div>
          {meta.type && meta.type !== 'UNKNOWN' && (
            <span className={`hidden sm:inline-flex items-center px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${typeColor}`}>{meta.type}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {meta.date && (
            <div className="hidden md:flex items-center gap-1.5 bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-lg px-3 py-1.5">
              <Clock size={10} className="text-gsrp-teal-light/30" /><span className="text-[9px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider">{meta.date}</span>
            </div>
          )}
          {meta.reason && meta.reason !== 'NoReason' && (
            <div className="hidden lg:flex items-center gap-1.5 bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-lg px-3 py-1.5 max-w-[180px]">
              <Tag size={10} className="text-gsrp-teal-light/30 flex-shrink-0" /><span className="text-[9px] font-bold text-gsrp-teal-light/40 uppercase tracking-wider truncate">{meta.reason}</span>
            </div>
          )}
          {canManage && (
            <button
              onClick={() => setAccessOpen(true)}
              className="flex items-center gap-2 bg-gsrp-dark-card/60 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 hover:border-gsrp-teal/30 px-4 py-2 rounded-lg text-gsrp-teal-light/70 hover:text-gsrp-teal-light transition-all duration-200 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
            >
              <Users size={12} /> Access
            </button>
          )}
          <button onClick={handlePrint} className="flex items-center gap-2 bg-gsrp-dark-card/60 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 px-4 py-2 rounded-lg text-gsrp-teal-light/70 hover:text-gsrp-orange-light transition-all duration-200 text-[10px] font-bold uppercase tracking-widest cursor-pointer"><Download size={12} /> Export PDF</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-10">
        {!loaded && htmlContent && (
          <div className="flex items-center justify-center py-10">
            <div className="bg-gsrp-dark/80 backdrop-blur-sm rounded-2xl px-6 py-4 flex items-center gap-3 border border-gsrp-dark-border/50 animate-scale-in">
              <Loader2 size={14} className="text-gsrp-orange animate-spin" /><span className="text-gsrp-teal-light/50 text-[10px] font-bold uppercase tracking-wider">Rendering messages…</span>
            </div>
          </div>
        )}
        <div className="card-glass rounded-[1.5rem] shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-up">
          <style dangerouslySetInnerHTML={{ __html: DISCORD_MD_STYLES }} />
          <div dangerouslySetInnerHTML={{ __html: applyDiscordMarkdown(htmlContent) }} />
        </div>
      </div>

      <AccessModal transcriptId={id} isOpen={accessOpen} onClose={() => setAccessOpen(false)} />
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getSession } = require("next-auth/react");
  const session = await getSession(context);
  const { id } = context.params;

  if (!session) return { props: { error: true } };

  const currentUserId = String(session.user?.id || "").trim();
  const adminIds = (process.env.ADMIN_USER_IDS || "").split(',').map(i => String(i).trim()).filter(Boolean);
  const isAdmin = adminIds.includes(currentUserId);
  const userRoles = session.user?.roles || [];

  const pool = (await import('../../lib/ticketdb')).default;

  try {
    const [rows] = await pool.query(
      'SELECT id, html_content, type, owner_id, channel_name, DATE_FORMAT(closed_at, "%Y-%m-%d") as date, close_reason FROM transcripts WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) return { props: { error: true } };

    const t = rows[0];
    const isOwner = String(t.owner_id) === currentUserId;

    // Check access: admin, owner, or granted via transcript_access
    if (!isAdmin && !isOwner) {
      const rolePlaceholders = userRoles.map(() => '?').join(',');
      let accessSql;
      let accessParams;
      if (rolePlaceholders) {
        accessSql = `SELECT 1 FROM transcript_access WHERE transcript_id = ? AND ((grantee_type = 'user' AND grantee_id = ?) OR (grantee_type = 'role' AND grantee_id IN (${rolePlaceholders}))) LIMIT 1`;
        accessParams = [id, currentUserId, ...userRoles];
      } else {
        accessSql = `SELECT 1 FROM transcript_access WHERE transcript_id = ? AND grantee_type = 'user' AND grantee_id = ? LIMIT 1`;
        accessParams = [id, currentUserId];
      }
      const [accessRows] = await pool.query(accessSql, accessParams);
      if (accessRows.length === 0) return { props: { error: true } };
    }

    const meta = {
      type: t.type || 'UNKNOWN',
      ownerId: t.owner_id || 'UNKNOWN',
      channelName: t.channel_name || 'Unknown',
      date: t.date || '',
      reason: t.close_reason || '',
    };

    const canManage = isAdmin || isOwner;

    return { props: { htmlContent: t.html_content, id, meta, canManage } };
  } catch (e) {
    console.error("[Viewer] DB Fetch Error:", e.message);
    return { props: { error: true } };
  }
}
