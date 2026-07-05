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
  Image,
  TextInput,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../../services/firebase';
import MissionCard from '../../components/MissionCard';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { Ionicons } from '@expo/vector-icons';
import { requestNotificationPermissions, scheduleMissionReminders, cancelMissionReminders } from '../../utils/notifications';

const CATEGORIES = ['Rapel', 'Trilha', 'Airsoft', 'Acampamento', 'Outra Atividade'];

export default function Dashboard() {
  const { user, profile, logout, reloadProfile } = useAuth();
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' ou 'mine'

  // Estados de Abas
  const [activeTab, setActiveTab] = useState('missions'); // 'missions', 'profile', 'members'

  // Estados de Edição de Perfil (Ficha Médica)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editGroup, setEditGroup] = useState('');
  const [editBloodType, setEditBloodType] = useState('');
  const [editChronic, setEditChronic] = useState('');
  const [editMedications, setEditMedications] = useState('');
  const [editEmergencyName, setEmergencyName] = useState('');
  const [editEmergencyPhone, setEmergencyPhone] = useState('');
  const [editEmergencyRelationship, setEmergencyRelationship] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Estados de Voluntários (Membros - Admin)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [hidePending, setHidePending] = useState(false);

  // Estados de Aprovação por Senha de Admin
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [confirming, setConfirming] = useState(false);

  // Solicitar permissões ao abrir o dashboard
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Estados dos Modais
  const [selectedMission, setSelectedMission] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  
  const [selectedMedicalProfile, setSelectedMedicalProfile] = useState(null);
  const [medicalVisible, setMedicalVisible] = useState(false);
  const [loadingMedical, setLoadingMedical] = useState(false);

  // Estados do CRUD de Missão (Admin)
  const [formVisible, setFormVisible] = useState(false);
  const [editingMission, setEditingMission] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('trilha');
  const [formLocation, setFormLocation] = useState('');
  const [formData, setFormData] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'missions'), orderBy('date', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const missionsList = [];
      snapshot.forEach((doc) => {
        missionsList.push({ id: doc.id, ...doc.data() });
      });
      setMissions(missionsList);
      setLoadingMissions(false);
    }, (error) => {
      console.error("Erro ao buscar missões do Firestore:", error);
      setLoadingMissions(false);
    });

    return unsubscribe;
  }, []);

  // Iniciar edição do perfil preenchendo os estados imperativamente
  const handleStartEditing = () => {
    setEditGroup(profile?.group || '');
    if (profile?.medicalInfo) {
      setEditBloodType(profile.medicalInfo.bloodType || '');
      setEditChronic(profile.medicalInfo.chronicConditions || '');
      setEditMedications(profile.medicalInfo.medications || '');
      setEmergencyName(profile.medicalInfo.emergencyContact?.name || '');
      setEmergencyPhone(profile.medicalInfo.emergencyContact?.phone || '');
      setEmergencyRelationship(profile.medicalInfo.emergencyContact?.relationship || '');
    } else {
      setEditBloodType('');
      setEditChronic('');
      setEditMedications('');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRelationship('');
    }
    setIsEditingProfile(true);
  };

  // Buscar lista de voluntários (apenas para Administradores)
  useEffect(() => {
    if (profile?.role !== 'administrador') return;

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
  }, [profile]);

  // Lógica de Salvar o Próprio Perfil (Ficha Médica)
  const handleSaveProfile = async () => {
    setProfileError('');
    if (!editGroup.trim()) {
      setProfileError("O campo Grupo é obrigatório.");
      return;
    }
    if (!editBloodType) {
      setProfileError("Selecione seu tipo sanguíneo.");
      return;
    }
    if (!editEmergencyName.trim() || !editEmergencyPhone.trim()) {
      setProfileError("Nome e telefone de emergência são obrigatórios.");
      return;
    }

    setSavingProfile(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        group: editGroup.trim(),
        medicalInfo: {
          bloodType: editBloodType,
          chronicConditions: editChronic.trim(),
          medications: editMedications.trim(),
          emergencyContact: {
            name: editEmergencyName.trim(),
            phone: editEmergencyPhone.trim(),
            relationship: editEmergencyRelationship.trim()
          }
        }
      });
      await reloadProfile();
      Alert.alert("Sucesso", "Ficha médica atualizada com sucesso.");
      setIsEditingProfile(false);
    } catch (err) {
      console.error("Erro ao atualizar ficha médica:", err);
      setProfileError("Falha ao gravar no banco de dados.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Lógica de Aprovação de Voluntário por Senha
  const handleOpenApproval = (userToApprove) => {
    setApprovalTarget(userToApprove);
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
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Administrador não autenticado no Auth.");

      const credential = EmailAuthProvider.credential(currentUser.email, adminPassword);
      await reauthenticateWithCredential(currentUser, credential);

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

  // Fechar modal de detalhes e limpar participantes
  const handleCloseDetails = () => {
    setDetailsVisible(false);
    setSelectedMission(null);
    setParticipants([]);
    setLoadingParticipants(false);
  };

  // Monitorar carregamento de participantes para a missão aberta
  useEffect(() => {
    if (!selectedMission || !detailsVisible || profile?.role !== 'administrador') {
      return;
    }

    const enrollmentsRef = collection(db, 'missions', selectedMission.id, 'enrollments');
    const unsubscribe = onSnapshot(enrollmentsRef, (snapshot) => {
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setParticipants(list);
      setLoadingParticipants(false);
    }, (err) => {
      console.error("Erro ao carregar inscritos:", err);
      setLoadingParticipants(false);
    });

    return unsubscribe;
  }, [selectedMission, detailsVisible, profile?.role]);

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return '';
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  };

  const handleSignUp = async (missionId) => {
    const mission = missions.find(m => m.id === missionId);
    if (!mission) return;

    const formattedDate = formatDate(mission.date);
    const waiverMessage = `Ao inscrever-se para a missão ${mission.title?.toUpperCase()} em ${mission.location || 'QG GMV'}, no dia ${formattedDate}, você concorda com os riscos associados à atividade.`;

    Alert.alert(
      "TERMO DE RESPONSABILIDADE",
      waiverMessage,
      [
        { text: "Abortar / Cancelar", style: "cancel" },
        { 
          text: "Concordar e Alistar-se", 
          style: "default",
          onPress: async () => {
            try {
              const missionRef = doc(db, 'missions', missionId);
              await updateDoc(missionRef, {
                participants: arrayUnion(user.uid)
              });

              const enrollRef = doc(db, 'missions', missionId, 'enrollments', user.uid);
              await setDoc(enrollRef, {
                userId: user.uid,
                userName: profile.name,
                userEmail: profile.email,
                userRole: profile.role,
                acceptedAt: new Date().toISOString()
              });

              // Agendar lembretes locais para o dia anterior e dia da missão
              await scheduleMissionReminders(mission);

              Alert.alert("Sucesso", "Você foi alistado com sucesso nesta missão.");
            } catch (error) {
              console.error("Erro no alistamento:", error);
              Alert.alert("Erro", "Não foi possível concluir o alistamento.");
            }
          }
        }
      ]
    );
  };

  const handleCancel = async (missionId) => {
    Alert.alert(
      "Confirmar Dispensa",
      "Deseja mesmo cancelar sua inscrição nesta missão?",
      [
        { text: "Manter Alistamento", style: "cancel" },
        { 
          text: "Confirmar Saída", 
          style: "destructive",
          onPress: async () => {
            try {
              const missionRef = doc(db, 'missions', missionId);
              await updateDoc(missionRef, {
                participants: arrayRemove(user.uid)
              });

              const enrollRef = doc(db, 'missions', missionId, 'enrollments', user.uid);
              await deleteDoc(enrollRef);

              // Cancelar lembretes agendados para esta missão
              await cancelMissionReminders(missionId);

              Alert.alert("Dispensado", "Sua inscrição foi cancelada com sucesso.");
            } catch (error) {
              console.error("Erro ao cancelar inscrição:", error);
              Alert.alert("Erro", "Não foi possível cancelar sua inscrição.");
            }
          }
        }
      ]
    );
  };

  const handleDateChange = (text) => {
    // Se o usuário está apagando (o comprimento diminuiu), não formate para evitar travar o backspace
    if (text.length < formData.length) {
      setFormData(text);
      return;
    }

    // Permitir apenas números e barras
    let cleaned = text.replace(/[^0-9/]/g, '');

    // Evitar barras repetidas
    cleaned = cleaned.replace(/\/{2,}/g, '/');

    const parts = cleaned.split('/');

    // Formatar se o usuário digitar sem barras
    if (parts[0] && parts[0].length > 2) {
      cleaned = `${parts[0].slice(0, 2)}/${parts[0].slice(2)}`;
    }
    
    const newParts = cleaned.split('/');
    if (newParts[1] && newParts[1].length > 2) {
      cleaned = `${newParts[0]}/${newParts[1].slice(0, 2)}/${newParts[1].slice(2)}`;
    }

    // Auto-inserção de barras nas posições 2 e 5
    if (cleaned.length === 2 && !cleaned.includes('/')) {
      cleaned += '/';
    } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
      cleaned += '/';
    }

    setFormData(cleaned.slice(0, 10));
  };

  const handleTimeChange = (text) => {
    // Se o usuário está apagando, apenas atualize o estado
    if (text.length < formTime.length) {
      setFormTime(text);
      return;
    }

    // Permitir apenas números e dois pontos
    let cleaned = text.replace(/[^0-9:]/g, '');

    // Evitar dois pontos repetidos
    cleaned = cleaned.replace(/:{2,}/g, ':');

    const parts = cleaned.split(':');

    // Formatar se o usuário digitar sem dois pontos
    if (parts[0] && parts[0].length > 2) {
      cleaned = `${parts[0].slice(0, 2)}:${parts[0].slice(2)}`;
    }

    // Auto-inserção de dois pontos na posição 2
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      cleaned += ':';
    }

    setFormTime(cleaned.slice(0, 5));
  };

  const handleOpenCreateModal = () => {
    setEditingMission(null);
    setFormTitle('');
    setFormCategory('trilha');
    setFormLocation('');
    setFormData('');
    setFormTime('');
    setFormResponsible('');
    setFormPhotoUrl('');
    setFormDescription('');
    setFormError('');
    setFormVisible(true);
  };

  const handleOpenEditModal = (mission) => {
    setEditingMission(mission);
    setFormTitle(mission.title || '');
    setFormCategory(mission.category || 'trilha');
    setFormLocation(mission.location || '');
    
    // Formatar data para DD/MM/AAAA
    const d = mission.date.toDate ? mission.date.toDate() : new Date(mission.date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    setFormData(`${day}/${month}/${year}`);
    
    // Formatar hora para HH:MM
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setFormTime(`${hours}:${minutes}`);
    
    setFormResponsible(mission.responsibleName || '');
    setFormPhotoUrl(mission.photoUrl || '');
    setFormDescription(mission.description || '');
    setFormError('');
    setFormVisible(true);
  };

  const handleSaveMission = async () => {
    setFormError('');
    
    if (!formTitle.trim() || !formLocation.trim() || !formCategory || !formData.trim()) {
      setFormError("Preencha todos os campos obrigatórios (Título, Local, Categoria, Data).");
      return;
    }

    // Normalizar a data (preencher com zero à esquerda e século 20 se ano for 2 dígitos)
    let normalizedDate = formData.trim();
    const dateParts = normalizedDate.split('/');
    if (dateParts.length === 3) {
      const dPart = dateParts[0].padStart(2, '0');
      const mPart = dateParts[1].padStart(2, '0');
      let yPart = dateParts[2];
      if (yPart.length === 2) {
        yPart = '20' + yPart;
      }
      normalizedDate = `${dPart}/${mPart}/${yPart}`;
      setFormData(normalizedDate); // Atualiza no formulário
    }

    // Normalizar o horário (preencher com zeros)
    let normalizedTime = formTime.trim();
    if (normalizedTime) {
      const timeParts = normalizedTime.split(':');
      if (timeParts.length === 2) {
        const hPart = timeParts[0].padStart(2, '0');
        const minPart = timeParts[1].padStart(2, '0');
        normalizedTime = `${hPart}:${minPart}`;
      } else if (timeParts.length === 1 && timeParts[0].length > 0) {
        normalizedTime = `${timeParts[0].padStart(2, '0')}:00`;
      }
      setFormTime(normalizedTime); // Atualiza no formulário
    } else {
      normalizedTime = '08:00';
      setFormTime(normalizedTime);
    }

    // Validar formato de data DD/MM/AAAA
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(normalizedDate)) {
      setFormError("Formato de data inválido. Use DD/MM/AAAA.");
      return;
    }

    // Validar formato de hora HH:MM
    if (!/^(\d{2}):(\d{2})$/.test(normalizedTime)) {
      setFormError("Formato de hora inválido. Use HH:MM.");
      return;
    }

    // Parse de data
    const [day, month, year] = normalizedDate.split('/').map(Number);
    const [hour, minute] = normalizedTime.split(':').map(Number);
    
    const parsedDate = new Date(year, month - 1, day, hour, minute);
    if (isNaN(parsedDate.getTime())) {
      setFormError("Data ou Horário inválido.");
      return;
    }

    // Validar que não é data passada
    const now = new Date();
    if (parsedDate < now) {
      setFormError("Agendamento inválido. Não é permitido criar missões no passado (tempo local de Brasília).");
      return;
    }

    setSavingForm(true);
    try {
      const missionData = {
        title: formTitle.trim(),
        category: formCategory,
        location: formLocation.trim(),
        date: parsedDate,
        responsibleName: formResponsible.trim(), // Se vazio, salva vazio e não será exibido
        photoUrl: formPhotoUrl.trim(),
        description: formDescription.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingMission) {
        // Editar
        const missionRef = doc(db, 'missions', editingMission.id);
        await updateDoc(missionRef, {
          ...missionData
        });
        Alert.alert("Sucesso", "Ordem de missão atualizada.");
      } else {
        // Criar
        const newMission = {
          ...missionData,
          participants: [],
          createdBy: user.uid,
          createdAt: new Date().toISOString()
        };
        await addDoc(collection(db, 'missions'), newMission);
        Alert.alert("Sucesso", "Nova missão publicada.");
      }
      setFormVisible(false);
    } catch (err) {
      console.error("Erro ao salvar missão:", err);
      setFormError("Erro ao gravar dados no Firestore.");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDeleteMission = async () => {
    if (!editingMission) return;

    // Verificar se a data é passada. Se for, bloqueia exclusão
    const missionDate = editingMission.date.toDate ? editingMission.date.toDate() : new Date(editingMission.date);
    const now = new Date();
    if (missionDate < now) {
      Alert.alert("Acesso Negado", "Não é permitido excluir uma missão do passado. Ela deve ser mantida como registro histórico.");
      return;
    }

    Alert.alert(
      "EXCLUIR MISSÃO",
      "Deseja realmente excluir permanentemente esta missão? Esta ação é irreversível.",
      [
        { text: "Abortar", style: "cancel" },
        {
          text: "Confirmar Exclusão",
          style: "destructive",
          onPress: async () => {
            try {
              // Deletar inscrições associadas primeiro
              const enrollsQuery = await getDocs(collection(db, 'missions', editingMission.id, 'enrollments'));
              for (const docSnap of enrollsQuery.docs) {
                await deleteDoc(docSnap.ref);
              }
              // Deletar documento da missão
              await deleteDoc(doc(db, 'missions', editingMission.id));
              
              Alert.alert("Excluída", "A missão foi removida com sucesso.");
              setFormVisible(false);
            } catch (err) {
              console.error("Erro ao excluir missão:", err);
              Alert.alert("Erro", "Não foi possível excluir a missão.");
            }
          }
        }
      ]
    );
  };

  const handleViewDetails = (mission) => {
    setLoadingParticipants(true);
    setSelectedMission(mission);
    setDetailsVisible(true);
  };

  const handleViewMedicalProfile = async (volunteerId) => {
    setLoadingMedical(true);
    setSelectedMedicalProfile(null);
    setMedicalVisible(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', volunteerId));
      if (userDoc.exists()) {
        setSelectedMedicalProfile(userDoc.data());
      } else {
        Alert.alert("Erro", "Documento do usuário não encontrado.");
        setMedicalVisible(false);
      }
    } catch (err) {
      console.error("Erro ao carregar ficha médica:", err);
      Alert.alert("Erro", "Falha ao consultar a ficha médica.");
      setMedicalVisible(false);
    } finally {
      setLoadingMedical(false);
    }
  };

  const isMissionInPast = (dateVal) => {
    if (!dateVal) return false;
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return d < new Date();
  };

  const filteredMissions = missions.filter(m => {
    if (filter === 'mine') {
      return m.participants?.includes(user?.uid);
    }
    return true;
  });

  return (
    <ImageBackground 
      source={require('../../../assets/images/camo-dark.jpg')} 
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header Tático */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{profile?.name || 'Operador'}</Text>
              {profile?.role === 'administrador' ? (
                <Text style={styles.userRoleAdmin}>
                  [ADMINISTRADOR] | SANGUE: {profile?.medicalInfo?.bloodType || 'N/D'}
                </Text>
              ) : (
                <Text style={styles.userRoleVoluntario}>
                  OP: VOLUNTÁRIO | SANGUE: {profile?.medicalInfo?.bloodType || 'N/D'}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          </View>

          {/* Barra de Abas Amarela */}
          <View style={styles.tabBar}>
            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'missions' && styles.tabItemActive]}
              onPress={() => {
                setActiveTab('missions');
                setIsEditingProfile(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="radio-outline" size={18} color={activeTab === 'missions' ? '#c29014' : '#606a5c'} />
              <Text style={[styles.tabText, activeTab === 'missions' && styles.tabTextActive]}>
                Missões
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
              onPress={() => {
                setActiveTab('profile');
                setIsEditingProfile(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={18} color={activeTab === 'profile' ? '#c29014' : '#606a5c'} />
              <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>
                Meu Perfil
              </Text>
            </TouchableOpacity>

            {profile?.role === 'administrador' && (
              <TouchableOpacity 
                style={[styles.tabItem, activeTab === 'members' && styles.tabItemActive]}
                onPress={() => {
                  setActiveTab('members');
                  setIsEditingProfile(false);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="people-outline" size={18} color={activeTab === 'members' ? '#c29014' : '#606a5c'} />
                <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
                  Voluntários
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Botão Nova Missão (Abaixo da Barra de Abas Amarela) */}
          {profile?.role === 'administrador' && activeTab === 'missions' && (
            <View style={styles.createMissionBar}>
              <TouchableOpacity 
                style={styles.createMissionBtn}
                onPress={handleOpenCreateModal}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={18} color="#000000" />
                <Text style={styles.createMissionBtnText}>Nova Missão</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* CONTEÚDO DA ABA: MISSÕES */}
          {activeTab === 'missions' && (
            <>
              {/* Filtros Rápidos (Apenas se Voluntário) */}
              {profile?.role !== 'administrador' && (
                <View style={styles.filterContainer}>
                  <TouchableOpacity 
                    style={[styles.filterBtn, filter === 'all' && styles.filterBtnActive]}
                    onPress={() => setFilter('all')}
                  >
                    <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
                      Quadro de Missões
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.filterBtn, filter === 'mine' && styles.filterBtnActive]}
                    onPress={() => setFilter('mine')}
                  >
                    <Text style={[styles.filterText, filter === 'mine' && styles.filterTextActive]}>
                      Minhas Escalas ({missions.filter(m => m.participants?.includes(user?.uid)).length})
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {loadingMissions ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#c29014" />
                  <Text style={styles.loaderText}>Sincronizando frequências de rádio...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredMissions}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <MissionCard
                      mission={item}
                      userId={user.uid}
                      userRole={profile?.role}
                      onSignUp={handleSignUp}
                      onCancel={handleCancel}
                      onManage={handleOpenEditModal}
                      onPressCard={handleViewDetails}
                    />
                  )}
                  ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="radio-outline" size={48} color="#606a5c" style={styles.emptyIcon} />
                      <Text style={styles.emptyTitle}>Sem Operações Ativas</Text>
                      <Text style={styles.emptyText}>
                        Nenhuma missão correspondente foi localizada na rede de transmissão no momento.
                      </Text>
                    </View>
                  )}
                />
              )}
            </>
          )}

          {/* CONTEÚDO DA ABA: MEU PERFIL */}
          {activeTab === 'profile' && profile && (
            <ScrollView style={styles.profileContainer} contentContainerStyle={styles.profileContentContainer}>
              {profileError ? <Text style={styles.errorBanner}>{profileError}</Text> : null}

              {isEditingProfile ? (
                // FORMULÁRIO DE EDIÇÃO DA FICHA MÉDICA
                <View style={styles.profileCard}>
                  <Text style={styles.profileCardTitle}>EDITAR FICHA MÉDICA</Text>

                  {/* Grupo / Organização */}
                  <Input
                    label="Grupo / Organização *"
                    placeholder="Ex: GMV, Visitante, Outro..."
                    value={editGroup}
                    onChangeText={setEditGroup}
                  />
                  
                  {/* Tipo Sanguíneo */}
                  <Text style={styles.formSectionLabel}>Tipo Sanguíneo *</Text>
                  <View style={styles.bloodTypeSelectorGrid}>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.bloodTypeOptionBtn,
                          editBloodType === type && styles.bloodTypeOptionBtnActive
                        ]}
                        onPress={() => setEditBloodType(type)}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.bloodTypeOptionText,
                          editBloodType === type && styles.bloodTypeOptionTextActive
                        ]}>
                          {type}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Input
                    label="Condições Crônicas / Alergias"
                    placeholder="Ex: Asma, alergia a dipirona..."
                    value={editChronic}
                    onChangeText={setEditChronic}
                  />

                  <Input
                    label="Medicações de Uso Contínuo"
                    placeholder="Ex: Insulina, anti-hipertensivo..."
                    value={editMedications}
                    onChangeText={setEditMedications}
                  />

                  <Text style={styles.emergencyContactHeader}>CONTATO DE EMERGÊNCIA</Text>
                  
                  <Input
                    label="Nome do Contato *"
                    placeholder="Ex: Maria (Esposa)"
                    value={editEmergencyName}
                    onChangeText={setEmergencyName}
                  />

                  <Input
                    label="Telefone do Contato *"
                    placeholder="Ex: (82) 99999-9999"
                    value={editEmergencyPhone}
                    onChangeText={setEmergencyPhone}
                    keyboardType="phone-pad"
                  />

                  <Input
                    label="Grau de Parentesco"
                    placeholder="Ex: Cônjuge, Mãe, Irmão..."
                    value={editEmergencyRelationship}
                    onChangeText={setEmergencyRelationship}
                  />

                  <View style={styles.profileActionsRow}>
                    <TouchableOpacity 
                      style={[styles.profileActionBtn, styles.profileCancelBtn]}
                      onPress={() => setIsEditingProfile(false)}
                      disabled={savingProfile}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.profileCancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.profileActionBtn, styles.profileSaveBtn]}
                      onPress={handleSaveProfile}
                      disabled={savingProfile}
                      activeOpacity={0.8}
                    >
                      {savingProfile ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={styles.profileSaveBtnText}>Salvar Ficha</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                // VISUALIZAÇÃO DOS DADOS DO PERFIL
                <View style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <Ionicons name="person-circle-sharp" size={72} color="#8fa882" style={styles.profileAvatar} />
                    <Text style={styles.profileNameText}>{profile.name?.toUpperCase()}</Text>
                    <Text style={styles.profileEmailText}>{profile.email}</Text>
                    <Text style={{ color: '#c29014', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                      GRUPO: {profile.group || 'Não informado'}
                    </Text>
                    <View style={[
                      styles.profileBadge, 
                      profile.role === 'administrador' ? styles.roleBadgeAdmin : styles.roleBadgeVoluntario
                    ]}>
                      <Text style={[
                        styles.profileBadgeText,
                        profile.role === 'administrador' ? styles.roleBadgeTextAdmin : styles.roleBadgeTextVoluntario
                      ]}>
                        {profile.role === 'administrador' ? 'ADMINISTRADOR' : 'OPERADOR VOLUNTÁRIO'}
                      </Text>
                    </View>
                  </View>

                  {/* Grupo Sanguíneo */}
                  <View style={styles.bloodTypeContainer}>
                    <Text style={styles.bloodTypeLabel}>TIPO SANGUÍNEO</Text>
                    <Text style={styles.bloodTypeValue}>
                      {profile.medicalInfo?.bloodType || 'N/D'}
                    </Text>
                  </View>

                  {/* Informações Médicas */}
                  <View style={styles.medicalSection}>
                    <Text style={styles.medicalLabel}>Condições Crônicas / Alergias:</Text>
                    <Text style={styles.medicalValueText}>
                      {profile.medicalInfo?.chronicConditions || 'Nenhuma declarada'}
                    </Text>

                    <Text style={styles.medicalLabel}>Medicações de Uso Contínuo:</Text>
                    <Text style={styles.medicalValueText}>
                      {profile.medicalInfo?.medications || 'Nenhuma declarada'}
                    </Text>
                  </View>

                  {/* Contato de Emergência */}
                  <View style={styles.emergencyContactBox}>
                    <Text style={styles.emergencyTitle}>CONTATO DE EMERGÊNCIA</Text>
                    
                    <Text style={styles.medicalLabel}>Nome do Contato:</Text>
                    <Text style={styles.medicalValueText}>
                      {profile.medicalInfo?.emergencyContact?.name || 'Não fornecido'}
                    </Text>

                    <Text style={styles.medicalLabel}>Telefone:</Text>
                    <Text style={styles.medicalValueText}>
                      {profile.medicalInfo?.emergencyContact?.phone || 'Não fornecido'}
                    </Text>

                    <Text style={styles.medicalLabel}>Grau de Parentesco:</Text>
                    <Text style={styles.medicalValueText}>
                      {profile.medicalInfo?.emergencyContact?.relationship || 'Não fornecido'}
                    </Text>
                  </View>

                  <Button
                    title="Atualizar Ficha Médica"
                    onPress={handleStartEditing}
                    style={styles.editProfileBtn}
                  />
                </View>
              )}

              {/* SEÇÃO DE MISSÕES DO OPERADOR / ADMINISTRADOR */}
              <View style={styles.userMissionsSection}>
                <Text style={styles.userMissionsTitle}>Minhas Missões</Text>
                
                {/* Escalas Confirmadas (Ativas) */}
                <Text style={styles.missionSubSectionHeader}>Escalas Confirmadas</Text>
                {missions.filter(m => m.participants?.includes(user?.uid) && !isMissionInPast(m.date)).length === 0 ? (
                  <Text style={styles.noMissionsText}>Nenhuma missão agendada.</Text>
                ) : (
                  missions.filter(m => m.participants?.includes(user?.uid) && !isMissionInPast(m.date)).map(m => (
                    <TouchableOpacity 
                      key={m.id} 
                      style={styles.userMissionRow}
                      onPress={() => handleViewDetails(m)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkbox-outline" size={20} color="#10b981" />
                      <View style={styles.userMissionInfo}>
                        <Text style={styles.userMissionName}>{m.title}</Text>
                        <Text style={styles.userMissionDate}>
                          {formatDate(m.date)} | {m.location}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={16} color="#606a5c" />
                    </TouchableOpacity>
                  ))
                )}

                {/* Histórico de Missões (Passadas) */}
                <Text style={styles.missionSubSectionHeader}>Histórico de Missões</Text>
                {missions.filter(m => m.participants?.includes(user?.uid) && isMissionInPast(m.date)).length === 0 ? (
                  <Text style={styles.noMissionsText}>Nenhuma missão concluída no histórico.</Text>
                ) : (
                  missions.filter(m => m.participants?.includes(user?.uid) && isMissionInPast(m.date)).map(m => (
                    <TouchableOpacity 
                      key={m.id} 
                      style={[styles.userMissionRow, styles.userMissionRowPast]}
                      onPress={() => handleViewDetails(m)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle-outline" size={20} color="#606a5c" />
                      <View style={styles.userMissionInfo}>
                        <Text style={[styles.userMissionName, styles.userMissionNamePast]}>{m.title}</Text>
                        <Text style={styles.userMissionDate}>
                          {formatDate(m.date)} | {m.location}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward-outline" size={16} color="#606a5c" />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          )}

          {/* CONTEÚDO DA ABA: VOLUNTÁRIOS (ADMIN ONLY) */}
          {activeTab === 'members' && profile?.role === 'administrador' && (
            <View style={styles.membersContainer}>
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
                  data={users.filter(u => {
                    if (hidePending && !u.approved) return false;
                    const term = search.toLowerCase();
                    return u.name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
                  })}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.membersListContainer}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.memberCard}>
                      <TouchableOpacity 
                        style={styles.memberTouchArea}
                        onPress={() => handleViewMedicalProfile(item.id)}
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
            </View>
          )}

          {/* ================= MODAL: DETALHES DA MISSÃO ================= */}
          {selectedMission && (
            <Modal
              animationType="slide"
              transparent={true}
              visible={detailsVisible}
              onRequestClose={handleCloseDetails}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  {/* Banner da Foto se houver */}
                  {selectedMission.photoUrl && selectedMission.photoUrl.trim() !== '' ? (
                    <View style={styles.bannerContainer}>
                      <Image 
                        source={{ uri: selectedMission.photoUrl }} 
                        style={styles.bannerImage}
                        resizeMode="cover"
                      />
                      <TouchableOpacity onPress={handleCloseDetails} style={styles.bannerCloseBtn}>
                        <Ionicons name="close" size={24} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                        {selectedMission.title?.toUpperCase()}
                      </Text>
                      <TouchableOpacity onPress={handleCloseDetails} style={styles.modalCloseBtn}>
                        <Ionicons name="close" size={24} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  )}

                  <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                    {/* Título abaixo do banner se houver banner */}
                    {selectedMission.photoUrl && selectedMission.photoUrl.trim() !== '' && (
                      <Text style={styles.modalTitleUnderBanner}>
                        {selectedMission.title?.toUpperCase()}
                      </Text>
                    )}

                    {/* Informações Gerais */}
                    <View style={styles.modalSection}>
                      <Text style={styles.modalLabel}>Operação / Tipo:</Text>
                      <Text style={styles.modalValue}>{selectedMission.category?.toUpperCase() || 'MISSÃO'}</Text>

                      {/* Só exibe Responsável se a informação existir */}
                      {selectedMission.responsibleName && selectedMission.responsibleName.trim() !== '' ? (
                        <>
                          <Text style={styles.modalLabel}>Líder Responsável:</Text>
                          <Text style={styles.modalValue}>{selectedMission.responsibleName}</Text>
                        </>
                      ) : null}

                      <Text style={styles.modalLabel}>Data e Horário:</Text>
                      <Text style={styles.modalValue}>{formatDateTime(selectedMission.date)}</Text>

                      <Text style={styles.modalLabel}>QG / Local de Encontro:</Text>
                      <Text style={styles.modalValue}>{selectedMission.location || 'QG GMV'}</Text>
                    </View>

                    {/* Descrição detalhada */}
                    <View style={[styles.modalSection, styles.descriptionBox]}>
                      <Text style={styles.modalLabel}>Diretrizes e Instruções:</Text>
                      <Text style={styles.descriptionText}>
                        {selectedMission.description || 'Nenhuma instrução adicional foi publicada para esta missão.'}
                      </Text>
                    </View>

                    {/* Painel do Administrador: Participantes e Ficha Médica */}
                    {profile?.role === 'administrador' && (
                      <View style={[styles.modalSection, styles.adminSection]}>
                        <Text style={styles.adminSectionHeader}>Voluntários Convocados ({participants.length})</Text>
                        
                        {loadingParticipants ? (
                          <ActivityIndicator size="small" color="#c29014" style={{ marginVertical: 12 }} />
                        ) : participants.length === 0 ? (
                          <Text style={styles.noParticipantsText}>Nenhum operador alistado no momento.</Text>
                        ) : (
                          <View style={styles.participantsList}>
                            {participants.map((p) => (
                              <TouchableOpacity
                                key={p.id}
                                style={styles.participantRow}
                                onPress={() => handleViewMedicalProfile(p.userId)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="person-circle-outline" size={24} color="#8fa882" />
                                <View style={styles.participantInfo}>
                                  <Text style={styles.participantName}>{p.userName || 'Recruta'}</Text>
                                  <Text style={styles.participantSubtext}>
                                    Aceite em: {formatDateTime(p.acceptedAt)}
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward-outline" size={16} color="#606a5c" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            </Modal>
          )}

          {/* ================= MODAL: FICHA MÉDICA DE VOLUNTÁRIO (ADMIN ONLY) ================= */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={medicalVisible}
            onRequestClose={() => setMedicalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, styles.medicalModalContent]}>
                <View style={[styles.modalHeader, styles.medicalModalHeader]}>
                  <Text style={styles.medicalHeaderTitle}>PRONTUÁRIO DE EMERGÊNCIA</Text>
                  <TouchableOpacity onPress={() => setMedicalVisible(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {loadingMedical ? (
                  <View style={styles.medicalLoaderContainer}>
                    <ActivityIndicator size="large" color="#ef4444" />
                    <Text style={styles.medicalLoaderText}>Acessando prontuário criptografado...</Text>
                  </View>
                ) : selectedMedicalProfile ? (
                  <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                    <View style={styles.medicalProfileHeader}>
                      <Text style={styles.medicalName}>{selectedMedicalProfile.name?.toUpperCase()}</Text>
                      <Text style={styles.medicalEmail}>{selectedMedicalProfile.email}</Text>
                      <Text style={{ color: '#c29014', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                        GRUPO: {selectedMedicalProfile.group || 'Não informado'}
                      </Text>
                      {selectedMedicalProfile.role === 'voluntario' && (
                        <Text style={[styles.medicalRoleText, { color: selectedMedicalProfile.approved ? '#8fa882' : '#ef4444', fontSize: 11, fontWeight: '750', marginTop: 4, letterSpacing: 0.5 }]}>
                          STATUS: {selectedMedicalProfile.approved ? 'APROVADO / LIBERADO' : 'PENDENTE / BLOQUEADO'}
                        </Text>
                      )}
                    </View>

                    {selectedMedicalProfile.onboarded && selectedMedicalProfile.medicalInfo ? (
                      <>
                        {/* Grupo Sanguíneo Destacado */}
                        <View style={styles.bloodTypeContainer}>
                          <Text style={styles.bloodTypeLabel}>TIPO SANGUÍNEO</Text>
                          <Text style={styles.bloodTypeValue}>
                            {selectedMedicalProfile.medicalInfo.bloodType || 'N/D'}
                          </Text>
                        </View>

                        {/* Detalhes Médicos */}
                        <View style={styles.medicalSection}>
                          <Text style={styles.medicalLabel}>Condições Crônicas / Alergias:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedMedicalProfile.medicalInfo.chronicConditions || 'Nenhuma declarada'}
                          </Text>

                          <Text style={styles.medicalLabel}>Medicações de Uso Contínuo:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedMedicalProfile.medicalInfo.medications || 'Nenhuma declarada'}
                          </Text>
                        </View>

                        {/* Contato de Emergência */}
                        <View style={[styles.medicalSection, styles.emergencyContactBox]}>
                          <Text style={styles.emergencyTitle}>CONTATO DE EMERGÊNCIA</Text>
                          
                          <Text style={styles.medicalLabel}>Nome:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedMedicalProfile.medicalInfo.emergencyContact?.name || 'Não fornecido'}
                          </Text>

                          <Text style={styles.medicalLabel}>Telefone:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedMedicalProfile.medicalInfo.emergencyContact?.phone || 'Não fornecido'}
                          </Text>

                          <Text style={styles.medicalLabel}>Grau de Parentesco:</Text>
                          <Text style={styles.medicalValueText}>
                            {selectedMedicalProfile.medicalInfo.emergencyContact?.relationship || 'Não fornecido'}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.noOnboardingBox}>
                        <Ionicons name="warning-outline" size={32} color="#606a5c" style={{ marginBottom: 8, alignSelf: 'center' }} />
                        <Text style={styles.noOnboardingTitle}>Ficha Médica Indisponível</Text>
                        <Text style={styles.noOnboardingText}>
                          Este operador ainda não realizou o preenchimento obrigatório da ficha médica.
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                ) : (
                  <View style={styles.medicalLoaderContainer}>
                    <Text style={styles.medicalLoaderText}>Erro ao carregar dados do voluntário.</Text>
                  </View>
                )}
              </View>
            </View>
          </Modal>

          {/* ================= MODAL: FORMULÁRIO DE MISSÃO (ADMIN ONLY) ================= */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={formVisible}
            onRequestClose={() => setFormVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalHeaderTitle}>
                    {editingMission ? "EDITAR ORDEM DE MISSÃO" : "NOVA ORDEM DE MISSÃO"}
                  </Text>
                  <TouchableOpacity onPress={() => setFormVisible(false)} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                  {formError ? <Text style={styles.errorBanner}>{formError}</Text> : null}

                  <Input
                    label="Título da Operação *"
                    placeholder="Ex: Trilha de Sobrevivência 5km"
                    value={formTitle}
                    onChangeText={setFormTitle}
                  />

                  <Input
                    label="Local de Encontro / QG *"
                    placeholder="Ex: Minador do Lúcio-AL"
                    value={formLocation}
                    onChangeText={setFormLocation}
                  />

                  {/* Seletor de Categorias Reais */}
                  <Text style={styles.formSectionLabel}>Categoria *</Text>
                  <View style={styles.categorySelectorGrid}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOptionBtn,
                          formCategory === cat.toLowerCase() && styles.categoryOptionBtnActive
                        ]}
                        onPress={() => setFormCategory(cat.toLowerCase())}
                        activeOpacity={0.8}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          formCategory === cat.toLowerCase() && styles.categoryOptionTextActive
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Input
                    label="Data da Atividade * (DD/MM/AAAA)"
                    placeholder="Ex: 21/07/2026"
                    value={formData}
                    onChangeText={handleDateChange}
                    keyboardType="numeric"
                  />

                  <Input
                    label="Horário (Opcional - HH:MM)"
                    placeholder="Ex: 08:30"
                    value={formTime}
                    onChangeText={handleTimeChange}
                    keyboardType="numeric"
                  />

                  <Input
                    label="Líder Responsável (Opcional)"
                    placeholder="Ex: Tenente Silva"
                    value={formResponsible}
                    onChangeText={setFormResponsible}
                  />

                  <Input
                    label="Link da Foto de Banner (Opcional)"
                    placeholder="Ex: https://link.com/foto.jpg"
                    value={formPhotoUrl}
                    onChangeText={setFormPhotoUrl}
                    autoCapitalize="none"
                  />

                  <Input
                    label="Diretrizes e Instruções (Opcional)"
                    placeholder="Ex: Levar bússola, água e kit de primeiros socorros..."
                    value={formDescription}
                    onChangeText={setFormDescription}
                    multiline
                    numberOfLines={4}
                    style={[styles.formTextArea, Platform.OS === 'ios' && { height: 100 }]}
                  />

                  <Button
                    title={savingForm ? "Gravando Ordem..." : editingMission ? "Salvar Alterações" : "Publicar Missão"}
                    onPress={handleSaveMission}
                    loading={savingForm}
                  />

                  {/* Botão de Excluir Missão (Apenas em Edição e se for futura) */}
                  {editingMission && (
                    <View style={styles.deleteSection}>
                      {isMissionInPast(editingMission.date) ? (
                        <Text style={styles.cannotDeleteMsg}>
                          ⚠️ Missão encerrada/passada. Mantida como registro histórico (exclusão bloqueada).
                        </Text>
                      ) : (
                        <Button
                          title="Excluir Missão Permanentemente"
                          onPress={handleDeleteMission}
                          style={styles.deleteBtn}
                        />
                      )}
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>

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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#4c5748',
    backgroundColor: 'rgba(28, 32, 26, 0.95)',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userRoleVoluntario: {
    color: '#8fa882',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  userRoleAdmin: {
    color: '#c29014',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },

  // ========== NOVOS ESTILOS DE NAVEGAÇÃO DE ABAS (BARRA AMARELA) ==========
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 32, 26, 0.95)',
    borderBottomWidth: 2,
    borderBottomColor: '#c29014', // Borda amarela da barra
    height: 52,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderBottomWidth: 3.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#c29014',
  },
  tabText: {
    color: '#606a5c',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#c29014',
  },

  // ========== BOTÃO NOVA MISSÃO ABAIXO DA BARRA AMARELA ==========
  createMissionBar: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(28, 32, 26, 0.5)',
    borderBottomWidth: 1,
    borderBottomColor: '#3d453a',
  },
  createMissionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981', // Verde
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  createMissionBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ========== ESTILOS DE FILTRAGEM (MISSÕES) ==========
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(28, 32, 26, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#4c5748',
    height: 48,
  },
  filterBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterBtnActive: {
    borderBottomColor: '#c29014',
  },
  filterText: {
    color: '#606a5c',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterTextActive: {
    color: '#c29014',
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

  // ========== ESTILOS DA ABA: MEU PERFIL ==========
  profileContainer: {
    flex: 1,
  },
  profileContentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  profileCard: {
    backgroundColor: 'rgba(35, 42, 33, 0.95)',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4c5748',
    padding: 20,
  },
  profileCardTitle: {
    color: '#c29014',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(194, 144, 20, 0.2)',
    paddingBottom: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#3d453a',
    paddingBottom: 20,
  },
  profileAvatar: {
    marginBottom: 12,
  },
  profileNameText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  profileEmailText: {
    color: '#8fa882',
    fontSize: 14,
    marginTop: 4,
  },
  profileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 12,
  },
  profileBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  editProfileBtn: {
    marginTop: 24,
    backgroundColor: '#c29014',
  },
  adminExplanationBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(194, 144, 20, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(194, 144, 20, 0.2)',
    borderRadius: 6,
    padding: 20,
  },
  adminExplanationTitle: {
    color: '#c29014',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  adminExplanationText: {
    color: '#cbd5e1',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Seletores para edição do perfil
  bloodTypeSelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  bloodTypeOptionBtn: {
    width: '22%',
    paddingVertical: 10,
    backgroundColor: '#1c201a',
    borderWidth: 1.5,
    borderColor: '#3d453a',
    borderRadius: 6,
    alignItems: 'center',
  },
  bloodTypeOptionBtnActive: {
    backgroundColor: '#c29014',
    borderColor: '#c29014',
  },
  bloodTypeOptionText: {
    color: '#606a5c',
    fontSize: 13,
    fontWeight: '800',
  },
  bloodTypeOptionTextActive: {
    color: '#000000',
  },
  emergencyContactHeader: {
    color: '#c29014',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 16,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(194, 144, 20, 0.2)',
    paddingBottom: 6,
    textTransform: 'uppercase',
  },
  profileActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  profileActionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCancelBtn: {
    borderWidth: 1.5,
    borderColor: '#3d453a',
    backgroundColor: 'transparent',
  },
  profileCancelBtnText: {
    color: '#606a5c',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileSaveBtn: {
    backgroundColor: '#c29014',
  },
  profileSaveBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ========== ESTILOS DA ABA: VOLUNTÁRIOS (ADMIN ONLY) ==========
  membersContainer: {
    flex: 1,
  },
  membersListContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  controlBar: {
    backgroundColor: 'rgba(28, 32, 26, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
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
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
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
  },
  roleBadgeAdmin: {
    backgroundColor: '#c29014',
  },
  roleBadgeVoluntario: {
    backgroundColor: '#3d453a',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '850',
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
    fontWeight: '850',
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
    fontWeight: '850',
    letterSpacing: 0.5,
  },

  // ========== OUTROS ESTILOS DE MODAIS ==========
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(12, 13, 12, 0.8)',
  },
  modalContent: {
    backgroundColor: '#1c201a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '88%',
    borderWidth: 1.5,
    borderColor: '#4c5748',
    borderBottomWidth: 0,
  },
  bannerContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bannerCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 20,
  },
  modalTitleUnderBanner: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 16,
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
    fontSize: 18,
    fontWeight: '850',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 16,
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
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    color: '#606a5c',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalValue: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  descriptionBox: {
    backgroundColor: '#131612',
    borderWidth: 1,
    borderColor: '#3d453a',
    borderRadius: 6,
    padding: 16,
  },
  descriptionText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  adminSection: {
    borderTopWidth: 1,
    borderTopColor: '#3d453a',
    paddingTop: 20,
    marginTop: 8,
  },
  adminSectionHeader: {
    color: '#c29014',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  noParticipantsText: {
    color: '#606a5c',
    fontSize: 13,
    fontStyle: 'italic',
  },
  participantsList: {
    gap: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131612',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3d453a',
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  participantSubtext: {
    color: '#606a5c',
    fontSize: 10,
    marginTop: 2,
  },
  noOnboardingBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#131612',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#3d453a',
    marginTop: 10,
  },
  noOnboardingTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '850',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noOnboardingText: {
    color: '#606a5c',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ========== ESTILOS DA FICHA MÉDICA EM MODAL ==========
  medicalModalContent: {
    backgroundColor: '#131612',
    borderColor: '#c29014',
    height: '75%',
  },
  medicalModalHeader: {
    borderBottomColor: '#c29014',
  },
  medicalHeaderTitle: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  medicalLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  medicalLoaderText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
  },
  medicalProfileHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3d453a',
    paddingBottom: 12,
  },
  medicalName: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  medicalEmail: {
    color: '#8fa882',
    fontSize: 13,
    marginTop: 2,
  },
  bloodTypeContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bloodTypeLabel: {
    color: '#ef4444',
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

  // ========== ESTILOS DE APROVAÇÃO POR CONFIRMAÇÃO DE SENHA ==========
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

  // ========== ESTILOS DO FORMULÁRIO DE MISSÕES ==========
  formSectionLabel: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categorySelectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1c201a',
    borderWidth: 1.5,
    borderColor: '#3d453a',
    borderRadius: 6,
  },
  categoryOptionBtnActive: {
    backgroundColor: '#c29014',
    borderColor: '#c29014',
  },
  categoryOptionText: {
    color: '#606a5c',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryOptionTextActive: {
    color: '#000000',
  },
  formTextArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  deleteSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#3d453a',
    paddingTop: 20,
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
    marginVertical: 0,
  },
  cannotDeleteMsg: {
    color: '#606a5c',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontStyle: 'italic',
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
  userMissionsSection: {
    marginTop: 24,
    backgroundColor: 'rgba(35, 42, 33, 0.95)',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#4c5748',
    padding: 20,
  },
  userMissionsTitle: {
    color: '#c29014',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(194, 144, 20, 0.2)',
    paddingBottom: 8,
  },
  missionSubSectionHeader: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  noMissionsText: {
    color: '#606a5c',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
    paddingLeft: 4,
  },
  userMissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c201a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3d453a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 10,
  },
  userMissionRowPast: {
    backgroundColor: 'rgba(28, 32, 26, 0.5)',
    borderColor: 'rgba(61, 69, 58, 0.5)',
  },
  userMissionInfo: {
    flex: 1,
  },
  userMissionName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  userMissionNamePast: {
    color: '#cbd5e1',
  },
  userMissionDate: {
    color: '#606a5c',
    fontSize: 11,
    marginTop: 2,
  },
});
