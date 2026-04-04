import React, { useState, useEffect } from 'react';
import { passwords } from './api';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    service_name: '',
    username: '',
    password: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async (query = '') => {
    try {
      const response = query
        ? await passwords.search(query)
        : await passwords.getAll();
      setEntries(response.data);
    } catch (err) {
      setError('Failed to fetch passwords');
    }
  };

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    fetchEntries(query);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingId) {
        await passwords.update(editingId, formData);
      } else {
        await passwords.create(formData);
      }
      resetForm();
      fetchEntries(searchQuery);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      service_name: entry.service_name,
      username: entry.username,
      password: '',
      notes: entry.notes || '',
    });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await passwords.delete(id);
      fetchEntries(searchQuery);
    } catch (err) {
      setError('Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({ service_name: '', username: '', password: '', notes: '' });
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const copyToClipboard = async (id, field) => {
    try {
      const response = await passwords.getById(id);
      const text = field === 'username' ? response.data.username : response.data.password;
      await navigator.clipboard.writeText(text);
      setCopiedId(`${field}-${id}`);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>🔐 Password Manager</h1>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button onClick={handleLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      <div className="container">
        <div className="toolbar">
          <input
            type="text"
            placeholder="🔍 Search by service name..."
            value={searchQuery}
            onChange={handleSearch}
            className="search-input"
          />
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
            + Add Password
          </button>
        </div>

        {showForm && (
          <div className="form-card">
            <h2>{editingId ? 'Edit Entry' : 'Add New Entry'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Service Name</label>
                  <input
                    type="text"
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    required
                    placeholder="e.g., Google"
                  />
                </div>
                <div className="form-group">
                  <label>Username / Email</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingId}
                    placeholder={editingId ? 'Leave blank to keep current' : ''}
                  />
                </div>
                <div className="form-group">
                  <label>Notes (optional)</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Security question answer, etc."
                  />
                </div>
              </div>
              {error && <div className="error">{error}</div>}
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="entries-list">
          {entries.length === 0 ? (
            <div className="empty-state">
              <p>No passwords saved yet. Click "+ Add Password" to get started!</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="entry-card">
                <div className="entry-header">
                  <h3>{entry.service_name}</h3>
                  <div className="entry-actions">
                    <button onClick={() => handleEdit(entry)} className="btn-icon" title="Edit">✏️</button>
                    <button onClick={() => handleDelete(entry.id)} className="btn-icon" title="Delete">🗑️</button>
                  </div>
                </div>
                <div className="entry-row">
                  <div className="entry-field">
                    <label>Username</label>
                    <div className="field-with-copy">
                      <code>{entry.username}</code>
                      <button
                        onClick={() => copyToClipboard(entry.id, 'username')}
                        className="btn-copy"
                      >
                        {copiedId === `username-${entry.id}` ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="entry-field">
                    <label>Password</label>
                    <div className="field-with-copy">
                      <code>••••••••</code>
                      <button
                        onClick={() => copyToClipboard(entry.id, 'password')}
                        className="btn-copy"
                      >
                        {copiedId === `password-${entry.id}` ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>
                {entry.notes && (
                  <div className="entry-notes">
                    <label>Notes:</label> {entry.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
