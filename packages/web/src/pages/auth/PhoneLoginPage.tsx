import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button, Input } from '../../components/ui';

type Step = 'phone' | 'otp';

export default function PhoneLoginPage() {
  const { loadSession } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const validatePhone = (p: string): boolean => {
    const digits = p.replace(/\D/g, '');
    return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
  };

  const handleSendOTP = useCallback(async () => {
    setError('');
    if (!validatePhone(phone)) {
      setError('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api<{ data: { message: string; code?: string } }>('/auth/otp/send', {
        method: 'POST',
        body: { phone: phone.replace(/\D/g, '') },
      });
      setStep('otp');
      setResendTimer(30);
      if (res.data.code) setOtpCode(res.data.code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleVerifyOTP = async () => {
    setError('');
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await api('/auth/otp/verify-login', { method: 'POST', body: { phone: phone.replace(/\D/g, ''), code } });
      await loadSession();
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link to="/" className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ICP</span>
            </div>
          </Link>
          <h1 className="mt-4 text-center text-2xl font-bold text-gray-900">Sign in with Phone</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === 'phone' ? 'Enter your phone number to receive an OTP' : 'Enter the 6-digit OTP sent to your phone'}
          </p>
        </div>

        <form className="mt-8 space-y-5 bg-white p-8 rounded-xl shadow-sm border border-gray-100" onSubmit={(e) => { e.preventDefault(); step === 'phone' ? handleSendOTP() : handleVerifyOTP(); }}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {step === 'phone' && (
            <Input
              label="Phone Number"
              type="tel"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => { setPhone(e.target.value.replace(/[^\d\s\-+]/g, '').slice(0, 13)); setError(''); }}
              autoFocus
            />
          )}

          {step === 'otp' && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  OTP sent to <span className="font-medium text-gray-900">+91 {phone}</span>
                </span>
                <button type="button" onClick={() => { setStep('phone'); setCode(''); setOtpCode(''); setError(''); }} className="text-primary-600 hover:text-primary-500 font-medium">Change</button>
              </div>
              <Input
                label="6-Digit OTP"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                autoFocus
              />
              {otpCode && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-700 uppercase tracking-wide">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    Development Mode
                  </div>
                  <p className="text-2xl font-bold text-blue-900 font-mono tracking-[0.3em]">{otpCode}</p>
                  <p className="text-xs text-blue-600">Use this code to sign in. This is only shown in development.</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={resendTimer > 0 || loading}
                className="text-sm text-primary-600 hover:text-primary-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </>
          )}

          <Button type="submit" loading={loading} className="w-full" size="lg">
            {step === 'phone' ? 'Send OTP' : 'Verify & Sign In'}
          </Button>

          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <Link to="/signin" className="font-medium text-primary-600 hover:text-primary-500">Email login</Link>
            <span className="text-gray-300">|</span>
            <Link to="/phone-forgot-password" className="font-medium text-primary-600 hover:text-primary-500">Forgot password?</Link>
            <span className="text-gray-300">|</span>
            <Link to="/phone-signup" className="font-medium text-primary-600 hover:text-primary-500">Create account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
