import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

export default function Button({ title, onPress, loading, variant = 'primary', style, ...props }) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        isPrimary ? styles.primaryButton : styles.outlineButton,
        loading && styles.disabledButton,
        style
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#000000' : '#c29014'} size="small" />
      ) : (
        <Text style={[
          styles.text,
          isPrimary ? styles.primaryText : styles.outlineText
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#c29014', // Amarelo Queimado
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#c29014',
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  primaryText: {
    color: '#000000', // Preto para contraste tático no botão primário
  },
  outlineText: {
    color: '#c29014',
  },
});
