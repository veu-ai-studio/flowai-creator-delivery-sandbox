// MockStripe — §9 LD-3 (Stripe Connect adversarial cases use mock, nominal cases use sandbox).
//
// In-process stub returning deterministic envelopes for the
// A4-M1 / A4-M2 / A4-X1 / A4-X2 / A4-X3 Agent #4 provider onboarding
// adversarial tests. Never makes an HTTP request.

export function createMockStripeClient() {
  const accounts = new Map();
  let counter = 0;

  return {
    accounts: {
      create({ email, type = 'standard', business_profile = {} } = {}) {
        if (!email || typeof email !== 'string' || !email.includes('@')) {
          return Promise.reject(new Error('parameter_invalid_string_empty: email'));
        }
        if (email.includes('\n') || email.includes('\r')) {
          return Promise.reject(new Error('parameter_invalid_string: email contains CRLF'));
        }
        const id = `acct_mock_${++counter}`;
        const acct = { id, email, type, business_profile, charges_enabled: false };
        accounts.set(id, acct);
        return Promise.resolve(acct);
      },
      retrieve(id) {
        if (!accounts.has(id)) return Promise.reject(new Error(`No such account: ${id}`));
        return Promise.resolve(accounts.get(id));
      },
    },
    accountLinks: {
      create({ account, refresh_url, return_url, type } = {}) {
        if (!accounts.has(account)) return Promise.reject(new Error(`No such account: ${account}`));
        return Promise.resolve({
          object: 'account_link',
          created: Math.floor(Date.now() / 1000),
          expires_at: Math.floor(Date.now() / 1000) + 300,
          url: `https://connect.stripe.com/mock/${account}`,
        });
      },
    },
    _internal: { accounts },
  };
}
