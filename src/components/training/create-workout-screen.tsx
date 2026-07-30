'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useExercises } from '@/lib/utils/use-exercises';
import { FOCUS_LABELS } from '@/lib/utils/constants';
import { uid, matchesEquipment } from '@/lib/utils/helpers';
import type { WorkoutExercise, WorkoutTemplate } from '@/types';
import {
  Dumbbell,
  Plus,
  Minus,
  Trash2,
  Save,
  Play,
  ArrowLeft,
  GripVertical,
  ChevronRight,
  Check,
  Search,
} from 'lucide-react';
import { FitnessIcon } from '@/components/ui/fitness-icon';
import {
  MuscleGroupIcon,
  MUSCLE_GROUPS as MUSCLE_REGISTRY,
} from '@/components/ui/muscle-icons';
import type { MuscleGroupKey } from '@/components/ui/muscle-icons';

const MUSCLE_ICON: Record<string, React.ReactNode> = {
  piernas: <FitnessIcon name="lower-body" size={20} />,
  gluteos: <FitnessIcon name="lower-body" size={20} />,
  pecho:   <FitnessIcon name="bench-press" size={20} />,
  espalda: <FitnessIcon name="upper-body" size={20} />,
  hombros: <FitnessIcon name="upper-body" size={20} />,
  brazos:  <FitnessIcon name="biceps" size={20} />,
  core:    <FitnessIcon name="core" size={20} />,
  cardio:  <FitnessIcon name="running" size={20} />,
};

/** SVG inline (viewBox 24×24, stroke currentColor, strokeWidth 2) para botones rápidos */
const SvgIcon = (paths: React.ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 sm:w-8 sm:h-8">
    {paths}
  </svg>
);

// ── Iconos base para categorías sin icono propio ──
const PushIcon = SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M6 8c2 2 4 3 6 1"/><path d="M18 8c-2 2-4 3-6 1"/><path d="M12 6v6"/></>);
const PullIcon = SvgIcon(<><circle cx="12" cy="3" r="2"/><path d="M7 5c1 3 2 5 5 6"/><path d="M17 5c-1 3-2 5-5 6"/><path d="M12 5v6"/></>);
const PressIcon = SvgIcon(<><circle cx="12" cy="5" r="2"/><path d="M9 9c1-2 1-4 3-7"/><path d="M15 9c-1-2-1-4-3-7"/><path d="M12 7v5"/></>);
const BridgeIcon = SvgIcon(<><circle cx="12" cy="3" r="2"/><path d="M12 5v3"/><path d="M7 13c1 3 3 4 5 4s4-1 5-4"/><path d="M7 8c0 2 1 3 2 5"/><path d="M17 8c0 2-1 3-2 5"/></>);

/** Mapa: ID del catálogo → SVG ReactNode para el grid "Toque para agregar" */
const EXERCISE_ICON: Record<string, React.ReactNode> = {
  // ── Core / Abdominales ──
  '3_4_Sit-Up': SvgIcon(<><path d="M12 4c-2 0-3.5 1.5-3.5 3.5S10 11 12 11s3.5-1.5 3.5-3.5S14 4 12 4z"/><path d="M7 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5v5H7v-5z"/><path d="M9 16h6M9 19h6"/></>),
  'Ab_Crunch_Machine': SvgIcon(<><rect x="7" y="3" width="10" height="18" rx="2"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><path d="M12 7c-1 0-2 .5-2 1.5S11 10 12 10s2-.5 2-1.5S13 7 12 7z"/></>),
  'Ab_Roller': SvgIcon(<><circle cx="6" cy="14" r="3"/><circle cx="18" cy="14" r="3"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="12" y1="14" x2="12" y2="6"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="10" y1="6" x2="14" y2="6"/></>),
  'Air_Bike': SvgIcon(<><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>),
  'Alternate_Heel_Touchers': SvgIcon(<><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>),
  'Barbell_Ab_Rollout': SvgIcon(<><circle cx="6" cy="14" r="3"/><circle cx="18" cy="14" r="3"/><line x1="9" y1="14" x2="15" y2="14"/><line x1="12" y1="14" x2="12" y2="6"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="10" y1="6" x2="14" y2="6"/></>),
  'Backward_Medicine_Ball_Throw': SvgIcon(<><path d="M12 4c-2 0-3.5 1.5-3.5 3.5S10 11 12 11s3.5-1.5 3.5-3.5S14 4 12 4z"/><path d="M7 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5v5H7v-5z"/><path d="M9 16h6M9 19h6"/></>),
  // más core
  'Cable_Crunch': SvgIcon(<><rect x="7" y="3" width="10" height="18" rx="2"/><line x1="12" y1="7" x2="12" y2="17"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/><path d="M12 7c-1 0-2 .5-2 1.5S11 10 12 10s2-.5 2-1.5S13 7 12 7z"/></>),
  'Crunch_-_Hands_Overhead': SvgIcon(<><path d="M12 4c-2 0-3.5 1.5-3.5 3.5S10 11 12 11s3.5-1.5 3.5-3.5S14 4 12 4z"/><path d="M7 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5v5H7v-5z"/><path d="M9 16h6M9 19h6"/></>),
  'Decline_Crunch': SvgIcon(<><path d="M12 4c-2 0-3.5 1.5-3.5 3.5S10 11 12 11s3.5-1.5 3.5-3.5S14 4 12 4z"/><path d="M7 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5v5H7v-5z"/><path d="M9 16h6M9 19h6"/></>),
  'Elbow_to_Knee': SvgIcon(<><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>),
  'Flat_Bench_Leg_Pull-In': SvgIcon(<><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>),
  'Hanging_Leg_Raise': SvgIcon(<><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>),
  'Jackknife_Sit-Up': SvgIcon(<><path d="M12 4c-2 0-3.5 1.5-3.5 3.5S10 11 12 11s3.5-1.5 3.5-3.5S14 4 12 4z"/><path d="M7 14c0-2.5 2-4.5 5-4.5s5 2 5 4.5v5H7v-5z"/><path d="M9 16h6M9 19h6"/></>),
  'Knee_Tuck_Jump': PushIcon,
  'Decline_Oblique_Crunch': SvgIcon(<><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>),
  'Plank': SvgIcon(<><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>),
  'Cable_Reverse_Crunch': SvgIcon(<><path d="M7 4c0 3 2 5 5 5s5-2 5-5"/><path d="M7 9v8l-2 3M17 9v8l2 3"/><path d="M9 12c0 2 1 3 3 3s3-1 3-3"/><path d="M5 20h14"/></>),
  'Side_Bridge': PushIcon,

  // ── Piernas / Estiramiento ──
  '90_90_Hamstring': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Adductor': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v6l-4 8M12 12l4 8"/><path d="M8 20l-2 2M16 20l2 2"/><path d="M10 9l-3 2M14 9l3 2"/></>),
  'Adductor_Groin': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v4l-5 8M12 10l5 8"/><path d="M7 18l-2 3M17 18l2 3"/><path d="M9 8l-4 3M15 8l4 3"/></>),
  'All_Fours_Quad_Stretch': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l3 8M12 11l-3 8"/><path d="M15 19l2 3M9 19l-2 3"/><path d="M13 8l3-2M11 8l-3-2"/></>),
  'Ball_Leg_Curl': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Band_Hip_Adductions': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v4l-5 8M12 10l5 8"/><path d="M7 18l-2 3M17 18l2 3"/><path d="M9 8l-4 3M15 8l4 3"/></>),
  // más piernas
  'Backward_Drag': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Balance_Board': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Band_Good_Morning': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Goblet_Squat': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  '3bc8b411-a28d-4e1c-a6d1-769e18fe9881': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Leg_Extensions': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Leg_Press': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Lying_Bent_Leg_Groin': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Mountain_Climbers': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'a3125129-203f-4195-8f8a-a460ff9e9481': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Barbell_Step_Ups': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  // ── Equipamiento específico ──
  'Advanced_Kettlebell_Windmill': SvgIcon(<><path d="M12 3a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><circle cx="12" cy="16" r="5"/><path d="M12 11v2"/><path d="M9 16h6M10 19h4"/></>),
  'Alternating_Kettlebell_Press': SvgIcon(<><path d="M12 3a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><circle cx="12" cy="16" r="5"/><path d="M12 11v2"/><path d="M9 16h6M10 19h4"/></>),
  'Alternating_Floor_Press': SvgIcon(<><path d="M12 3a4 4 0 0 0-4 4v2a4 4 0 0 0 8 0V7a4 4 0 0 0-4-4z"/><circle cx="12" cy="16" r="5"/><path d="M12 11v2"/><path d="M9 16h6M10 19h4"/></>),
  // más equipamiento
  'Atlas_Stone_Trainer': PullIcon,
  'Atlas_Stones': PullIcon,
  'Axle_Deadlift': PullIcon,
  'Band_Assisted_Pull-Up': PullIcon,
  'Barbell_Deadlift': PullIcon,
  'Barbell_Hip_Thrust': BridgeIcon,
  'Barbell_Full_Squat': SvgIcon(<><circle cx="12" cy="4" r="2"/><path d="M12 6v5l-4 6M12 11l4 6"/><path d="M8 17l-2 3M16 17l2 3"/><path d="M10 8l4-2"/></>),
  'Barbell_Bench_Press_-_Medium_Grip': PushIcon,
  'Bent_Over_Barbell_Row': PullIcon,
  'Dumbbell_Bench_Press': PushIcon,
  'Barbell_Rear_Delt_Row': PullIcon,
  'Close-Grip_Front_Lat_Pulldown': PullIcon,
  'Pull_Through': BridgeIcon,
  'Dumbbell_Lying_Pronation': PullIcon,
  'Trap_Bar_Deadlift': PullIcon,
  'Upright_Barbell_Row': PullIcon,

  // ── Brazos ──
  'Alternate_Hammer_Curl': SvgIcon(<><line x1="6" y1="3" x2="6" y2="10"/><line x1="18" y1="3" x2="18" y2="10"/><path d="M6 10a6 6 0 0 0 12 0"/><line x1="8" y1="12" x2="8" y2="20"/><line x1="16" y1="12" x2="16" y2="20"/><circle cx="8" cy="21" r="1.5"/><circle cx="16" cy="21" r="1.5"/></>),
  'Alternate_Incline_Dumbbell_Curl': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  'Barbell_Curl': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  'Barbell_Curls_Lying_Against_An_Incline': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  'Band_Skull_Crusher': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  // más brazos
  'Cable_Hammer_Curls_-_Rope_Attachment': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  'Concentration_Curls': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  'Decline_Dumbbell_Triceps_Extension': PressIcon,
  'Alternating_Cable_Shoulder_Press': PressIcon,
  'Lying_Close-Grip_Barbell_Triceps_Press_To_Chin': PressIcon,
  'Cable_One_Arm_Tricep_Extension': PressIcon,
  'Preacher_Curl': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),
  'Dips_-_Triceps_Version': PressIcon,
  'Triceps_Pushdown': PressIcon,
  'Zottman_Curl': SvgIcon(<><path d="M7 14c0-4 2-7 5-7s5 3 5 7-2 7-5 7"/><path d="M7 14l-3 3M17 14l3 3"/><circle cx="12" cy="7" r="2"/><path d="M9 17h6"/></>),

  // ── Pecho (push) ──
  'Around_The_Worlds': PushIcon,
  'Dips_-_Chest_Version': PushIcon,
  '5b4fb3ec-53a1-4525-a58a-c070798ea86e': PushIcon,
  'Decline_Dumbbell_Bench_Press': PushIcon,
  'Dumbbell_Flyes': PushIcon,
  '55ff32e6-24ab-4303-9b50-176d60d48796': PushIcon,
  'Incline_Dumbbell_Press': PushIcon,
  'c4aca20e-9591-425f-85a8-0ab04cd1515d': PushIcon,
  'Barbell_Side_Bend': PushIcon,
  'Close-Grip_Barbell_Bench_Press': PushIcon,

  // ── Espalda (pull) ──
  'Alternating_Kettlebell_Row': PullIcon,
  'Back_Flyes_-_With_Bands': PullIcon,
  'Band_Pull_Apart': PullIcon,
  'Chin-Up': PullIcon,
  'Face_Pull': PullIcon,
  'Hyperextensions_Back_Extensions': PullIcon,
  'Reverse_Flyes': PullIcon,
  'Barbell_Shrug': PullIcon,
  'Snatch': PullIcon,
  'Rope_Straight-Arm_Pulldown': PullIcon,
  'Wide-Grip_Lat_Pulldown': PullIcon,

  // ── Hombros (press) ──
  'Anti-Gravity_Press': PressIcon,
  'Arm_Circles': PressIcon,
  'Arnold_Dumbbell_Press': PressIcon,
  '2500c212-6f14-4a8d-a997-04e9e7c04116': PressIcon,
  'bff4776a-5972-4799-9534-c9d25e4885ea': PressIcon,
  'Chest_And_Front_Of_Shoulder_Stretch': PressIcon,
  'Barbell_Shrug_Behind_The_Back': PressIcon,
  'Dumbbell_Lying_One-Arm_Rear_Lateral_Raise': PressIcon,

  // ── Cardio ──
  '48ee1385-47c5-4821-8b6a-57fac6130776': SvgIcon(<><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>),
  '89443e49-e5be-4b67-a5f6-e3f5ff80f6ea': SvgIcon(<><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>),
  'Running_Treadmill': SvgIcon(<><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>),
  'Hip_Flexion_with_Band': SvgIcon(<><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/><path d="M12 5c-2 0-3 1.5-3 3s1 3 3 3 3-1.5 3-3-1-3-3-3z"/><path d="M9 8l-3 7M15 8l3 7"/><path d="M12 11l-2 4M12 11l2 4"/></>),

  // ── Glúteos ──
  'Ankle_On_The_Knee': BridgeIcon,
  'Barbell_Glute_Bridge': BridgeIcon,
  '821e289e-bd39-4410-b436-6f2a43bc3649': BridgeIcon,
  'Glute_Kickback': BridgeIcon,
  'Single_Leg_Glute_Bridge': BridgeIcon,
};

/** Fallback por músculo para ejercicios sin icono específico */
const MUSCLE_FALLBACK: Record<string, React.ReactNode> = {
  core:    EXERCISE_ICON['3_4_Sit-Up'],
  piernas: EXERCISE_ICON['90_90_Hamstring'],
  brazos:  EXERCISE_ICON['Alternate_Incline_Dumbbell_Curl'],
  gluteos: BridgeIcon,
  pecho:   PushIcon,
  espalda: PullIcon,
  hombros: PressIcon,
  cardio:  EXERCISE_ICON['Air_Bike'],
};

/** Busca icono SVG por ID exacto o cae al fallback por músculo */
function ExerciseIcon({ id, muscle }: { id: string; muscle: string }) {
  const icon = EXERCISE_ICON[id] ?? MUSCLE_FALLBACK[muscle] ?? null;
  return icon ? (
    <span className="text-[#94a0b8]/70 group-hover:text-[#ffb454] transition-colors duration-200">
      {icon}
    </span>
  ) : null;
}

// Datos de filtrado específicos del workout (no viven en el registro tipado)
const MUSCLE_FILTERS: Record<MuscleGroupKey, string[]> = {
  full:  ['piernas', 'gluteos', 'pecho', 'espalda', 'hombros', 'brazos', 'core', 'cardio'],
  upper: ['pecho', 'espalda', 'hombros', 'brazos'],
  lower: ['piernas', 'gluteos'],
  core:  ['core', 'cardio'],
};

// Derivado del registro tipado — cualquier cambio en MUSCLE_REGISTRY
// se refleja aquí. TypeScript forza a añadir filtros si se agrega una key.
const MUSCLE_GROUPS = (Object.keys(MUSCLE_REGISTRY) as MuscleGroupKey[]).map((key) => ({
  key,
  label: MUSCLE_REGISTRY[key].label,
  muscles: MUSCLE_FILTERS[key],
}));

const DURATION_PRESETS = [10, 15, 20, 30, 45];

// ─── Steps ───
type Step = 'focus' | 'exercises' | 'done';

export function CreateWorkoutScreen() {
  const setView = useStore((s) => s.setView);
  const addTemplate = useStore((s) => s.addTemplate);
  const setPlan = useStore((s) => s.setPlan);
  const profile = useStore((s) => s.profile);
  const equipment = profile?.equipment ?? 'ninguno';

  const [step, setStep] = React.useState<Step>('focus');
  const [name, setName] = React.useState('');
  const [focus, setFocus] = React.useState<'full' | 'upper' | 'lower' | 'core'>('full');
  const [exercises, setExercises] = React.useState<WorkoutExercise[]>([]);
  const [duration, setDuration] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const { exercises: catalog } = useExercises();

  const availableExercises = React.useMemo(() => {
    const group = MUSCLE_GROUPS.find((g) => g.key === focus);
    const muscleSet = group ? new Set(group.muscles) : new Set<string>();
    let exs = catalog.filter(
      (e) => muscleSet.has(e.muscle) && matchesEquipment(equipment, e.equipment)
    );
    if (search.trim()) {
      const q = search.toLowerCase();
      exs = exs.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.muscle.toLowerCase().includes(q)
      );
    }
    return exs;
  }, [focus, equipment, search, catalog]);

  const addExercise = (exId: string) => {
    const found = catalog.find((e) => e.id === exId);
    if (!found) return;
    const newEx: WorkoutExercise = {
      exercise_id: found.id,
      name: found.name,
      muscle: found.muscle,
      sets: 3,
      reps: found.load_type === 'time' ? 30 : 10,
      rest: 60,
      completed_sets: 0,
      completed_reps: [],
      status: 'pending',
    };
    setExercises((prev) => [...prev, newEx]);
  };

  const removeExercise = (idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateExercise = (idx: number, patch: Partial<WorkoutExercise>) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, ...patch } : e))
    );
  };

  const totalSets = exercises.reduce((a, e) => a + e.sets, 0);

  const startWorkout = () => {
    if (exercises.length === 0) return;
    useStore.getState().trackDecision(7);
    setPlan({
      action: 'train',
      intensity: 'standard',
      duration,
      reasons: ['Entrenamiento personalizado'],
      confidence: 85,
      recovery_score: 60,
      consistency: { user_id: '', period_start: '', period_end: '', consistency_pct: 50, sessions_done: 0, sessions_target: 4 },
      date: new Date().toISOString().slice(0, 10),
      done: false,
      workout: {
        focus,
        intensity: 'standard',
        duration,
        exercises,
        title: name || `Rutina ${FOCUS_LABELS[focus]}`,
        sets: totalSets,
        rest: 60,
      },
    });
    setView('session');
  };

  const saveTemplate = () => {
    if (exercises.length === 0) return;
    const template: WorkoutTemplate = {
      id: uid(),
      name: name || `Mi rutina ${FOCUS_LABELS[focus]}`,
      focus,
      exercises: exercises.map((e) => ({ ...e, status: 'pending' as const })),
      created_at: new Date().toISOString(),
    };
    addTemplate(template);
    setStep('done');
  };

  const totalEx = exercises.length;
  const canProceed = totalEx > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          aria-label="Volver"
          className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center hover:bg-white/[.08]"
          onClick={() => {
            if (step === 'exercises') setStep('focus');
            else setView('home');
          }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <div className="text-center">
          <span className="text-lg font-bold">
            {step === 'focus' ? 'Crear entrenamiento' : step === 'exercises' ? 'Elige ejercicios' : '¡Listo!'}
          </span>
          <p className="text-xs text-[#94a0b8]">
            {step === 'focus' ? 'Paso 1 de 2' : step === 'exercises' ? 'Paso 2 de 2' : ''}
          </p>
        </div>
        {step === 'exercises' && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-11 h-11 rounded-2xl border border-white/[.07] bg-[#151b2a] flex items-center justify-center text-[#ffb454] hover:bg-white/[.08]"
            onClick={() => setExercises([])}
          >
            <Trash2 size={18} />
          </motion.button>
        )}
        {step !== 'exercises' && <div className="w-11" />}
      </div>

      {/* Step indicators */}
      <div className="flex gap-2 px-4 mb-4">
        {(['focus', 'exercises'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step === s || (step === 'done' && s === 'exercises')
                  ? 'bg-[#ffb454] text-[#0a0d14]'
                  : 'bg-white/[.08] text-[#94a0b8]'
              }`}
            >
              {step === 'done' && s === 'exercises' ? '✓' : i + 1}
            </div>
            <span className="text-xs text-[#94a0b8] hidden sm:block">
              {s === 'focus' ? 'Enfoque' : 'Ejercicios'}
            </span>
            {i === 0 && <div className="flex-1 h-0.5 bg-white/[.08]" />}
          </div>
        ))}
      </div>

      <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-4">
        <AnimatePresence mode="wait">
          {step === 'focus' && (
            <motion.div
              key="focus"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Name */}
              <Card>
                <label className="text-sm font-semibold mb-2 block">
                  Nombre de la rutina <span className="text-[#94a0b8] font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Full body express, Día de piernas..."
                  className="w-full bg-white/[.06] border border-white/[.10] rounded-xl px-4 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
                  autoFocus
                />
              </Card>

              {/* Focus selection */}
              <Card>
                <label className="text-sm font-semibold mb-3 block">
                  ¿Qué grupo muscular quieres trabajar?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {MUSCLE_GROUPS.map((g) => (
                    <motion.button
                      key={g.key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setFocus(g.key as typeof focus);
                        setStep('exercises');
                      }}
                      className={`group flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all duration-300 ${
                        focus === g.key
                          ? 'border-[#ffb454] bg-[rgba(255,180,84,0.12)] shadow-[0_0_24px_rgba(255,180,84,0.18)]'
                          : 'border-white/[.07] bg-[#151b2a] hover:border-[#ffb454]/40 hover:shadow-[0_0_28px_rgba(255,180,84,0.10)] hover:bg-[rgba(255,180,84,0.03)]'
                      }`}
                    >
                      <motion.span
                        className="text-[#ffb454] block"
                        whileHover={{
                          scale: 1.15,
                          rotate: [0, -6, 6, 0],
                          transition: { duration: 0.45, ease: 'easeInOut' },
                        }}
                      >
                        <MuscleGroupIcon name={g.key} size={28} title={g.label} />
                      </motion.span>
                      <span className="text-sm font-bold group-hover:text-white transition-colors duration-300">
                        {g.label}
                      </span>
                      <span className="text-[10px] text-[#94a0b8] group-hover:text-[#b0c4d8] transition-colors duration-300">
                        {g.muscles.join(' · ')}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Duration */}
              <Card>
                <label className="text-sm font-semibold mb-3 block">
                  Duración estimada
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_PRESETS.map((d) => (
                    <motion.button
                      key={d}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setDuration(d)}
                      className={`px-5 py-3 rounded-xl font-bold text-sm transition-all ${
                        duration === d
                          ? 'bg-[#ffb454] text-[#0a0d14]'
                          : 'bg-white/[.06] text-[#94a0b8] border border-white/[.07]'
                      }`}
                    >
                      {d} min
                    </motion.button>
                  ))}
                </div>
              </Card>

              {/* Go to exercises */}
              <Button
                variant="primary"
                size="large"
                className="w-full"
                onClick={() => setStep('exercises')}
              >
                Elegir ejercicios <ChevronRight size={18} />
              </Button>
            </motion.div>
          )}

          {step === 'exercises' && (
            <motion.div
              key="exercises"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Search */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5c6577]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar ejercicios..."
                  className="w-full bg-[#151b2a] border border-white/[.10] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#5c6577] outline-none focus:border-[#ffb454] transition-colors"
                />
              </div>

              {/* Quick add: Common exercises visual grid */}
              {!search && (
                <div>
                  <p className="text-xs text-[#94a0b8] font-semibold uppercase tracking-wider mb-2 px-1">
                    Toque para agregar
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {availableExercises.slice(0, 12).map((ex) => {
                      const added = exercises.some((e) => e.exercise_id === ex.id);
                      return (
                        <motion.button
                          key={ex.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => {
                            if (added) {
                              const idx = exercises.findIndex((e) => e.exercise_id === ex.id);
                              removeExercise(idx);
                            } else {
                              addExercise(ex.id);
                            }
                          }}
                          className={`group flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                            added
                              ? 'border-[#34d399] bg-[rgba(52,211,153,0.1)]'
                              : 'border-white/[.07] bg-[#151b2a] hover:border-white/[.15]'
                          }`}
                        >
                          <ExerciseIcon id={ex.id} muscle={ex.muscle} />
                          <span className="text-[10px] font-semibold text-center leading-tight">
                            {ex.name.split(' ').slice(0, 2).join(' ')}
                          </span>
                          {added && (
                            <span className="text-[8px] text-[#34d399] font-bold">
                              +{exercises.filter((e) => e.exercise_id === ex.id).length}
                            </span>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Search results list */}
              {search && (
                <div className="space-y-1">
                  {availableExercises.map((ex) => {
                    const added = exercises.some((e) => e.exercise_id === ex.id);
                    return (
                      <motion.button
                        key={ex.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          added
                            ? removeExercise(exercises.findIndex((e) => e.exercise_id === ex.id))
                            : addExercise(ex.id);
                        }}
                        className={`flex items-center gap-3 w-full p-3 rounded-xl border transition-all ${
                          added
                            ? 'border-[#34d399] bg-[rgba(52,211,153,0.08)]'
                            : 'border-white/[.07] bg-[#151b2a]'
                        }`}
                      >
                        <span className="text-[#94a0b8]">{MUSCLE_ICON[ex.muscle] || <Dumbbell size={18} />}</span>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold">{ex.name}</div>
                          <div className="text-[10px] text-[#94a0b8] capitalize">{ex.muscle}</div>
                        </div>
                        {added ? (
                          <Check size={18} className="text-[#34d399]" />
                        ) : (
                          <Plus size={18} className="text-[#94a0b8]" />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Selected exercises */}
              {exercises.length > 0 && (
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold">
                      Tus ejercicios ({totalEx})
                    </span>
                    <Badge variant="light">{totalSets} series · ~{exercises.reduce((a, e) => a + e.sets * e.rest, 0) > 0
                      ? Math.round(exercises.reduce((a, e) => a + e.sets * e.rest, 0) / 60)
                      : 0} min descanso</Badge>
                  </div>
                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <motion.div
                        key={`${ex.exercise_id}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[.04] border border-white/[.06]"
                      >
                        <GripVertical size={14} className="text-[#5c6577] shrink-0" />
                        <span className="shrink-0 text-[#94a0b8]"><Dumbbell size={18} /></span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{ex.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {/* Sets */}
                            <button
                              onClick={() => updateExercise(i, { sets: Math.max(1, ex.sets - 1) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[#94a0b8]"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold tabular-nums min-w-[20px] text-center">{ex.sets}</span>
                            <button
                              onClick={() => updateExercise(i, { sets: Math.min(6, ex.sets + 1) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[#94a0b8]"
                            >
                              <Plus size={10} />
                            </button>
                            <span className="text-[10px] text-[#94a0b8] ml-1">series</span>

                            {/* Reps */}
                            <button
                              onClick={() => updateExercise(i, { reps: Math.max(1, ex.reps - 5) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[#94a0b8]"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-xs font-bold tabular-nums min-w-[20px] text-center">{ex.reps}</span>
                            <button
                              onClick={() => updateExercise(i, { reps: Math.min(120, ex.reps + 5) })}
                              className="w-6 h-6 rounded-md bg-white/[.06] flex items-center justify-center text-[10px] text-[#94a0b8]"
                            >
                              <Plus size={10} />
                            </button>
                            <span className="text-[10px] text-[#94a0b8]">reps</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeExercise(i)}
                          className="w-8 h-8 rounded-lg bg-white/[.04] flex items-center justify-center text-[#ff5470] hover:bg-[rgba(255,84,112,0.1)]"
                        >
                          <Trash2 size={14} />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Action buttons */}
              <div className="space-y-2.5 pb-4">
                <Button
                  variant="primary"
                  size="large"
                  className="w-full"
                  disabled={!canProceed}
                  onClick={startWorkout}
                >
                  <Play size={18} /> Empezar ahora
                </Button>
                <Button
                  variant="ghost"
                  size="large"
                  className="w-full"
                  disabled={!canProceed}
                  onClick={saveTemplate}
                >
                  <Save size={18} /> Guardar como plantilla
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                className="w-20 h-20 rounded-full bg-[rgba(52,211,153,0.15)] flex items-center justify-center mb-4"
              >
                <Check size={36} className="text-[#34d399]" />
              </motion.div>
              <h2 className="text-2xl font-black mb-2">Plantilla guardada</h2>
              <p className="text-sm text-[#94a0b8] mb-2">
                {name || `Mi rutina ${FOCUS_LABELS[focus]}`}
              </p>
              <p className="text-xs text-[#94a0b8] mb-8">
                {totalEx} ejercicios · {totalSets} series · ~{duration} min
              </p>
              <div className="flex gap-3 w-full max-w-xs">
                <Button variant="primary" className="flex-1" onClick={startWorkout}>
                  <Play size={16} /> Empezar
                </Button>
                <Button variant="ghost" className="flex-1" onClick={() => setView('home')}>
                  Ir al inicio
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
