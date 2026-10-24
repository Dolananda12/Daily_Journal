import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { getApiBaseUrl, setApiBaseUrl } from '../lib/apiClient';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onUrlChanged?: () => void;
}

export function SettingsModal({ visible, onClose, onUrlChanged }: SettingsModalProps) {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (visible) {
      getApiBaseUrl().then(setUrl);
      setTestResult(null);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!url.trim()) {
      Alert.alert('Invalid URL', 'Please enter a valid API URL.');
      return;
    }
    await setApiBaseUrl(url.trim());
    onUrlChanged?.();
    onClose();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${cleanUrl}/api/quote`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setTestResult({ ok: true, message: 'Connected successfully to backend!' });
      } else {
        setTestResult({ ok: false, message: `Server replied with status ${res.status}` });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.name === 'AbortError' ? 'Connection timed out.' : 'Failed to reach backend.',
      });
    } finally {
      setTesting(false);
    }
  };

  const setPreset = (presetUrl: string) => {
    setUrl(presetUrl);
    setTestResult(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Backend Connection</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.label}>Spring Boot API Base URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setTestResult(null);
              }}
              placeholder="e.g. http://10.0.2.2:8080"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Presets */}
            <Text style={styles.subLabel}>Quick Presets:</Text>
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setPreset('https://daily-journal-pbeh.onrender.com')}
              >
                <Text style={styles.presetChipText}>Render Cloud (Live)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setPreset('http://10.0.2.2:8080')}
              >
                <Text style={styles.presetChipText}>Android Emulator (Local)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setPreset('http://172.16.128.210:8080')}
              >
                <Text style={styles.presetChipText}>Wi-Fi / LAN API</Text>
              </TouchableOpacity>
            </View>

            {/* Test result message */}
            {testResult && (
              <View
                style={[
                  styles.statusBox,
                  testResult.ok ? styles.statusBoxSuccess : styles.statusBoxError,
                ]}
              >
                <Ionicons
                  name={testResult.ok ? 'checkmark-circle' : 'alert-circle'}
                  size={18}
                  color={testResult.ok ? theme.colors.success : theme.colors.danger}
                />
                <Text
                  style={[
                    styles.statusText,
                    testResult.ok ? styles.statusTextSuccess : styles.statusTextError,
                  ]}
                >
                  {testResult.message}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={theme.colors.text} />
                ) : (
                  <>
                    <Ionicons name="wifi-outline" size={16} color={theme.colors.text} />
                    <Text style={styles.btnSecondaryText}>Test</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={handleSave}
              >
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.btnPrimaryText}>Save & Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 16,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusBoxSuccess: {
    backgroundColor: theme.colors.successFaint,
    borderColor: theme.colors.success,
  },
  statusBoxError: {
    backgroundColor: theme.colors.dangerFaint,
    borderColor: theme.colors.danger,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  statusTextSuccess: {
    color: theme.colors.success,
  },
  statusTextError: {
    color: theme.colors.danger,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    gap: 6,
  },
  btnSecondary: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  btnPrimary: {
    backgroundColor: theme.colors.accentDark,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
