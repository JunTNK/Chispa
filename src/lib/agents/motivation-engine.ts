/**
 * Motivation Engine — Genera mensajes motivacionales contextuales.
 *
 * 4 estilos: data, energy, direct, calm
 * El usuario puede elegir su estilo preferido en la pantalla de resumen,
 * y el Digital Twin aprende y se adapta.
 */
export class MotivationEngine {
  static message(
    style: 'data' | 'energy' | 'direct' | 'calm',
    recovery: number,
    consistencyPct: number,
    duration: number
  ): string {
    const good = recovery >= 70;
    switch (style) {
      case 'data':
        return `Recuperación ${recovery}/100 · Consistencia ${consistencyPct}%. ${good ? 'Condiciones óptimas' : 'Condiciones gestionables'}: ${duration} min de sesión.`;
      case 'energy':
        return good
          ? `¡Hoy estás al ${recovery}%! ${duration} minutos, a encender la chispa`
          : `Un ${recovery}% basta para empezar. La chispa se enciende con el movimiento`;
      case 'direct':
        return `${recovery}/100. ${duration} minutos. Empieza.`;
      case 'calm':
        return `Tu cuerpo está al ${recovery}%. Sin prisa: ${duration} minutos a tu ritmo.`;
    }
  }

  static restMessage(style: string): string {
    switch (style) {
      case 'data':
        return 'Recuperación por debajo de 35. Los datos dicen: descanso activo hoy.';
      case 'energy':
        return 'Hoy la chispa se recarga descansando. Mañana vuelves con todo';
      case 'direct':
        return 'Recuperación baja. Hoy: moverse suave. Nada más.';
      case 'calm':
        return 'Tu cuerpo pide calma. Escucharlo también es entrenar.';
      default:
        return 'Hoy toca descanso activo. Mañana volvemos más fuertes.';
    }
  }
}
