import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
  Easing,
  Platform
} from 'react-native';
import {
  Card,
  Text,
  Button,
  TextInput,
  Modal,
  Portal,
  Chip,
  IconButton,
  Divider
} from 'react-native-paper';
import { getEvents, addEvent, deleteEvent, getClasses, DataService } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

// Componente de Card de Evento
const EventCard = memo(({ event, onDelete }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'prova': return '#f44336';
      case 'trabalho': return '#2196f3';
      case 'reuniao': return '#4caf50';
      case 'feriado': return '#ff9800';
      case 'outro': return '#9c27b0';
      default: return '#666';
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case 'prova': return 'clipboard-check';
      case 'trabalho': return 'book-open';
      case 'reuniao': return 'account-group';
      case 'feriado': return 'party-popper';
      case 'outro': return 'calendar';
      default: return 'calendar';
    }
  };

  return (
    <Card style={styles.eventCard}>
      <Card.Content>
        <View style={styles.eventHeader}>
          <View style={styles.eventType}>
            <Chip
              mode="outlined"
              textStyle={{ color: getEventTypeColor(event.type) }}
              style={[styles.typeChip, { borderColor: getEventTypeColor(event.type) }]}
              icon={getEventTypeIcon(event.type)}
            >
              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </Chip>
          </View>
          <IconButton
            icon="delete"
            size={20}
            iconColor="#f44336"
            onPress={() => onDelete(event.id)}
          />
        </View>

        <Text style={styles.eventTitle}>
          {event.title}
        </Text>

        {event.description && (
          <Text style={styles.eventDescription}>
            {event.description}
          </Text>
        )}

        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              {formatDate(event.date)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailIcon}>⏰</Text>
            <Text style={styles.detailText}>
              {formatTime(event.date)}
            </Text>
          </View>

          {event.className && (
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🏫</Text>
              <Text style={styles.detailText}>
                {event.className}
              </Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );
});

// Componente de Overlay animado
const AnimatedOverlay = memo(({ visible, onPress }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible, fadeAnim]);

  if (!visible && fadeAnim._value === 0) return null;

  return (
    <Animated.View 
      style={[
        styles.overlay,
        {
          opacity: fadeAnim
        }
      ]}
    >
      <Button 
        style={styles.overlayButton} 
        onPress={onPress}
        contentStyle={styles.overlayButtonContent}
      >
        {''}
      </Button>
    </Animated.View>
  );
});

// Componente de Modal animado
const AnimatedModal = memo(({ visible, children, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  if (!visible && slideAnim._value === height) return null;

  return (
    <Portal>
      <Animated.View 
        style={[
          styles.modalContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <Card style={styles.modalCard}>
          {children}
        </Card>
      </Animated.View>
    </Portal>
  );
});

// Componente customizado para seleção de data
const DatePickerModal = memo(({ 
  visible, 
  value, 
  onConfirm, 
  onClose 
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [selectedDate, setSelectedDate] = useState(value);

  useEffect(() => {
    if (visible) {
      setSelectedDate(value);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.back(1)),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, value]);

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Componente customizado para seleção de data
  const renderDatePicker = () => {
    const currentDate = selectedDate;
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentDay = currentDate.getDate();

    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <View style={styles.customPicker}>
        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>Dia:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
          >
            {days.map(day => (
              <Chip
                key={day}
                selected={day === currentDay}
                onPress={() => {
                  const newDate = new Date(currentYear, currentMonth, day);
                  setSelectedDate(newDate);
                }}
                style={[
                  styles.pickerChip,
                  day === currentDay && styles.pickerChipSelected
                ]}
                mode="outlined"
              >
                {day}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>Mês:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
          >
            {months.map((month, index) => (
              <Chip
                key={month}
                selected={index === currentMonth}
                onPress={() => {
                  const newDate = new Date(currentYear, index, Math.min(currentDay, new Date(currentYear, index + 1, 0).getDate()));
                  setSelectedDate(newDate);
                }}
                style={[
                  styles.pickerChip,
                  index === currentMonth && styles.pickerChipSelected
                ]}
                mode="outlined"
              >
                {month}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>Ano:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
          >
            {years.map(year => (
              <Chip
                key={year}
                selected={year === currentYear}
                onPress={() => {
                  const newDate = new Date(year, currentMonth, Math.min(currentDay, new Date(year, currentMonth + 1, 0).getDate()));
                  setSelectedDate(newDate);
                }}
                style={[
                  styles.pickerChip,
                  year === currentYear && styles.pickerChipSelected
                ]}
                mode="outlined"
              >
                {year}
              </Chip>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  // Componente customizado para seleção de hora
  const renderTimePicker = () => {
    const currentDate = selectedDate;
    const currentHours = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
      <View style={styles.customPicker}>
        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>Hora:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
          >
            {hours.map(hour => (
              <Chip
                key={hour}
                selected={hour === currentHours}
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setHours(hour);
                  setSelectedDate(newDate);
                }}
                style={[
                  styles.pickerChip,
                  hour === currentHours && styles.pickerChipSelected
                ]}
                mode="outlined"
              >
                {hour.toString().padStart(2, '0')}
              </Chip>
            ))}
          </ScrollView>
        </View>

        <View style={styles.pickerRow}>
          <Text style={styles.pickerLabel}>Minuto:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.pickerScroll}
            contentContainerStyle={styles.pickerScrollContent}
          >
            {minutes.map(minute => (
              <Chip
                key={minute}
                selected={minute === currentMinutes}
                onPress={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMinutes(minute);
                  setSelectedDate(newDate);
                }}
                style={[
                  styles.pickerChip,
                  minute === currentMinutes && styles.pickerChipSelected
                ]}
                mode="outlined"
              >
                {minute.toString().padStart(2, '0')}
              </Chip>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Portal>
      <View style={styles.dateTimePickerOverlay}>
        <Animated.View 
          style={[
            styles.dateTimePickerContainer,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Card style={styles.dateTimePickerCard}>
            <Card.Content>
              <View style={styles.dateTimePickerHeader}>
                <Text style={styles.dateTimePickerTitle}>
                  {visible === 'date' ? 'Selecionar Data' : 'Selecionar Horário'}
                </Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={handleCancel}
                />
              </View>
              
              {visible === 'date' ? renderDatePicker() : renderTimePicker()}
              
              <View style={styles.selectedDateTime}>
                <Text style={styles.selectedDateTimeText}>
                  {visible === 'date' 
                    ? selectedDate.toLocaleDateString('pt-BR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })
                    : selectedDate.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                  }
                </Text>
              </View>

              <View style={styles.dateTimePickerActions}>
                <Button
                  mode="outlined"
                  onPress={handleCancel}
                  style={styles.dateTimePickerButton}
                  contentStyle={styles.dateTimePickerButtonContent}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  style={styles.dateTimePickerButton}
                  contentStyle={styles.dateTimePickerButtonContent}
                >
                  Confirmar
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Animated.View>
      </View>
    </Portal>
  );
});

function CalendarScreen({ navigation }) {
  const { getDisplayName } = useAuth();
  
  const [events, setEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    type: 'prova',
    date: new Date(),
    classId: ''
  });

  const eventTypes = [
    { value: 'prova', label: 'Prova', icon: 'clipboard-check' },
    { value: 'trabalho', label: 'Trabalho', icon: 'book-open' },
    { value: 'reuniao', label: 'Reunião', icon: 'account-group' },
    { value: 'feriado', label: 'Feriado', icon: 'party-popper' },
    { value: 'outro', label: 'Outro', icon: 'calendar' }
  ];

  /**
   * Carregar eventos e turmas do Firebase
   */
  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const [eventsResult, classesResult] = await Promise.all([
        getEvents(),
        getClasses()
      ]);

      // Extrair arrays dos resultados
      const loadedEvents = eventsResult.events || [];
      const loadedClasses = classesResult.classes || [];
      
      // Adicionar nome da turma aos eventos
      const eventsWithClassNames = loadedEvents.map(event => {
        const classItem = loadedClasses.find(cls => cls.id === event.classId);
        return {
          ...event,
          className: classItem ? classItem.name : 'Geral'
        };
      });
      
      setEvents(eventsWithClassNames);
      setClasses(loadedClasses);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os eventos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Adicionar novo evento
   */
  const handleAddEvent = useCallback(async () => {
    if (!newEvent.title.trim()) {
      Alert.alert('Erro', 'Por favor, insira um título para o evento');
      return;
    }

    try {
      const eventToSave = {
        ...newEvent,
        title: newEvent.title.trim(),
        description: newEvent.description.trim()
      };

      // Salvar evento no Firebase
      const result = await addEvent(eventToSave);
      
      if (result.success) {
        setModalVisible(false);
        
        // Reset form after a small delay to allow animation to complete
        setTimeout(() => {
          setNewEvent({
            title: '',
            description: '',
            type: 'prova',
            date: new Date(),
            classId: ''
          });
        }, 300);
        
        // Recarregar eventos
        await loadEvents();
        Alert.alert('✅ Sucesso', 'Evento adicionado ao calendário!');
      } else {
        Alert.alert('❌ Erro', result.error || 'Não foi possível salvar o evento');
      }
    } catch (error) {
      console.error('Erro ao salvar evento:', error);
      Alert.alert('❌ Erro', 'Ocorreu um erro ao salvar o evento');
    }
  }, [newEvent, loadEvents]);

  /**
   * Excluir evento
   */
  const handleDeleteEvent = useCallback(async (eventId) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Deseja excluir este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteEvent(eventId);
              
              if (result.success) {
                await loadEvents();
                Alert.alert('✅ Sucesso', 'Evento excluído!');
              } else {
                Alert.alert('❌ Erro', result.error || 'Não foi possível excluir o evento');
              }
            } catch (error) {
              console.error('Erro ao excluir evento:', error);
              Alert.alert('❌ Erro', 'Ocorreu um erro ao excluir o evento');
            }
          }
        }
      ]
    );
  }, [loadEvents]);

  /**
   * Confirmar data selecionada
   */
  const handleDateConfirm = useCallback((selectedDate) => {
    if (selectedDate) {
      const currentDate = newEvent.date;
      const newDate = new Date(selectedDate);
      newDate.setHours(currentDate.getHours(), currentDate.getMinutes());
      setNewEvent(prev => ({ ...prev, date: newDate }));
    }
  }, [newEvent.date]);

  /**
   * Confirmar hora selecionada
   */
  const handleTimeConfirm = useCallback((selectedTime) => {
    if (selectedTime) {
      const currentDate = newEvent.date;
      const newDate = new Date(currentDate);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setNewEvent(prev => ({ ...prev, date: newDate }));
    }
  }, [newEvent.date]);

  /**
   * Obter eventos futuros (próximos)
   */
  const getUpcomingEvents = useCallback(() => {
    const now = new Date();
    return events
      .filter(event => new Date(event.date) >= now)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 10);
  }, [events]);

  /**
   * Obter eventos passados
   */
  const getPastEvents = useCallback(() => {
    const now = new Date();
    return events
      .filter(event => new Date(event.date) < now)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);
  }, [events]);

  /**
   * Fechar modal
   */
  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    // Reset form when closing without saving
    setTimeout(() => {
      setNewEvent({
        title: '',
        description: '',
        type: 'prova',
        date: new Date(),
        classId: ''
      });
    }, 300);
  }, []);

  /**
   * Fechar seletor de data/hora
   */
  const handleCloseDateTimePicker = useCallback(() => {
    setDatePickerVisible(false);
    setTimePickerVisible(false);
  }, []);

  // Carregar dados quando o componente montar
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Recarregar quando a tela receber foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadEvents();
    });

    return unsubscribe;
  }, [navigation, loadEvents]);

  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Cabeçalho */}
        <Card style={styles.headerCard}>
          <Card.Content>
            <Text style={styles.headerTitle}>
              📅 Calendário de Eventos
            </Text>
            <Text style={styles.headerSubtitle}>
              Organize suas atividades escolares
            </Text>
            
            <Button
              mode="contained"
              onPress={() => setModalVisible(true)}
              style={styles.addButton}
              icon="plus"
              contentStyle={styles.buttonContent}
            >
              Novo Evento
            </Button>
          </Card.Content>
        </Card>

        {/* Eventos Futuros */}
        {upcomingEvents.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                🚀 Próximos Eventos ({upcomingEvents.length})
              </Text>
              {upcomingEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Eventos Passados */}
        {pastEvents.length > 0 && (
          <Card style={styles.sectionCard}>
            <Card.Content>
              <Text style={styles.sectionTitle}>
                📝 Eventos Passados ({pastEvents.length})
              </Text>
              {pastEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </Card.Content>
          </Card>
        )}

        {/* Estado Vazio */}
        {events.length === 0 && !isLoading && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>
                Nenhum evento agendado
              </Text>
              <Text style={styles.emptyText}>
                Clique em "Novo Evento" para adicionar seu primeiro evento ao calendário
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <Card style={styles.loadingCard}>
            <Card.Content style={styles.loadingContent}>
              <Text style={styles.loadingText}>Carregando eventos...</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Overlay com fundo semi-transparente */}
      <AnimatedOverlay 
        visible={modalVisible} 
        onPress={handleCloseModal}
      />

      {/* Modal animado para novo evento */}
      <AnimatedModal 
        visible={modalVisible} 
        onDismiss={handleCloseModal}
      >
        <Card.Content style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Novo Evento
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={handleCloseModal}
              style={styles.closeButton}
            />
          </View>

          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <TextInput
              label="Título do Evento *"
              value={newEvent.title}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, title: text }))}
              style={styles.input}
              mode="outlined"
              placeholder="Ex: Prova de Matemática"
            />

            <TextInput
              label="Descrição"
              value={newEvent.description}
              onChangeText={(text) => setNewEvent(prev => ({ ...prev, description: text }))}
              style={styles.input}
              mode="outlined"
              multiline
              numberOfLines={3}
              placeholder="Ex: Trazer calculadora e régua"
            />

            <Text style={styles.label}>Tipo de Evento</Text>
            <View style={styles.chipsContainer}>
              {eventTypes.map(type => (
                <Chip
                  key={type.value}
                  selected={newEvent.type === type.value}
                  onPress={() => setNewEvent(prev => ({ ...prev, type: type.value }))}
                  style={[
                    styles.typeOption,
                    newEvent.type === type.value && styles.selectedType
                  ]}
                  icon={type.icon}
                  showSelectedOverlay
                >
                  {type.label}
                </Chip>
              ))}
            </View>

            <Text style={styles.label}>Data e Hora</Text>
            <View style={styles.datetimeContainer}>
              <Button
                mode="outlined"
                onPress={() => setDatePickerVisible('date')}
                style={styles.datetimeButton}
                icon="calendar"
                contentStyle={styles.datetimeButtonContent}
              >
                {newEvent.date.toLocaleDateString('pt-BR')}
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => setTimePickerVisible('time')}
                style={styles.datetimeButton}
                icon="clock"
                contentStyle={styles.datetimeButtonContent}
              >
                {newEvent.date.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Button>
            </View>

            <Text style={styles.label}>Turma (opcional)</Text>
            <View style={styles.chipsContainer}>
              <Chip
                selected={newEvent.classId === ''}
                onPress={() => setNewEvent(prev => ({ ...prev, classId: '' }))}
                style={[
                  styles.classOption,
                  newEvent.classId === '' && styles.selectedClass
                ]}
                icon="account-multiple"
                showSelectedOverlay
              >
                Geral
              </Chip>
              {classes.map(classItem => (
                <Chip
                  key={classItem.id}
                  selected={newEvent.classId === classItem.id}
                  onPress={() => setNewEvent(prev => ({ ...prev, classId: classItem.id }))}
                  style={[
                    styles.classOption,
                    newEvent.classId === classItem.id && styles.selectedClass
                  ]}
                  icon="account-multiple"
                  showSelectedOverlay
                >
                  {classItem.name}
                </Chip>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={handleCloseModal}
                style={styles.modalButton}
                contentStyle={styles.modalButtonContent}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={handleAddEvent}
                style={styles.modalButton}
                contentStyle={styles.modalButtonContent}
                disabled={!newEvent.title.trim()}
              >
                Salvar Evento
              </Button>
            </View>
          </ScrollView>
        </Card.Content>
      </AnimatedModal>

      {/* Date Picker Modal */}
      <DatePickerModal
        visible={datePickerVisible}
        value={newEvent.date}
        onConfirm={handleDateConfirm}
        onClose={handleCloseDateTimePicker}
      />

      {/* Time Picker Modal */}
      <DatePickerModal
        visible={timePickerVisible}
        value={newEvent.date}
        onConfirm={handleTimeConfirm}
        onClose={handleCloseDateTimePicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f6f6f6',
  },
  headerCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  addButton: {
    marginTop: 10,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  sectionCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#000000',
  },
  eventCard: {
    marginBottom: 12,
    backgroundColor: '#ffffff',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    borderRadius: 8,
    elevation: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventType: {
    flex: 1,
  },
  typeChip: {
    alignSelf: 'flex-start',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000000',
  },
  eventDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  eventDetails: {
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
    fontSize: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  emptyCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#999',
    lineHeight: 20,
  },
  loadingCard: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    elevation: 2,
  },
  loadingContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  // Estilos do Overlay
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayButton: {
    width: '100%',
    height: '100%',
  },
  overlayButtonContent: {
    width: '100%',
    height: '100%',
  },
  // Estilos do Modal animado
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContent: {
    padding: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    flex: 1,
  },
  closeButton: {
    margin: 0,
  },
  modalScrollView: {
    maxHeight: height * 0.6,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000000',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeOption: {
    marginBottom: 8,
  },
  selectedType: {
    backgroundColor: '#2196f3',
  },
  datetimeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  datetimeButton: {
    flex: 1,
    borderRadius: 8,
  },
  datetimeButtonContent: {
    height: 48,
  },
  classOption: {
    marginBottom: 8,
  },
  selectedClass: {
    backgroundColor: '#2196f3',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
  },
  modalButtonContent: {
    height: 48,
  },
  // Estilos do DateTimePicker Modal
  dateTimePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dateTimePickerContainer: {
    width: '100%',
  },
  dateTimePickerCard: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#ffffff',
    maxHeight: height * 0.7,
  },
  dateTimePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dateTimePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  // Estilos do Custom Picker
  customPicker: {
    gap: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  pickerRow: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  pickerScroll: {
    maxHeight: 60,
  },
  pickerScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  pickerChip: {
    marginRight: 8,
  },
  pickerChipSelected: {
    backgroundColor: '#2196f3',
  },
  selectedDateTime: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  selectedDateTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'center',
  },
  dateTimePickerActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dateTimePickerButton: {
    flex: 1,
    borderRadius: 8,
  },
  dateTimePickerButtonContent: {
    height: 48,
  },
});

export default memo(CalendarScreen);