import Constants from 'expo-constants';

let Notifications = null;
let notificationsAvailable = false;

// No Expo Go (SDK 53+), o expo-notifications lança avisos/erros sobre push notifications.
// Em builds de desenvolvimento ou produção (standalone), ele é totalmente operacional.
const isExpoGo = Constants.executionEnvironment === 'store-client';

if (isExpoGo) {
  console.log(
    "[Notificações] Info: Executando no Expo Go. O agendamento de lembretes locais de missões está silenciado neste ambiente (requer build de desenvolvimento ou standalone para testes completos)."
  );
} else {
  try {
    Notifications = require('expo-notifications');
    
    // Configurar o comportamento padrão para notificações recebidas com o app em primeiro plano
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    
    notificationsAvailable = true;
  } catch (error) {
    console.warn(
      "[Notificações] Alerta: Falha ao inicializar o módulo de notificações nativas. Detalhes:",
      error.message
    );
    Notifications = null;
    notificationsAvailable = false;
  }
}

// Solicitar permissões nativas para exibição de notificações
export async function requestNotificationPermissions() {
  if (!notificationsAvailable || !Notifications) {
    console.log("[Notificações] Permissões ignoradas (módulo indisponível).");
    return false;
  }
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error("Erro ao solicitar permissões de notificação:", error);
    return false;
  }
}

// Agendar lembretes locais para uma missão específica
export async function scheduleMissionReminders(mission) {
  if (!notificationsAvailable || !Notifications) {
    console.log("[Notificações] Agendamento ignorado (módulo indisponível).");
    return;
  }
  try {
    const d = mission.date.toDate ? mission.date.toDate() : new Date(mission.date);
    const now = new Date();
    
    const idDayBefore = `${mission.id}_day_before`;
    const idDayOf = `${mission.id}_day_of`;

    // 1. Notificação para 24 horas antes do início da missão
    const triggerDayBefore = new Date(d.getTime() - 24 * 60 * 60 * 1000);
    if (triggerDayBefore > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: idDayBefore,
        content: {
          title: `CONVOCAÇÃO AMANHÃ: ${mission.title?.toUpperCase()}`,
          body: `A operação está confirmada para amanhã em ${mission.location || 'QG'}. Prepare seu equipamento.`,
          data: { missionId: mission.id },
        },
        trigger: triggerDayBefore,
      });
      console.log(`[Notificações] Lembrete do dia anterior agendado para: ${triggerDayBefore}`);
    }

    // 2. Notificação para 2 horas antes do início da missão (tempo de deslocamento)
    const triggerDayOf = new Date(d.getTime() - 2 * 60 * 60 * 1000);
    if (triggerDayOf > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: idDayOf,
        content: {
          title: `OPERAÇÃO HOJE: ${mission.title?.toUpperCase()}`,
          body: `Atenção! Sua missão inicia em 2 horas em ${mission.location || 'QG'}. Apresente-se no local determinado.`,
          data: { missionId: mission.id },
        },
        trigger: triggerDayOf,
      });
      console.log(`[Notificações] Lembrete do dia do evento agendado para: ${triggerDayOf}`);
    }
  } catch (error) {
    console.error("Erro ao agendar notificações locais:", error);
  }
}

// Cancelar lembretes agendados para uma missão específica
export async function cancelMissionReminders(missionId) {
  if (!notificationsAvailable || !Notifications) {
    console.log("[Notificações] Cancelamento ignorado (módulo indisponível).");
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(`${missionId}_day_before`);
    await Notifications.cancelScheduledNotificationAsync(`${missionId}_day_of`);
    console.log(`[Notificações] Lembretes da missão ${missionId} cancelados.`);
  } catch (error) {
    console.error("Erro ao cancelar notificações agendadas:", error);
  }
}
