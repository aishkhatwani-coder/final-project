import { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

function CheckoutModal({ cartTotal, onVerificationSuccess, onClose }) {
  const [step, setStep] = useState('phone'); // 'phone' ya 'otp'
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Phone par OTP bhejna
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setErrorMsg('Valid 10-digit phone number enter karein');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        phone,
        email,
        name
      });

      if (res.data.success) {
        // Testing alert (agar gateway connected nahi ho toh screen par code show hoga)
        if (res.data.debugOtp) {
          alert(`Test OTP: ${res.data.debugOtp}`);
        }
        setStep('otp');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'OTP send nahi ho paya');
    } finally {
      setLoading(false);
    }
  };

  // 2. OTP match karke Payment trigger karna
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        phone,
        otp
      });

      if (res.data.success) {
        sessionStorage.setItem('clientToken', res.data.token);
        sessionStorage.setItem('clientUser', JSON.stringify(res.data.user));
        // Verify hote hi direct payment function call hoga
        onVerificationSuccess(res.data.user);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Galat OTP enter kiya hai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#1c1c1e', padding: '30px', borderRadius: '10px', width: '380px', color: '#fff' }}>
        <h3 style={{ marginBottom: '15px', color: '#e5a950' }}>🔐 Client Phone Verification</h3>
        <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '20px' }}>
          Payment proceed karne se pehle apna mobile number verify karein.
        </p>

        {errorMsg && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>{errorMsg}</p>}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="Your Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ padding: '10px', background: '#2c2c2e', border: '1px solid #444', color: '#fff', borderRadius: '5px' }}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '10px', background: '#2c2c2e', border: '1px solid #444', color: '#fff', borderRadius: '5px' }}
            />
            <input
              type="tel"
              placeholder="10-digit Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{ padding: '10px', background: '#2c2c2e', border: '1px solid #444', color: '#fff', borderRadius: '5px' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: '10px', padding: '12px', background: '#e5a950', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '5px', cursor: 'pointer' }}
            >
              {loading ? 'Sending OTP...' : 'Send Verification OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p style={{ fontSize: '13px', color: '#bbb' }}>Enter 6-digit OTP sent to <strong>{phone}</strong>:</p>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              style={{ padding: '12px', textAlign: 'center', fontSize: '18px', letterSpacing: '4px', background: '#2c2c2e', border: '1px solid #444', color: '#fff', borderRadius: '5px' }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '12px', background: '#22c55e', border: 'none', color: '#fff', fontWeight: 'bold', borderRadius: '5px', cursor: 'pointer' }}
            >
              {loading ? 'Verifying...' : `Pay ₹${cartTotal} & Place Order`}
            </button>
          </form>
        )}

        <button
          onClick={onClose}
          style={{ marginTop: '15px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', width: '100%', fontSize: '13px' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default CheckoutModal;