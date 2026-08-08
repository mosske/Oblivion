import React, { useEffect, useState } from "react";
import { Playlist, Track } from "../types";
import { DragDropPlaylist } from "./DragDropPlaylist";
import { cleanTrackTitle } from "../utils/formatters";
import {
  Library,
  Sparkles,
  Plus,
  Play,
  DownloadCloud,
  Trash2,
  Edit,
  Heart,
  HardDrive,
  RefreshCcw,
  CheckCircle2,
  LayoutGrid,
  List,
  Columns,
  ArrowUpDown,
  Eye,
  EyeOff,
  Music
} from "lucide-react";
import { getA