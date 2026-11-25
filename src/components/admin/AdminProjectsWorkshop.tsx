import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Archive,
  AlertTriangle,
  Upload,
  Save,
  RotateCcw,
  ShieldAlert,
  FileCode,
  Globe,
  Lock,
  Layers
} from "lucide-react";
import { AppItem, ProjectPublishStatus } from "../../types/app";
import { AppCard } from "../AppCard";

export const AdminProjectsWorkshop: React.FC = () => {
  const [projects, setProjects] = useState<AppItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedProject, setSelectedProject] = useState<Partial<AppItem> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [previewProject, setPreviewProject] = useState<AppItem | null>(null);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<AppItem | null>(null);
  const [sudoPassword, setSudoPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/projects", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (e) {
      setErrorMsg("Не вдалося завантажити список проєктів");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateNew = () => {
    setSelectedProject({
      name: "",
      slug: "",
      publishStatus: "Draft",
      category: "Utility",
      version: "1.0.0",
      status: "available",
      fileSize: "1.0 MB",
      platforms: ["Windows"],
      tagline: { uk: "", en: "" },
      description: { uk: "", en: "" },
      longDescription: { uk: [""], en: [""] },
      features: { uk: [], en: [] },
      requirements: { os: "Windows 10+" },
      changelog: [{ version: "1.0.0", date: new Date().toISOString().split("T")[0], changes: { uk: ["Перший реліз"], en: ["Initial release"] } }]
    });
    setIsEditing(true);
    setHasUnsaved(false);
  };

  const handleEdit = (proj: AppItem) => {
    setSelectedProject({ ...proj });
    setIsEditing(true);
    setHasUnsaved(false);
  };

  const handleStatusChange = async (id: string, newStatus: ProjectPublishStatus) => {
    setActionLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/projects/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Не вдалося змінити статус");
      } else {
        setSuccessMsg(`Статус успішно змінено на ${newStatus}`);
        setTimeout(() => setSuccessMsg(""), 3000);
        loadProjects();
      }
    } catch (e) {
      setErrorMsg("Помилка при зміні статусу");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProject) return;
    if (!sudoPassword) {
      setErrorMsg("Введіть пароль підтвердження адміністратора для видалення проєкта");
      return;
    }
    setActionLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/projects/${deleteConfirmProject.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sudoPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Не вдалося видалити проєкт");
      } else {
        setSuccessMsg(`Проєкт "${deleteConfirmProject.name}" успішно видалено`);
        setDeleteConfirmProject(null);
        setSudoPassword("");
        setTimeout(() => setSuccessMsg(""), 3000);
        loadProjects();
      }
    } catch (e) {
      setErrorMsg("Помилка мережі при видаленні");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedProject.name) return;
    setActionLoading(true);
    setErrorMsg("");
    try {
      const url = selectedProject.id ? `/api/admin/projects/${selectedProject.id}` : "/api/admin/projects";
      const method = selectedProject.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedProject)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Не вдалося зберегти проєкт");
      } else {
        setSuccessMsg("Проєкт успішно збережено!");
        setIsEditing(false);
        setSelectedProject(null);
        setHasUnsaved(false);
        setTimeout(() => setSuccessMsg(""), 3000);
        loadProjects();
      }
    } catch (e) {
      setErrorMsg("Помилка з’єднання при збереженні");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isPrivate: boolean, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("isPrivate", String(isPrivate));

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Помилка завантаження файлу");
      } else if (selectedProject) {
        if (targetField === "customIconUrl") {
          setSelectedProject({ ...selectedProject, customIconUrl: data.fileUrl });
        } else if (targetField === "download") {
          setSelectedProject({
            ...selectedProject,
            download: { ...selectedProject.download, windows: data.fileUrl }
          });
        }
        setHasUnsaved(true);
        setSuccessMsg(`Файл "${file.name}" успішно завантажено!`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setErrorMsg("Не вдалося завантажити файл");
    } finally {
      setUploading(false);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    if (statusFilter === "ALL") return matchSearch;
    return matchSearch && p.publishStatus === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Workshop Control Bar */}
      <div className="p-6 bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 font-bold">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[var(--text-color)]">Приватна майстерня проєктів</h2>
            <p className="text-xs text-[var(--muted-text)] font-mono">
              Всього проєктів: {projects.length} • Опубліковано: {projects.filter(p => p.publishStatus === "Published").length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleCreateNew}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Створити проєкт
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--card-bg)] p-4 border border-[var(--border-color)] rounded-2xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-text)]" />
          <input
            type="text"
            placeholder="Пошук за назвою або slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-medium text-[var(--text-color)] focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto text-xs font-bold">
          <span className="text-[var(--muted-text)]">Статус:</span>
          {["ALL", "Draft", "Published", "Archived"].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-amber-500/20 border-amber-500 text-amber-500 font-bold"
                  : "bg-[var(--input-bg)] border-[var(--border-color)] text-[var(--muted-text)] hover:text-[var(--text-color)]"
              }`}
            >
              {st === "ALL" ? "Усі" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="py-12 text-center text-xs text-[var(--muted-text)] font-mono">
          Завантаження списку проєктів...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-[var(--card-bg)] border-2 border-dashed border-[var(--border-color)] rounded-2xl">
          <p className="text-sm font-bold text-[var(--text-color)]">Проєктів не знайдено</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(proj => (
            <div
              key={proj.id}
              className="p-4 bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-amber-500/50 transition-all shadow-sm"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 font-bold text-amber-500">
                  {proj.customIconUrl ? (
                    <img src={proj.customIconUrl} alt={proj.name} className="w-8 h-8 rounded-lg object-contain" />
                  ) : (
                    <Layers className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--text-color)]">{proj.name}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400">
                      v{proj.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        proj.publishStatus === "Published"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : proj.publishStatus === "Draft"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                      }`}
                    >
                      {proj.publishStatus}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-text)] mt-0.5 font-mono">
                    /{proj.slug} • {proj.category} • {proj.platforms?.join(", ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 border-[var(--border-color)] pt-3 md:pt-0">
                <button
                  onClick={() => setPreviewProject(proj)}
                  className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-amber-500 rounded-lg text-xs font-bold text-[var(--text-color)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-500" />
                  Прев’ю
                </button>

                <button
                  onClick={() => handleEdit(proj)}
                  className="px-3 py-1.5 bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-amber-500 rounded-lg text-xs font-bold text-[var(--text-color)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Редагувати
                </button>

                {proj.publishStatus !== "Published" && (
                  <button
                    onClick={() => handleStatusChange(proj.id, "Published")}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Опублікувати
                  </button>
                )}

                {proj.publishStatus === "Published" && (
                  <button
                    onClick={() => handleStatusChange(proj.id, "Draft")}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    В чернетку
                  </button>
                )}

                <button
                  onClick={() => setDeleteConfirmProject(proj)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Form Modal */}
      {isEditing && selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <h3 className="text-lg font-black text-[var(--text-color)]">
                {selectedProject.id ? "Редагування проєкту" : "Новий проєкт"}
              </h3>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedProject(null);
                }}
                className="text-[var(--muted-text)] hover:text-[var(--text-color)] text-xs font-bold cursor-pointer"
              >
                ✕ Закрити
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-color)] mb-1">Назва проєкту *</label>
                  <input
                    type="text"
                    required
                    value={selectedProject.name || ""}
                    onChange={e => {
                      setSelectedProject({ ...selectedProject, name: e.target.value });
                      setHasUnsaved(true);
                    }}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-medium text-[var(--text-color)] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-color)] mb-1">Slug (URL)</label>
                  <input
                    type="text"
                    value={selectedProject.slug || ""}
                    onChange={e => {
                      setSelectedProject({ ...selectedProject, slug: e.target.value });
                      setHasUnsaved(true);
                    }}
                    placeholder="автоматично з назви"
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-mono text-[var(--text-color)] focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-color)] mb-1">Статус публікації</label>
                  <select
                    value={selectedProject.publishStatus || "Draft"}
                    onChange={e => {
                      setSelectedProject({ ...selectedProject, publishStatus: e.target.value as ProjectPublishStatus });
                      setHasUnsaved(true);
                    }}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-color)] focus:outline-none focus:border-amber-500"
                  >
                    <option value="Draft">Draft (Чернетка)</option>
                    <option value="Published">Published (Опубліковано)</option>
                    <option value="Archived">Archived (В архіві)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-color)] mb-1">Версія</label>
                  <input
                    type="text"
                    value={selectedProject.version || "1.0.0"}
                    onChange={e => {
                      setSelectedProject({ ...selectedProject, version: e.target.value });
                      setHasUnsaved(true);
                    }}
                    className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-mono text-[var(--text-color)] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-color)] mb-1">Короткий опис (UK)</label>
                <input
                  type="text"
                  value={selectedProject.description?.uk || ""}
                  onChange={e => {
                    setSelectedProject({
                      ...selectedProject,
                      description: { ...selectedProject.description, uk: e.target.value, en: selectedProject.description?.en || "" }
                    });
                    setHasUnsaved(true);
                  }}
                  className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-medium text-[var(--text-color)] focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Uploads */}
              <div className="p-4 bg-zinc-900/50 border border-[var(--border-color)] rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4" />
                  Завантаження та файли релізу
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-color)] mb-1">Завантажити іконку</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => handleFileUpload(e, false, "customIconUrl")}
                      className="text-xs text-[var(--muted-text)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[var(--text-color)] mb-1">Завантажити релізний файл (ZIP/EXE/DMG)</label>
                    <input
                      type="file"
                      onChange={e => handleFileUpload(e, false, "download")}
                      className="text-xs text-[var(--muted-text)]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--border-color)] pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedProject(null);
                  }}
                  className="px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-color)] transition-all cursor-pointer"
                >
                  Скасувати
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Зберегти проєкт
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Re-authentication */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--card-bg)] border-2 border-red-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center font-bold mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-[var(--text-color)]">Небезпечна операція</h3>
              <p className="text-xs text-[var(--muted-text)] font-sans">
                Ви дійсно бажаєте видалити проєкт <strong className="text-amber-500">"{deleteConfirmProject.name}"</strong> (ID: {deleteConfirmProject.id})?
              </p>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-mono text-left">
                ⚠️ Автоматично буде створено контрольно-аварійну точку (Checkpoint). Для підтвердження введіть пароль адміністратора.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-color)] mb-1">Пароль підтвердження *</label>
              <input
                type="password"
                required
                value={sudoPassword}
                onChange={e => setSudoPassword(e.target.value)}
                placeholder="Введіть ваш пароль"
                className="w-full px-3 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-mono text-[var(--text-color)] focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmProject(null);
                  setSudoPassword("");
                }}
                className="px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-color)] transition-all cursor-pointer"
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Підтвердити видалення
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewProject && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-[var(--text-color)]">Попередній перегляд картки проєкту</h3>
              </div>
              <button
                onClick={() => setPreviewProject(null)}
                className="text-[var(--muted-text)] hover:text-[var(--text-color)] text-xs font-bold cursor-pointer"
              >
                ✕ Закрити
              </button>
            </div>

            <AppCard app={previewProject} onSelect={() => {}} />

            <p className="text-[11px] text-[var(--muted-text)] text-center font-mono">
              Саме так цей проєкт відображатиметься у публічному каталозі.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
