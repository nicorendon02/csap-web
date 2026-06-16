<?php
// =====================================================
// CSAP — add-admin.php
// ONE-TIME USE: Creates or updates any admin/superuser
// account via a simple web form.
// DELETE THIS FILE immediately after running it.
// =====================================================
require_once __DIR__ . '/db-config.php';

$message = '';
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name     = trim($_POST['name']     ?? '');
    $email    = trim($_POST['email']    ?? '');
    $password = trim($_POST['password'] ?? '');
    $role     = in_array($_POST['role'] ?? '', ['admin', 'superuser'], true)
                  ? $_POST['role'] : 'admin';

    if (!$name || !$email || !$password) {
        $message = '⚠️  All fields are required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $message = '⚠️  Invalid email address.';
    } elseif (strlen($password) < 8) {
        $message = '⚠️  Password must be at least 8 characters.';
    } else {
        $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $db   = getDB();

        // Update if email already exists, otherwise insert
        $stmt = $db->prepare(
            "UPDATE csap_users
             SET name = ?, password_hash = ?, role = ?, status = 'active'
             WHERE email = ?"
        );
        $stmt->execute([$name, $hash, $role, $email]);

        if ($stmt->rowCount() === 0) {
            $stmt = $db->prepare(
                "INSERT INTO csap_users (name, email, password_hash, role, status)
                 VALUES (?, ?, ?, ?, 'active')"
            );
            $stmt->execute([$name, $email, $hash, $role]);
            $message = "✅ Account <strong>" . htmlspecialchars($email) . "</strong> created as <strong>{$role}</strong>.";
        } else {
            $message = "✅ Account <strong>" . htmlspecialchars($email) . "</strong> updated (role: <strong>{$role}</strong>, new password set).";
        }
        $success = true;
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CSAP — Add Admin</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #f0ede7;
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,.1);
      padding: 40px;
      width: 100%; max-width: 480px;
    }
    h1 {
      font-size: 1.4rem; font-weight: 800;
      color: #0d1b2a; margin-bottom: 6px;
    }
    .subtitle {
      font-size: 0.85rem; color: #999; margin-bottom: 28px;
    }
    label {
      display: block; font-size: 0.78rem; font-weight: 700;
      color: #555; text-transform: uppercase; letter-spacing: .5px;
      margin-bottom: 6px; margin-top: 16px;
    }
    input, select {
      width: 100%; padding: 11px 14px;
      border: 1.5px solid #e0d9cc;
      border-radius: 10px; font-size: 0.93rem;
      color: #0d1b2a; outline: none;
      transition: border-color .2s;
    }
    input:focus, select:focus { border-color: #c29a12; box-shadow: 0 0 0 3px rgba(194,154,18,.12); }
    button {
      width: 100%; margin-top: 24px;
      background: #c29a12; color: #fff;
      border: none; border-radius: 10px;
      padding: 13px; font-size: 1rem; font-weight: 700;
      cursor: pointer; transition: background .2s;
    }
    button:hover { background: #a07e0e; }
    .msg {
      margin-top: 20px; padding: 14px 16px;
      border-radius: 10px; font-size: 0.88rem; line-height: 1.6;
    }
    .msg.ok  { background: #e6f9f0; color: #15803d; border: 1px solid #bbf0d5; }
    .msg.err { background: #fff0f0; color: #dc2626; border: 1px solid #fecaca; }
    .warning {
      margin-top: 20px; padding: 12px 16px;
      background: #fff8e1; color: #92400e;
      border: 1px solid #fde68a; border-radius: 10px;
      font-size: 0.82rem; font-weight: 600; line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>&#128272; Add / Update Admin</h1>
    <p class="subtitle">CSAP Portal &mdash; One-time use. Delete after running.</p>

    <form method="POST">
      <label for="name">Full Name</label>
      <input id="name" name="name" type="text" placeholder="e.g. CSAP Admin"
             value="<?= htmlspecialchars($_POST['name'] ?? '') ?>" required />

      <label for="email">Email Address</label>
      <input id="email" name="email" type="email" placeholder="user@example.edu"
             value="<?= htmlspecialchars($_POST['email'] ?? '') ?>" required />

      <label for="password">Password</label>
      <input id="password" name="password" type="password"
             placeholder="Min. 8 characters" required />

      <label for="role">Role</label>
      <select id="role" name="role">
        <option value="admin"     <?= ($_POST['role'] ?? '') === 'admin'     ? 'selected' : '' ?>>Admin</option>
        <option value="superuser" <?= ($_POST['role'] ?? '') === 'superuser' ? 'selected' : '' ?>>Superuser</option>
      </select>

      <button type="submit">Create / Update Account</button>
    </form>

    <?php if ($message): ?>
      <div class="msg <?= $success ? 'ok' : 'err' ?>">
        <?= $message ?>
        <?php if ($success): ?>
          <br><br>
          You can now <a href="../login.html" style="color:inherit;font-weight:700;">log in</a> with these credentials.
        <?php endif; ?>
      </div>
    <?php endif; ?>

    <div class="warning">
      &#9888;&nbsp; Delete <code>add-admin.php</code> from your server immediately after use!
    </div>
  </div>
</body>
</html>
