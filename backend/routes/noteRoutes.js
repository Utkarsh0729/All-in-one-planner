import express from 'express';
import bcrypt from 'bcryptjs';
import { protect } from '../middleware/auth.js';
import Note from '../models/Note.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = express.Router();

// Helper to mask protected note content and checklists/links
const maskNotes = (notes) => {
  return notes.map(note => {
    if (note.isProtected) {
      return {
        _id: note._id,
        user: note.user,
        title: note.title,
        content: '🔒 Protected Content. Please enter password to unlock.',
        checklist: [],
        links: [],
        tags: note.tags || [],
        isProtected: true,
        passwordHint: note.passwordHint || '',
        isPinned: note.isPinned || false,
        isFavorite: note.isFavorite || false,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      };
    }
    return note;
  });
};

// @desc    Get all notes for a user (masked if protected)
// @route   GET /api/notes
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id }).sort({ updatedAt: -1 });
    res.json(maskNotes(notes));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a new note
// @route   POST /api/notes
// @access  Private
router.post('/', protect, async (req, res) => {
  const { title, content, checklist, links, tags, isProtected, password, passwordHint, isPinned, isFavorite } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  try {
    let finalContent = content || '';
    let passwordHash = null;

    if (isProtected && password) {
      // Hash password for authentication later
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(password, salt);
      // Encrypt the content with the password
      finalContent = encrypt(finalContent, password);
    }

    const note = await Note.create({
      user: req.user._id,
      title,
      content: finalContent,
      checklist: checklist || [],
      links: links || [],
      tags: tags || [],
      isProtected: !!(isProtected && password),
      passwordHash,
      passwordHint: passwordHint || '',
      isPinned: !!isPinned,
      isFavorite: !!isFavorite
    });

    // Mask before returning if protected
    if (note.isProtected) {
      res.status(201).json({
        _id: note._id,
        user: note.user,
        title: note.title,
        content: '🔒 Protected Content. Please enter password to unlock.',
        checklist: [],
        links: [],
        tags: note.tags || [],
        isProtected: true,
        passwordHint: note.passwordHint || '',
        isPinned: note.isPinned || false,
        isFavorite: note.isFavorite || false,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      });
    } else {
      res.status(201).json(note);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Unlock a protected note
// @route   POST /api/notes/:id/unlock
// @access  Private
router.post('/:id/unlock', protect, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Password is required to unlock this note' });
  }

  try {
    const note = await Note.findOne({ _id: id, user: req.user._id });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (!note.isProtected) {
      return res.json(note);
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(password, note.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    // Decrypt the note content
    const decryptedContent = decrypt(note.content, password);

    // Return the full unlocked note object
    res.json({
      _id: note._id,
      user: note.user,
      title: note.title,
      content: decryptedContent,
      checklist: note.checklist,
      links: note.links,
      tags: note.tags || [],
      isProtected: true,
      passwordHint: note.passwordHint || '',
      isPinned: note.isPinned || false,
      isFavorite: note.isFavorite || false,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Decryption failed' });
  }
});

// @desc    Update a note
// @route   PUT /api/notes/:id
// @access  Private
router.put('/:id', protect, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    content,
    checklist,
    links,
    tags,
    isProtected,
    password,
    passwordHint,
    currentPassword,
    isPinned,
    isFavorite
  } = req.body;

  try {
    const note = await Note.findOne({ _id: id, user: req.user._id });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    // Determine if we are changing content/structure of a protected note
    const isModifyingContent =
      title !== undefined ||
      content !== undefined ||
      checklist !== undefined ||
      links !== undefined ||
      tags !== undefined ||
      isProtected !== undefined ||
      password !== undefined;

    // If the note is protected and we modify content, verify the current password
    if (note.isProtected && isModifyingContent) {
      if (!currentPassword) {
        return res.status(401).json({ message: 'Current password is required to update a protected note' });
      }
      const isMatch = await bcrypt.compare(currentPassword, note.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect current password' });
      }
    }

    // Update metadata directly (can be updated even if protected without verification)
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (isFavorite !== undefined) note.isFavorite = isFavorite;
    if (passwordHint !== undefined) note.passwordHint = passwordHint;

    // Update content/structure fields
    if (title !== undefined) note.title = title;
    if (checklist !== undefined) note.checklist = checklist;
    if (links !== undefined) note.links = links;
    if (tags !== undefined) note.tags = tags;

    // Handle protection state updates
    if (password) {
      // Set or update password
      const salt = await bcrypt.genSalt(10);
      note.passwordHash = await bcrypt.hash(password, salt);
      note.content = encrypt(content || '', password);
      note.isProtected = true;
    } else if (isProtected === false) {
      // Unprotect the note
      note.passwordHash = null;
      note.content = content || '';
      note.isProtected = false;
    } else if (note.isProtected && content !== undefined) {
      // Content updated, keeping existing protection (encrypt with validated currentPassword)
      note.content = encrypt(content, currentPassword);
    } else if (content !== undefined) {
      // Content updated, note is not protected
      note.content = content;
    }

    await note.save();

    // Mask if protected
    if (note.isProtected) {
      res.json({
        _id: note._id,
        user: note.user,
        title: note.title,
        content: '🔒 Protected Content. Please enter password to unlock.',
        checklist: [],
        links: [],
        tags: note.tags || [],
        isProtected: true,
        passwordHint: note.passwordHint || '',
        isPinned: note.isPinned || false,
        isFavorite: note.isFavorite || false,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      });
    } else {
      res.json(note);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete a note
// @route   DELETE /api/notes/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  const { id } = req.params;

  try {
    const note = await Note.findOneAndDelete({ _id: id, user: req.user._id });
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
