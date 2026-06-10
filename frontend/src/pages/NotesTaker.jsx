import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, Pin, Star, Lock, Trash2, Tag, Calendar, 
  ShieldAlert, FileText
} from 'lucide-react';

const NotesTaker = () => {
  const { token, API_URL } = useAuth();
  const navigate = useNavigate();
  
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search, Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'oldest' | 'titleAsc' | 'titleDesc'
  
  // Quick Filter Toggles
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterProtected, setFilterProtected] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchNotes = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch notes');
        if (active) {
          setNotes(data);
        }
      } catch (err) {
        console.error('Fetch notes error:', err);
        if (active) {
          setError('Failed to fetch notes list.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const run = async () => {
      await Promise.resolve();
      if (active) {
        fetchNotes();
      }
    };
    run();

    return () => {
      active = false;
    };
  }, [API_URL, token]);

  // Card Quick Actions
  const handleTogglePin = async (e, note) => {
    e.stopPropagation(); // Prevent navigating to edit page
    try {
      const res = await fetch(`${API_URL}/notes/${note._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isPinned: !note.isPinned })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n._id === note._id ? { ...n, isPinned: data.isPinned } : n));
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  const handleToggleFavorite = async (e, note) => {
    e.stopPropagation(); // Prevent navigating to edit page
    try {
      const res = await fetch(`${API_URL}/notes/${note._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isFavorite: !note.isFavorite })
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotes(prev => prev.map(n => n._id === note._id ? { ...n, isFavorite: data.isFavorite } : n));
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteNote = async (e, noteId) => {
    e.stopPropagation(); // Prevent navigating to edit page
    if (!window.confirm('Delete this note block permanently?')) return;

    try {
      const res = await fetch(`${API_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error();
      setNotes(prev => prev.filter(n => n._id !== noteId));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete note.');
    }
  };

  // Convert HTML content from Tiptap to a plain text preview
  const getPreviewText = (contentHTML) => {
    if (!contentHTML) return '';
    if (contentHTML.includes('🔒 Protected Content.')) {
      return 'Encrypted content block. Click to verify credentials.';
    }
    try {
      const doc = new DOMParser().parseFromString(contentHTML, 'text/html');
      const text = doc.body.textContent || '';
      return text.length > 180 ? text.substring(0, 180) + '...' : text;
    } catch (err) {
      console.error('HTML parsing error, using fallback:', err);
      const stripped = contentHTML.replace(/<[^>]*>/g, ' ');
      return stripped.length > 180 ? stripped.substring(0, 180) + '...' : stripped;
    }
  };

  // Collect all unique tags
  const allTags = Array.from(
    new Set(notes.flatMap(note => note.tags || []))
  ).filter(Boolean);

  // Apply filtering and sorting
  const processedNotes = notes.filter(note => {
    // 1. Search filter (title, stripped content, or tags)
    const matchesSearch = 
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getPreviewText(note.content).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (note.tags && note.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

    // 2. Tag filter
    const matchesTag = selectedTag === 'all' || (note.tags && note.tags.includes(selectedTag));

    // 3. Quick toggle filters
    const matchesPinned = !filterPinned || note.isPinned;
    const matchesFavorites = !filterFavorites || note.isFavorite;
    const matchesProtected = !filterProtected || note.isProtected;

    return matchesSearch && matchesTag && matchesPinned && matchesFavorites && matchesProtected;
  }).sort((a, b) => {
    // Sort logic
    if (sortBy === 'latest') {
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    } else if (sortBy === 'oldest') {
      return new Date(a.updatedAt) - new Date(b.updatedAt);
    } else if (sortBy === 'titleAsc') {
      return a.title.localeCompare(b.title);
    } else if (sortBy === 'titleDesc') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  });

  // Split Pinned and Others for Keep-like dashboard organization (if no specific filtering is active)
  const isSplitLayout = !filterPinned && processedNotes.some(n => n.isPinned);
  const pinnedNotes = processedNotes.filter(n => n.isPinned);
  const otherNotes = processedNotes.filter(n => !n.isPinned);

  const renderNoteCard = (note) => {
    return (
      <div 
        key={note._id}
        className={`note-card card-hover-glow hover-scale ${note.isPinned ? 'pinned-card' : ''} ${note.isProtected ? 'protected-card' : ''}`}
        onClick={() => navigate(`/notes/edit/${note._id}`)}
      >
        <div>
          {/* Card Header */}
          <div className="note-card-header">
            <h4 className="note-card-title">{note.title}</h4>
            <div className="note-card-actions">
              {/* Pin Action */}
              <button 
                className={`note-card-action-btn hover-scale active-press ${note.isPinned ? 'active-pin' : ''}`}
                onClick={(e) => handleTogglePin(e, note)}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin size={15} style={{ fill: note.isPinned ? 'currentColor' : 'none' }} />
              </button>
              
              {/* Favorite Action */}
              <button 
                className={`note-card-action-btn hover-scale active-press ${note.isFavorite ? 'active-favorite' : ''}`}
                onClick={(e) => handleToggleFavorite(e, note)}
                title={note.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star size={15} style={{ fill: note.isFavorite ? 'currentColor' : 'none' }} />
              </button>

              {/* Delete Action */}
              <button 
                className="note-card-action-btn delete-btn hover-scale active-press"
                onClick={(e) => handleDeleteNote(e, note._id)}
                title="Delete note"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          {/* Preview Text */}
          <p className="note-card-preview">
            {getPreviewText(note.content)}
          </p>
        </div>

        {/* Card Footer */}
        <div>
          {/* Tags if any */}
          {note.tags && note.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
              {note.tags.map((tag, tIdx) => (
                <span 
                  key={tIdx} 
                  style={{ 
                    backgroundColor: 'rgba(99, 102, 241, 0.08)', 
                    color: 'var(--primary)', 
                    fontSize: '11px', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Tag size={8} /> {tag}
                </span>
              ))}
            </div>
          )}

          <div className="note-card-footer">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} />
              {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>

            <div className="note-card-badges">
              {note.isPinned && <span className="note-badge badge-pinned">Pinned</span>}
              {note.isFavorite && <span className="note-badge badge-favorite">Favorite</span>}
              {note.isProtected && <span className="note-badge badge-protected">Locked</span>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="main-content page-fade-in">
      {/* Dashboard Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Notes System</h1>
          <p className="page-subtitle">A Google Keep & Notion inspired personal operating workspace</p>
        </div>
      </div>

      {error && <div className="text-red" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}><ShieldAlert size={16} /> {error}</div>}

      {/* Modern Filter & Tool Belt */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        gap: '16px', 
        marginBottom: '32px',
        backgroundColor: 'rgba(24, 24, 35, 0.3)',
        padding: '16px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Left Side: Search & Toggles */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', flex: 1, minWidth: '320px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search title, content, or tags..." 
              className="input-field" 
              style={{ paddingLeft: '36px', fontSize: '14px' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick Filter Pill Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={() => setFilterPinned(!filterPinned)}
              className="btn hover-scale active-press"
              style={{ 
                padding: '8px 14px', 
                fontSize: '13px', 
                backgroundColor: filterPinned ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterPinned ? 'var(--primary)' : 'rgba(255,255,255,0.08)'}`,
                color: filterPinned ? 'var(--primary)' : 'var(--text-secondary)'
              }}
            >
              <Pin size={13} style={{ marginRight: '4px', fill: filterPinned ? 'currentColor' : 'none' }} /> Pinned
            </button>

            <button 
              onClick={() => setFilterFavorites(!filterFavorites)}
              className="btn hover-scale active-press"
              style={{ 
                padding: '8px 14px', 
                fontSize: '13px', 
                backgroundColor: filterFavorites ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterFavorites ? 'var(--accent-orange)' : 'rgba(255,255,255,0.08)'}`,
                color: filterFavorites ? 'var(--accent-orange)' : 'var(--text-secondary)'
              }}
            >
              <Star size={13} style={{ marginRight: '4px', fill: filterFavorites ? 'currentColor' : 'none' }} /> Favorites
            </button>

            <button 
              onClick={() => setFilterProtected(!filterProtected)}
              className="btn hover-scale active-press"
              style={{ 
                padding: '8px 14px', 
                fontSize: '13px', 
                backgroundColor: filterProtected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${filterProtected ? 'var(--accent-red)' : 'rgba(255,255,255,0.08)'}`,
                color: filterProtected ? 'var(--accent-red)' : 'var(--text-secondary)'
              }}
            >
              <Lock size={13} style={{ marginRight: '4px' }} /> Protected
            </button>
          </div>
        </div>

        {/* Right Side: Tag & Sorting Selectors */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {/* Tag filter selector */}
          <select 
            className="input-field" 
            style={{ fontSize: '13.5px', padding: '10px 16px', width: 'auto', minWidth: '130px' }}
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
          >
            <option value="all">🏷️ All Tags</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>#{tag}</option>
            ))}
          </select>

          {/* Sort selector */}
          <select 
            className="input-field" 
            style={{ fontSize: '13.5px', padding: '10px 16px', width: 'auto', minWidth: '140px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="latest">🕒 Latest Updated</option>
            <option value="oldest">🕒 Oldest Modified</option>
            <option value="titleAsc">🔤 Title A-Z</option>
            <option value="titleDesc">🔤 Title Z-A</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="card skeleton" style={{ height: n % 2 === 0 ? '190px' : '240px', border: 'none' }} />
          ))}
        </div>
      ) : processedNotes.length > 0 ? (
        <div className="notes-masonry-container">
          {isSplitLayout ? (
            /* Split layout: Pinned vs Other notes */
            <>
              {pinnedNotes.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                  <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Pin size={13} style={{ transform: 'rotate(45deg)' }} /> Pinned Notes
                  </h3>
                  <div className="notes-masonry">
                    {pinnedNotes.map(note => (
                      <div key={note._id} className="notes-masonry-item">
                        {renderNoteCard(note)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otherNotes.length > 0 && (
                <div>
                  {pinnedNotes.length > 0 && (
                    <h3 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px', marginTop: '24px' }}>
                      Others
                    </h3>
                  )}
                  <div className="notes-masonry">
                    {otherNotes.map(note => (
                      <div key={note._id} className="notes-masonry-item">
                        {renderNoteCard(note)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Single list layout when filters are active or no notes are pinned */
            <div className="notes-masonry">
              {processedNotes.map(note => (
                <div key={note._id} className="notes-masonry-item">
                  {renderNoteCard(note)}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* descriptive Empty State */
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          border: '1px dashed rgba(255,255,255,0.08)', 
          borderRadius: 'var(--radius-lg)', 
          background: 'rgba(255,255,255,0.005)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
            <FileText size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>No Notes Yet</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14.5px', maxWidth: '400px', margin: '0 auto', lineHeight: '1.4' }}>
              Capture your ideas. Create your first note.
            </p>
          </div>
          <button 
            className="btn btn-primary hover-scale active-press"
            onClick={() => navigate('/notes/new')}
            style={{ padding: '8px 20px', fontSize: '13.5px', marginTop: '4px' }}
          >
            <Plus size={16} /> Create Note
          </button>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        className="floating-action-btn hover-scale active-press"
        onClick={() => navigate('/notes/new')}
        title="Create new note"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default NotesTaker;
