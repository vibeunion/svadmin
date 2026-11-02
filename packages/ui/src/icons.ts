/**
 * Built-in icon names for navigation and resource metadata.
 *
 * `MenuItem.icon` and `ResourceDefinition.icon` accept either a component or a
 * string. This module owns the string → component mapping (lucide by default),
 * so hosts and plugins can extend it through `registerIcons()` instead of
 * editing `Sidebar`.
 */
import {
  LayoutDashboard, FileText, Users, Settings, Home, Palette,
  Image as ImageIcon, Layout, Folder, Type, Video,
  Download, ListTodo, TrendingUp, Sparkles, Images, Bot, Key, KeyRound, CreditCard, BookOpen, Wrench,
  Repeat, ClipboardCheck, SlidersHorizontal, AlertTriangle, Mail, Map as MapIcon, MessageSquare, Send,
  ShoppingBag, Star, Briefcase, Building2, Calendar, Bell, Clock, Tag, Trash2, Shield,
} from '@lucide/svelte';
import { createIconRegistry, type IconComponent } from './icon-registry.js';

/** Default icon vocabulary; keys are the documented string form. */
export const builtinIcons: Readonly<Record<string, IconComponent>> = {
  dashboard: LayoutDashboard,
  posts: FileText,
  file: FileText,
  users: Users,
  settings: Settings,
  home: Home,
  palette: Palette,
  image: ImageIcon,
  layout: Layout,
  folder: Folder,
  type: Type,
  video: Video,
  download: Download,
  'list-todo': ListTodo,
  'trending-up': TrendingUp,
  sparkles: Sparkles,
  images: Images,
  bot: Bot,
  key: Key,
  'key-round': KeyRound,
  'credit-card': CreditCard,
  'book-open': BookOpen,
  wrench: Wrench,
  repeat: Repeat,
  'clipboard-check': ClipboardCheck,
  'sliders-horizontal': SlidersHorizontal,
  'alert-triangle': AlertTriangle,
  mail: Mail,
  map: MapIcon,
  'message-square': MessageSquare,
  send: Send,
  'shopping-bag': ShoppingBag,
  star: Star,
  briefcase: Briefcase,
  building: Building2,
  calendar: Calendar,
  bell: Bell,
  clock: Clock,
  tag: Tag,
  trash: Trash2,
  shield: Shield,
};

const registry = createIconRegistry(builtinIcons);

export const replaceIcons = registry.replaceIcons;
export const registerIcons = registry.registerIcons;
export const resolveIcon = registry.resolveIcon;
export const hasIcon = registry.hasIcon;
export const getIconNames = registry.getIconNames;
export const setIconFallback = registry.setIconFallback;
export const setIconMissHandler = registry.setIconMissHandler;
export const resetIconRegistry = registry.resetIconRegistry;
export type { IconComponent, IconMissHandler, IconRegistry } from './icon-registry.js';