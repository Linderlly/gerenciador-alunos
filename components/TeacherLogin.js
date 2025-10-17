import React, { useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { TextInput, Button, Card, Switch, HelperText } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;

function TeacherLogin({ navigation }) {
  const { login, register, loading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [errors, setErrors] = useState({});

  // Animações de entrada
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  // Validar formulário
  const validateForm = useCallback(() => {
    const newErrors = {};

    // Validar email
    if (!email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    // Validar senha
    if (!password.trim()) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    // Validar nome no registro
    if (isRegister && !teacherName.trim()) {
      newErrors.teacherName = 'Nome é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, teacherName, isRegister]);

  // Processar login/registro
  const handleAuth = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    try {
      let result;
      
      if (isRegister) {
        // Registrar novo professor
        result = await register(email, password, teacherName.trim());
      } else {
        // Login do professor
        result = await login(email, password);
      }

      if (result.success) {
        // Animação de sucesso antes de navegar
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          navigation.navigate('WelcomeScreen');
        });
      } else {
        Alert.alert('Erro', result.error || `Não foi possível ${isRegister ? 'criar conta' : 'fazer login'}`);
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro inesperado. Tente novamente.');
    }
  }, [email, password, teacherName, isRegister, validateForm, login, register, fadeAnim, navigation]);

  // Submissão do formulário
  const handleSubmitEditing = useCallback(() => {
    if (email.trim() && password.trim() && (!isRegister || teacherName.trim())) {
      handleAuth();
    }
  }, [email, password, teacherName, isRegister, handleAuth]);

  // Alternar entre login e registro
  const toggleMode = useCallback(() => {
    setIsRegister(prev => !prev);
    setEmail('');
    setPassword('');
    setTeacherName('');
    setErrors({});
  }, []);

  // Limpar erro quando o usuário começar a digitar
  const clearError = useCallback((field) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
  }, []);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.View 
          style={[
            styles.animatedContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <Text style={styles.title}>
                📊 Sistema de Médias Escolares
              </Text>
              <Text style={styles.subtitle}>
                {isRegister ? 'Criar Nova Conta' : 'Bem-vindo, Professor!'}
              </Text>
              
              {isRegister && (
                <>
                  <TextInput
                    label="Seu Nome"
                    value={teacherName}
                    onChangeText={(text) => {
                      setTeacherName(text);
                      clearError('teacherName');
                    }}
                    style={styles.input}
                    mode="outlined"
                    autoCapitalize="words"
                    placeholder="Digite seu nome completo"
                    left={<TextInput.Icon icon="account" />}
                    returnKeyType="next"
                    error={!!errors.teacherName}
                    disabled={loading}
                  />
                  <HelperText type="error" visible={!!errors.teacherName}>
                    {errors.teacherName}
                  </HelperText>
                </>
              )}
              
              <TextInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  clearError('email');
                }}
                style={styles.input}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="seu.email@escola.com"
                left={<TextInput.Icon icon="email" />}
                returnKeyType="next"
                error={!!errors.email}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.email}>
                {errors.email}
              </HelperText>
              
              <TextInput
                label="Senha"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearError('password');
                }}
                style={styles.input}
                mode="outlined"
                secureTextEntry
                placeholder="Digite sua senha"
                left={<TextInput.Icon icon="lock" />}
                onSubmitEditing={handleSubmitEditing}
                returnKeyType="go"
                error={!!errors.password}
                disabled={loading}
              />
              <HelperText type="error" visible={!!errors.password}>
                {errors.password}
              </HelperText>
              
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>
                  {isRegister ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                </Text>
                <Switch
                  value={isRegister}
                  onValueChange={toggleMode}
                  color="#6200ee"
                  disabled={loading}
                />
                <Text style={styles.switchText}>
                  {isRegister ? 'Fazer Login' : 'Criar Conta'}
                </Text>
              </View>
              
              <Button 
                mode="contained" 
                onPress={handleAuth}
                style={styles.button}
                disabled={loading}
                loading={loading}
                contentStyle={styles.buttonContent}
              >
                {loading ? 'Processando...' : (isRegister ? 'Criar Conta' : 'Entrar')}
              </Button>

              <Text style={styles.hint}>
                💡 {isRegister 
                  ? 'Crie sua conta para começar a usar o sistema' 
                  : 'Faça login para acessar suas turmas e alunos'
                }
              </Text>

              {isRegister && (
                <Text style={styles.securityHint}>
                  🔒 Sua senha é criptografada e segura
                </Text>
              )}
            </Card.Content>
          </Card>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: isSmallScreen ? 16 : 20,
  },
  animatedContainer: {
    width: '100%',
  },
  card: {
    padding: isSmallScreen ? 12 : 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  cardContent: {
    padding: isSmallScreen ? 16 : 20,
  },
  title: {
    fontSize: isSmallScreen ? 22 : 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: isSmallScreen ? 6 : 8,
    color: '#1976d2',
  },
  subtitle: {
    fontSize: isSmallScreen ? 16 : 18,
    textAlign: 'center',
    marginBottom: isSmallScreen ? 24 : 32,
    color: '#666',
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fafafa',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isSmallScreen ? 20 : 24,
    marginTop: isSmallScreen ? 10 : 12,
    padding: isSmallScreen ? 8 : 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    marginRight: isSmallScreen ? 8 : 12,
  },
  switchText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#1976d2',
    fontWeight: '600',
    marginLeft: isSmallScreen ? 8 : 12,
  },
  button: {
    marginTop: isSmallScreen ? 6 : 8,
    paddingVertical: isSmallScreen ? 6 : 8,
    borderRadius: 8,
    elevation: 4,
  },
  buttonContent: {
    height: isSmallScreen ? 44 : 48,
  },
  hint: {
    fontSize: isSmallScreen ? 13 : 14,
    textAlign: 'center',
    marginTop: isSmallScreen ? 16 : 20,
    color: '#888',
    fontStyle: 'italic',
  },
  securityHint: {
    fontSize: isSmallScreen ? 12 : 13,
    textAlign: 'center',
    marginTop: isSmallScreen ? 8 : 10,
    color: '#4caf50',
    fontStyle: 'italic',
  },
});

export default memo(TeacherLogin);