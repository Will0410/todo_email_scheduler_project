const express = require('express');
const Todo = require('../models/Todo');
const router = express.Router();

// Create
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    // Normalize tags: accept comma string or array
    if (body.tags && typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map(s => s.trim()).filter(Boolean);
    }
    const todo = await Todo.create({
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      tags: body.tags || [],
      due: body.due ? new Date(body.due) : null,
      email: body.email,
      completed: !!body.completed
    });
    res.status(201).json(todo);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Read all
router.get('/', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    res.json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Read one
router.get('/:id', async (req, res) => {
  try {
    const todo = await Todo.findById(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo não encontrado' });
    res.json(todo);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    if (body.tags && typeof body.tags === 'string') {
      body.tags = body.tags.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (body.due) body.due = new Date(body.due);
    const todo = await Todo.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!todo) return res.status(404).json({ error: 'Todo não encontrado' });
    res.json(todo);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) return res.status(404).json({ error: 'Todo não encontrado' });
    res.json({ message: 'Todo removido' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
