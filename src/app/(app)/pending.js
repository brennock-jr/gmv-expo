import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity,
  ImageBackground,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

export default function Pending() {
  const { profile, reloadProfile, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      await reloadProfile();
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    } finally {
      setChecking(false);
    }
  };

  return (
    <ImageBackground 
      source={require('../../../assets/images/camo-dark.jpg')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons name="shield-half-outline" size={40} color="#c29014" />
              </View>
              <Text style={styles.title}>IDENTIFICAÇÃO CADASTRADA</Text>
              <Text style={styles.subtitle}>Acesso Restrito / Pendente de Liberação</Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardHeader}>STATUS DA OPERAÇÃO</Text>

              <Text style={styles.statusLabel}>Operador:</Text>
              <Text style={styles.statusValue}>{profile?.name || 'Recruta'}</Text>
              
              <Text style={styles.statusLabel}>E-mail:</Text>
              <Text style={styles.statusValue}>{profile?.email || 'N/A'}</Text>

              <View style={styles.warningBox}>
                <Ionicons name="lock-closed-outline" size={20} color="#c29014" style={styles.warningIcon} />
                <Text style={styles.warningText}>
                  Para garantir a segurança física dos membros e a confidencialidade das missões, o acesso ao painel requer aprovação manual do Administrador.
                </Text>
              </View>

              <Text style={styles.infoText}>
                Seu cadastro foi recebido. Por favor, aguarde o comando liberar seu acesso ou clique no botão abaixo para verificar se o status foi atualizado.
              </Text>

              <Button
                title={checking ? "Verificando..." : "Verificar Status da Conta"}
                onPress={handleCheckStatus}
                loading={checking}
              />

              <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Sair da Conta / Cancelar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
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
    backgroundColor: 'rgba(12, 13, 12, 0.85)',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? 64 : 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(194, 144, 20, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#c29014',
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
    color: '#8fa882',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
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
  statusLabel: {
    color: '#606a5c',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  statusValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(194, 144, 20, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(194, 144, 20, 0.2)',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 10,
  },
  warningText: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  infoText: {
    color: '#8fa882',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 16,
    padding: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
