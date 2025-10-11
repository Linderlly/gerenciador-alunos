import React, { useState, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Text,
  Animated,
  Dimensions
} from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { saveTeacherName } from '../utils/storage';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;

function TeacherLogin({ navigation }) {
  const [teacherName, setTeacherName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

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

  const handleLogin = useCallback(async () => {
    if (teacherName.trim() === '') {
      Alert.alert('Atenção', 'Por favor, insira seu nome');
      return;
    }

    setIsLoading(true);
    
    try {
      const saved = await saveTeacherName(teacherName.trim());
      if (saved) {
        // Animação de sucesso antes de navegar
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          navigation.navigate('WelcomeScreen', { teacherName: teacherName.trim() });
        });
      } else {
        Alert.alert('Erro', 'Não foi possível salvar o nome do professor');
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao fazer login');
      setIsLoading(false);
    }
  }, [teacherName, fadeAnim, navigation]);

  const handleSubmitEditing = useCallback(() => {
    if (teacherName.trim()) {
      handleLogin();
    }
  }, [teacherName, handleLogin]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
              Bem-vindo, Professor!
            </Text>
            
            <TextInput
              label="Seu Nome"
              value={teacherName}
              onChangeText={setTeacherName}
              style={styles.input}
              mode="outlined"
              autoCapitalize="words"
              placeholder="Digite seu nome completo"
              onSubmitEditing={handleSubmitEditing}
              left={<TextInput.Icon icon="account" />}
              autoFocus={true}
              returnKeyType="go"
            />
            
            <Button 
              mode="contained" 
              onPress={handleLogin}
              style={styles.button}
              disabled={!teacherName.trim() || isLoading}
              loading={isLoading}
              contentStyle={styles.buttonContent}
            >
              {isLoading ? 'Entrando...' : 'Iniciar Sessão'}
            </Button>

            <Text style={styles.hint}>
              💡 Digite seu nome para começar a usar o sistema
            </Text>
          </Card.Content>
        </Card>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: isSmallScreen ? 16 : 20,
    backgroundColor: '#f6f6f6',
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
    marginBottom: isSmallScreen ? 20 : 24,
    backgroundColor: '#fafafa',
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
});

export default memo(TeacherLogin);