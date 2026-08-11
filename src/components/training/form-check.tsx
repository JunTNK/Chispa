'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useT } from '@/lib/i18n/use-t';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePose } from '@/lib/pose/use-pose';
import { PoseEngine } from '@/lib/pose/pose-engine';
import {
  Camera,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
  Activity,
  CameraOff,
  Video,
  UserX,
} from 'lucide-react';

/* ─── Types ─── */

interface FormCue {
  ok: boolean;
  label: string;
  detail: string;
}

interface JointAngles {
  knee: number;
  hip: number;
  shoulder: number;
  backOk: boolean;
}

interface FormCheckProps {
  exerciseName: string;
  muscleGroup: string;
  onClose: () => void;
}

/* ─── Exercise-specific form cues ─── */

const EXERCISE_CUES: Record<string, FormCue[]> = {
  default: [
    { ok: true, label: 'Cabeza neutral', detail: 'Alineada con la columna, mirada al frente' },
    { ok: false, label: 'Hombros', detail: 'Relajados, sin tensión en trapecios' },
    { ok: true, label: 'Rodillas', detail: 'Ligeramente flexionadas, sin bloqueo' },
    { ok: true, label: 'Columna', detail: 'Neutral, sin arqueo lumbar' },
    { ok: false, label: 'Pies', detail: 'Ancho de hombros, peso equilibrado' },
  ],
  sentadilla: [
    { ok: true, label: 'Profundidad', detail: 'Cadera debajo de rodilla en el punto más bajo' },
    { ok: false, label: 'Rodillas', detail: 'Siguen la línea de los pies, no colapsan hacia dentro' },
    { ok: true, label: 'Espalda', detail: 'Recta, pecho arriba, sin redondear' },
    { ok: false, label: 'Talones', detail: 'Pegan al suelo, peso en el medio del pie' },
    { ok: true, label: 'Mirada', detail: 'Al frente, no al suelo' },
  ],
  flexión: [
    { ok: true, label: 'Cuerpo recto', detail: 'Línea recta de cabeza a talones' },
    { ok: false, label: 'Codos', detail: 'A 45° del cuerpo, no abiertos' },
    { ok: true, label: 'Amplitud', detail: 'Pecho toca el suelo o cerca' },
    { ok: true, label: 'Core firme', detail: 'Abdomen contraído, caderas no caen' },
    { ok: false, label: 'Cuello', detail: 'Neutral, no mirar arriba ni abajo' },
  ],
  peso_muerto: [
    { ok: true, label: 'Espalda plana', detail: 'Columna neutral durante todo el movimiento' },
    { ok: false, label: 'Cadera atrás', detail: 'Iniciar con cadera hacia atrás, no con rodillas' },
    { ok: true, label: 'Barra cerca', detail: 'La barra roza las piernas en todo el recorrido' },
    { ok: false, label: 'Hombros', detail: 'Por delante de la barra en inicio' },
    { ok: true, label: 'Respiración', detail: 'Bloquear aire en cada repetición' },
  ],
  press: [
    { ok: true, label: 'Muñecas neutrales', detail: 'Sin hiperextensión, antebrazo vertical' },
    { ok: false, label: 'Codos', detail: 'A 45-75° del torso, no a 90°' },
    { ok: true, label: 'Hombros estables', detail: 'Omóplatos pegados al banco' },
    { ok: false, label: 'Arco lumbar', detail: 'Mínimo, pies firmes en el suelo' },
    { ok: true, label: 'Recorrido completo', detail: 'Barra toca pecho, bloqueo arriba' },
  ],
  plancha: [
    { ok: true, label: 'Cuerpo recto', detail: 'Línea recta de cabeza a talones' },
    { ok: false, label: 'Caderas', detail: 'Ni arriba (pico) ni abajo (hundidas)' },
    { ok: true, label: 'Core', detail: 'Abdomen y glúteos contraídos' },
    { ok: false, label: 'Hombros', detail: 'Sobre las muñecas, no hacia atrás' },
    { ok: true, label: 'Cuello', detail: 'Neutral, mirada al suelo' },
  ],
  dominada: [
    { ok: true, label: 'Activación escapular', detail: 'Omóplatos hacia abajo y atrás antes de iniciar' },
    { ok: false, label: 'Cuerpo', detail: 'Sin balanceo, core firme' },
    { ok: true, label: 'Recorrido', detail: 'Barbilla sobre la barra' },
    { ok: false, label: 'Bajada controlada', detail: 'No caer, control en excéntrica' },
    { ok: true, label: 'Respiración', detail: 'Subes al exhalar, bajas al inhalar' },
  ],
  zancada: [
    { ok: true, label: 'Rodilla frontal', detail: 'A 90°, no sobrepasa la punta del pie' },
    { ok: false, label: 'Torso erguido', detail: 'Recto, no inclinarse hacia adelante' },
    { ok: true, label: 'Paso amplio', detail: 'Suficiente para rodilla trasera casi toque suelo' },
    { ok: true, label: 'Cadera estable', detail: 'Sin balanceo lateral' },
    { ok: false, label: 'Rodilla trasera', detail: 'No toca el suelo pero se acerca' },
  ],
  remo: [
    { ok: true, label: 'Espalda plana', detail: 'Columna neutral durante todo el movimiento, sin redondear' },
    { ok: false, label: 'Torso firme', detail: 'No usar impulso del torso para subir el peso' },
    { ok: true, label: 'Codos pegados', detail: 'Pasan cerca del cuerpo, no se abren hacia afuera' },
    { ok: false, label: 'Retracción escapular', detail: 'Omóplatos juntos al final del movimiento' },
    { ok: true, label: 'Control excéntrico', detail: 'Bajar el peso con control, no soltar' },
  ],
  curl: [
    { ok: true, label: 'Codos fijos', detail: 'Pegados al torso, sin movimiento hacia adelante' },
    { ok: false, label: 'Muñecas rectas', detail: 'Sin flexión ni extensión, antebrazo neutral' },
    { ok: true, label: 'Recorrido completo', detail: 'Extensión total abajo, contracción máxima arriba' },
    { ok: false, label: 'Sin balanceo', detail: 'No usar impulso lumbar ni de hombros' },
    { ok: true, label: 'Fase excéntrica', detail: 'Bajar en 2-3 segundos, controlado' },
  ],
  elevacion_lateral: [
    { ok: true, label: 'Hombros abajo', detail: 'Sin encoger hombros, trapecios relajados' },
    { ok: false, label: 'Codo ligeramente flexionado', detail: 'Ángulo fijo de ~15° durante todo el movimiento' },
    { ok: true, label: 'Altura controlada', detail: 'Subir hasta paralelo al suelo, no más arriba' },
    { ok: false, label: 'Sin impulso', detail: 'No usar balanceo del torso para subir' },
    { ok: true, label: 'Bajada lenta', detail: 'Control en excéntrica, no dejar caer' },
  ],
  press_militar: [
    { ok: true, label: 'Core firme', detail: 'Abdomen contraído, costillas abajo, sin arco lumbar' },
    { ok: false, label: 'Codos al frente', detail: 'Ligeramente por delante de la barra, no abiertos' },
    { ok: true, label: 'Barra sobre cabeza', detail: 'Pasa justo por encima de la coronilla, trayectoria recta' },
    { ok: false, label: 'Hombros estables', detail: 'Omóplatos hacia abajo y atrás, sin elevación' },
    { ok: true, label: 'Respiración', detail: 'Bloquear aire al subir, exhalar al pasar la frente' },
  ],
  fondo_triceps: [
    { ok: true, label: 'Hombros abajo', detail: 'Sin encogerlos, omóplatos estables' },
    { ok: false, label: 'Codos atrás', detail: 'Apuntan hacia atrás, no se abren a los lados' },
    { ok: true, label: 'Profundidad', detail: 'Codos a 90° como mínimo, pecho erguido' },
    { ok: false, label: 'Torso recto', detail: 'Sin inclinarse hacia adelante, sin redondear espalda' },
    { ok: true, label: 'Control', detail: 'Bajar con control, subir sin bloqueo de codos' },
  ],
  rdl: [
    { ok: true, label: 'Espalda plana', detail: 'Columna neutral durante todo el movimiento' },
    { ok: false, label: 'Cadera atrás', detail: 'Empujar cadera hacia atrás, no flexionar rodillas primero' },
    { ok: true, label: 'Rodillas suaves', detail: 'Ligera flexión, ~10-15°, sin bloquear' },
    { ok: false, label: 'Barra pegada', detail: 'La barra roza las piernas en todo el descenso' },
    { ok: true, label: 'Cuello neutral', detail: 'Mirada al suelo a ~1m, no al frente ni arriba' },
  ],
  hip_thrust: [
    { ok: true, label: 'Barbilla al pecho', detail: 'Cuello neutral, sin hiperextender cervicales' },
    { ok: false, label: 'Extensión completa', detail: 'Cadera arriba del todo, línea recta hombros-rodillas' },
    { ok: true, label: 'Glúteos contraídos', detail: 'Aprieta glúteos arriba, sin hiperextender lumbar' },
    { ok: false, label: 'Rodillas a 90°', detail: 'Ángulo recto, espinillas verticales en punto máximo' },
    { ok: true, label: 'Descenso controlado', detail: 'Bajar cadera sin soltar tensión de glúteos' },
  ],
  gemelos: [
    { ok: true, label: 'Rango completo', detail: 'Bajar talón por debajo del escalón para estirar' },
    { ok: false, label: 'Sin impulso', detail: 'Subir usando gemelos, no balanceo del cuerpo' },
    { ok: true, label: 'Pausa arriba', detail: 'Mantener contracción 1-2 segundos en punto máximo' },
    { ok: false, label: 'Piernas rectas', detail: 'Rodillas extendidas sin bloqueo, core firme' },
    { ok: true, label: 'Peso en metatarsos', detail: 'Empujar a través de la punta del pie, no talón' },
  ],
  burpee: [
    { ok: true, label: 'Aterrizaje suave', detail: 'Flexionar rodillas al caer, absorber impacto' },
    { ok: false, label: 'Pecho al suelo', detail: 'Flexión completa, pecho toca o casi toca suelo' },
    { ok: true, label: 'Salto explosivo', detail: 'Extender cadera y rodillas completamente al saltar' },
    { ok: false, label: 'Espalda recta', detail: 'Sin redondear en la flexión, core firme' },
    { ok: true, label: 'Respiración rítmica', detail: 'Inhalar al bajar, exhalar al saltar' },
  ],
  apertura: [
    { ok: true, label: 'Codo suave', detail: 'Ligera flexión fija de ~15°, no bloqueado' },
    { ok: false, label: 'Apertura controlada', detail: 'Bajar hasta sentir estiramiento en pecho, sin forzar' },
    { ok: true, label: 'Hombros estables', detail: 'Omóplatos pegados al banco, sin movimiento' },
    { ok: false, label: 'Arco lumbar mínimo', detail: 'Pies firmes en el suelo, costillas abajo' },
    { ok: true, label: 'Contracción al centro', detail: 'Juntar manos arriba apretando pecho, no hombros' },
  ],
};

const DEFAULT_CUES = EXERCISE_CUES.default;

function getCuesForExercise(name: string, muscle: string): FormCue[] {
  const lower = name.toLowerCase().trim();
  if (lower.includes('sentadilla') || lower.includes('squat') || muscle === 'legs') return EXERCISE_CUES.sentadilla;
  if (lower.includes('flexión') || lower.includes('lagartija') || lower.includes('push')) return EXERCISE_CUES.flexión;
  if (lower.includes('peso muerto') || lower.includes('deadlift')) return EXERCISE_CUES.peso_muerto;
  if (lower.includes('press') || lower.includes('banca') || lower.includes('pecho')) return EXERCISE_CUES.press;
  if (lower.includes('plancha') || lower.includes('plank') || muscle === 'core') return EXERCISE_CUES.plancha;
  if (lower.includes('dominada') || lower.includes('pull') || lower.includes('jalón')) return EXERCISE_CUES.dominada;
  if (lower.includes('zancada') || lower.includes('lunge')) return EXERCISE_CUES.zancada;
  if (lower.includes('remo') || lower.includes('row') || muscle === 'back') return EXERCISE_CUES.remo;
  if (lower.includes('fondo') || lower.includes('tríceps') || lower.includes('triceps') || lower.includes('dips')) return EXERCISE_CUES.fondo_triceps;
  if (lower.includes('curl') || lower.includes('bíceps') || lower.includes('biceps') || lower.includes('martillo') || muscle === 'arms') return EXERCISE_CUES.curl;
  if (lower.includes('elevación lateral') || lower.includes('vuelo lateral')) return EXERCISE_CUES.elevacion_lateral;
  if (lower.includes('press militar') || lower.includes('military') || lower.includes('shoulder press') || muscle === 'shoulders') return EXERCISE_CUES.press_militar;
  if (lower.includes('rdl') || lower.includes('rumano') || lower.includes('peso muerto rum') || lower.includes('romanian')) return EXERCISE_CUES.rdl;
  if (lower.includes('hip thrust') || lower.includes('glute bridge') || lower.includes('empuje cadera') || lower.includes('glúteo')) return EXERCISE_CUES.hip_thrust;
  if (lower.includes('gemelo') || lower.includes('calf') || lower.includes('elevación de talón') || lower.includes('pantorrilla')) return EXERCISE_CUES.gemelos;
  if (lower.includes('burpee') || lower.includes('burpie')) return EXERCISE_CUES.burpee;
  if (lower.includes('apertura') || lower.includes('fly') || lower.includes('pec fly') || lower.includes('cruces')) return EXERCISE_CUES.apertura;
  return DEFAULT_CUES;
}

/* ─── Analysis engine (real only) ─── */

function anglesToCues(angles: JointAngles): FormCue[] {
  return [
    { ok: true, label: 'Cabeza neutral', detail: 'Alineada con la columna' },
    { ok: angles.backOk, label: 'Espalda', detail: angles.backOk ? 'Neutral, sin arqueo' : 'Ligeramente redondeada — endereza el torso' },
    { ok: angles.knee > 90, label: 'Ángulo rodilla', detail: `${angles.knee}° — ${angles.knee > 90 ? 'dentro de rango' : 'muy cerrado, abre más'}` },
    { ok: angles.hip < 100, label: 'Ángulo cadera', detail: `${angles.hip}° — ${angles.hip < 100 ? 'buena profundidad' : 'acorta el rango'}` },
    { ok: angles.shoulder > 60 && angles.shoulder < 120, label: 'Hombros estables', detail: `${angles.shoulder}° — ${angles.shoulder > 60 && angles.shoulder < 120 ? 'estables' : 'ajusta la posición'}` },
  ];
}

/* ─── Main FormCheck Component (real camera only) ─── */

type CameraStatus = 'loading' | 'real' | 'error';

export function FormCheck({ exerciseName, muscleGroup, onClose }: FormCheckProps) {
  const t = useT();
  const {
    status: poseStatus,
    videoRef,
    canvasRef,
    angles: realAngles,
    error: poseError,
    startCamera,
    stopCamera,
  } = usePose();

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noPersonTimeout, setNoPersonTimeout] = useState(false);
  const initRef = useRef(false);
  const noPersonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Start camera on mount ──
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    const start = async () => {
      setCameraStatus('loading');
      try {
        await startCamera();
        if (cancelled) return;

        // Poll for engine readiness (model may load async)
        await new Promise<void>(resolve => {
          const interval = setInterval(() => {
            if (cancelled) {
              clearInterval(interval);
              resolve();
              return;
            }

            const engine = PoseEngine.getInstance();

            if (engine.isReady) {
              clearInterval(interval);
              if (!cancelled) {
                setCameraStatus('real');
                setErrorMessage(null);
              }
              resolve();
              return;
            }

            const hasFailed = engine.status === 'error' || engine.status === 'unavailable';
            if (hasFailed) {
              clearInterval(interval);
              if (!cancelled) {
                setCameraStatus('error');
                setErrorMessage(engine.error || t('No se pudo iniciar el análisis de postura. Verifica los permisos de la cámara.'));
              }
              resolve();
              return;
            }
          }, 500);
        });
      } catch (err: any) {
        if (!cancelled) {
          setCameraStatus('error');
          setErrorMessage(err?.message ?? t('No se pudo acceder a la cámara. Verifica los permisos en tu navegador.'));
        }
      }
    };

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-analyse: restart camera from scratch ──
  const handleRetry = useRef(() => {});
  handleRetry.current = () => {
    initRef.current = false;
    stopCamera();
    setCameraStatus('loading');
    setErrorMessage(null);

    // Small delay to release camera, then re-start
    setTimeout(() => {
      initRef.current = true;
      const start = async () => {
        try {
          await startCamera();
          // Poll same as above
          await new Promise<void>(resolve => {
            const interval = setInterval(() => {
              const engine = PoseEngine.getInstance();
              if (engine.isReady) {
                clearInterval(interval);
                setCameraStatus('real');
                setErrorMessage(null);
                resolve();
                return;
              }
              if (engine.status === 'error' || engine.status === 'unavailable') {
                clearInterval(interval);
                setCameraStatus('error');
                setErrorMessage(engine.error || t('No se pudo iniciar el análisis de postura.'));
                resolve();
                return;
              }
            }, 500);
          });
        } catch (err: any) {
          setCameraStatus('error');
          setErrorMessage(err?.message ?? t('Error al acceder a la cámara.'));
        }
      };
      start();
    }, 300);
  };

  // ── Compute analysis from real angles only ──
  const cuesFromAngles = useMemo(() => {
    if (!realAngles) return [];
    return anglesToCues(realAngles);
  }, [realAngles]);

  const matchedCues = useMemo(() => {
    if (cuesFromAngles.length === 0) return [];
    const base = getCuesForExercise(exerciseName, muscleGroup);
    return cuesFromAngles.map((c, i) => {
      const baseCue = base[i] || base[0];
      return { ...c, detail: baseCue.detail || c.detail };
    });
  }, [exerciseName, muscleGroup, cuesFromAngles]);

  const okCount = matchedCues.filter(c => c.ok).length;
  const totalCues = matchedCues.length;
  const score = totalCues > 0 ? Math.round((okCount / totalCues) * 100) : 0;

  const isLoading = cameraStatus === 'loading';
  const isCameraLive = cameraStatus === 'real';
  const hasAngles = realAngles !== null;
  const isError = cameraStatus === 'error';

  // ── No-person detection timeout ──
  // If camera is live but no landmarks detected for 15s, show a warning
  useEffect(() => {
    if (isCameraLive && !hasAngles && !noPersonTimeout) {
      noPersonTimerRef.current = setTimeout(() => {
        setNoPersonTimeout(true);
      }, 15_000);
    } else if (hasAngles) {
      if (noPersonTimerRef.current) {
        clearTimeout(noPersonTimerRef.current);
        noPersonTimerRef.current = null;
      }
      setNoPersonTimeout(false);
    } else if (!isCameraLive) {
      if (noPersonTimerRef.current) {
        clearTimeout(noPersonTimerRef.current);
        noPersonTimerRef.current = null;
      }
      setNoPersonTimeout(false);
    }

    return () => {
      if (noPersonTimerRef.current) {
        clearTimeout(noPersonTimerRef.current);
        noPersonTimerRef.current = null;
      }
    };
  }, [isCameraLive, hasAngles, noPersonTimeout]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 bg-[rgba(5,8,14,0.85)] backdrop-blur-md z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
        className="w-full max-w-sm"
      >
        <Card className="overflow-hidden border-[rgba(76,201,240,0.3)]">
          {/* ── Header ── */}
          <div className="flex items-center justify-between p-4 pb-0">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isCameraLive
                    ? 'bg-[rgba(52,211,153,0.12)] text-[#34d399]'
                    : isError
                      ? 'bg-[rgba(248,113,113,0.12)] text-[#f87171]'
                      : 'bg-[rgba(76,201,240,0.12)] text-[#4CC9F0]'
                }`}>
                  {isCameraLive ? <Video size={14} /> : isError ? <CameraOff size={14} /> : <Camera size={14} />}
                </span>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${
                  isCameraLive ? 'text-[#34d399]' : isError ? 'text-[#f87171]' : 'text-[#4CC9F0]'
                }`}>
                  Form Check · {isCameraLive ? t('cámara real') : isError ? t('error') : t('iniciando…')}
                </span>
              </div>
              <h3 className="text-lg font-black mt-1">{t('Análisis de postura')}</h3>
            </div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[.06] border border-white/[.10] flex items-center justify-center text-[var(--muted)] hover:bg-white/[.12]"
            >
              <X size={14} />
            </motion.button>
          </div>

          {/* ── Error state ── */}
          {isError && (
            <div className="mx-4 mt-3 rounded-xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] overflow-hidden">
              <div className="flex flex-col items-center justify-center py-14 px-6 gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-[rgba(248,113,113,0.12)] flex items-center justify-center">
                  <CameraOff size={22} className="text-[#f87171]" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#f87171]">{t('Cámara no disponible')}</p>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">
                    {errorMessage || poseError || t('Permite el acceso a la cámara en tu navegador para usar el análisis de postura.')}
                  </p>
                </div>
                <div className="flex gap-2 mt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleRetry.current()}
                  >
                    <RefreshCw size={13} /> {t('Reintentar')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                  >
                    {t('Cerrar')}
                  </Button>
                </div>
                <details className="w-full mt-2">
                  <summary className="text-[9px] text-[#5C6577] font-mono cursor-pointer hover:text-[var(--muted)]">
                    {t('Solución de problemas')}
                  </summary>
                  <div className="text-[9px] text-[#5C6577] font-mono mt-2 space-y-1 text-left">
                    <p>{t('1. Asegúrate de que ningún otro programa usa la cámara')}</p>
                    <p>{t('2. Revisa los permisos en la barra de direcciones del navegador')}</p>
                    <p>{t('3. Si usas Chrome/Edge, permite el acceso explícitamente')}</p>
                    <p>{t('4. Conecta una cámara externa si estás en escritorio')}</p>
                    <p>{t('5. En el móvil, la cámara solo funciona con HTTPS o localhost')}</p>
                  </div>
                </details>
              </div>
            </div>
          )}

          {/* ── Camera feed ──
           * Mounted during BOTH loading and live states. The <video> element
           * must exist in the DOM before startCamera() runs (mount effect),
           * otherwise usePose aborts early (videoRef.current is null) and the
           * camera never starts — the bug that left the feed black forever.
           */}
          {(isLoading || isCameraLive) && (
            <>
              {/* Score ring — only when real angles exist */}
              {hasAngles && (
                <div className="flex items-center justify-center gap-4 px-4 pt-4">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                      <motion.circle
                        cx="32" cy="32" r="28"
                        fill="none"
                        stroke={score >= 80 ? '#34d399' : score >= 60 ? '#fbbf24' : '#f87171'}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - score / 100) }}
                        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-black">{score}%</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{exerciseName}</p>
                    <p className="text-xs text-[var(--muted)] font-mono mt-0.5">
                      {t('{a}/{b} en rango', { a: okCount, b: totalCues })}
                      {score >= 80 ? t(' · buena forma ✓') : score >= 60 ? t(' · ajusta lo marcado') : t(' · revisa correcciones')}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[9px] text-[#34d399] font-mono mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                      {t('Cámara en vivo')}
                    </span>
                  </div>
                </div>
              )}

              {/* Camera feed + pose overlay */}
              <div className="mx-4 mt-3 rounded-xl bg-[#0a0d13] border border-white/[.06] overflow-hidden relative">
                <div className="relative" style={{ aspectRatio: '4/3' }}>
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                    playsInline
                    muted
                    autoPlay
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full scale-x-[-1]"
                  />
                  {isCameraLive && (
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[rgba(0,0,0,0.6)] backdrop-blur-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                      <span className="text-[9px] text-white font-mono">LIVE</span>
                    </div>
                  )}
                  {hasAngles && (
                    <div className="absolute bottom-2 right-2 flex gap-1.5">
                      {(['knee', 'hip', 'shoulder'] as const).map(part => (
                        <div key={part}
                          className="px-1.5 py-0.5 rounded-md bg-[rgba(0,0,0,0.6)] backdrop-blur-sm text-[9px] font-mono"
                          style={{
                            color: realAngles[part] > 90 ? '#34d399' : realAngles[part] > 60 ? '#fbbf24' : '#f87171',
                          }}
                        >
                          {part === 'knee' ? 'K' : part === 'hip' ? 'H' : 'S'}{realAngles[part]}°
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Overlay message when camera is live but no person detected */}
                  {isCameraLive && !hasAngles && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
                      <div className="text-center px-6">
                        {noPersonTimeout ? (
                          <>
                            <UserX size={28} className="mx-auto text-[#fbbf24] mb-2" />
                            <p className="text-xs font-bold text-[#fbbf24] font-mono">
                              {t('No se detecta a nadie')}
                            </p>
                            <p className="text-[10px] text-[#b8932a] mt-1.5 leading-relaxed">
                              {t('¿Estás frente a la cámara?')}
                            </p>
                            <p className="text-[9px] text-[#5C6577] font-mono mt-2 leading-relaxed">
                              {t('Colócate de lado, a ~1.5m.')}<br />
                              {t('Buena iluminación y fondo limpio ayudan.')}<br />
                              {t('Si el problema persiste, prueba reiniciar la cámara.')}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-[var(--muted)] font-mono">
                              {t('Buscando persona...')}
                            </p>
                            <p className="text-[9px] text-[#5C6577] font-mono mt-2 leading-relaxed">
                              {t('Colócate frente a la cámara,')}<br />
                              {t('de lado, a ~1.5m de distancia.')}<br />
                              {t('Buena iluminación ayuda a la detección.')}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Loading overlay on top of the (black) camera feed — the
                      <video> is already mounted so the stream can start */}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(5,8,14,0.72)] backdrop-blur-[2px]">
                      <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                        >
                          <Activity size={26} className="text-[#4CC9F0]" />
                        </motion.div>
                        <p className="text-xs text-[var(--muted)] font-mono">
                          {poseStatus === 'loading-model' ? t('Cargando modelo de IA...') : t('Iniciando cámara...')}
                        </p>
                        <p className="text-[9px] text-[#5C6577] font-mono max-w-[220px]">
                          {t('Se necesita acceso a la cámara para analizar tu postura en tiempo real.')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Cue list — only when live & detecting ── */}
              {isCameraLive && hasAngles && matchedCues.length > 0 && (
                <div className="px-4 py-3 space-y-1.5">
                  <h4 className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider mb-2">{t('Puntos de forma')}</h4>
                  {matchedCues.map((cue, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className={`flex items-start gap-2.5 p-2 rounded-lg text-xs ${
                        cue.ok
                          ? 'bg-[rgba(52,211,153,0.06)]'
                          : 'bg-[rgba(248,113,113,0.06)]'
                      }`}
                    >
                      {cue.ok ? (
                        <CheckCircle size={13} className="text-[#34d399] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={13} className="text-[#f87171] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className={`font-semibold ${cue.ok ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                          {cue.label}
                        </span>
                        <span className="text-[var(--muted)] block leading-relaxed">{cue.detail}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── Actions + footer — only when live ── */}
              {isCameraLive && (
                <>
                  <div className="flex gap-2.5 px-4 pb-4">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => handleRetry.current()}
                    >
                      <RefreshCw size={15} /> {t('Reiniciar cámara')}
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={onClose}
                    >
                      <CheckCircle size={15} /> {t('Listo')}
                    </Button>
                  </div>
                  <div className="px-4 pb-3">
                    <p className="text-[9px] font-mono text-center text-[#5C6577]">
                      MediaPipe Pose · 33 landmarks · ángulos en tiempo real
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
