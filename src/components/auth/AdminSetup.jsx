import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';

const PASSWORD_REQUIREMENTS = [
  { label: 'At least 12 characters', regex: /.{12,}/ },
  { label: 'Uppercase letter', regex: /[A-Z]/ },
  { label: 'Lowercase letter', regex: /[a-z]/ },
  { label: 'Number', regex: /[0-9]/ },
  { label: 'Special character', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

function getPasswordStrength(password) {
  const metRequirements = PASSWORD_REQUIREMENTS.filter(r => r.regex.test(password)).length;
  if (metRequirements < 3) return { level: 'Weak', color: 'text-red-400' };
  if (metRequirements < 5) return { level: 'Good', color: 'text-amber-400' };
  return { level: 'Very Strong', color: 'text-emerald-400' };
}

function isPasswordValid(password) {
  return PASSWORD_REQUIREMENTS.every(r => r.regex.test(password));
}

export default function AdminSetup({ onComplete }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Email
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  
  // Step 2: Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Step 3: Admin Secret Key
  const [adminSecretKey, setAdminSecretKey] = useState('');
  const [confirmAdminSecret, setConfirmAdminSecret] = useState('');
  const [secretAcknowledged, setSecretAcknowledged] = useState(false);
  const [secretError, setSecretError] = useState('');
  
  // Step 4: Confirmation
  const [submitting, setSubmitting] = useState(false);

  const validateEmail = (e) => {
    const value = e.target.value;
    setEmail(value);
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setEmailError(isValid || !value ? '' : 'Invalid email format');
  };

  const handleEmailNext = () => {
    if (!email || emailError) {
      setEmailError('Valid email required');
      return;
    }
    setStep(2);
  };

  const handlePasswordNext = () => {
    setPasswordError('');
    if (!password || !confirmPassword) {
      setPasswordError('Both password fields required');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (!isPasswordValid(password)) {
      setPasswordError('Password does not meet requirements');
      return;
    }
    setStep(3);
  };

  const handleSecretNext = () => {
    setSecretError('');
    if (!adminSecretKey || !confirmAdminSecret) {
      setSecretError('Both fields required');
      return;
    }
    if (adminSecretKey.length < 8) {
      setSecretError('Minimum 8 characters');
      return;
    }
    if (adminSecretKey !== confirmAdminSecret) {
      setSecretError('Keys do not match');
      return;
    }
    if (!secretAcknowledged) {
      setSecretError('Must acknowledge you have stored the key securely');
      return;
    }
    setStep(4);
  };

  const handleCompleteSetup = async () => {
    setSubmitting(true);
    try {
      await base44.functions.invoke('adminSetup', {
        action: 'completeSetup',
        email: email,
        password: password,
        adminSecretKey: adminSecretKey
      });

      // Clear sensitive data from memory
      setPassword('');
      setConfirmPassword('');
      setAdminSecretKey('');
      setConfirmAdminSecret('');

      onComplete();
    } catch (error) {
      alert('Setup failed: ' + error.message);
      setSubmitting(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const metRequirements = PASSWORD_REQUIREMENTS.filter(r => r.regex.test(password)).length;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <div className="rounded-xl border border-border bg-card p-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Setup</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Step {step} of 4: {
                step === 1 ? 'Email' :
                step === 2 ? 'Password' :
                step === 3 ? 'Admin Secret Key' :
                'Confirmation'
              }
            </p>
            <div className="flex gap-1 mt-4">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-all ${
                    s <= step ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Enter your Admin email address
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={validateEmail}
                    placeholder="admin@example.com"
                    className="h-10"
                  />
                  {emailError && (
                    <p className="text-xs text-red-400 mt-1">{emailError}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    This email will be your Admin login identifier.
                  </p>
                </div>
                <Button onClick={handleEmailNext} className="w-full">
                  Next
                </Button>
              </motion.div>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Create a strong Admin password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="h-10 pr-10"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-2 flex-1 rounded-full ${
                          metRequirements < 3 ? 'bg-red-400' :
                          metRequirements < 5 ? 'bg-amber-400' :
                          'bg-emerald-400'
                        }`} />
                        <span className={`text-xs font-semibold ${passwordStrength.color}`}>
                          {passwordStrength.level}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {PASSWORD_REQUIREMENTS.map((req, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className={req.regex.test(password) ? 'text-emerald-400' : 'text-muted-foreground'}>
                              {req.regex.test(password) ? '✓' : '○'}
                            </span>
                            {req.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Confirm password
                  </label>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="h-10"
                  />
                </div>

                {passwordError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">{passwordError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handlePasswordNext} className="flex-1" disabled={!isPasswordValid(password) || password !== confirmPassword}>
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Admin Secret Key */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Create your Admin Secret Key
                  </label>
                  <Input
                    type="password"
                    value={adminSecretKey}
                    onChange={(e) => setAdminSecretKey(e.target.value)}
                    placeholder="Enter Admin Secret Key (min 8 characters)"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Confirm Admin Secret Key
                  </label>
                  <Input
                    type="password"
                    value={confirmAdminSecret}
                    onChange={(e) => setConfirmAdminSecret(e.target.value)}
                    placeholder="Confirm Admin Secret Key"
                    className="h-10"
                  />
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <p className="text-sm font-semibold text-amber-400">⚠️ Critical Warning</p>
                  <p className="text-xs text-amber-400">
                    This key will never be shown again and cannot be recovered. Store it in a secure physical location only. Do not store it digitally or communicate it through any digital channel.
                  </p>
                </div>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={secretAcknowledged}
                    onChange={(e) => setSecretAcknowledged(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    I have stored this key securely in a physical location
                  </span>
                </label>

                {secretError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400">{secretError}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleSecretNext} className="flex-1" disabled={!secretAcknowledged || !adminSecretKey}>
                    Next
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmation */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  {[
                    { label: 'Email', value: email, done: true },
                    { label: 'Password', value: '••••••••', done: true },
                    { label: 'Admin Secret Key', value: '••••••••', done: secretAcknowledged }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={handleCompleteSetup} disabled={submitting} className="w-full gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? 'Completing Setup...' : 'Complete Admin Setup'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}