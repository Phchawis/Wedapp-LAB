/* Icon — thin wrapper over lucide-react so screens can reference icons by
   PascalCase name (matching the original UI-kit `Icon` helper API:
   name / size / color / sw / style).

   Only the icons actually used by the app are imported, so the bundle
   ships ~30 icons instead of the entire lucide set. To use a new icon,
   import it below and add it to ICONS. */
import {
  Plus, ArrowRight, ArrowLeft, User, Lock, LayoutDashboard, FolderClosed,
  BellRing, FlaskConical, LogOut, Files, CircleCheck, Clock, ChevronRight,
  FileSearch, AlertTriangle, Paperclip, ExternalLink, Pencil, Eye, History,
  Check, Megaphone, PencilLine, Download, Ban, FileText, FilePen, Link, Search,
  UserCog, Trash2, Printer, FileSpreadsheet, Upload,
} from 'lucide-react';

const ICONS = {
  Plus, ArrowRight, ArrowLeft, User, Lock, LayoutDashboard, FolderClosed,
  BellRing, FlaskConical, LogOut, Files, CircleCheck, Clock, ChevronRight,
  FileSearch, AlertTriangle, Paperclip, ExternalLink, Pencil, Eye, History,
  Check, Megaphone, PencilLine, Download, Ban, FileText, FilePen, Link, Search,
  UserCog, Trash2, Printer, FileSpreadsheet, Upload,
};

export function Icon({ name, size = 18, color = 'currentColor', sw = 2, style }) {
  const Cmp = ICONS[name];
  if (!Cmp) {
    if (import.meta.env.DEV) console.warn(`Icon "${name}" is not registered in components/Icon.jsx`);
    return <span style={{ display: 'inline-block', width: size, height: size, ...style }} />;
  }
  return <Cmp size={size} color={color} strokeWidth={sw} style={{ display: 'block', flexShrink: 0, ...style }} />;
}

export default Icon;
