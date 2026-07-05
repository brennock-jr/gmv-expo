import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';

const getCategoryIcon = (category) => {
  switch (category?.toLowerCase()) {
    case 'rapel':
      return 'arrow-down-circle-outline';
    case 'trilha':
      return 'walk-outline';
    case 'airsoft':
      return 'disc-outline';
    case 'acampamento':
      return 'bonfire-outline';
    default:
      return 'grid-outline'; // Outra Atividade
  }
};

const getCategoryColor = (category) => {
  switch (category?.toLowerCase()) {
    case 'rapel':
      return '#f43f5e'; // Rosa/Vermelho
    case 'trilha':
      return '#10b981'; // Verde Esmeralda
    case 'airsoft':
      return '#eab308'; // Amarelo
    case 'acampamento':
      return '#f97316'; // Laranja
    default:
      return '#cbd5e1'; // Cinza claro para Outra Atividade
  }
};

export default function MissionCard({ mission, userId, userRole, onSignUp, onCancel, onManage, onPressCard }) {
  const { title, category, date, location, responsibleName, participants = [] } = mission;
  const isEnrolled = participants.includes(userId);
  const participantCount = participants.length;

  const formatDate = (dateVal) => {
    if (!dateVal) return '';
    const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  };

  return (
    <View style={styles.card}>
      {/* Cabeçalho do Card */}
      <View style={styles.cardHeader}>
        <TouchableOpacity 
          style={styles.headerTouchTarget} 
          onPress={() => onPressCard(mission)}
          activeOpacity={0.7}
        >
          <View style={styles.titleContainer}>
            <View style={[styles.iconBox, { backgroundColor: `${getCategoryColor(category)}15`, borderColor: getCategoryColor(category) }]}>
              <Ionicons name={getCategoryIcon(category)} size={20} color={getCategoryColor(category)} />
            </View>
            <View style={styles.titleTexts}>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <Text style={[styles.badgeText, { color: getCategoryColor(category) }]}>
                {category?.toUpperCase() || 'OUTRA ATIVIDADE'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        
        {userRole === 'administrador' && (
          <TouchableOpacity onPress={() => onManage(mission)} style={styles.editButton} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={20} color="#c29014" />
          </TouchableOpacity>
        )}
      </View>

      {/* Área de Informações Clicável */}
      <TouchableOpacity onPress={() => onPressCard(mission)} activeOpacity={0.7}>
        <View style={styles.infoContainer}>
          {/* Só exibe Responsável se a informação existir e não estiver em branco */}
          {responsibleName && responsibleName.trim() !== '' ? (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color="#606a5c" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Responsável: <Text style={styles.boldText}>{responsibleName}</Text>
              </Text>
            </View>
          ) : null}

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#606a5c" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Data/Hora: <Text style={styles.boldText}>{formatDate(date)}</Text>
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="pin-outline" size={16} color="#606a5c" style={styles.infoIcon} />
            <Text style={styles.infoText} numberOfLines={1}>
              Local: <Text style={styles.boldText}>{location || 'QG GMV'}</Text>
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={16} color="#606a5c" style={styles.infoIcon} />
            <Text style={styles.infoText}>
              Efetivo Convocado: <Text style={styles.boldText}>{participantCount} voluntários</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Botões de Ação de Alistamento */}
      <View style={styles.actionContainer}>
        {isEnrolled ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(mission.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            <Text style={styles.cancelText}>Dispensar-me</Text>
          </TouchableOpacity>
        ) : (
          <Button
            title="Alistar-se na Missão"
            onPress={() => onSignUp(mission.id)}
            style={styles.signUpBtn}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(35, 42, 33, 0.95)',
    borderRadius: 8,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#4c5748',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 87, 72, 0.4)',
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTouchTarget: {
    flex: 1,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTexts: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
  },
  infoContainer: {
    gap: 8,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
    width: 16,
  },
  infoText: {
    color: '#aebfa7',
    fontSize: 13,
  },
  boldText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: 4,
  },
  signUpBtn: {
    marginVertical: 0,
    height: 44,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(194, 144, 20, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(194, 144, 20, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
