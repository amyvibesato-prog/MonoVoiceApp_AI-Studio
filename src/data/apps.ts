import { AppItem } from '../types/app';

export const APPS_DATA: AppItem[] = [
  {
    id: "monovoice",
    slug: "monovoice",
    name: "MonoVoice",
    tagline: {
      en: "Simple and convenient voice recorder with basic editing tools.",
      uk: "Простий та зручний диктофон із базовими інструментами редагування."
    },
    description: {
      en: "A distraction-free audio recorder focused on high-fidelity microphone capture, waveform visualization, and rapid trim-and-share workflows.",
      uk: "Диктофон без зайвого шуму, орієнтований на чистий запис звуку з мікрофона, візуалізацію хвиль та швидке редагування й експорт."
    },
    longDescription: {
      en: [
        "MonoVoice was built out of frustration with bloated audio recording apps filled with subscription paywalls, cloud sync requirements, and confusing interfaces. It does one thing exceptionally well: capture crisp sound and let you export or trim it immediately.",
        "With hardware-accelerated audio processing, raw PCM lossless recording options, silence skipping, and instant WAV/AAC export, MonoVoice is the ideal utility for voice memos, field interviews, acoustic sketches, and podcast drafts.",
        "All recordings stay completely offline on your device storage. Zero tracking, zero telemetry, and zero mandatory accounts."
      ],
      uk: [
        "MonoVoice створено як відповідь на перевантажені диктофони з підписками, обов’язковою хмарною синхронізацією та заплутаним інтерфейсом. Він робить одну справу бездоганно: записує кришталево чистий звук та дозволяє миттєво обрізати й експортувати його.",
        "Завдяки апаратному прискоренню обробки аудіо, запису без втрат (Lossless WAV/PCM), пропуску пауз та швидкому збереженню в AAC/MP3, MonoVoice ідеально підходить для голосових нотаток, інтерв’ю, музичних нарисів та подкастів.",
        "Усі записи залишаються виключно на вашому пристрої. Жодного відстеження, жодної телеметрії та жодних реєстрацій."
      ]
    },
    iconType: "waves",
    platforms: ["Android"],
    category: "Audio",
    status: "available",
    version: "1.2.0",
    releaseDate: "2026-09-24",
    fileSize: "8.4 MB",
    featured: true,
    download: {
      android: "https://github.com/monovoice/monovoice/releases/download/v1.2.0/MonoVoice-v1.2.0.apk",
      fileName: "MonoVoice-v1.2.0.apk"
    },
    github: "https://github.com/monovoice/monovoice",
    features: {
      en: [
        "High-resolution audio recording (up to 24-bit 96kHz PCM WAV / AAC)",
        "Real-time live waveform monitor with zoomable timeline",
        "Built-in non-destructive trimmer and silence detection",
        "Background recording with persistent lockscreen widget",
        "Custom tagging and lightning-fast search through recorded memos",
        "100% offline, privacy-first architecture with zero analytics"
      ],
      uk: [
        "Високоякісний аудіозапис (до 24-біт 96kHz PCM WAV / AAC)",
        "Візуалізація звукової хвилі в реальному часі з масштабуванням",
        "Вбудований точний редактор для обрізання та автоматичне видалення пауз",
        "Фоновий запис із компактним віджетом на екрані блокування",
        "Тегування та швидкий локальний пошук збережених записів",
        "100% офлайн, приватність без збору даних та аналітики"
      ]
    },
    requirements: {
      os: "Android 8.0 (Oreo) or later",
      architecture: "ARM64, ARMv7, x86_64",
      storage: "25 MB free storage space",
      permissions: {
        en: [
          "RECORD_AUDIO (Required to capture sound from microphone)",
          "POST_NOTIFICATIONS (Required for background recording controls)"
        ],
        uk: [
          "RECORD_AUDIO (Необхідно для захоплення аудіо з мікрофона)",
          "POST_NOTIFICATIONS (Необхідно для керування записом у фоновому режимі)"
        ]
      }
    },
    screenshots: [
      {
        url: "/src/assets/images/monovoice_preview_1790772497988.jpg",
        caption: {
          en: "Recording interface with live frequency waveform & time indicators",
          uk: "Інтерфейс запису з живою хвилею та лічильником часу"
        },
        aspectRatio: "9:16"
      }
    ],
    changelog: [
      {
        version: "1.2.0",
        date: "2026-09-24",
        changes: {
          en: [
            "Added high-efficiency AAC-ELD codec support for ultra-low latency",
            "Implemented non-destructive waveform cut & trim tool",
            "Improved battery consumption during background recording by 18%",
            "Fixed volume fluctuation bug on Android 15"
          ],
          uk: [
            "Додано підтримку кодека AAC-ELD для мінімальної затримки",
            "Впроваджено інструмент обрізання аудіохвилі без втрати оригіналу",
            "Знижено енергоспоживання при фоновому записі на 18%",
            "Виправлено помилку перепаду гучності на Android 15"
          ]
        }
      },
      {
        version: "1.1.0",
        date: "2026-08-15",
        changes: {
          en: [
            "Introduced silence auto-skip toggle during recording",
            "Added customizable tag folders for audio organization",
            "Support for external USB-C condenser microphones"
          ],
          uk: [
            "Додано функцію автопропуску тиші під час запису",
            "Створено систему папок і тегів для впорядкування",
            "Підтримка зовнішніх USB-C конденсаторних мікрофонів"
          ]
        }
      },
      {
        version: "1.0.0",
        date: "2026-07-02",
        changes: {
          en: [
            "Initial stable public release of MonoVoice"
          ],
          uk: [
            "Перший стабільний публічний реліз MonoVoice"
          ]
        }
      }
    ]
  },
  {
    id: "quicknotes",
    slug: "quicknotes",
    name: "QuickNotes",
    tagline: {
      en: "A minimal notes app for quick thoughts and ideas.",
      uk: "Мінімалістичний блокнот для швидких думок та ідей."
    },
    description: {
      en: "Instant startup, clean typography, plain Markdown storage, and zero cognitive overhead. Write down thoughts in half a second.",
      uk: "Миттєвий запуск, чиста типографіка, збереження у простому Markdown та нуль зайвого. Записуйте думки за пів секунди."
    },
    longDescription: {
      en: [
        "QuickNotes is created for speed. Most modern note apps take several seconds to open, force you into complicated folder structures, and sync to proprietary cloud databases. QuickNotes opens immediately to a clean typing canvas.",
        "All your notes are saved as plain `.md` files in a standard directory on your device. You can open them in Obsidian, VS Code, or transfer them with a USB cable whenever you want.",
        "Includes essential conveniences like checklist toggles, quick search, dark theme contrast tuning, and optional biometrics lock."
      ],
      uk: [
        "QuickNotes створено заради швидкості. Більшість сучасних додатків для заміток запускаються по кілька секунд, змушують налаштовувати структури папок і зберігають дані у закритих базах. QuickNotes відкривається миттєво з готовим до введення полем.",
        "Усі ваші нотатки зберігаються як звичайні `.md` файли в окремій папці на пристрої. Ви можете відкривати їх в Obsidian, VS Code чи копіювати через USB коли завгодно.",
        "Містить найважливіше: чеклісти справ, швидкий повнотекстовий пошук, регулювання контрасту темної теми та біометричний захист."
      ]
    },
    iconType: "file-text",
    platforms: ["Android"],
    category: "Productivity",
    status: "available",
    version: "1.0.3",
    releaseDate: "2026-08-30",
    fileSize: "5.2 MB",
    featured: true,
    download: {
      android: "https://github.com/monovoice/quicknotes/releases/download/v1.0.3/QuickNotes-v1.0.3.apk",
      fileName: "QuickNotes-v1.0.3.apk"
    },
    github: "https://github.com/monovoice/quicknotes",
    features: {
      en: [
        "Under 100ms cold start time on mid-range Android devices",
        "Pure Markdown storage in an accessible local device folder",
        "Swipe-to-complete tasks and interactive checkbox lists",
        "Quick pinned notification for jotting notes from any app",
        "Biometric fingerprint / face unlock for private notes"
      ],
      uk: [
        "Холодний старт менше ніж за 100 мс на будь-якому пристрої",
        "Збереження у чистому Markdown у відкритій системній папці",
        "Зручні свайпи для завершення справ та інтерактивні чеклісти",
        "Закріплене сповіщення у шторці для запису з будь-якого екрана",
        "Біометричний вхід (відбиток пальця) для приватних заміток"
      ]
    },
    requirements: {
      os: "Android 7.0 (Nougat) or later",
      architecture: "Universal (ARM, x86)",
      storage: "15 MB free storage space",
      permissions: {
        en: [
          "USE_BIOMETRIC (Optional, for note security lock)"
        ],
        uk: [
          "USE_BIOMETRIC (Опціонально, для блокування заміток)"
        ]
      }
    },
    screenshots: [
      {
        url: "/src/assets/images/quicknotes_preview_1790772510460.jpg",
        caption: {
          en: "Distraction-free typing interface with quick task management",
          uk: "Чистий інтерфейс написання з швидким керуванням списками"
        },
        aspectRatio: "9:16"
      }
    ],
    changelog: [
      {
        version: "1.0.3",
        date: "2026-08-30",
        changes: {
          en: [
            "Added instant export to PDF and single plain text file",
            "Enhanced Markdown preview rendering speed",
            "Added word and character counter toggle in header"
          ],
          uk: [
            "Додано миттєвий експорт у PDF та текстовий файл",
            "Прискорено рендеринг попереднього перегляду Markdown",
            "Додано лічильник слів та символів у верхній панелі"
          ]
        }
      },
      {
        version: "1.0.0",
        date: "2026-06-18",
        changes: {
          en: [
            "Initial launch with Markdown engine and local storage"
          ],
          uk: [
            "Початковий реліз із підтримкою Markdown та локального сховища"
          ]
        }
      }
    ]
  },
  {
    id: "imagetool",
    slug: "imagetool",
    name: "ImageTool",
    tagline: {
      en: "Simple image converter and compressor.",
      uk: "Простий конвертер та компресор зображень."
    },
    description: {
      en: "Batch compress, resize, and convert JPEG, PNG, WebP, and AVIF images locally without uploading them to remote servers.",
      uk: "Пакетне стиснення, зміна розміру та конвертація JPEG, PNG, WebP та AVIF локально без завантаження на сторонні сервери."
    },
    longDescription: {
      en: [
        "ImageTool was created to eliminate the need for shady online image compressors that upload your private photos and screenshots to unknown cloud servers.",
        "Powered by optimized WebAssembly and native rust image codecs, ImageTool runs completely inside your browser or as a native lightweight desktop app. It reduces file sizes by up to 85% with virtually imperceptible visual loss.",
        "Simply drag and drop photos, select target format or desired maximum file size, and download optimized files in seconds."
      ],
      uk: [
        "ImageTool створено для того, щоб більше не користуватися сумнівними сайтами для стиснення, які завантажують ваші особисті фото на невідомі сервери.",
        "Завдяки кодекам на Rust та WebAssembly, ImageTool працює повністю локально прямо у браузері або як компактний десктопний додаток. Він зменшує вагу фотографій до 85% без видимої втрати якості.",
        "Просто перетягніть файли, виберіть потрібний формат або ліміт розміру та завантажте оптимізовані файли за лічені секунди."
      ]
    },
    iconType: "image",
    platforms: ["Android", "Web"],
    category: "Utility",
    status: "available",
    version: "1.1.0",
    releaseDate: "2026-09-12",
    fileSize: "12.8 MB",
    featured: true,
    download: {
      android: "https://github.com/monovoice/imagetool/releases/download/v1.1.0/ImageTool-v1.1.0.apk",
      web: "https://imagetool.monovoice.app",
      fileName: "ImageTool-v1.1.0.apk"
    },
    github: "https://github.com/monovoice/imagetool",
    features: {
      en: [
        "Modern format support: AVIF, WebP, JPEG, PNG, and SVG optimization",
        "Visual side-by-side comparison slider before saving",
        "Batch drag-and-drop processing for up to 100 images at once",
        "Exif metadata stripper for privacy before publishing online",
        "Fixed target file size mode (e.g. compress to strictly under 500 KB)"
      ],
      uk: [
        "Підтримка сучасних форматів: AVIF, WebP, JPEG, PNG та оптимізація SVG",
        "Інтерактивний повзунок порівняння \"до / після\" перед збереженням",
        "Пакетне перетягування до 100 зображень одночасно",
        "Очищення метаданих Exif та геолокації для захисту приватності",
        "Режим фіксованого ліміту розміру (наприклад, суворо до 500 КБ)"
      ]
    },
    requirements: {
      os: "Android 8.0+ or any Modern Web Browser (Chrome, Firefox, Safari)",
      architecture: "Universal",
      storage: "30 MB free storage space",
      permissions: {
        en: [
          "READ_EXTERNAL_STORAGE / Photo Picker access"
        ],
        uk: [
          "Доступ до системного Photo Picker для вибору зображень"
        ]
      }
    },
    screenshots: [
      {
        url: "/src/assets/images/imagetool_preview_1790772522144.jpg",
        caption: {
          en: "Batch compression dashboard with real-time file savings metrics",
          uk: "Панель пакетного стиснення з розрахунком економії місця"
        },
        aspectRatio: "16:9"
      }
    ],
    changelog: [
      {
        version: "1.1.0",
        date: "2026-09-12",
        changes: {
          en: [
            "Integrated ultra-fast libavif encoder for 30% higher compression efficiency",
            "Added preserve folder hierarchy option for batch exports",
            "Custom aspect ratio presets (16:9, 4:3, 1:1, Twitter, Instagram)"
          ],
          uk: [
            "Інтегровано новий енкодер libavif для на 30% ефективнішого стиснення",
            "Додано збереження структури папок при експорті",
            "Шаблони співвідношення сторін (16:9, 4:3, 1:1, соцмережі)"
          ]
        }
      },
      {
        version: "1.0.0",
        date: "2026-07-28",
        changes: {
          en: [
            "Initial release supporting WebP and MozJPEG engines"
          ],
          uk: [
            "Перший випуск із підтримкою рушіїв WebP та MozJPEG"
          ]
        }
      }
    ]
  },
  {
    id: "systemtuner",
    slug: "systemtuner",
    name: "SystemTuner",
    tagline: {
      en: "A small tool to optimize system settings.",
      uk: "Невелика утиліта для оптимізації налаштувань системи."
    },
    description: {
      en: "A single portable executable to disable unwanted background telemetry, declutter OS start-up items, and clean temporary junk files.",
      uk: "Один портативний файл для відключення фонової телеметрії, оптимізації автозавантаження та швидкого очищення тимчасового сміття."
    },
    longDescription: {
      en: [
        "SystemTuner was developed to give users transparent, one-click control over their desktop operating system without needing to navigate through dozens of nested registry subkeys or cryptic PowerShell commands.",
        "It requires no installation, writes no permanent changes without an automatic restore point, and provides clear descriptions of what every single toggle does before you apply it.",
        "Clean, open source, and lightweight (under 3 MB)."
      ],
      uk: [
        "SystemTuner створено для того, щоб дати прозорий контроль над налаштуваннями ОС в один клік без необхідності вручну копатися в реєстрах чи незрозумілих командах PowerShell.",
        "Не потребує встановлення (портативна версія), автоматично створює точку відновлення перед змінами та містить детальні пояснення до кожного пункту.",
        "Чистий відкритий код, вага менше ніж 3 МБ."
      ]
    },
    iconType: "settings",
    platforms: ["Windows"],
    category: "System",
    status: "available",
    version: "0.9.5",
    releaseDate: "2026-09-05",
    fileSize: "2.8 MB",
    featured: true,
    download: {
      windows: "https://github.com/monovoice/systemtuner/releases/download/v0.9.5/SystemTuner-v0.9.5-portable.zip",
      fileName: "SystemTuner-v0.9.5-portable.zip"
    },
    github: "https://github.com/monovoice/systemtuner",
    features: {
      en: [
        "Single portable executable (.exe) with zero installation required",
        "Automatic Windows Restore Point creation prior to applying tweaks",
        "Telemetry and background diagnostic logging disabler",
        "Start-up program audit with impact scoring",
        "Deep temp file cleaner with disk preview"
      ],
      uk: [
        "Один портативний файл (.exe), що не потребує інсталяції",
        "Автоматичне створення точки відновлення перед внесенням змін",
        "Вимкнення фонової діагностичної телеметрії ОС",
        "Аудит автозапуску програм із оцінкою навантаження на систему",
        "Глибоке очищення тимчасових кешів із попереднім переглядом"
      ]
    },
    requirements: {
      os: "Windows 10 / 11 (64-bit)",
      architecture: "x86_64, ARM64",
      storage: "10 MB free space",
      permissions: {
        en: [
          "Administrator privileges required to toggle system services"
        ],
        uk: [
          "Права адміністратора для зміни системних служб"
        ]
      }
    },
    screenshots: [
      {
        url: "/src/assets/images/imagetool_preview_1790772522144.jpg",
        caption: {
          en: "System tuning dashboard with categorical toggle controls",
          uk: "Головна панель із перемикачами системних служб"
        },
        aspectRatio: "16:9"
      }
    ],
    changelog: [
      {
        version: "0.9.5",
        date: "2026-09-05",
        changes: {
          en: [
            "Added Windows 11 24H2 compatibility profile",
            "Implemented instant rollback button for recent tweaks",
            "Fixed high-DPI scaling on 4K multi-monitor setups"
          ],
          uk: [
            "Додано профіль сумісності з оновленням Windows 11 24H2",
            "Створено кнопку миттєвого відкату останніх налаштувань",
            "Виправлено масштабування інтерфейсу на 4K моніторах"
          ]
        }
      },
      {
        version: "0.9.0",
        date: "2026-08-10",
        changes: {
          en: [
            "Initial beta test release with core telemetry toggles"
          ],
          uk: [
            "Перша публічна бета-версія з базовими перемикачами"
          ]
        }
      }
    ]
  },
  {
    id: "codesnippet",
    slug: "codesnippet",
    name: "CodeSnippet",
    tagline: {
      en: "Minimal developer snippet manager & syntax highlighter.",
      uk: "Компактний менеджер фрагментів коду з підсвіткою синтаксису."
    },
    description: {
      en: "Store, tag, and search your most valuable CLI commands, regex patterns, and code snippets with global keyboard hotkeys.",
      uk: "Зберігайте, тегуйте та знаходьте CLI команди, регулярні вирази та корисні шматки коду за допомогою гарячих клавіш."
    },
    longDescription: {
      en: [
        "CodeSnippet replaces messy text files, browser bookmarks, and lost terminal histories. It stays in your system tray and summons with a single hotkey (Alt+Space or Super+S).",
        "Syntax highlighting covers over 80 programming languages with Tree-sitter precision. All data is stored in a clean local SQLite database that you can sync with git."
      ],
      uk: [
        "CodeSnippet замінює розкидані текстові файли, закладки в браузері та загублену історію термінала. Працює у системному треї та викликається однією комбінацією клавіш.",
        "Підсвічує синтаксис для понад 80 мов програмування на базі Tree-sitter. Дані зберігаються у простій локальній базі SQLite, яку можна синхронізувати через git."
      ]
    },
    iconType: "terminal",
    platforms: ["Linux", "Windows"],
    category: "Developer",
    status: "available",
    version: "1.0.1",
    releaseDate: "2026-09-18",
    fileSize: "9.6 MB",
    featured: false,
    download: {
      linux: "https://github.com/monovoice/codesnippet/releases/download/v1.0.1/codesnippet-linux.AppImage",
      windows: "https://github.com/monovoice/codesnippet/releases/download/v1.0.1/codesnippet-windows.zip",
      fileName: "codesnippet-linux.AppImage"
    },
    github: "https://github.com/monovoice/codesnippet",
    features: {
      en: [
        "Global spotlight search popup with fuzzy search filter",
        "One-click copy to clipboard with auto-formatting",
        "Native syntax highlighting for 80+ programming languages",
        "Export/import repository directly with git"
      ],
      uk: [
        "Швидкий виклик вікна пошуку за комбінацією клавіш",
        "Копіювання у буфер обміну в один клік з автоформатуванням",
        "Підсвітка синтаксису для понад 80 мов",
        "Експорт та імпорт сховища через звичайний git"
      ]
    },
    requirements: {
      os: "Ubuntu 20.04+, Fedora 38+, Arch, or Windows 10+",
      architecture: "x86_64, ARM64",
      storage: "20 MB free space"
    },
    screenshots: [
      {
        url: "/src/assets/images/imagetool_preview_1790772522144.jpg",
        caption: {
          en: "Quick search palette with syntax-highlighted snippets",
          uk: "Швидкий пошук із підсвіченими фрагментами"
        },
        aspectRatio: "16:9"
      }
    ],
    changelog: [
      {
        version: "1.0.1",
        date: "2026-09-18",
        changes: {
          en: [
            "Added Rust and Zig syntax highlighting grammars",
            "Fixed Wayland hotkey registration"
          ],
          uk: [
            "Додано граматики для Rust та Zig",
            "Виправлено глобальні гарячі клавіші на Wayland"
          ]
        }
      }
    ]
  }
];
