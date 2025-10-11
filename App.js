import React, { useState, useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider, DefaultTheme as PaperDefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import TeacherLogin from './components/TeacherLogin';
import WelcomeScreen from './components/WelcomeScreen';
import StudentManager from './components/StudentManager';
import StudentAverages from './components/StudentAverages';
import ClassManager from './components/ClassManager';
import SettingsScreen from './components/SettingsScreen';
import CalendarScreen from './components/CalendarScreen';
import ChartsScreen from './components/ChartsScreen';
import AIAssistantScreen from './components/AIAssistantScreen';
import { getTeacherName } from './utils/storage';

const Stack = createNativeStackNavigator();

const AppTheme = {
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

export default function App() {
  const [isTeacherLogged, setIsTeacherLogged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkTeacherLogin = useCallback(async () => {
    try {
      const teacherName = await getTeacherName();
      setIsTeacherLogged(!!teacherName);
    } catch (error) {
      console.log('Erro ao verificar login:', error);
      setIsTeacherLogged(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkTeacherLogin();
  }, [checkTeacherLogin]);

  if (isLoading) {
    return null;
  }

  return (
    <PaperProvider theme={AppTheme}>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator 
          initialRouteName={isTeacherLogged ? "WelcomeScreen" : "TeacherLogin"}
          screenOptions={{
            headerStyle: {
              backgroundColor: AppTheme.colors.primary,
            },
            headerTintColor: '#ffffff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerBackTitle: 'Voltar',
            animation: 'slide_from_right',
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