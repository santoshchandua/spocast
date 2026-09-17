import React, { createContext, useContext, useEffect, useState } from 'react';
import { mutate, restoreSession, setSession } from './api';
const Context = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false), [revision, setRevision] = useState(0);
  const refresh = async () => { try { const u = await restoreSession(); setUser(u); setRevision(n=>n+1); return u; } catch { setUser(null); } finally { setReady(true); } };
  useEffect(() => { refresh(); }, []);
  const login = async (challengeId, code) => { const data = await mutate('/auth/otp/verify', { challengeId, code }); await setSession(data); setUser(data.user); setRevision(n=>n+1); };
  const logout = async () => { await mutate('/auth/logout'); await setSession(null); setUser(null); setRevision(n=>n+1); };
  return <Context.Provider value={{ user, ready, login, logout, refresh, revision, forget: async () => { await setSession(null); setUser(null); setRevision(n=>n+1); } }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
