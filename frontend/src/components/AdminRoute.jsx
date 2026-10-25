import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function AdminRoute({ children }) {
  const { user, isAuthenticated, sessionLoading } = useAuth();

  // 1. Session load ho raha ho tab loading banner
  if (sessionLoading) {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf9f6',
          color: '#666',
          fontSize: '15px'
        }}
      >
        Authenticating administrator session...
      </div>
    );
  }

  // 2. Agar login hi nahi hai toh seedhe login page par redirect
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: '/admin' }} replace />;
  }

  // 3. Agar logged in hai par role admin nahi hai (Safe null check)
  if (!user || user?.role !== 'admin') {
    return (
      <div
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          background: '#faf9f6'
        }}
      >
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            border: '1px solid #eae6e0',
            borderRadius: '12px',
            padding: '40px 30px',
            textAlign: 'center',
            boxShadow: '0 6px 25px rgba(0,0,0,0.04)'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛡️</div>
          <span
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#dc2626',
              fontWeight: '700',
              background: '#fee2e2',
              padding: '4px 12px',
              borderRadius: '12px'
            }}
          >
            RESTRICTED ACCESS
          </span>
          <h2 style={{ fontSize: '26px', color: '#141414', margin: '14px 0 8px' }}>
            Administrator Privileges Required
          </h2>
          <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6', marginBottom: '24px' }}>
            You are currently signed in as <strong>{user?.name || 'Valued User'}</strong> (
            {user?.email || 'N/A'}) with a <strong>{user?.role || 'client'}</strong> account. The Studio
            Control Center is restricted to studio directors and project architects.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link
              to="/my-orders"
              style={{
                background: '#1a1a1a',
                color: '#ffffff',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              My Orders & Tracking →
            </Link>
            <Link
              to="/"
              style={{
                background: '#f0ede8',
                color: '#333',
                padding: '10px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '13px'
              }}
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Admin verified - render target admin dashboard
  return children;
}

export default AdminRoute;