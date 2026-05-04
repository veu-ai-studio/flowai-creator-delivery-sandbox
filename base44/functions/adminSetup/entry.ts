import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { action, email, password, adminSecretKey } = payload;

    if (action === 'completeSetup') {
      // Hash password using simple bcrypt-like approach with Deno crypto
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const passwordHash = await hashBcrypt(password);

      // Hash admin secret key
      const secretData = encoder.encode(adminSecretKey);
      const secretHashBuffer = await crypto.subtle.digest('SHA-256', secretData);
      const secretHashArray = Array.from(new Uint8Array(secretHashBuffer));
      const secretHash = secretHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Create UserRole record
      const userRole = await base44.asServiceRole.entities.UserRole.create({
        email: email,
        role: 'admin',
        admin_key_hash: secretHash,
        // totp_secret field is intentionally left null for now (will be populated in future sprint)
      });

      return Response.json({
        success: true,
        userRoleId: userRole.id,
        message: 'Admin setup completed successfully'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Admin setup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Simple bcrypt-compatible hash function
async function hashBcrypt(password) {
  // For simplicity in this development stage, use SHA-256 with salt
  // In production, would use full bcrypt library
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Array.from(salt).join(''));
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return Array.from(salt).join('-') + ':' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}