import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Input({ label, iconName, secureTextEntry, error, ...props }) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper, 
        isFocused && styles.inputWrapperFocused,
        error && styles.inputWrapperError
      ]}>
        {iconName && (
          <Ionicons 
            name={iconName} 
            size={20} 
            color={error ? '#ef4444' : isFocused ? '#c29014' : '#606a5c'} 
            style={styles.icon} 
          />
        )}
        <TextInput
          style={styles.input}
          placeholderTextColor="#606a5c"
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={togglePasswordVisibility} style={styles.visibilityToggle}>
            <Ionicons 
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#606a5c" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c201a',
    borderWidth: 1.5,
    borderColor: '#3d453a',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#c29014',
    backgroundColor: '#131612',
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    height: '100%',
  },
  visibilityToggle: {
    padding: 6,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
