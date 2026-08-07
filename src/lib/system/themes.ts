import { ComponentType } from 'react';
import {
  Dumbbell, Flame, Crown, Anchor, Sword, Shield,
  Sprout, GitBranch, Wind, MoonStar, Zap,
  HeartPulse, HelpCircle,
} from 'lucide-react';
import type { ThemeCategory } from './types';

export type ThemeDef = {
  value: string;
  label_key: string;
  desc_key: string;
  resource: string;
  nouns: string[];
  color: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  category: ThemeCategory;
};

export type ThemeCategoryDef = {
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  themes: ThemeDef[];
};

export const THEME_CATEGORIES: ThemeCategoryDef[] = [
  {
    label: 'Fitness',
    icon: Dumbbell,
    themes: [
      { value: 'fitness_iniciacion', label_key: 'Iniciación', desc_key: 'Primeros pasos en movimiento', resource: 'Energía', nouns: ['Constancia', 'Hábito', 'Progreso'], color: '#34d399', icon: Dumbbell, category: 'fitness' },
      { value: 'fitness_resistencia', label_key: 'Resistencia', desc_key: 'Fuerza sostenida', resource: 'Acero', nouns: ['Voluntad', 'Determinación', 'Aguante'], color: '#fbbf24', icon: Dumbbell, category: 'fitness' },
      { value: 'fitness_elite', label_key: 'Élite', desc_key: 'Dominio completo', resource: 'Poder', nouns: ['Dominio', 'Maestría', 'Legado'], color: '#f87171', icon: Dumbbell, category: 'fitness' },
    ],
  },
  {
    label: 'Taíno',
    icon: Shield,
    themes: [
      { value: 'taino_naboria', label_key: 'Naboría', desc_key: 'Pueblo y comunidad', resource: 'Conuco', nouns: ['Pueblo', 'Tierra', 'Comunidad'], color: '#4ade80', icon: Shield, category: 'taino' },
      { value: 'taino_nitaino', label_key: 'Nitaíno', desc_key: 'Guerrero con honor', resource: 'Guáni', nouns: ['Guerrero', 'Honor', 'Batey'], color: '#22d3ee', icon: Shield, category: 'taino' },
      { value: 'taino_bohique', label_key: 'Bohique', desc_key: 'Visión y espíritu', resource: 'Cemí', nouns: ['Espíritu', 'Visión', 'Cohoba'], color: '#a78bfa', icon: Shield, category: 'taino' },
      { value: 'taino_cacique', label_key: 'Cacique', desc_key: 'Liderazgo y guía', resource: 'Macana', nouns: ['Liderazgo', 'Caney', 'Duhu'], color: '#fbbf24', icon: Shield, category: 'taino' },
    ],
  },
  {
    label: 'Arquetipo',
    icon: Crown,
    themes: [
      { value: 'arquetipo_pirata', label_key: 'Pirata', desc_key: 'Navegación y descubrimiento', resource: 'Bruma', nouns: ['Navegación', 'Tesoro', 'Horizonte'], color: '#22d3ee', icon: Crown, category: 'arquetipo' },
      { value: 'arquetipo_samurai', label_key: 'Samurái', desc_key: 'Espíritu y disciplina', resource: 'Espíritu', nouns: ['Katana', 'Halfway', 'Bushido'], color: '#fbbf24', icon: Crown, category: 'arquetipo' },
      { value: 'arquetipo_monarca', label_key: 'Monarca', desc_key: 'Renacimiento y legado', resource: 'Renacimiento', nouns: ['Retorno', 'Canteras', 'Legado'], color: '#a78bfa', icon: Crown, category: 'arquetipo' },
      { value: 'arquetipo_explorador', label_key: 'Explorador', desc_key: 'Descubrir caminos nuevos', resource: 'Brújula', nouns: ['Descubrimiento', 'Camino', 'Horizonte'], color: '#34d399', icon: Crown, category: 'arquetipo' },
      { value: 'arquetipo_guardian', label_key: 'Guardián', desc_key: 'Proteger y protegerse', resource: 'Escudo', nouns: ['Protección', 'Vigor', 'Sacrificio'], color: '#f87171', icon: Crown, category: 'arquetipo' },
    ],
  },
  {
    label: 'Elemental',
    icon: Zap,
    themes: [
      { value: 'constellation', label_key: 'Constelación', desc_key: 'Recurso: Estrellas · cada entrenamiento enciende una estrella', resource: 'Estrellas', nouns: ['Luz', 'Navegación', 'Cosmos'], color: '#a78bfa', icon: Zap, category: 'elemental' },
      { value: 'crucible', label_key: 'Crisol', desc_key: 'Recurso: Fuego · cada set fortalece tu fuego interior', resource: 'Fuego', nouns: ['Calor', 'Transformación', 'Acero'], color: '#f87171', icon: Flame, category: 'elemental' },
      { value: 'fathom', label_key: 'Fathom', desc_key: 'Recurso: Profundidad · cada rep te lleva más al fondo', resource: 'Profundidad', nouns: ['Océano', 'Corriente', 'Presión'], color: '#22d3ee', icon: Anchor, category: 'elemental' },
      { value: 'labyrinth', label_key: 'Laberinto', desc_key: 'Recurso: Camino · cada workout es una nueva ruta', resource: 'Camino', nouns: ['Ruta', 'Decisión', 'Salida'], color: '#34d399', icon: Sword, category: 'elemental' },
    ],
  },
  {
    label: 'Biblico',
    icon: Shield,
    themes: [
      { value: 'bathsheba', label_key: 'Betsabe', desc_key: 'Renovación y gracia', resource: 'Gracia', nouns: ['Renacimiento', 'Caída', 'Gracia'], color: '#fbbf24', icon: MoonStar, category: 'biblico' },
      { value: 'david', label_key: 'David', desc_key: 'Fe inquebrantable', resource: 'Fe', nouns: ['Vigor', 'Golleta', 'Triunfo'], color: '#f87171', icon: Crown, category: 'biblico' },
      { value: 'gideon', label_key: 'Gedeón', desc_key: 'Estrategia y fe', resource: 'Estrategia', nouns: ['Plan', 'Valentía', 'Vigor'], color: '#34d399', icon: Anchor, category: 'biblico' },
      { value: 'job', label_key: 'Job', desc_key: 'Paciencia y resistencia', resource: 'Resistencia', nouns: ['Paciencia', 'Perseverancia', 'Fe'], color: '#22d3ee', icon: Shield, category: 'biblico' },
      { value: 'joshua', label_key: 'Josué', desc_key: 'Conquista y batalla', resource: 'Batalla', nouns: ['Muro', 'Conquista', 'Valentía'], color: '#fbbf24', icon: Sword, category: 'biblico' },
      { value: 'maria', label_key: 'María', desc_key: 'Pureza y propósito', resource: 'Pureza', nouns: ['Intención', 'Fe', 'Servicio'], color: '#4ade80', icon: Sprout, category: 'biblico' },
      { value: 'moses', label_key: 'Moisés', desc_key: 'Liderazgo y liberación', resource: 'Liberación', nouns: ['Éxodo', 'Tabla', 'Guía'], color: '#a78bfa', icon: Shield, category: 'biblico' },
      { value: 'noah', label_key: 'Noé', desc_key: 'Construir y perseverar', resource: 'Constancia', nouns: ['Arca', 'Perseverancia', 'Fe'], color: '#22d3ee', icon: GitBranch, category: 'biblico' },
      { value: 'rahab', label_key: 'Rahab', desc_key: 'Valentía frente al riesgo', resource: 'Valentía', nouns: ['Engaño', 'Fe', 'Salvación'], color: '#f87171', icon: Flame, category: 'biblico' },
      { value: 'ruth', label_key: 'Ruth', desc_key: 'Lealtad inquebrantable', resource: 'Lealtad', nouns: ['Constancia', 'Fe', 'Familia'], color: '#4ade80', icon: HeartPulse, category: 'biblico' },
      { value: 'samson', label_key: 'Sansón', desc_key: 'Fuerza sobrehumana', resource: 'Fuerza', nouns: ['Potencia', 'Vigor', 'Riqueza'], color: '#f87171', icon: Zap, category: 'biblico' },
      { value: 'tamar', label_key: 'Tamar', desc_key: 'Astucia y firmeza', resource: 'Astucia', nouns: ['Ingenio', 'Firmeza', 'Camino'], color: '#22d3ee', icon: Wind, category: 'biblico' },
    ],
  },
  {
    label: 'Ninguno',
    icon: HelpCircle,
    themes: [
      { value: 'ninguno', label_key: 'Ninguno', desc_key: 'Sin hiperfijación', resource: 'Enfoque', nouns: ['Claridad', 'Dirección', 'Propósito'], color: '#f87171', icon: HelpCircle, category: 'none' },
    ],
  },
];

export const THEME_BY_VALUE: Record<string, ThemeDef> = (() => {
  const acc: Record<string, ThemeDef> = {};
  for (const cat of THEME_CATEGORIES) {
    for (const th of cat.themes) {
      acc[th.value] = th;
    }
  }
  return acc;
})();

export const DEFAULT_THEME = 'fitness_iniciacion';
