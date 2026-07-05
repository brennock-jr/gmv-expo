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
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function Onboarding() {
  const { user, reloadProfile, logout } = useAuth();
  const [bloodType, setBloodType] = useState('');
  const [chronicConditions, setChronicConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setError('');
    
    if (!bloodType) {
      setError('Por favor, selecione seu tipo sanguíneo.');
      return;
    }
    
    if (!emergencyName || !emergencyPhone || !emergencyRelationship) {
      setError('Por favor, preencha todos os campos do contato de emergência.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboarded: true,
        medicalInfo: {
          bloodType,
          chronicConditions: chronicConditions.trim() || 'Nenhuma',
          medications: medications.trim() || 'Nenhuma',
          emergencyContact: {
            name: emergencyName.trim(),
            phone: emergencyPhone.trim(),
            relationship: emergencyRelationship.trim()
          }
        }
      });
      
      // Recarregar perfil no contexto global para disparar o redirecionamento
      await reloadProfile();
    } catch (err) {
      console.error("Erro ao salvar ficha médica:", err);
      setError('Falha ao salvar dados médicos. Verifique a rede e tente novamente.');
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
              <View style={styles.iconContainer}>
                <Ionicons name="medical-outline" size={40} color="#c29014" />
              </View>
              <Text style={styles.title}>Ficha Médica Obrigatória</Text>
              <Text style={styles.subtitle}>
                Estes dados são vitais para sua segurança física e resgate médico em operações.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardHeader}>DECLARAÇÃO DE SAÚDE</Text>

              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              {/* Seletor de Tipo Sanguíneo */}
              <Text style={styles.sectionLabel}>Tipo Sanguíneo</Text>
              <View style={styles.bloodGrid}>
                {BLOOD_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.bloodOption,
                      bloodType === type && styles.bloodOptionSelected
                    ]}
                    onPress={() => setBloodType(type)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.bloodText,
                      bloodType === type && styles.bloodTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Condições Crônicas / Alergias"
                placeholder="Ex: Asma, Diabetes, Alergia a Penicilina (ou 'Nenhuma')"
                iconName="heart-outline"
                value={chronicConditions}
                onChangeText={setChronicConditions}
                multiline
                numberOfLines={2}
                style={[styles.textArea, Platform.OS === 'ios' && { height: 60 }]}
              />

              <Input
                label="Medicações em Uso Contínuo"
                placeholder="Ex: Insulina, Anti-hipertensivo (ou 'Nenhuma')"
                iconName="flask-outline"
                value={medications}
                onChangeText={setMedications}
                multiline
                numberOfLines={2}
                style={[styles.textArea, Platform.OS === 'ios' && { height: 60 }]}
              />

              <Text style={styles.cardDivider}>CONTATO DE EMERGÊNCIA</Text>

              <Input
                label="Nome do Contato"
                placeholder="Ex: Maria Souza"
                iconName="person-outline"
                value={emergencyName}
                onChangeText={setEmergencyName}
              />

              <Input
                label="Telefone do Contato"
                placeholder="Ex: (11) 98765-4321"
                iconName="call-outline"
                value={emergencyPhone}
                onChangeText={setEmergencyPhone}
                keyboardType="phone-pad"
              />

              <Input
                label="Grau de Parentesco"
                placeholder="Ex: Esposa, Pai, Irmão"
                iconName="people-outline"
                value={emergencyRelationship}
                onChangeText={setEmergencyRelationship}
              />

              <Button
                title="Salvar e Iniciar Missões"
                onPress={handleSave}
                loading={loading}
              />

              <TouchableOpacity onPress={logout} style={styles.logoutButton}>
                <Text style={styles.logoutText}>Abortar Operação (Sair da Conta)</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(12, 13, 12, 0.85)',
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
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
    paddingHorizontal: 10,
    lineHeight: 18,
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
  cardDivider: {
    color: '#c29014',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#4c5748',
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bloodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  bloodOption: {
    width: '22%',
    height: 44,
    backgroundColor: '#1c201a',
    borderWidth: 1.5,
    borderColor: '#3d453a',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bloodOptionSelected: {
    backgroundColor: '#c29014',
    borderColor: '#c29014',
  },
  bloodText: {
    color: '#606a5c',
    fontSize: 15,
    fontWeight: '700',
  },
  bloodTextSelected: {
    color: '#000000',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
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
