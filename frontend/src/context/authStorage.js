const legacyUserKey = 'user';
const legacyTokenKey = 'token';
const migrationKey = 'interior_studio_auth_migrated_v1';

export const getAuthRole = () => (
  window.location.pathname.startsWith('/admin') ? 'admin' : 'client'
);

const getRoleKey = (role, kind) => `interior_studio_${role}_${kind}`;

export const getAuthStorageKeys = (role = getAuthRole()) => ({
  user: getRoleKey(role, 'user'),
  token: getRoleKey(role, 'token')
});

export const migrateLegacyAuth = () => {
  if (localStorage.getItem(migrationKey)) return;

  const legacyUser = localStorage.getItem(legacyUserKey);
  const legacyToken = localStorage.getItem(legacyTokenKey);

  if (legacyUser && legacyToken && legacyToken !== 'direct-admin-bypass-token') {
    try {
      const user = JSON.parse(legacyUser);
      const role = user?.role === 'admin' ? 'admin' : 'client';
      const keys = getAuthStorageKeys(role);

      if (!localStorage.getItem(keys.user)) {
        localStorage.setItem(keys.user, JSON.stringify(user));
        localStorage.setItem(keys.token, legacyToken);
      }
    } catch (error) {
      console.error('Could not migrate the saved sign-in:', error);
    }
  }

  localStorage.setItem(migrationKey, 'true');
};

export const readAuth = (role = getAuthRole()) => {
  const keys = getAuthStorageKeys(role);
  const token = localStorage.getItem(keys.token);

  try {
    const user = localStorage.getItem(keys.user);
    return {
      user: user ? JSON.parse(user) : null,
      token: token === 'direct-admin-bypass-token' ? null : token
    };
  } catch (error) {
    console.error(`Could not read the saved ${role} sign-in:`, error);
    return { user: null, token: null };
  }
};

export const saveAuth = (role, user, token) => {
  const keys = getAuthStorageKeys(role);
  localStorage.setItem(keys.user, JSON.stringify(user));
  if (token) localStorage.setItem(keys.token, token);
};

export const clearAuth = (role = getAuthRole()) => {
  const keys = getAuthStorageKeys(role);
  localStorage.removeItem(keys.user);
  localStorage.removeItem(keys.token);

  try {
    const legacyUser = JSON.parse(localStorage.getItem(legacyUserKey));
    const legacyRole = legacyUser?.role === 'admin' ? 'admin' : 'client';
    if (legacyRole === role) {
      localStorage.removeItem(legacyUserKey);
      localStorage.removeItem(legacyTokenKey);
    }
  } catch (error) {
    console.error('Could not clear the previous saved sign-in:', error);
  }
};
