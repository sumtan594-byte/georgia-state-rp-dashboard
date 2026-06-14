import { useSession } from "next-auth/react";
import { ArrowLeft, Lock, Download, Loader2, Clock, Tag, Sparkles, Users, X, Plus, Trash2, ShieldCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, useCallback } from "react";

const LOGO = "https://i.imgur.com/70GfmYd.gif";
const BG_IMAGE = "/media/Background.png";

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

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatFallbackHtml(text) {
  if (!text) return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body></body></html>';
  const lines = text.split('\n');
  const messagesHtml = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<div class="spacer"></div>';
    return `<div class="message"><span class="text">${escapeHtml(line)}</span></div>`;
  }).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #09090b;
      color: #e5e7eb;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 16px 20px;
      line-height: 1.6;
      font-size: 14px;
    }
    .message {
      padding: 6px 10px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
      border-radius: 4px;
    }
    .message:hover {
      background: rgba(255,255,255,0.02);
    }
    .text { white-space: pre-wrap; word-wrap: break-word; }
    .spacer { height: 8px; }
    a { color: #6ee7b7; }
    .header {
      padding: 12px 10px;
      margin-bottom: 8px;
      border-bottom: 2px solid rgba(255,255,255,0.08);
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-weight: 800;
      color: rgba(255,255,255,0.3);
    }
  </style>
</head>
<body>
  <div class="header">Transcript Messages</div>
  ${messagesHtml}
</body>
</html>`;
}

export default function Viewer({ htmlContent, fullHtml, id, meta: serverMeta, canManage, error, isAdmin }) {
  const { status } = useSession();
  const router = useRouter();
  const [accessOpen, setAccessOpen] = useState(false);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(fullHtml || formatFallbackHtml(htmlContent) || '');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/transcripts/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        router.push('/transcripts');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
        setConfirmDelete(false);
      }
    } catch {
      alert('Network error');
    }
    setDeleting(false);
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
    <div className="max-w-5xl mx-auto py-6">
      <div className="mb-6 animate-fade-in-down">
        <div className="flex items-center gap-3 mb-3">
          <Link href="/transcripts" className="flex items-center gap-1.5 text-gsrp-teal-light/40 hover:text-gsrp-orange-light text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer"><ArrowLeft size={12} /> Transcripts</Link>
          <div className="w-px h-4 bg-gsrp-dark-border/50" />
          <div className="flex items-center gap-2">
            <div className="relative"><div className="absolute inset-0 bg-gradient-to-r from-gsrp-orange/20 to-gsrp-teal/20 rounded-lg blur-sm" /><img src={LOGO} className="relative w-5 h-5 rounded-lg border border-white/10" alt="GSRP" /></div>
            <div>
              <div className="flex items-center gap-1"><Sparkles size={7} className="text-gsrp-gold" /><span className="text-[7px] text-gsrp-teal-light/40 font-bold uppercase tracking-widest">Transcript</span></div>
              <div className="text-xs font-black text-white leading-none">{meta.channelName || id}</div>
            </div>
          </div>
          {meta.type && meta.type !== 'UNKNOWN' && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${typeColor}`}>{meta.type}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {meta.date && (
            <div className="flex items-center gap-1 bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-lg px-2.5 py-1">
              <Clock size={9} className="text-gsrp-teal-light/30" /><span className="text-[8px] font-bold text-gsrp-teal-light/50 uppercase tracking-wider">{meta.date}</span>
            </div>
          )}
          {meta.reason && meta.reason !== 'NoReason' && (
            <div className="flex items-center gap-1 bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-lg px-2.5 py-1 max-w-[200px]">
              <Tag size={9} className="text-gsrp-teal-light/30 flex-shrink-0" /><span className="text-[8px] font-bold text-gsrp-teal-light/50 uppercase tracking-wider truncate">{meta.reason}</span>
            </div>
          )}
          <div className="flex-1" />
          {canManage && (
            <button onClick={() => setAccessOpen(true)} className="flex items-center gap-1.5 bg-gsrp-dark-card/60 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 hover:border-gsrp-teal/30 px-3 py-1.5 rounded-lg text-gsrp-teal-light/70 hover:text-gsrp-teal-light transition-all duration-200 text-[9px] font-bold uppercase tracking-widest cursor-pointer"><Users size={11} /> Access</button>
          )}
          {isAdmin && (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 bg-gsrp-sunset/10 hover:bg-gsrp-sunset/20 border border-gsrp-sunset/20 hover:border-gsrp-sunset/40 px-3 py-1.5 rounded-lg text-gsrp-sunset/70 hover:text-gsrp-sunset transition-all duration-200 text-[9px] font-bold uppercase tracking-widest cursor-pointer"><Trash2 size={11} /> Delete</button>
          )}
          <button onClick={handlePrint} className="flex items-center gap-1.5 bg-gsrp-dark-card/60 hover:bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 hover:border-gsrp-orange/30 px-3 py-1.5 rounded-lg text-gsrp-teal-light/70 hover:text-gsrp-orange-light transition-all duration-200 text-[9px] font-bold uppercase tracking-widest cursor-pointer"><Download size={11} /> Export PDF</button>
        </div>
      </div>

      {/* Ticket Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
        <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Ticket Identifier</div>
          <div className="text-white font-bold text-sm truncate">{meta.channelName}</div>
        </div>
        <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Ticket Opener</div>
          <div className="text-white font-bold text-sm truncate">{meta.openerTag}</div>
        </div>
        <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Closed Timestamp</div>
          <div className="text-white font-bold text-sm truncate">{meta.closedAt || 'Unknown'}</div>
        </div>
        <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4">
          <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Close Reason</div>
          <div className="text-white font-bold text-sm truncate">{meta.reason || 'No reason provided'}</div>
        </div>
        
        {meta.claimedByTag && (
          <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Claimed By</div>
            <div className="text-white font-bold text-sm truncate">{meta.claimedByTag}</div>
          </div>
        )}
        {meta.openReason && meta.openReason !== 'No initial query provided' && (
          <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4 sm:col-span-2 lg:col-span-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Initial Query</div>
            <div className="text-white font-medium text-sm whitespace-pre-wrap">{meta.openReason}</div>
          </div>
        )}
        {meta.staffRequestReason && (
          <div className="bg-gsrp-dark-card/60 border border-gsrp-dark-border/50 rounded-2xl p-4 sm:col-span-2 lg:col-span-4">
            <div className="text-[9px] font-black uppercase tracking-widest text-gsrp-teal-light/40 mb-1">Staff Resolution Summary</div>
            <div className="text-white font-medium text-sm whitespace-pre-wrap">{meta.staffRequestReason}</div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="card-glass rounded-[1.5rem] shadow-2xl shadow-black/40 overflow-hidden animate-fade-in-up">
          {(fullHtml || htmlContent) ? (
            <iframe
              srcDoc={fullHtml || formatFallbackHtml(htmlContent)}
              sandbox="allow-scripts"
              style={{ width: '100%', minHeight: '600px', border: 'none', display: 'block' }}
              onLoad={(e) => {
                try {
                  const doc = e.target.contentDocument;
                  if (doc) e.target.style.height = doc.documentElement.scrollHeight + 'px';
                } catch {}
              }}
            />
          ) : (
            <div className="flex items-center justify-center py-16">
              <div className="bg-gsrp-dark/80 backdrop-blur-sm rounded-2xl px-6 py-4 border border-gsrp-dark-border/50">
                <span className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-wider">No messages to display</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <AccessModal transcriptId={id} isOpen={accessOpen} onClose={() => setAccessOpen(false)} />

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-gsrp-dark-card border border-gsrp-dark-border/60 rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gsrp-sunset/10 border border-gsrp-sunset/20 flex items-center justify-center">
                <Trash2 size={16} className="text-gsrp-sunset" />
              </div>
              <div>
                <h3 className="text-white font-black text-sm">Delete Transcript</h3>
                <p className="text-gsrp-teal-light/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gsrp-dark-surface/60 border border-gsrp-dark-border/50 text-gsrp-teal-light/70 text-[10px] font-bold uppercase tracking-wider hover:bg-gsrp-dark-surface transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gsrp-sunset to-red-700 text-white text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {deleting ? <><RefreshCw size={10} className="animate-spin" /> Deleting</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(context) {
  const { getServerSession } = require("next-auth");
  const { authOptions } = require("../../lib/auth-options");
  const session = await getServerSession(context.req, context.res, authOptions);
  const { id } = context.params;

  if (!session) return { props: { error: true, isAdmin: false } };

  const currentUserId = String(session.user?.id || "").trim();
  const { isFullAdmin } = require('../../lib/admin-helper');
  const isAdmin = await isFullAdmin(currentUserId, session.user?.roles || []);
  const userRoles = session.user?.roles || [];

  const pool = (await import('../../lib/ticketdb')).default;

  try {
    const [rows] = await pool.query(
      `SELECT id, html_content, type, owner_id, channel_name, closed_at, close_reason,
              opener_tag, open_reason, claimed_by, claimed_by_tag, staff_request_reason
       FROM transcripts WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) return { props: { error: true, isAdmin } };

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
      date: t.closed_at ? (() => { const d = new Date(t.closed_at); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })() : '',
      reason: t.close_reason || '',
      openerTag: t.opener_tag || 'Unknown User',
      openReason: t.open_reason || null,
      claimedByTag: t.claimed_by_tag || null,
      staffRequestReason: t.staff_request_reason || null,
      closedAt: t.closed_at ? new Date(t.closed_at).toLocaleString() : '',
    };

    const canManage = isAdmin || isOwner;

    // Always re-render from transcript_messages via the worker (hydrated, no external scripts).
    // Fall back to stored html_content only if no message rows exist.
    try {
      const [msgRows] = await pool.query(
        'SELECT message_data, author_id, created_timestamp FROM transcript_messages WHERE transcript_id = ? ORDER BY sort_order ASC',
        [id]
      );

      if (msgRows.length > 0) {
        const { generateTranscriptHTML } = require('../../lib/transcript-renderer');
        const messages = msgRows.map(r => JSON.parse(r.message_data));
        const { fullHtml } = await generateTranscriptHTML({
          messages,
          channelName: t.channel_name,
          guildName: 'GSRP',
        });
        return { props: { fullHtml, id, meta, canManage, isAdmin } };
      }
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') {
        console.error('[Viewer] transcript_messages render error:', e.message);
      }
    }

    // Fall back to bot-generated html_content for tickets with no message rows
    if (t.html_content) {
      return { props: { fullHtml: t.html_content, id, meta, canManage, isAdmin } };
    }

    // Nothing available
    return { props: { error: true, isAdmin } };
  } catch (e) {
    console.error("[Viewer] DB Fetch Error:", e.message);
    return { props: { error: true, isAdmin } };
  }
}
