import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme, DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Screens and Components
import TeacherLogin from './components/TeacherLogin';
import WelcomeScreen from './screens/WelcomeScreen';
import StudentManager from './components/StudentManager';
import StudentAverages from './components/StudentAverages';
import ClassManager from './components/ClassManager';
import SettingsScreen from './screens/SettingsScreen';
import CalendarScreen from './screens/CalendarScreen';
import ChartsScreen from './screens/ChartsScreen';
import AIAssistantScreen from './screens/AIAssistantScreen';

// Storage
import { getTheme } from './utils/storage';

const Stack = createNativeStackNavigator();

// Temas personalizados
const LightTheme = {
  ...PaperDefaultTheme,
  colors: {
    ...PaperDefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac6',
    background: '#f6f6f6',
    surface: '#ffffff',
    text: '#000000',
    disabled: '#9e9e9e',
    placeholder: '#9e9e9e',
    backdrop: '#000000',
    onSurface: '#000000',
    notification: '#f50057',
  },
};


// Componente de Loading
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f6f6' }}>
      <ActivityIndicator size="large" color="#6200ee" />
    </View>
  );
}

// Componente principal da navegação
function AppNavigator() {
  const { user, loading, isInitializing } = useAuth();
  const [themeMode, setThemeMode] = useState('light');
  const [themeLoading, setThemeLoading] = useState(true);

  // Carregar tema salvo
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        const themeResult = await getTheme();
        if (themeResult.success) {
          setThemeMode(themeResult.theme);
        }
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
      } finally {
        setThemeLoading(false);
      }
    };

    loadSavedTheme();
  }, []);

  // Determinar qual tema usar
  const currentTheme = themeMode === 'dark' ? DarkTheme : LightTheme;

  // Se ainda está carregando a autenticação ou o tema
  if (loading || isInitializing || themeLoading) {
    return <LoadingScreen />;
  }

  return (
    <PaperProvider theme={currentTheme}>
      <NavigationContainer>
        <StatusBar style={themeMode === 'dark' ? 'light' : 'dark'} />
        <Stack.Navigator 
          initialRouteName={user ? "WelcomeScreen" : "TeacherLogin"}
          screenOptions={{
            headerStyle: {
              backgroundColor: currentTheme.colors.primary,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerBackTitle: 'Voltar',
            animation: 'slide_from_right',
            contentStyle: {
              backgroundColor: currentTheme.colors.background,
            },
          }}
        >
          <Stack.Screen 
            name="TeacherLogin" 
            component={TeacherLogin}
            options={{ 
              headerShown: false,
              animation: 'fade'
            }}
          />
          <Stack.Screen 
            name="WelcomeScreen" 
            component={WelcomeScreen}
            options={{ 
              headerShown: false,
              animation: 'fade'
            }}
          />
          <Stack.Screen 
            name="StudentManager" 
            component={StudentManager}
            options={{ 
              title: 'Gerenciar Alunos',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen 
            name="StudentAverages" 
            component={StudentAverages}
            options={{ 
              title: 'Médias dos Alunos',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen 
            name="ClassManager" 
            component={ClassManager}
            options={{ 
              title: 'Gerenciar Turmas',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen 
            name="CalendarScreen" 
            component={CalendarScreen}
            options={{ 
              title: 'Calendário de Eventos',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen 
            name="ChartsScreen" 
            component={ChartsScreen}
            options={{ 
              title: 'Gráficos de Desempenho',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen 
            name="AIAssistant" 
            component={AIAssistantScreen}
            options={{ 
              title: 'Assistente IA',
              animation: 'slide_from_right'
            }}
          />
          <Stack.Screen 
            name="SettingsScreen" 
            component={SettingsScreen}
            options={{ 
              title: 'Configurações',
              animation: 'slide_from_right'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

// Componente principal do App
export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}