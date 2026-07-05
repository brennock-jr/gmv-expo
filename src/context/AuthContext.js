import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      // Limpar escuta do perfil anterior se houver
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (userDoc) => {
          if (userDoc.exists()) {
            setProfile(userDoc.data());
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Erro ao escutar perfil do Firestore em tempo real:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
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
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await fetchProfile(credential.user.uid);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const register = async (name, email, password, group) => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;
      
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
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Erro ao deslogar:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, logout, reloadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
