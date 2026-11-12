export interface Holiday {
  id: string;
  name: string;
  nameEn: string;
  date: Date;
  dateStr: string;
  country: 'STP' | 'BR';
  countryName: string;
  countryFlag: string;
  type: 'nacional' | 'religioso' | 'facultativo';
  typeLabel: string;
  meaning: string;
}

export const OFFICIAL_HOLIDAYS_STP = [
  { day: 1, month: 1, name: 'Ano Novo', nameEn: 'New Year', type: 'nacional', meaning: 'Celebração da passagem de ano civil.' },
  { day: 4, month: 1, name: 'Dia dos Mártires do Rei Amador', nameEn: 'King Amador Day', type: 'nacional', meaning: 'Homenagem ao herói nacional Rei Amador e à luta contra a escravatura.' },
  { day: 3, month: 2, name: 'Dia dos Mártires do Massacre de Batepá', nameEn: 'Batepa Martyrs Day', type: 'nacional', meaning: 'Memória dos compatriotas assassinados no massacre de 1953.' },
  { day: 1, month: 5, name: 'Dia do Trabalhador', nameEn: 'Labour Day', type: 'nacional', meaning: 'Celebração internacional da dignidade do trabalho e dos trabalhadores.' },
  { day: 12, month: 7, name: 'Dia da Independência Nacional', nameEn: 'National Independence Day', type: 'nacional', meaning: 'Proclamação da independência soberana de São Tomé e Príncipe em 1975.' },
  { day: 6, month: 9, name: 'Dia das Forças Armadas', nameEn: 'Armed Forces Day', type: 'nacional', meaning: 'Homenagem e comemoração da fundação das Forças Armadas de São Tomé e Príncipe.' },
  { day: 30, month: 9, name: 'Dia da Reforma Agrária', nameEn: 'Agrarian Reform Day', type: 'nacional', meaning: 'Comemoração histórica da nacionalização das roças e soberania alimentar.' },
  { day: 1, month: 11, name: 'Dia de Todos os Santos', nameEn: 'All Saints Day', type: 'religioso', meaning: 'Celebração cristã solene em memória de todos os santos.' },
  { day: 21, month: 12, name: 'Dia de São Tomé', nameEn: 'St. Thomas Day', type: 'nacional', meaning: 'Data da descoberta da ilha pelos navegadores portugueses em 1470.' },
  { day: 25, month: 12, name: 'Natal da Família', nameEn: 'Christmas Day', type: 'religioso', meaning: 'Celebração do nascimento de Jesus Cristo e comunhão das famílias.' }
];

export const OFFICIAL_HOLIDAYS_BR = [
  { day: 1, month: 1, name: 'Confraternização Universal', nameEn: 'New Year', type: 'nacional', meaning: 'Celebração mundial de paz e acolhimento do novo ano.' },
  { day: 21, month: 4, name: 'Tiradentes', nameEn: 'Tiradentes Day', type: 'nacional', meaning: 'Homenagem a Joaquim José da Silva Xavier, mártir da Inconfidência Mineira.' },
  { day: 1, month: 5, name: 'Dia do Trabalho', nameEn: 'Labour Day', type: 'nacional', meaning: 'Comemoração oficial do trabalhador brasileiro e conquistas sociais.' },
  { day: 7, month: 9, name: 'Independência do Brasil', nameEn: 'Independence of Brazil', type: 'nacional', meaning: 'Proclamação da Independência do Brasil em 1822 às margens do Ipiranga.' },
  { day: 12, month: 10, name: 'Nossa Senhora Aparecida', nameEn: 'Our Lady of Aparecida', type: 'religioso', meaning: 'Padroeira oficial do Brasil e dia solene das crianças.' },
  { day: 2, month: 11, name: 'Finados', nameEn: 'All Souls Day', type: 'religioso', meaning: 'Dia solene de oração e memória dos entes queridos falecidos.' },
  { day: 15, month: 11, name: 'Proclamação da República', nameEn: 'Proclamation of the Republic', type: 'nacional', meaning: 'Transição histórica para o regime republicano brasileiro em 1889.' },
  { day: 20, month: 11, name: 'Dia da Consciência Negra', nameEn: 'Black Consciousness Day', type: 'nacional', meaning: 'Memória de Zumbi dos Palmares e valorização da cultura afro-brasileira.' },
  { day: 25, month: 12, name: 'Natal', nameEn: 'Christmas Day', type: 'religioso', meaning: 'Celebração cristã solene do nascimento de Jesus Cristo.' }
];

export function getAllHolidaysForYear(year: number, country: 'ALL' | 'STP' | 'BR'): Holiday[] {
  const result: Holiday[] = [];

  if (country === 'ALL' || country === 'STP') {
    OFFICIAL_HOLIDAYS_STP.forEach((h, i) => {
      const date = new Date(year, h.month - 1, h.day);
      result.push({
        id: `stp-${year}-${h.month}-${h.day}-${i}`,
        name: h.name,
        nameEn: h.nameEn,
        date,
        dateStr: `${String(h.day).padStart(2, '0')}/${String(h.month).padStart(2, '0')}/${year}`,
        country: 'STP',
        countryName: 'São Tomé e Príncipe',
        countryFlag: '🇸🇹',
        type: h.type as any,
        typeLabel: h.type === 'nacional' ? 'Nacional / Cívico' : 'Religioso / Cristão',
        meaning: h.meaning
      });
    });
  }

  if (country === 'ALL' || country === 'BR') {
    OFFICIAL_HOLIDAYS_BR.forEach((h, i) => {
      const date = new Date(year, h.month - 1, h.day);
      result.push({
        id: `br-${year}-${h.month}-${h.day}-${i}`,
        name: h.name,
        nameEn: h.nameEn,
        date,
        dateStr: `${String(h.day).padStart(2, '0')}/${String(h.month).padStart(2, '0')}/${year}`,
        country: 'BR',
        countryName: 'Brasil',
        countryFlag: '🇧🇷',
        type: h.type as any,
        typeLabel: h.type === 'nacional' ? 'Nacional / Cívico' : 'Religioso / Cristão',
        meaning: h.meaning
      });
    });
  }

  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function getUpcomingHolidays(now: Date, count = 10, country: 'ALL' | 'STP' | 'BR' = 'ALL'): Holiday[] {
  const currentYear = now.getFullYear();
  const list = [
    ...getAllHolidaysForYear(currentYear, country),
    ...getAllHolidaysForYear(currentYear + 1, country)
  ];
  return list
    .filter(h => h.date.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime())
    .slice(0, count);
}

export function getHolidaysOnDate(date: Date): Holiday[] {
  const all = getAllHolidaysForYear(date.getFullYear(), 'ALL');
  return all.filter(h => 
    h.date.getDate() === date.getDate() && 
    h.date.getMonth() === date.getMonth()
  );
}

export function getDaysDifference(targetDate: Date, fromDate: Date): number {
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const diffTime = target.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
