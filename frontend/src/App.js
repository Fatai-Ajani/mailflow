import React, { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import Campaigns from './pages/Campaigns';
import Contacts from './pages/Contacts';
import Accounts from './pages/Accounts';
import Analytics from './pages/Analytics';
import Templates from './pages/Templates';
import PinModal from './components/PinModal';
import { setAppPin } from './api';

const styles = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: '224px', background: '#fffdf8', borderRight: '1px solid #e1e5dd', display: 'flex', flexDirection: 'column', padding: '22px 0' },
  logo: { padding: '0 22px 20px', fontSize: '22px', fontWeight: '600', borderBottom: '1px solid #e1e5dd', marginBottom: '14px' },
  logoSub: { fontSize: '11px', fontWeight: '400', color: '#718078', display: 'block', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' },
  navItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 22px', fontSize: '13px', color: '#718078', cursor: 'pointer', transition: 'background 0.1s' },
  navItemActive: { background: '#eef2eb', color: '#17211b', fontWeight: '600', borderRight: '3px solid #35613d' },
  dot: { width: '7px', height: '7px', borderRadius: '50%' },
  main: { flex: 1, padding: '34px 42px', overflowY: 'auto', background: '#f6f7f2' },
  statusBar: { padding: '16px 22px', borderTop: '1px solid #e1e5dd', marginTop: 'auto' },
  statusLabel: { fontSize: '11px', color: '#718078', textTransform: 'uppercase', letterSpacing: '0.08em' },
  statusRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
  statusDot: { width: '7px', height: '7px', borderRadius: '50%', background: '#35613d' },
  statusText: { fontSize: '12px', fontWeight: '500', color: '#17211b' },
  lockBadge: { fontSize: '10px', padding: '2px 6px', borderRadius: '999px', background: '#eef2eb', color: '#718078', marginLeft: 'auto', border: '1px solid #e1e5dd' },
};

const navItems = [
  { id: 'dashboard', label: 'Dashboard', color: '#35613d', protected: false },
  { id: 'campaigns', label: 'Campaigns', color: '#6d8068', protected: true },
  { id: 'templates', label: 'Templates', color: '#8c7651', protected: true },
  { id: 'contacts', label: 'Contacts', color: '#9a6251', protected: true },
  { id: 'accounts', label: 'Gmail Accounts', color: '#7d7652', protected: true },
  { id: 'analytics', label: 'Analytics', color: '#52736b', protected: true },
];

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [pinVerified, setPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingPage, setPendingPage] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [actionLabel, setActionLabel] = useState('');

  const handleNavClick = (item) => {
    if (item.protected && !pinVerified) {
      setPendingPage(item.id);
      setActionLabel(`access ${item.label}`);
      setShowPinModal(true);
    } else {
      setPage(item.id);
    }
  };

  const handlePinSuccess = useCallback((pin) => {
    setAppPin(pin);
    setPinVerified(true);
    setShowPinModal(false);
    if (pendingPage) {
      setPage(pendingPage);
      setPendingPage(null);
    }
    if (pendingAction) {
      pendingAction(pin);
      setPendingAction(null);
    }
  }, [pendingPage, pendingAction]);

  const handlePinCancel = () => {
    setShowPinModal(false);
    setPendingPage(null);
    setPendingAction(null);
  };

  const requirePin = useCallback((label, action) => {
    if (pinVerified) {
      action();
      return;
    }
    setActionLabel(label);
    setPendingAction(() => action);
    setShowPinModal(true);
  }, [pinVerified]);

  const renderPage = () => {
  switch (page) {
    case 'dashboard': return <Dashboard />;
    case 'campaigns': return <Campaigns requirePin={requirePin} />;
    case 'templates': return <Templates requirePin={requirePin} />;
    case 'contacts': return <Contacts requirePin={requirePin} />;
    case 'accounts': return <Accounts requirePin={requirePin} />;
    case 'analytics': return <Analytics />;
    default: return <Dashboard />;
  }
};

  return (
    <div className="app-shell" style={styles.shell}>
      {showPinModal && (
        <PinModal
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          actionLabel={actionLabel}
        />
      )}

      <div className="app-sidebar" style={styles.sidebar}>
        <div className="app-logo" style={styles.logo}>
          MailFlow
          <span style={styles.logoSub}>Email automation</span>
        </div>

        <div className="app-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className="app-nav-item"
            style={{ ...styles.navItem, ...(page === item.id ? styles.navItemActive : {}) }}
            onClick={() => handleNavClick(item)}
          >
            <div style={{ ...styles.dot, background: item.color }} />
            {item.label}
            {item.protected && !pinVerified && (
              <span style={styles.lockBadge}>🔒</span>
            )}
          </div>
        ))}
        </div>

        <div className="app-status" style={styles.statusBar}>
          <div style={styles.statusLabel}>System status</div>
          <div style={styles.statusRow}>
            <div style={styles.statusDot} />
            <span style={styles.statusText}>Running</span>
          </div>
          {pinVerified && (
            <div
              style={{ fontSize: '11px', color: '#3B6D11', marginTop: '6px', cursor: 'pointer' }}
              onClick={() => { setAppPin(null); setPinVerified(false); setPage('dashboard'); }}
            >
              🔓 Unlocked · Click to lock
            </div>
          )}
        </div>
      </div>

      <div className="app-main" style={styles.main}>
        {renderPage()}
      </div>
    </div>
  );
}
