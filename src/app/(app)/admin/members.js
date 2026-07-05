import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ImageBackground, 
  ActivityIndicator, 
  Alert, 
  Platform,
  Modal,
  ScrollView,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../../../services/firebase';
import Input from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function Members() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [hidePending, setHidePending] = useState(false);
  const router = useRouter();

  // Estados dos Modais
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);

  // Estados de Aprovação de Senha
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Ordenar alfabeticamente
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt', { sensitivity: 'base' }));
      setUsers(list);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Erro ao buscar operadores:", err);
      setLoadingUsers(false);
    });

    return unsubscribe;
  }, []);

  const handleOpenApproval = (user) => {
    setApprovalTarget(user);
    setAdminPassword('');
    setApprovalError('');
    setApprovalVisible(true);
  };

  const handleConfirmApproval = async () => {
    setApprovalError('');
    if (!adminPassword) {
      setApprovalError("Por favor, digite sua senha de confirmação.");
      return;
    }

    setConfirming(true);
    try {
      // 1. Re-autenticar o administrador atual no Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Administrador não autenticado no Auth.");

      const credential = EmailAuthProvider.credential(currentUser.email, adminPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // 2. Atualizar o status do voluntário no Firestore
      const targetUserRef = doc(db, 'users', approvalTarget.uid);
      await updateDoc(targetUserRef, {
        approved: true
      });

      Alert.alert("Sucesso", `O operador ${approvalTarget.name} foi aprovado com sucesso.`);
      setApprovalVisible(false);
    } catch (err) {
      console.error("Erro na confirmação de aprovação:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setApprovalError("Senha de administrador incorreta. Liberação negada.");
      } else {
        setApprovalError("Falha na re-autenticação do sistema de segurança.");
      }
    } finally {
      setConfirming(false);
    }
  };

  // Filtragem dos membros listados
  const filteredUsers = users.filter((u) => {
    // Filtro de Pendentes
    if (hidePending && !u.approved) {
      return false;
    }
    // Filtro de Busca (Nome ou Email)
    const term = search.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(term);
    const emailMatch = u.email?.toLowerCase().includes(term);
    return nameMatch || emailMatch;
  });

  return (
    <ImageBackground 
      source={require('../../../../assets/images/camo-dark.jpg')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back-outline" size={24} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>PAINEL DE OPERADORES</Text>
              <Text style={styles.headerSubtitle}>Administração & Controle de Membros</Text>
            </View>
          </View>

          {/* Filtros e Busca */}
          <View style={styles.controlBar}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={20} color="#606a5c" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por Nome ou E-mail..."
                placeholderTextColor="#606a5c"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search !== '' && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                  <Ionicons name="close-circle" size={18} color="#606a5c" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.toggleWrapper}>
              <Text style={styles.toggleText}>Ocultar Operadores Pendentes</Text>
              <Switch
                trackColor={{ false: '#3d453a', true: '#c29014' }}
                thumbColor={hidePending ? '#ffffff' : '#606a5c'}
                ios_backgroundColor="#1c201a"
                onValueChange={setHidePending}
                value={hidePending}
              />
            </View>
          </View>

          {/* Listagem */}
          {loadingUsers ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#c29014" />
              <Text style={styles.loaderText}>Consultando frequências de cadastro...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  {/* Toque no Nome/Informações abre Ficha Médica */}
                  <TouchableOpacity 
                    style={styles.memberTouchArea}
                    onPress={() => {
                      setSelectedUser(item);
                      setDetailsVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.memberMain}>
                      <Text style={[
                        styles.memberName,
                        !item.approved && styles.memberNamePending
                      ]}>
                        {item.name || 'Operador'}
                      </Text>
                      <View style={styles.badgesRow}>
                        {/* Badge de Cargo */}
                        <View style={[
                          styles.roleBadge,
                          item.role === 'administrador' ? styles.roleBadgeAdmin : styles.roleBadgeVoluntario
                        ]}>
                          <Text style={[
                            styles.roleBadgeText,
                            item.role === 'administrador' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextVoluntario
                          ]}>
                            {item.role === 'administrador' ? 'ADMIN' : 'VOLUNTÁRIO'}
                          </Text>
                        </View>

                        {/* Badge de Aprovação */}
                        <View style={[
                          styles.statusBadge,
                          item.approved ? styles.statusBadgeApproved : styles.statusBadgePending
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            item.approved ? styles.statusBadgeTextApproved : styles.statusBadgeTextPending
                          ]}>
                            {item.approved ? 'APROVADO' : 'PENDENTE'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Ação de Aprovação Rápida (Se pendente) */}
                  {!item.approved && (
                    <TouchableOpacity 
                      style={styles.approveBtn}
                      onPress={() => handleOpenApproval(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.approveBtnText}>APROVAR</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={() => (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color="#606a5c" style={styles.emptyIcon} />
                  <Text style={styles.emptyTitle}>Nenhum Membro Encontrado</Text>
                  <Text style={styles.emptyText}>
                    Não há registros correspondentes aos filtros aplicados na rede.
                  </Text>
                </View>
              )}
            />
          )}

          {/* ================= MODAL: DETALHES DO OPERADOR ================= */}
          {selectedUser && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={detailsVisible}
              onRequestClose={() => setDetailsVisible(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalHeaderTitle}>FICHA DE OPERADOR</Text>
                    <TouchableOpacity onPress={() => setDetailsVisible(false)} style={styles.modalCloseBtn}>
                      <Ionicons name="close" size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                    <View style={styles.modalProfileHeader}>
                      <Text style={styles.modalName}>{selectedUser.name?.toUpperCase()}</Text>
                      <Text style={styles.modalEmail}>{selectedUser.email}</Text>
                      <Text style={{ color: '#c29014', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                        Grupo: {selectedUser.group || 'Não informado'}
                      </Text>
                      <Text style={styles.modalRoleText}>
                        Função: {selectedUser.role?.toUpperCase() || 'VOLUNTÁRIO'} | Status: {selectedUser.approved ? 'LIBERADO' : 'BLOQUEADO'}
                      </Text>
                    </View>

                    {selectedUser.onboarded && selectedUser.medicalInfo ? (
                      <>
                        {/* Tipo Sanguíneo */}
                        <View style={styles.bloodTypeContainer}>
                          <Text style={styles.bloodTypeLabel}>TIPO SANGUÍNEO</Text>
                          <Text style={styles.bloodTypeValue}>
                            {selectedUser.medicalInfo.bloodType || 'N/D'}
                          </Text>
                        </View>

                        {/* Informações Médicas */}
                        <View style={styles.medicalSection}>
                          <Text style={styles.medicalLabel}>Condições Crônicas / Alergias:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedUser.medicalInfo.chronicConditions || 'Nenhuma declarada'}
                          </Text>

                          <Text style={styles.medicalLabel}>Medicações de Uso Contínuo:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedUser.medicalInfo.medications || 'Nenhuma declarada'}
                          </Text>
                        </View>

                        {/* Contato de Emergência */}
                        <View style={styles.emergencyContactBox}>
                          <Text style={styles.emergencyTitle}>CONTATO DE EMERGÊNCIA</Text>
                          
                          <Text style={styles.medicalLabel}>Nome do Contato:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedUser.medicalInfo.emergencyContact?.name || 'Não fornecido'}
                          </Text>

                          <Text style={styles.medicalLabel}>Telefone:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedUser.medicalInfo.emergencyContact?.phone || 'Não fornecido'}
                          </Text>

                          <Text style={styles.medicalLabel}>Grau de Parentesco:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedUser.medicalInfo.emergencyContact?.relationship || 'Não fornecido'}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.noOnboardingBox}>
                        <Ionicons name="warning-outline" size={32} color="#606a5c" style={{ marginBottom: 8 }} />
                        <Text style={styles.noOnboardingTitle}>Ficha Médica Indisponível</Text>
                        <Text style={styles.noOnboardingText}>
                          Este operador ainda não realizou o preenchimento obrigatório da ficha médica no primeiro acesso.
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

          {/* ================= MODAL: CONFIRMAÇÃO DE APROVAÇÃO POR SENHA ================= */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={approvalVisible}
            onRequestClose={() => setApprovalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.approvalModalContent]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.securityHeaderTitle}>CONFIRMAÇÃO DE SEGURANÇA</Text>
                  <TouchableOpacity onPress={() => setApprovalVisible(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <View style={styles.approvalFormContainer}>
                  {approvalError ? <Text style={styles.errorBanner}>{approvalError}</Text> : null}

                  <Text style={styles.approvalInstruction}>
                    Para aprovar e liberar o acesso do voluntário <Text style={styles.boldText}>{approvalTarget?.name}</Text>, reinsira sua senha de login de administrador:
                  </Text>

                  <Input
                    placeholder="Sua senha de administrador"
                    secureTextEntry
                    iconName="key-outline"
                    value={adminPassword}
                    onChangeText={setAdminPassword}
                    autoCapitalize="none"
                  />

                  <View style={styles.approvalActionsRow}>
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.cancelActionBtn]}
                      onPress={() => setApprovalVisible(false)}
                      disabled={confirming}
                    >
                      <Text style={styles.cancelActionBtnText}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.confirmActionBtn]}
                      onPress={handleConfirmApproval}
                      disabled={confirming}
                    >
                      {confirming ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={styles.confirmActionBtnText}>Confirmar</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </Modal>

        </SafeAreaView>
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
    backgroundColor: 'rgba(12, 13, 12, 0.88)',
  },
  safeArea: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#4c5748',
    backgroundColor: 'rgba(28, 32, 26, 0.95)',
  },
  backBtn: {
    padding: 6,
    marginRight: 14,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#8fa882',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  controlBar: {
    backgroundColor: 'rgba(28, 32, 26, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#3d453a',
    gap: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c201a',
    borderWidth: 1.5,
    borderColor: '#3d453a',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    height: '100%',
  },
  clearSearchBtn: {
    padding: 4,
  },
  toggleWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  toggleText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loaderText: {
    color: '#8fa882',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(35, 42, 33, 0.95)',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4c5748',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    gap: 12,
  },
  memberTouchArea: {
    flex: 1,
  },
  memberMain: {
    flex: 1,
  },
  memberName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  memberNamePending: {
    color: '#606a5c', // Acinzentado para pendentes
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  roleBadgeAdmin: {
    backgroundColor: '#c29014',
  },
  roleBadgeVoluntario: {
    backgroundColor: '#3d453a',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleBadgeTextAdmin: {
    color: '#000000',
  },
  roleBadgeTextVoluntario: {
    color: '#aebfa7',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextApproved: {
    color: '#10b981',
  },
  statusBadgeTextPending: {
    color: '#ef4444',
  },
  approveBtn: {
    backgroundColor: '#c29014',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  approveBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 64,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  emptyText: {
    color: '#606a5c',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Estilos do Modal de Detalhes
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12, 13, 12, 0.8)',
  },
  modalContent: {
    backgroundColor: '#1c201a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '80%',
    borderWidth: 1.5,
    borderColor: '#4c5748',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#4c5748',
  },
  modalHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  modalProfileHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3d453a',
    paddingBottom: 12,
  },
  modalName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalEmail: {
    color: '#8fa882',
    fontSize: 13,
    marginTop: 2,
  },
  modalRoleText: {
    color: '#606a5c',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bloodTypeContainer: {
    backgroundColor: 'rgba(194, 144, 20, 0.08)',
    borderWidth: 1.5,
    borderColor: '#c29014',
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bloodTypeLabel: {
    color: '#c29014',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  bloodTypeValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },
  medicalSection: {
    marginBottom: 16,
  },
  medicalLabel: {
    color: '#606a5c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 10,
  },
  medicalValueText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 18,
  },
  emergencyContactBox: {
    backgroundColor: 'rgba(194, 144, 20, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(194, 144, 20, 0.2)',
    borderRadius: 6,
    padding: 16,
    marginTop: 10,
  },
  emergencyTitle: {
    color: '#c29014',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(194, 144, 20, 0.15)',
    paddingBottom: 6,
  },
  noOnboardingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#131612',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3d453a',
    marginTop: 10,
  },
  noOnboardingTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  noOnboardingText: {
    color: '#606a5c',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Estilos da aprovação com confirmação de senha
  approvalModalContent: {
    height: 'auto',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomWidth: 1.5,
  },
  securityHeaderTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  approvalFormContainer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  approvalInstruction: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: '700',
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
  approvalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelActionBtn: {
    borderWidth: 1.5,
    borderColor: '#3d453a',
    backgroundColor: 'transparent',
  },
  confirmActionBtn: {
    backgroundColor: '#c29014',
  },
  cancelActionBtnText: {
    color: '#606a5c',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmActionBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
