const fs = require('fs');
const path = require('path');

const BACKUP_FILE = path.join(__dirname, 'conversations_backup.json');
const MAX_MESSAGES = 20;

const store = {};

function loadBackup() {
  try {
    if (fs.existsSync(BACKUP_FILE)) {
      const data = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
      Object.assign(store, data);
    }
  } catch {
    // backup corrupto o inexistente, empezamos limpio
  }
}

function saveBackup() {
  try {
    fs.writeFileSync(BACKUP_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Error guardando backup:', err.message);
  }
}

function getHistory(userId) {
  if (!store[userId]) store[userId] = [];
  return store[userId];
}

function addMessage(userId, role, content) {
  if (!store[userId]) store[userId] = [];
  store[userId].push({ role, content });

  if (store[userId].length > MAX_MESSAGES) {
    store[userId] = store[userId].slice(-MAX_MESSAGES);
  }

  saveBackup();
}

function clearHistory(userId) {
  delete store[userId];
  saveBackup();
}

loadBackup();

module.exports = { getHistory, addMessage, clearHistory };
