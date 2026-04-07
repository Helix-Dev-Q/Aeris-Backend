"use client";

import { useEffect } from 'react';
import { useProfileStore } from '@/app/packages/zustand/profile';
import { Config } from '../config/config';
import axios from 'axios';

const SessionManager = () => {
  const { 
    isSessionExpired, 
    clearSession, 
    hydrated, 
    loginTime, 
    email, 
    accountId,
    login,
    displayName,
    discordId,
    discordAvatar,
    password,
    setProfile
  } = useProfileStore();

  useEffect(() => {
    if (!hydrated) return;

    const checkPersistentSession = async () => {
      // If we already have a valid local session, just check expiration
      if (accountId && displayName && !isSessionExpired()) {
        // Fix avatar: reconstruct from discordId + password (avatar hash)
        if (discordId && password && !password.startsWith('discord_') && password.length > 5) {
          const expectedAvatar = `https://cdn.discordapp.com/avatars/${discordId}/${password}.png?size=256`;
          if (!discordAvatar || discordAvatar.includes('embed/avatars')) {
            setProfile({ discordAvatar: expectedAvatar });
          }
        }
        return;
      }

      // If we have an accountId but no valid session, try to restore from backend
      if (accountId && !displayName) {
        try {
          const response = await axios.get(`${Config.LAUNCHER_API_URL}/api/user/profile/${accountId}`, { timeout: 5000 });
          const d = response.data;
          if (d?.accountId) {
            login({
              accountId: d.accountId,
              displayName: d.displayName || 'User',
              email: d.email || email,
              password: password || '',
              discordId: d.discordId,
              discordAvatar: d.discordAvatar,
            });
          } else {
            clearSession();
          }
        } catch (err: unknown) {
          const axiosErr = err as { response?: { status?: number } };
          if (axiosErr.response?.status === 401 || axiosErr.response?.status === 404) {
            clearSession();
          }
        }
      }
    };

    const checkSession = () => {
      checkPersistentSession();
      if (isSessionExpired() && loginTime) {
        clearSession();
      }
    };

    // Fix avatar immediately on mount if needed
    if (discordId && password && !password.startsWith('discord_') && password.length > 5) {
      const expectedAvatar = `https://cdn.discordapp.com/avatars/${discordId}/${password}.png?size=256`;
      if (!discordAvatar || discordAvatar.includes('embed/avatars')) {
        setProfile({ discordAvatar: expectedAvatar });
      }
    }

    const intervalId = setInterval(checkSession, 60 * 1000);
    checkSession();
    return () => clearInterval(intervalId);
  }, [isSessionExpired, clearSession, hydrated, loginTime, accountId, displayName, email, login]);

  return null; // This component doesn't render anything
};

export default SessionManager;
