import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  TouchableOpacity,
  ImageBackground
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    setError('');
    if (!name || !email || !group || !password || !confirmPassword) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await register(name, email, password, group);
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Formato de e-mail inválido.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
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
              <Text style={styles.title}>CADASTRO DE OPERADOR</Text>
              <Text style={styles.subtitle}>Inscreva-se no corpo de missões voluntárias</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardHeader}>INFORMAÇÕES DE CADASTRO</Text>
              
              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <Input
                label="Nome Completo"
                placeholder="Ex: Recruta Silva"
                iconName="person-outline"
                value={name}
                onChangeText={setName}
              />

              <Input
                label="Grupo / Organização"
                placeholder="Ex: GMV, Visitante, Outro..."
                iconName="people-outline"
                value={group}
                onChangeText={setGroup}
              />

              <Input
                label="E-mail"
                placeholder="Ex: silva@missao.com"
                iconName="mail-outline"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Input
                label="Senha"
                placeholder="mínimo 6 caracteres"
                iconName="lock-closed-outline"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />

              <Input
                label="Confirmar Senha"
                placeholder="repita a senha"
                iconName="lock-closed-outline"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
              />



              <Button 
                title="Cadastrar Credenciais" 
                onPress={handleRegister} 
                loading={loading} 
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>Já possui credenciais?</Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.linkText}>Fazer Login</Text>
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
    backgroundColor: 'rgba(12, 13, 12, 0.82)',
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
    marginBottom: 24,
    marginTop: 16,
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
    color: '#606a5c',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formCard: {
    backgroundColor: 'rgba(35, 42, 33, 0.95)',
    borderRadius: 8,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#4c5748',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 16,
  },
  cardHeader: {
    color: '#c29014',
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
  roleLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1c201a',
    borderWidth: 1.5,
    borderColor: '#3d453a',
    borderRadius: 6,
    height: 48,
  },
  roleOptionSelected: {
    borderColor: '#c29014',
    backgroundColor: '#c29014', // Amarelo queimado para o selecionado
  },
  roleOptionText: {
    color: '#606a5c',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  roleOptionTextSelected: {
    color: '#000000', // Texto preto para maior visibilidade sobre o amarelo
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  footerText: {
    color: '#8fa882',
    fontSize: 14,
  },
  linkText: {
    color: '#c29014',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
