import React, { useState } from 'react';
import { Github, Mail, Send, Check, Sparkles } from 'lucide-react';
import { MascotArtwork } from '../components/MascotArtwork';
import { useLanguage } from '../context/LanguageContext';

export const AboutPage: React.FC = () => {
  const { language } = useLanguage();
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('contact@monovoice.app');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const principles = [
    {
      title: {
        uk: 'Ідеї, які працюють',
        en: 'Ideas That Actually Work'
      },
      desc: {
        uk: 'Кожна програма вирішує конкретну задачу швидко, зручно та без зайвого візуального шуму.',
        en: 'Every utility solves a real everyday problem quickly, cleanly, and without unnecessary bloat.'
      }
    },
    {
      title: {
        uk: 'Чесний софт без підписок',
        en: 'Honest Software Without Paywalls'
      },
      desc: {
        uk: 'Жодної реклами, прихованої телеметрії чи примусових реєстрацій. Ви завантажуєте інструмент і користуєтеся ним.',
        en: 'Zero ads, zero hidden telemetry, and zero forced accounts. Download the tool and own your workflow.'
      }
    },
    {
      title: {
        uk: 'Відкриті релізи та швидкість',
        en: 'Open Releases & Native Speed'
      },
      desc: {
        uk: 'Пряме завантаження інсталяторів та APK з офіційних релізів GitHub із прозорою історією оновлень.',
        en: 'Direct binary downloads from official GitHub Releases with transparent changelogs.'
      }
    }
  ];

  return (
    <div className="w-full space-y-10 pb-20 pt-6 select-none">
      {/* Hero Banner Card with Mascot */}
      <div className="comic-card p-6 sm:p-10 overflow-hidden">
        <svg
          viewBox="0 0 900 320"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <polygon points="820,0 900,0 900,85 850,125 865,30" fill="#f6cf3f" />
          <polygon points="0,250 35,215 20,320 0,320" fill="#f6cf3f" opacity="0.9" />
        </svg>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 items-center gap-8">
          {/* Mascot Showcase Column */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-[300px] aspect-square bg-[#6fd2d0] border-4 border-[#f6cf3f] shadow-[8px_8px_0px_#f6cf3f] overflow-hidden flex items-end justify-center pt-4">
              <MascotArtwork variant="hero" className="w-full h-full" />
            </div>
          </div>

          {/* Bio & Story Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-block transform -rotate-2">
              <div className="comic-eyebrow-strip px-5 py-1">
                <span className="font-impact text-xs uppercase tracking-wider text-[#0b1013]">
                  {language === 'uk' ? 'ПРО АВТОРА ТА ПРОЄКТ' : 'ABOUT THE CREATOR'}
                </span>
              </div>
            </div>

            <h1 className="font-brush text-4xl sm:text-5xl text-[#f6cf3f] tracking-wide">
              {language === 'uk' ? 'Про мене та MonoVoice' : 'About Me & MonoVoice'}
            </h1>

            <div className="space-y-3 text-sm sm:text-base text-zinc-200 leading-relaxed">
              <p>
                {language === 'uk'
                  ? 'Привіт! Я створюю невеликі незалежні програми, утиліти та інструменти, які роблять щоденне життя зручнішим, роботу за комп’ютером та смартфоном — швидшою, а улюблені ігри й хобі — ближчими.'
                  : 'Hi! I build independent applications, utilities, and tools designed to make daily life more convenient, desktop and mobile workflows faster, and favorite games and hobbies closer.'}
              </p>
              <p>
                {language === 'uk'
                  ? 'Кожен проєкт тут народжується з власної потреби: коли існуючі програми перевантажені рекламою, підписками чи зайвими функціями, я сідаю і пишу власну — швидку, чисту й таку, якою приємно користуватися щодня.'
                  : 'Every project here starts from a real personal need: whenever existing apps are weighed down by ads, subscriptions, or clutter, I build a focused alternative that is fast, expressive, and a joy to use every day.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Principles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {principles.map((p, idx) => (
          <div key={idx} className="comic-card p-6 space-y-3">
            <div className="w-10 h-10 bg-[#f6cf3f] text-[#0d1317] flex items-center justify-center font-impact text-lg">
              0{idx + 1}
            </div>
            <h3 className="font-brush text-2xl text-[#fff6c5]">
              {p.title[language] || p.title.uk}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {p.desc[language] || p.desc.uk}
            </p>
          </div>
        ))}
      </div>

      {/* Contacts Section */}
      <div id="contacts-section" className="comic-card p-6 sm:p-10 space-y-6">
        <div className="flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-[#f6cf3f]" />
          <h2 className="font-brush text-3xl sm:text-4xl text-[#f6cf3f]">
            {language === 'uk' ? 'Контакти та зв’язок' : 'Contacts & Reach Out'}
          </h2>
        </div>

        <p className="text-sm sm:text-base text-zinc-200 max-w-2xl leading-relaxed">
          {language === 'uk'
            ? 'Якщо є питання, ідеї для нових інструментів, пропозиції або просто хочеш поговорити — пиши у зручний месенджер чи на пошту:'
            : 'If you have questions, ideas for new tools, feedback, or just want to talk — reach out via Telegram, GitHub, or email:'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <a
            href="https://t.me/monovoice"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-white/5 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/15 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-[#f6cf3f] group-hover:text-[#0d1317]" />
              <div>
                <div className="text-xs opacity-75">Telegram</div>
                <div className="text-sm font-extrabold">@monovoice</div>
              </div>
            </div>
          </a>

          <a
            href="https://github.com/monovoice"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 bg-white/5 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/15 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-[#f6cf3f] group-hover:text-[#0d1317]" />
              <div>
                <div className="text-xs opacity-75">GitHub</div>
                <div className="text-sm font-extrabold">github.com/monovoice</div>
              </div>
            </div>
          </a>

          <button
            onClick={copyEmail}
            className="flex items-center justify-between p-4 bg-white/5 hover:bg-[#f6cf3f] hover:text-[#0d1317] text-white border border-white/15 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              {copiedEmail ? (
                <Check className="w-5 h-5 text-emerald-400 group-hover:text-[#0d1317]" />
              ) : (
                <Mail className="w-5 h-5 text-[#f6cf3f] group-hover:text-[#0d1317]" />
              )}
              <div>
                <div className="text-xs opacity-75">Email</div>
                <div className="text-sm font-extrabold">
                  {copiedEmail
                    ? language === 'uk'
                      ? 'Скопійовано!'
                      : 'Copied!'
                    : 'contact@monovoice.app'}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
