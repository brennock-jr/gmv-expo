import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity,
  Image,
  ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError('Erro ao fazer login. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../../assets/images/camo-dark.jpg')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../../../assets/images/logo.png')} 
                  style={styles.logo} 
                  resizeMode="contain" 
                />
              </View>
              <Text style={styles.title}>Grupo Missões Voluntários</Text>
              <Text style={styles.subtitle}>{"\"In Omnia Paratus\""}</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardHeader}>LOGIN</Text>
              
              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <Input
                label="E-mail"
                placeholder="usuario@email.com"
                iconName="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Input
                label="Senha"
                placeholder="********"
                iconName="lock-closed-outline"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />

              <Button 
                title="Fazer Login" 
                onPress={handleLogin} 
                loading={loading} 
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>Não possui login?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.linkText}>Cadastre-se</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 13, 12, 0.82)', // Camada preta tática translúcida sobre a camuflagem
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#cbd3c6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#4c5748',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#606a5c', // Cinza esverdeado claro
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: 'rgba(35, 42, 33, 0.95)', // Cinza esverdeado tático
    borderRadius: 8,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#4c5748', // Borda verde oliva
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  cardHeader: {
    color: '#c29014', // Amarelo queimado
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#4c5748',
    paddingBottom: 8,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    padding: 12,
    borderRadius: 4,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    color: '#8fa882', // Cinza esverdeado mais claro
    fontSize: 14,
  },
  linkText: {
    color: '#c29014', // Amarelo queimado para links
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
