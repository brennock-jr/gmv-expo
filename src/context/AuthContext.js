import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../services/firebase';

const SESSION_STORAGE_KEY = '@gmv_user_credentials';
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedEmail, setSavedEmail] = useState('');

  // Auxiliares de armazenamento local de sessão
  const saveSessionCredentials = async (email, password) => {
    try {
      const sessionData = {
        email,
        password,
        lastAccess: Date.now(),
      };
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error("Erro ao salvar credenciais no AsyncStorage:", error);
    }
  };

  const updateLastAccess = async () => {
    try {
      const storedSessionStr = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSessionStr) {
        const storedSession = JSON.parse(storedSessionStr);
        storedSession.lastAccess = Date.now();
        await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession));
      }
    } catch (error) {
      console.error("Erro ao atualizar último acesso:", error);
    }
  };

  const clearStoredCredentials = async () => {
    try {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      setSavedEmail('');
    } catch (error) {
      console.error("Erro ao remover credenciais do AsyncStorage:", error);
    }
  };

  // Buscar perfil do Firestore (mantido como fallback e para compatibilidade)
  const fetchProfile = async (uid) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setProfile(userDoc.data());
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Erro ao buscar perfil do Firestore:", error);
    }
  };

  useEffect(() => {
    let unsubscribeProfile = null;
    const timer = setTimeout(() => {
      // Safety timeout para evitar que a tela de carregamento trave indefinidamente por queda de rede
      setLoading(false);
    }, 4000);

    const checkSessionAndAuth = async () => {
      try {
        const storedSessionStr = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (storedSessionStr) {
          const storedSession = JSON.parse(storedSessionStr);
          const now = Date.now();
          const elapsed = now - (storedSession.lastAccess || 0);

          if (storedSession.email) {
            setSavedEmail(storedSession.email);
          }

          if (elapsed > THIRTY_DAYS_MS) {
            console.log('Sessão expirada (mais de 30 dias desde o último acesso). Limpando credenciais.');
            await clearStoredCredentials();
            await signOut(auth);
          } else {
            storedSession.lastAccess = now;
            await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(storedSession));

            // Tenta reautenticar apenas se o Firebase Auth ainda não tiver restaurado a sessão ativa
            if (!auth.currentUser && storedSession.email && storedSession.password) {
              try {
                await signInWithEmailAndPassword(auth, storedSession.email, storedSession.password);
              } catch (loginErr) {
                console.error("Erro ao realizar auto-login com credenciais salvas:", loginErr);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao validar sessão salva:", err);
      }
    };

    checkSessionAndAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Limpar escuta do perfil anterior se houver
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        // Atualiza a data de último acesso ao obter sessão ativa do Firebase
        updateLastAccess();

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (userDoc) => {
          clearTimeout(timer);
          if (userDoc.exists()) {
            setProfile(userDoc.data());
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          clearTimeout(timer);
          console.error("Erro ao escutar perfil do Firestore em tempo real:", error);
          setProfile(null);
          setLoading(false);
        });
      } else {
        clearTimeout(timer);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  // Recarregar perfil do usuário (útil após preencher ficha médica)
  const reloadProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const login = async (email, password) => {
    const cleanEmail = email ? email.trim() : '';
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    await saveSessionCredentials(cleanEmail, password);
    setSavedEmail(cleanEmail);
    await fetchProfile(credential.user.uid);
  };

  const register = async (name, email, password, group) => {
    const cleanEmail = email ? email.trim() : '';
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const uid = credential.user.uid;
    await saveSessionCredentials(cleanEmail, password);
    setSavedEmail(cleanEmail);
    
    const newProfile = {
      uid,
      name,
      email,
      group: group.trim(),
      role: 'voluntario', // Todos os novos cadastros são obrigatoriamente voluntários. Admins devem ser promovidos manualmente no banco.
      approved: false, // Necessita de aprovação manual do administrador do banco de dados para acessar o app
      onboarded: false, // Ficha médica ainda não preenchida
      createdAt: new Date().toISOString(),
      medicalInfo: null
    };

    // Salvar perfil no Firestore
    await setDoc(doc(db, 'users', uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    try {
      await clearStoredCredentials();
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, savedEmail, login, register, logout, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
