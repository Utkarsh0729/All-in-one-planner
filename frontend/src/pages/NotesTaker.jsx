import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Lock, Unlock, Plus, Trash2, Link as LinkIcon, CheckSquare, Eye, X } from 'lucide-react';

const NotesTaker = () => {
  const { token, API_URL } = useAuth();
  
  const [notes, setNotes] = useState([]);
  const [unlockedNotes, setUnlockedNotes] = useState({}); // Stores decrypted versions of notes by ID: { noteId: noteData }
  
  // Note Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [checklistText, setChecklistText] = useState(''); // comma-separated
  const [linksText, setLinksText] = useState('');         // comma-separated
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');

  // Unlock password prompt Modal state
  const [activePromptNoteId, setActivePromptNoteId] = useState(null);
  const [unlockPassword, setUnlockPassword] = useState('');
  
  // Detail Modal view state
  const [viewingNote, setViewingNote] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promptError, setPromptError] = useState('');

  const fetchNotes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/notes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      setError('Failed to fetch notes drawer.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!title) return;

    setError('');
    const checklist = checklistText
      ? checklistText.split(',').map(t => ({ text: t.trim(), checked: false })).filter(t => t.text)
      : [];
    const links = linksText
      ? linksText.split(',').map(l => l.trim()).filter(l => l)
      : [];

    try {
      const res = await fetch(`${API_URL}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          checklist,
          links,
          isProtected,
          password
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setNotes(prev => [data, ...prev]);
      
      // Reset form
      setTitle('');
      setContent('');
      setChecklistText('');
      setLinksText('');
      setIsProtected(false);
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOpenNote = (note) => {
    if (note.isProtected && !unlockedNotes[note._id]) {
      // Prompt password unlock
      setActivePromptNoteId(note._id);
      setUnlockPassword('');
      setPromptError('');
    } else {
      // Display regular note details
      setViewingNote(unlockedNotes[note._id] || note);
    }
  };

  const handleUnlockNoteSubmit = async (e) => {
    e.preventDefault();
    setPromptError('');

    try {
      const res = await fetch(`${API_URL}/notes/${activePromptNoteId}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: unlockPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Save unlocked details to page state
      setUnlockedNotes(prev => ({ ...prev, [activePromptNoteId]: data }));
      setActivePromptNoteId(null);
      setViewingNote(data); // Immediately view
    } catch (err) {
      setPromptError(err.message || 'Incorrect password');
    }
  };

  const handleDeleteNote = async (e, noteId) => {
    e.stopPropagation(); // Stop opening modal

    try {
      const res = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();

      setNotes(prev => prev.filter(n => n._id !== noteId));
      if (viewingNote && viewingNote._id === noteId) {
        setViewingNote(null);
      }
    } catch (err) {
      setError('Failed to delete note.');
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes Drawer</h1>
          <p className="page-subtitle">Save passwords, checklist bullet notes, and links in encrypted blocks</p>
        </div>
      </div>

      {error && <div className="text-red" style={{ marginBottom: '15px' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
        {/* Left Column: Notes Box List */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} style={{ color: '#ec4899' }} /> Safe Drawer
            </h3>

            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading notes...</p>
            ) : notes.length > 0 ? (
              <div className="notes-grid">
                {notes.map((note) => {
                  const isUnlocked = !!unlockedNotes[note._id];
                  const displayedNote = unlockedNotes[note._id] || note;
                  
                  return (
                    <div 
                      key={note._id} 
                      className={`note-box ${note.isProtected && !isUnlocked ? 'protected' : ''}`}
                      onClick={() => handleOpenNote(note)}
                    >
                      <div>
                        <div className="flex-between">
                          <h4 className="note-title">{note.title}</h4>
                          {note.isProtected && (
                            isUnlocked ? (
                              <Unlock size={14} className="text-emerald" />
                            ) : (
                              <Lock size={14} className="text-red" />
                            )
                          )}
                        </div>
                        <p className="note-content-preview">
                          {displayedNote.content}
                        </p>
                      </div>
                      
                      <div className="note-footer">
                        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        <button 
                          className="btn-danger"
                          onClick={(e) => handleDeleteNote(e, note._id)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                No notes found. Create a new note block to start!
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Note Creator Form */}
        <div>
          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Create Note</h3>
            <form onSubmit={handleCreateNote}>
              <div className="form-group">
                <label className="form-label">Note Title</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Server Credentials"
                  className="input-field" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Note Body</label>
                <textarea 
                  placeholder="Type notes content..."
                  className="input-field" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Checklist Bullet Points (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Task A, Task B, Task C"
                  className="input-field" 
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Related Links (comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. google.com, vertex.ai"
                  className="input-field" 
                  value={linksText}
                  onChange={(e) => setLinksText(e.target.value)}
                />
              </div>

              {/* Encryption options */}
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="protect"
                  checked={isProtected}
                  onChange={(e) => setIsProtected(e.target.checked)}
                />
                <label htmlFor="protect" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Password Lock this note
                </label>
              </div>

              {isProtected && (
                <div className="form-group">
                  <label className="form-label text-red">Define Note Password</label>
                  <input 
                    type="password" 
                    required 
                    placeholder="Enter lock password"
                    className="input-field" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                <Plus size={16} /> Save Note Block
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Note Password Prompt Modal */}
      {activePromptNoteId && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '400px' }}>
            <button type="button" className="modal-close-btn" onClick={() => setActivePromptNoteId(null)} aria-label="Close modal">
              <X size={20} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <Lock size={20} className="text-red" /> Unlock Note Block
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '20px' }}>
              Enter password to verify authentication and decrypt content.
            </p>

            {promptError && <div className="text-red" style={{ marginBottom: '12px', fontSize: '13px' }}>{promptError}</div>}

            <form onSubmit={handleUnlockNoteSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <input 
                  type="password" 
                  required 
                  autoFocus
                  placeholder="Enter notes password"
                  className="input-field" 
                  value={unlockPassword}
                  onChange={(e) => setUnlockPassword(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Unlock
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setActivePromptNoteId(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Note Detail Viewer Modal */}
      {viewingNote && (
        <div className="modal-overlay">
          <div className="modal-content card" style={{ maxWidth: '600px' }}>
            <button type="button" className="modal-close-btn" onClick={() => setViewingNote(null)} aria-label="Close modal">
              <X size={20} />
            </button>
            <div className="flex-between" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px' }}>{viewingNote.title}</h3>
              {viewingNote.isProtected && <Lock size={16} className="text-red" />}
            </div>
            
            <p style={{ whiteSpace: 'pre-wrap', fontSize: '14.5px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '20px' }}>
              {viewingNote.content}
            </p>

            {/* Checklist */}
            {viewingNote.checklist && viewingNote.checklist.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={14} /> Checklist
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewingNote.checklist.map((c, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px' }}>
                      <input type="checkbox" checked={c.checked} readOnly style={{ pointerEvents: 'none' }} />
                      <span style={{ textDecoration: c.checked ? 'line-through' : 'none', color: c.checked ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                        {c.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {viewingNote.links && viewingNote.links.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LinkIcon size={14} /> Links
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {viewingNote.links.map((link, idx) => (
                    <a 
                      key={idx} 
                      href={link.startsWith('http') ? link : `https://${link}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--accent-cyan)', textDecoration: 'none', fontSize: '13.5px' }}
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button 
              className="btn btn-secondary" 
              style={{ width: '100%' }}
              onClick={() => setViewingNote(null)}
            >
              Close Viewer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesTaker;
