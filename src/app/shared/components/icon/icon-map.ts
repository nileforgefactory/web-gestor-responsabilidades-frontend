import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faScaleBalanced, faFolderOpen, faBook, faSackDollar, faMagnifyingGlass, faBolt, faUsers,
  faFileLines, faCircleCheck, faTriangleExclamation, faTrash, faEye, faEyeSlash, faLock,
  faStop, faArrowRight, faChevronRight, faLandmark, faGavel, faFileContract, faScroll,
  faFileInvoice, faStamp, faChartSimple, faDrawPolygon, faCalendarDays, faTableCells,
  faClipboardList, faDownload, faRotate, faArrowLeft, faGlobe, faMap, faCity, faFlask,
  faBoxArchive, faSuperscript, faCalculator, faHashtag, faScissors, faRobot, faFilePdf,
  faFileLines as faFileText, faPenNib, faXmark, faBullseye, faCompass, faCircleXmark,
} from '@fortawesome/free-solid-svg-icons';

/** Mapa emoji legado -> icono FontAwesome equivalente (misma semantica, solo cambia el render). */
const MAP: Record<string, IconDefinition> = {
  '⚖️': faScaleBalanced,
  '📂': faFolderOpen,
  '📚': faBook,
  '💰': faSackDollar,
  '🔍': faMagnifyingGlass,
  '⚡': faBolt,
  '👥': faUsers,
  '📄': faFileLines,
  '✅': faCircleCheck,
  '⚠️': faTriangleExclamation,
  '🗑️': faTrash,
  '👁️': faEye,
  '🙈': faEyeSlash,
  '🔒': faLock,
  '⏹': faStop,
  '→': faArrowRight,
  '←': faArrowLeft,
  '🏛️': faLandmark,
  '🚨': faTriangleExclamation,
  '🗃️': faTableCells,
  '📊': faChartSimple,
  '📐': faDrawPolygon,
  '📅': faCalendarDays,
  '📋': faClipboardList,
  '📜': faScroll,
  '🔏': faStamp,
  '📥': faDownload,
  '🔄': faRotate,
  '🌐': faGlobe,
  '🗺️': faMap,
  '🏙️': faCity,
  '🔬': faFlask,
  '📦': faBoxArchive,
  '①': faSuperscript,
  '②': faSuperscript,
  '③': faSuperscript,
  '④': faSuperscript,
  '⑤': faSuperscript,
  '🔢': faCalculator,
  '✂️': faScissors,
  '🤖': faRobot,
  '📕': faFilePdf,
  '📝': faFileText,
  '✍️': faPenNib,
  '✕': faXmark,
  '🎯': faBullseye,
  '🧭': faCompass,
  '🚫': faCircleXmark,
  '📃': faFileContract,
  '📖': faBook,
  '🧾': faFileInvoice,
};

const FALLBACK = faFileLines;

export function emojiToIcon(emoji: string | undefined | null): IconDefinition {
  if (!emoji) return FALLBACK;
  return MAP[emoji] ?? FALLBACK;
}
