import React, { useState } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { AppService } from '../services/appService';
import { AppItem } from '../types/app';
import { ComicAppIconBadge } from '../components/AppCard';
import { useLanguage } from '../context/LanguageContext';

interface ProjectsPageProps {
  onSelectApp: (slug: string) => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({ onSelectApp }) => {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [inDevApps, setInDevApps] = useState<AppItem[]>([]);

  React.useEffect(() => {
    AppService.getInDevelopmentApps().then(setInDevApps);
  }, []);

  const upcomingLabs = [
    {
      title: 'CloudSync CLI',
      desc: {
        en: 'A high-throughput headless file synchronization tool built in Rust for lightweight remote backups via SFTP and S3.',
        uk: 'Високопродуктивна утиліта командного рядка на Rust для синхронізації та бекапу файлів через SFTP та S3.'
      },
      platform: 'Linux / macOS / Windows',
      status: { en: 'Alpha Prototype', uk: 'Альфа прототип' },
      eta: 'Q4 2026'
    },
    {
      title: 'TinyCanvas',
      desc: {
        en: 'A zero-bloat vector sketchpad for quick flowcharts, wireframes, and architecture diagrams stored directly as pure SVG.',
        uk: 'Векторний блокнот для швидких схем, блок-діаграм та інтерфейсних начерків зі збереженням у чистому SVG.'
      },
      platform: 'Web / Desktop',
      status: { en: 'Design & Architecture', uk: 'Проєктування архітектури' },
      eta: 'Q1 2027'
    }
  ];

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
      setSubscribed(false);
    }, 4000);
  };

  return (
    <div className="w-full space-y-12 pb-20 pt-6 select-none">
      {/* Header */}
      <div className="space-y-3">
        <div className="inline-block transform -rotate-3 origin-left">
          <div className="comic-eyebrow-strip px-5 py-1">
            <span className="font-impact text-xs uppercase tracking-wider text-[#0b1013]">
              {language === 'uk' ? 'ЛАБОРАТОРІЯ ТА РОЗРОБКА' : 'LABORATORY & ROADMAP'}
            </span>
          </div>
        </div>
        <h1 className="font-impact text-4xl sm:text-5xl uppercase tracking-tight text-[#0b1114] dark:text-white transform -rotate-1">
          {language === 'uk' ? 'Проєкти в розробці' : 'Projects in Development'}
        </h1>
        <p className="text-sm sm:text-base font-medium text-[#0c181b] dark:text-zinc-200 max-w-2xl leading-relaxed">
          {language === 'uk'
            ? 'Програми та експериментальні інструменти, які зараз знаходяться на стадії активного програмування або закритого тестування.'
            : 'Applications and experimental tools currently in active engineering, prototyping, or private testing phases.'}
        </p>
      </div>

      {/* Active In-Development Apps */}
      <div className="space-y-4">
        <h2 className="font-brush text-3xl text-[#0b1114] dark:text-[#f6cf3f]">
          {language === 'uk' ? 'Активні релізи' : 'Active Builds'}
        </h2>

        {inDevApps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inDevApps.map(app => (
              <div
                key={app.id}
                onClick={() => onSelectApp(app.slug)}
                className="comic-card p-6 cursor-pointer group flex flex-col justify-between hover:-translate-y-1 transition-all duration-200"
              >
                <svg
                  viewBox="0 0 400 220"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <polygon points="365,0 400,0 400,45 382,65 388,18" fill="#f6cf3f" />
                </svg>

                <div className="relative z-10 flex items-start gap-4">
                  <ComicAppIconBadge iconType={app.iconType} />
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#f6cf3f]">
                      <span>{language === 'uk' ? 'У розробці' : 'In Dev'} · v{app.version}</span>
                      <span>·</span>
                      <span className="text-zinc-300">{app.platforms.join(' / ')}</span>
                    </div>
                    <h3 className="font-brush text-2xl sm:text-3xl text-[#fff6c5] group-hover:text-[#f6cf3f] transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-zinc-200/90 leading-relaxed">
                      {app.description[language] || app.description.uk}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-6 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="comic-btn-yellow px-4 py-1.5 text-xs font-extrabold">
                    <span>{language === 'uk' ? 'Переглянути' : 'Preview'}</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="comic-card p-6 text-sm text-zinc-300">
            {language === 'uk'
              ? 'Усі поточні програми випущені у стабільному статусі та доступні для скачування в каталозі.'
              : 'All current applications are officially released in stable status and available for direct download.'}
          </div>
        )}
      </div>

      {/* Upcoming Concepts */}
      <div className="space-y-4">
        <h2 className="font-brush text-3xl text-[#0b1114] dark:text-[#f6cf3f]">
          {language === 'uk' ? 'Майбутні ідеї' : 'Upcoming Concepts'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {upcomingLabs.map((item, idx) => (
            <div key={idx} className="comic-card p-6 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#f6cf3f]">
                <span>{item.platform}</span>
                <span>{item.eta}</span>
              </div>
              <h3 className="font-brush text-2xl sm:text-3xl text-[#fff6c5]">
                {item.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
                {item.desc[language] || item.desc.uk}
              </p>
              <div className="pt-2 text-xs font-mono text-[#f6cf3f]">
                ✦ {language === 'uk' ? 'Статус: ' : 'Status: '}
                {item.status[language] || item.status.uk}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Release Notification Box */}
      <div className="comic-card p-7 max-w-xl space-y-3">
        <h3 className="font-brush text-2xl sm:text-3xl text-[#f6cf3f]">
          {language === 'uk' ? 'Сповіщення про нові релізи' : 'Get Notified Upon Release'}
        </h3>
        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
          {language === 'uk'
            ? 'Жодного спаму. Лише короткий лист, коли нова програма стає доступною для скачування.'
            : 'Zero spam. Only a short notification when a new app or update is ready for download.'}
        </p>

        {subscribed ? (
          <div className="flex items-center gap-2 text-sm font-bold text-[#f6cf3f] py-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {language === 'uk'
                ? 'Дякую! Ви підписані на сповіщення.'
                : 'Subscribed! You will be notified on the next release.'}
            </span>
          </div>
        ) : (
          <form onSubmit={handleNotifySubmit} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white/5 border border-white/20 text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#f6cf3f]"
            />
            <button
              type="submit"
              className="comic-btn-yellow px-6 py-2.5 text-xs sm:text-sm font-extrabold cursor-pointer"
            >
              {language === 'uk' ? 'Підписатися' : 'Notify Me'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
