import { useState } from 'react';

const STEPS = ['Plan', 'Details', 'Payment', 'Confirm'];

export default function CheckoutModal({ tier, onClose }) {
  const [step, setStep] = useState(0);
  const [details, setDetails] = useState({ name: '', email: '', company: '' });
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '' });
  const [done, setDone] = useState(false);

  const handlePay = (e) => {
    e.preventDefault();
    setDone(true);
  };

  if (!tier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#0d1425] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest">Checkout</p>
            <p className="font-bold text-white">{tier.name} — {tier.price}{tier.period}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-5 gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1 w-full rounded-full transition-colors ${i <= step ? 'bg-blue-500' : 'bg-white/10'}`} />
              <span className={`text-[10px] font-semibold ${i === step ? 'text-blue-400' : 'text-gray-500'}`}>{s}</span>
            </div>
          ))}
        </div>

        <div className="px-6 py-6">
          {done ? (
            <div className="text-center py-6">
              <div className="h-16 w-16 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">You're all set!</h3>
              <p className="text-gray-400 text-sm mb-1">Welcome to FlowAI {tier.name}.</p>
              <p className="text-gray-500 text-xs mb-6">A confirmation has been sent to {details.email}</p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-colors">
                Go to Dashboard →
              </button>
            </div>
          ) : (
            <>
              {/* Step 0: Plan summary */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{tier.name} Plan</span>
                      <span className="text-blue-400 font-bold">{tier.price}{tier.period}</span>
                    </div>
                    <ul className="space-y-2">
                      {tier.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-gray-300">
                          <svg className="h-3.5 w-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button onClick={() => setStep(1)} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-colors">
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 1: Account details */}
              {step === 1 && (
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); setStep(2); }}>
                  {[
                    { label: 'Full Name', key: 'name', type: 'text', ph: 'Jane Smith' },
                    { label: 'Work Email', key: 'email', type: 'email', ph: 'jane@company.com' },
                    { label: 'Company (optional)', key: 'company', type: 'text', ph: 'Acme Inc.' },
                  ].map(({ label, key, type, ph }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
                      <input
                        type={type}
                        required={key !== 'company'}
                        value={details[key]}
                        onChange={e => setDetails(p => ({ ...p, [key]: e.target.value }))}
                        placeholder={ph}
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setStep(0)} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-colors">
                      Back
                    </button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-colors">
                      Continue →
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Payment */}
              {step === 2 && (
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); setStep(3); }}>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Card Number</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={card.number}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                        setCard(p => ({ ...p, number: v.replace(/(.{4})/g, '$1 ').trim() }));
                      }}
                      placeholder="4242 4242 4242 4242"
                      className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">Expiry</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={card.expiry}
                        onChange={e => {
                          let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                          setCard(p => ({ ...p, expiry: v }));
                        }}
                        placeholder="MM/YY"
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">CVC</label>
                      <input
                        type="text"
                        required
                        maxLength={3}
                        value={card.cvc}
                        onChange={e => setCard(p => ({ ...p, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                        placeholder="123"
                        className="w-full h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition font-mono"
                      />
                    </div>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Payments are encrypted and secure
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-colors">Back</button>
                    <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-colors">Review →</button>
                  </div>
                </form>
              )}

              {/* Step 3: Confirm */}
              {step === 3 && (
                <form className="space-y-5" onSubmit={handlePay}>
                  <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-400">Plan</span><span className="font-semibold">{tier.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Email</span><span className="font-semibold truncate max-w-[180px]">{details.email}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Card</span><span className="font-semibold font-mono">•••• {card.number.replace(/\s/g, '').slice(-4)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-white/8 text-base font-bold">
                      <span>Total</span><span className="text-blue-400">{tier.price}{tier.period}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold transition-colors">Back</button>
                    <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold transition-colors shadow-lg shadow-blue-600/30">
                      Pay {tier.price} →
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}