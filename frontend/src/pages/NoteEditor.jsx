import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import LinkExtension from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { 
  ArrowLeft, Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, 
  Unlink, Code, Terminal, Quote, Undo, Redo, Save, Trash2, 
  Lock, Unlock, Eye, EyeOff, Tag, ShieldAlert, CheckCircle2, AlertCircle
} from 'lucide-react';

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, API_URL } = useAuth();

  const isNew = !id;

  // Note Core State
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  
  // Lock state for protected notes
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [hintMessage, setHintMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState(''); // Stores unlocked password to save edits

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Saved'); // 'Saved' | 'Saving...' | 'Unsaved changes' | 'Error'
  const [error, setError] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [passwordConfigError, setPasswordConfigError] = useState('');

  // Refs for tracking changes
  const isDirtyRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  
  // Track inputs to avoid closure issues in autosave
  const noteDataRef = useRef({ title: '', tags: [], isProtected: false, password: '', passwordHint: '', currentPassword: '' });

  // Update noteDataRef whenever state changes
  useEffect(() => {
    noteDataRef.current = {
      title,
      tags,
      isProtected,
      password,
      passwordHint,
      currentPassword
    };
  }, [title, tags, isProtected, password, passwordHint, currentPassword]);

  // Set up Tiptap Editor
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'editor-link',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content: '',
    onUpdate: () => {
      markAsDirty();
    },
  });

  const markAsDirty = () => {
    isDirtyRef.current = true;
    setSaveStatus('Unsaved changes');
    triggerAutosave();
  };

  // Fetch Note (Edit Mode)
  useEffect(() => {
    if (isNew || !id) {
      if (editor && editor.getHTML() !== '<p></p>') {
        editor.commands.setContent('');
      }
      return;
    }

    const fetchNoteDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_URL}/notes`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const notes = await res.json();
        const note = notes.find(n => n._id === id);
        
        if (!note) {
          setError('Note not found.');
          setLoading(false);
          return;
        }

        setTitle(note.title);
        setTags(note.tags || []);
        setIsProtected(note.isProtected);
        setPasswordHint(note.passwordHint || '');

        if (note.isProtected) {
          setIsLocked(true);
          setHintMessage(note.passwordHint || '');
        } else {
          setIsLocked(false);
          
          // Backward compatibility: convert V1 notes structure to Tiptap HTML
          let initialHTML = note.content || '';
          
          if (note.checklist && note.checklist.length > 0) {
            let checklistHTML = '<ul data-type="taskList">';
            note.checklist.forEach(item => {
              checklistHTML += `<li data-checked="${item.checked}"><label><input type="checkbox" ${item.checked ? 'checked' : ''}></label><div><p>${item.text}</p></div></li>`;
            });
            checklistHTML += '</ul>';
            initialHTML += '<br>' + checklistHTML;
          }

          if (note.links && note.links.length > 0) {
            let linksHTML = '<p>';
            note.links.forEach(link => {
              const url = link.startsWith('http') ? link : `https://${link}`;
              linksHTML += `<a href="${url}">${link}</a><br>`;
            });
            linksHTML += '</p>';
            initialHTML += '<br>' + linksHTML;
          }

          if (editor) {
            editor.commands.setContent(initialHTML);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to fetch note detail.');
      } finally {
        setLoading(false);
      }
    };

    if (editor) {
      fetchNoteDetail();
    }
  }, [id, editor, isNew, token, API_URL]);

  // Prompt user on tab close/refresh if unsaved
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Save Note API Call
  const handleSave = async () => {
    // Prevent empty title saves
    const currentTitle = noteDataRef.current.title.trim();
    if (!currentTitle) {
      return;
    }

    if (saving) return;

    setSaving(true);
    setSaveStatus('Saving...');
    
    const currentContent = editor ? editor.getHTML() : '';
    const { tags: currentTags, isProtected: currentProtect, password: currentPass, passwordHint: currentHint, currentPassword: currPwd } = noteDataRef.current;

    const bodyPayload = {
      title: currentTitle,
      content: currentContent,
      tags: currentTags,
      isProtected: currentProtect,
      checklist: [], // Clear old structure to migrate to html
      links: []      // Clear old structure to migrate to html
    };

    // If making protected for the first time or updating password
    if (currentProtect && currentPass) {
      bodyPayload.password = currentPass;
    }
    
    if (currentHint) {
      bodyPayload.passwordHint = currentHint;
    }

    // Pass password verification if modifying existing protected note
    if (!isNew && isProtected) {
      bodyPayload.currentPassword = currPwd;
    }

    // If unprotecting a protected note
    if (!isNew && !currentProtect && isProtected) {
      bodyPayload.isProtected = false;
      bodyPayload.currentPassword = currPwd;
    }

    try {
      const url = isNew ? `${API_URL}/notes` : `${API_URL}/notes/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save note');

      isDirtyRef.current = false;
      setSaveStatus('Saved');
      
      // If we saved a brand new password, store it as currentPassword and clear password fields
      if (currentProtect && currentPass) {
        setCurrentPassword(currentPass);
        setPassword('');
        setConfirmPassword('');
      }

      // If note was successfully created, redirect to edit path
      if (isNew && data._id) {
        navigate(`/notes/edit/${data._id}`, { replace: true });
      }
    } catch (err) {
      console.error('Save error:', err);
      setSaveStatus('Error');
      setError(err.message || 'Error occurred while saving note.');
    } finally {
      setSaving(false);
    }
  };

  // Trigger Debounced Autosave
  const triggerAutosave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (isDirtyRef.current) {
        handleSave();
      }
    }, 1500);
  };

  // Save changes immediately on navigation trigger
  const handleBack = async () => {
    if (isDirtyRef.current) {
      await handleSave();
    }
    navigate('/notes');
  };

  // Handle Protected Note Unlock
  const handleUnlock = async (e) => {
    e.preventDefault();
    setUnlockError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/notes/${id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password: unlockPassword })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unlock failed');

      setCurrentPassword(unlockPassword);
      setIsLocked(false);
      
      // Load decrypted content to editor
      let initialHTML = data.content || '';
      
      // Convert V1 structures if any
      if (data.checklist && data.checklist.length > 0) {
        let checklistHTML = '<ul data-type="taskList">';
        data.checklist.forEach(item => {
          checklistHTML += `<li data-checked="${item.checked}"><label><input type="checkbox" ${item.checked ? 'checked' : ''}></label><div><p>${item.text}</p></div></li>`;
        });
        checklistHTML += '</ul>';
        initialHTML += '<br>' + checklistHTML;
      }

      if (data.links && data.links.length > 0) {
        let linksHTML = '<p>';
        data.links.forEach(link => {
          const url = link.startsWith('http') ? link : `https://${link}`;
          linksHTML += `<a href="${url}">${link}</a><br>`;
        });
        linksHTML += '</p>';
        initialHTML += '<br>' + linksHTML;
      }

      if (editor) {
        editor.commands.setContent(initialHTML);
      }
    } catch (err) {
      setUnlockError(err.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  // Delete note
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this note? This cannot be undone.')) {
      try {
        const res = await fetch(`${API_URL}/notes/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error();
        isDirtyRef.current = false;
        navigate('/notes');
      } catch (err) {
        console.error('Delete error:', err);
        setError('Failed to delete note.');
      }
    }
  };

  // Tag Manager
  const addTag = (e) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      const updated = [...tags, tag];
      setTags(updated);
      setNewTag('');
      markAsDirty();
    }
  };

  const removeTag = (tagToRemove) => {
    const updated = tags.filter(t => t !== tagToRemove);
    setTags(updated);
    markAsDirty();
  };

  // Password Protection configuration
  const handleToggleProtect = (e) => {
    const checked = e.target.checked;
    
    if (!checked) {
      // Unprotect
      if (isNew) {
        setIsProtected(false);
        setPassword('');
        setConfirmPassword('');
        setPasswordHint('');
      } else {
        // Needs current password verification to unprotect
        setIsProtected(false);
        markAsDirty();
      }
    } else {
      setIsProtected(true);
      if (isNew) {
        setPassword('');
        setConfirmPassword('');
      }
    }
    markAsDirty();
  };

  const savePasswordConfig = (e) => {
    e.preventDefault();
    setPasswordConfigError('');

    if (isProtected) {
      if (!password) {
        setPasswordConfigError('Password cannot be empty');
        return;
      }
      if (password !== confirmPassword) {
        setPasswordConfigError('Passwords do not match');
        return;
      }
    }

    markAsDirty();
    // Trigger direct save to store password configuration
    handleSave();
    alert('Password configuration updated! Saving changes...');
  };

  // Tiptap toolbar actions
  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL:', previousUrl);
    
    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Note System...</p>
      </div>
    );
  }

  // Lock pad lock screen rendering
  if (isLocked) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Lock size={28} className="text-red" />
          </div>
          <h2 style={{ fontSize: '22px', marginBottom: '8px' }}>Password Protected Note</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            This block is encrypted. Enter password to decrypt.
          </p>

          {hintMessage && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: '20px', fontSize: '13.5px', color: 'var(--accent-orange)' }}>
              Hint: {hintMessage}
            </div>
          )}

          {unlockError && <div className="text-red" style={{ fontSize: '13.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', justify: 'center', gap: '6px' }}><AlertCircle size={14} />{unlockError}</div>}

          <form onSubmit={handleUnlock}>
            <div className="form-group" style={{ position: 'relative', marginBottom: '24px' }}>
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="Enter password"
                className="input-field"
                required
                autoFocus
                style={{ paddingRight: '40px' }}
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                Unlock
              </button>
              <button type="button" onClick={() => navigate('/notes')} className="btn btn-secondary" style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      {/* Editor Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <button 
          onClick={handleBack}
          className="btn btn-secondary"
          style={{ padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back to Notes
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Autosave Status Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            {saveStatus === 'Saving...' && (
              <>
                <span className="saving-spinner" style={{ width: '12px', height: '12px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>Saving draft...</span>
              </>
            )}
            {saveStatus === 'Saved' && (
              <>
                <CheckCircle2 size={14} className="text-emerald" />
                <span className="text-emerald">All changes saved</span>
              </>
            )}
            {saveStatus === 'Unsaved changes' && (
              <>
                <AlertCircle size={14} className="text-orange" />
                <span className="text-orange">Unsaved changes</span>
              </>
            )}
            {saveStatus === 'Error' && (
              <>
                <ShieldAlert size={14} className="text-red" />
                <span className="text-red">Error saving</span>
              </>
            )}
          </div>

          <button 
            onClick={() => handleSave(true)}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            <Save size={16} /> Save Now
          </button>

          {!isNew && (
            <button 
              onClick={handleDelete}
              className="btn btn-danger"
              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Delete Note"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertCircle size={14} />{error}</div>}

      <div className="editor-layout">
        {/* Left Column: Tiptap Editor & Title */}
        <div>
          {/* Tiptap Toolbar */}
          {editor && (
            <div className="editor-toolbar">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`toolbar-btn ${editor.isActive('bold') ? 'is-active' : ''}`}
                title="Bold"
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`toolbar-btn ${editor.isActive('italic') ? 'is-active' : ''}`}
                title="Italic"
              >
                <Italic size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`toolbar-btn ${editor.isActive('underline') ? 'is-active' : ''}`}
                title="Underline"
              >
                <UnderlineIcon size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`toolbar-btn ${editor.isActive('strike') ? 'is-active' : ''}`}
                title="Strikethrough"
              >
                <Strikethrough size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={`toolbar-btn ${editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}`}
                title="H1"
              >
                <Heading1 size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`toolbar-btn ${editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
                title="H2"
              >
                <Heading2 size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`toolbar-btn ${editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
                title="H3"
              >
                <Heading3 size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`toolbar-btn ${editor.isActive('bulletList') ? 'is-active' : ''}`}
                title="Bullet List"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`toolbar-btn ${editor.isActive('orderedList') ? 'is-active' : ''}`}
                title="Ordered List"
              >
                <ListOrdered size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={`toolbar-btn ${editor.isActive('taskList') ? 'is-active' : ''}`}
                title="Checklist"
              >
                <CheckSquare size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={`toolbar-btn ${editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}`}
                title="Align Left"
              >
                <AlignLeft size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={`toolbar-btn ${editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}`}
                title="Align Center"
              >
                <AlignCenter size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={`toolbar-btn ${editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}`}
                title="Align Right"
              >
                <AlignRight size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={`toolbar-btn ${editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}`}
                title="Align Justify"
              >
                <AlignJustify size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                onClick={addLink}
                className={`toolbar-btn ${editor.isActive('link') ? 'is-active' : ''}`}
                title="Insert Link"
              >
                <LinkIcon size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().unsetLink().run()}
                disabled={!editor.isActive('link')}
                className="toolbar-btn"
                title="Remove Link"
              >
                <Unlink size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`toolbar-btn ${editor.isActive('code') ? 'is-active' : ''}`}
                title="Inline Code"
              >
                <Code size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`toolbar-btn ${editor.isActive('codeBlock') ? 'is-active' : ''}`}
                title="Code Block"
              >
                <Terminal size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`toolbar-btn ${editor.isActive('blockquote') ? 'is-active' : ''}`}
                title="Quote"
              >
                <Quote size={16} />
              </button>

              <div className="toolbar-divider" />

              <button
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                className="toolbar-btn"
                title="Undo"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                className="toolbar-btn"
                title="Redo"
              >
                <Redo size={16} />
              </button>
            </div>
          )}

          {/* Editor Paper */}
          <div className="editor-paper">
            <input 
              type="text" 
              placeholder="Title your note block..."
              className="editor-title-input"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markAsDirty();
              }}
            />
            
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* Right Column: Settings & Lock Sidebar Panel */}
        <div className="sidebar-panel">
          {/* Tags Section */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Tag size={16} style={{ color: 'var(--accent-purple)' }} /> Tags
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {tags.map(tag => (
                <span 
                  key={tag} 
                  style={{ 
                    backgroundColor: 'rgba(168, 85, 247, 0.15)', 
                    color: 'var(--accent-purple)', 
                    fontSize: '12px', 
                    padding: '3px 8px', 
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: '500'
                  }}
                >
                  #{tag}
                  <button 
                    onClick={() => removeTag(tag)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '1px' }}
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No tags added</span>}
            </div>

            <form onSubmit={addTag} style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                placeholder="New tag..." 
                className="input-field"
                style={{ padding: '8px 12px', fontSize: '13.5px' }}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 12px' }}>
                Add
              </button>
            </form>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.04)' }} />

          {/* Encryption & Lock Section */}
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={16} className="text-red" /> Encryption Lock
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="checkbox" 
                id="protect-checkbox"
                checked={isProtected}
                onChange={handleToggleProtect}
                style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-red)' }}
              />
              <label htmlFor="protect-checkbox" style={{ fontSize: '14px', cursor: 'pointer', userSelect: 'none' }}>
                Password Lock this note
              </label>
            </div>

            {isProtected && (
              <form onSubmit={savePasswordConfig} style={{ background: 'rgba(239, 68, 68, 0.02)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  {isNew ? 'Set an encryption password for this note block.' : 'Update the encryption password or configure settings.'}
                </p>

                {passwordConfigError && <div className="text-red" style={{ fontSize: '12.5px' }}>{passwordConfigError}</div>}

                <div>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="Min 4 characters"
                      className="input-field"
                      style={{ padding: '8px 12px', fontSize: '13.5px', paddingRight: '40px' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Confirm Password</label>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Repeat password"
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '13.5px' }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Password Hint (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. My favorite food"
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '13.5px' }}
                    value={passwordHint}
                    onChange={(e) => setPasswordHint(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-danger" style={{ fontSize: '13px', padding: '8px 12px', marginTop: '4px' }}>
                  Update Password
                </button>
              </form>
            )}

            {!isNew && isProtected && !password && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)', fontSize: '13px', background: 'rgba(16, 185, 129, 0.05)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <Unlock size={14} /> Note is unlocked for session
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .saving-spinner {
          display: inline-block;
        }
        .editor-link {
          color: var(--primary);
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default NoteEditor;
