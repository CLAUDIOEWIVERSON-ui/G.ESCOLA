export type CountryCode = 'STP' | 'BR';

export interface Holiday {
  id: string;
  name: string;
  nameEn: string;
  date: Date;
  dateStr: string; // YYYY-MM-DD
  day: number;
  month: number; // 1-12
  year: number;
  country: CountryCode;
  countryName: string;
  countryFlag: string;
  type: 'nacional' | 'religioso' | 'facultativo';
  typeLabel: string;
  typeLabelEn: string;
  meaning: string;
  meaningEn: string;
}

/**
 * Computes Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
export function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed for Date
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function addDaysToDate(baseDate: Date, days: number): Date {
  const res = new Date(baseDate);
  res.setDate(res.getDate() + days);
  return res;
}

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns all official holidays of São Tomé and Príncipe for a given year.
 */
export function getStpHolidays(year: number): Holiday[] {
  const fixed = [
    {
      day: 1,
      month: 1,
      name: 'Ano Novo',
      nameEn: 'New Year\'s Day',
      meaning: 'Celebração universal do início do ano civil e da fraternidade entre os povos.',
      meaningEn: 'Universal celebration of the start of the civil year and fraternity among nations.',
      type: 'nacional' as const,
    },
    {
      day: 3,
      month: 2,
      name: 'Dia dos Mártires da Liberdade',
      nameEn: 'Martyrs of Liberty Day',
      meaning: 'Homenagem solene aos mártires do Massacre de Batepá (1953), marco fundamental da resistência contra o colonialismo.',
      meaningEn: 'Solemn tribute to the martyrs of the 1953 Batepá Massacre, a pivotal milestone in resistance against colonial rule.',
      type: 'nacional' as const,
    },
    {
      day: 1,
      month: 5,
      name: 'Dia Internacional do Trabalhador',
      nameEn: 'Labour Day',
      meaning: 'Celebração nacional das lutas, conquistas e valorização da classe trabalhadora são-tomense.',
      meaningEn: 'National celebration of the struggles, achievements, and recognition of the workforce.',
      type: 'nacional' as const,
    },
    {
      day: 1,
      month: 6,
      name: 'Dia Internacional da Criança',
      nameEn: 'International Children\'s Day',
      meaning: 'Feriado nacional de promoção e proteção integral dos direitos da infância e da juventude de STP.',
      meaningEn: 'National holiday dedicated to the full protection and promotion of children\'s and youth rights in STP.',
      type: 'nacional' as const,
    },
    {
      day: 12,
      month: 7,
      name: 'Dia da Independência Nacional',
      nameEn: 'National Independence Day',
      meaning: 'Comemoração histórica da proclamação da soberania e independência nacional de São Tomé e Príncipe em 1975.',
      meaningEn: 'Historic commemoration of the proclamation of sovereignty and national independence in 1975.',
      type: 'nacional' as const,
    },
    {
      day: 6,
      month: 9,
      name: 'Dia das Forças Armadas (FASTP)',
      nameEn: 'Armed Forces Day (FASTP)',
      meaning: 'Homenagem às Forças Armadas de São Tomé e Príncipe (FASTP), guardiãs da soberania e integridade territorial.',
      meaningEn: 'Tribute to the Armed Forces of São Tomé and Príncipe (FASTP), defenders of national sovereignty and territory.',
      type: 'nacional' as const,
    },
    {
      day: 30,
      month: 9,
      name: 'Reforma Agrária / Nacionalizações',
      nameEn: 'Agrarian Reform / Nationalization Day',
      meaning: 'Comemoração da posse popular e nacionalização histórica das grandes empresas agrícolas e roças em 1975.',
      meaningEn: 'Celebration of the historical nationalization and sovereign reclamation of plantation lands in 1975.',
      type: 'nacional' as const,
    },
    {
      day: 21,
      month: 12,
      name: 'Dia de São Tomé',
      nameEn: 'Saint Thomas Day',
      meaning: 'Comemoração do achamento e descobrimento da Ilha de São Tomé pelos navegadores em 21 de dezembro de 1470.',
      meaningEn: 'Commemoration of the discovery of São Tomé Island by navigators on December 21, 1470.',
      type: 'nacional' as const,
    },
    {
      day: 25,
      month: 12,
      name: 'Natal da Família e da Paz',
      nameEn: 'Christmas Day',
      meaning: 'Feriado universal de união familiar, solidariedade, renovação da fé e fraternidade.',
      meaningEn: 'Universal celebration of family harmony, solidarity, faith renewal, and peace.',
      type: 'nacional' as const,
    }
  ];

  return fixed.map(item => {
    const d = new Date(year, item.month - 1, item.day);
    return {
      id: `stp-${year}-${String(item.month).padStart(2, '0')}-${String(item.day).padStart(2, '0')}`,
      name: item.name,
      nameEn: item.nameEn,
      date: d,
      dateStr: formatDateStr(d),
      day: item.day,
      month: item.month,
      year,
      country: 'STP' as CountryCode,
      countryName: 'São Tomé e Príncipe',
      countryFlag: '🇸🇹',
      type: item.type,
      typeLabel: 'Feriado Nacional de STP',
      typeLabelEn: 'STP National Holiday',
      meaning: item.meaning,
      meaningEn: item.meaningEn,
    };
  });
}

/**
 * Returns all official federal holidays of Brazil for a given year (fixed + mobile).
 */
export function getBrazilHolidays(year: number): Holiday[] {
  const easter = getEasterSunday(year);
  const carnaval = addDaysToDate(easter, -47); // Terça-feira de Carnaval
  const sextaFeiraSanta = addDaysToDate(easter, -2); // Sexta-feira da Paixão
  const corpusChristi = addDaysToDate(easter, 60); // Corpus Christi

  const list: Array<{
    date: Date;
    name: string;
    nameEn: string;
    meaning: string;
    meaningEn: string;
    type: 'nacional' | 'religioso' | 'facultativo';
    typeLabel: string;
    typeLabelEn: string;
  }> = [
    {
      date: new Date(year, 0, 1),
      name: 'Confraternização Universal',
      nameEn: 'New Year\'s Day',
      meaning: 'Início do ano civil e celebração da paz, harmonia e fraternidade universal (Lei nº 10.607/2002).',
      meaningEn: 'Start of the civil calendar year celebrating peace and international fraternity.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: carnaval,
      name: 'Carnaval',
      nameEn: 'Carnival Tuesday',
      meaning: 'Festa popular tradicional brasileira e ponto facultativo nacional antecedendo a Quarta-feira de Cinzas.',
      meaningEn: 'Traditional Brazilian carnival holiday preceding Ash Wednesday.',
      type: 'facultativo',
      typeLabel: 'Ponto Facultativo / Tradição',
      typeLabelEn: 'Optional Holiday / Tradition',
    },
    {
      date: sextaFeiraSanta,
      name: 'Sexta-feira Santa (Paixão de Cristo)',
      nameEn: 'Good Friday',
      meaning: 'Celebração cristã solene da Paixão e Morte de Jesus Cristo (Feriado Nacional - Lei nº 9.093/1995).',
      meaningEn: 'Solemn Christian commemoration of the Passion and Death of Jesus Christ.',
      type: 'religioso',
      typeLabel: 'Feriado Religioso Nacional',
      typeLabelEn: 'National Religious Holiday',
    },
    {
      date: easter,
      name: 'Domingo de Páscoa',
      nameEn: 'Easter Sunday',
      meaning: 'Celebração litúrgica central da Ressurreição de Jesus Cristo no calendário cristão.',
      meaningEn: 'Central liturgical celebration of the Resurrection of Jesus Christ.',
      type: 'religioso',
      typeLabel: 'Celebração Religiosa',
      typeLabelEn: 'Religious Celebration',
    },
    {
      date: new Date(year, 3, 21),
      name: 'Tiradentes',
      nameEn: 'Tiradentes Day',
      meaning: 'Homenagem a Joaquim José da Silva Xavier, mártir da Inconfidência Mineira e patrono cívico da Nação Brasileira (Lei nº 10.607/2002).',
      meaningEn: 'Honors Joaquim José da Silva Xavier, martyr of the Minas Gerais Conspiracy and civic hero of Brazil.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: new Date(year, 4, 1),
      name: 'Dia do Trabalhador',
      nameEn: 'Labour Day',
      meaning: 'Homenagem a todos os trabalhadores brasileiros e à valorização do trabalho digno (Lei nº 10.607/2002).',
      meaningEn: 'Tribute to all workers and the celebration of labour rights and dignity.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: corpusChristi,
      name: 'Corpus Christi',
      nameEn: 'Corpus Christi',
      meaning: 'Celebração religiosa tradicional do sacramento da Eucaristia com tapetes coloridos nas cidades.',
      meaningEn: 'Traditional religious feast honoring the institution of the Holy Eucharist.',
      type: 'facultativo',
      typeLabel: 'Ponto Facultativo Nacional',
      typeLabelEn: 'Optional National Holiday',
    },
    {
      date: new Date(year, 8, 7),
      name: 'Independência do Brasil',
      nameEn: 'Independence Day',
      meaning: 'Comemoração solene do Grito do Ipiranga em 1822 por Dom Pedro I, declarando o Brasil uma nação livre e soberana (Lei nº 10.607/2002).',
      meaningEn: 'Solemn celebration of Brazil\'s 1822 Declaration of Independence from Portugal.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: new Date(year, 9, 12),
      name: 'Nossa Senhora Aparecida',
      nameEn: 'Our Lady of Aparecida Day',
      meaning: 'Feriado nacional dedicado à padroeira do Brasil e tradicionalmente associado às crianças (Lei nº 6.802/1980).',
      meaningEn: 'Federal holiday dedicated to the patron saint of Brazil, also celebrated as Children\'s Day.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: new Date(year, 10, 2),
      name: 'Finados',
      nameEn: 'All Souls\' Day',
      meaning: 'Dia de oração, respeito e lembrança dedicada à memória de todos os entes queridos falecidos (Lei nº 10.607/2002).',
      meaningEn: 'Day of remembrance, prayer, and solemn respect for departed loved ones.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: new Date(year, 10, 15),
      name: 'Proclamação da República',
      nameEn: 'Republic Proclamation Day',
      meaning: 'Comemoração da instauração do regime republicano no Brasil em 15 de novembro de 1889 pelo Marechal Deodoro da Fonseca (Lei nº 10.607/2002).',
      meaningEn: 'Celebration of the birth of the Brazilian Republic on November 15, 1889.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: new Date(year, 10, 20),
      name: 'Dia Nacional de Zumbi e da Consciência Negra',
      nameEn: 'Black Consciousness and Zumbi Day',
      meaning: 'Feriado nacional oficial em memória de Zumbi dos Palmares e valorização da cultura e resistência afro-brasileira (Lei nº 14.759/2023).',
      meaningEn: 'Official federal holiday honoring Zumbi dos Palmares and Afro-Brazilian resistance and cultural heritage.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    },
    {
      date: new Date(year, 11, 25),
      name: 'Natal',
      nameEn: 'Christmas Day',
      meaning: 'Celebração cristã do nascimento de Jesus Cristo e festa universal de fraternidade e união familiar (Lei nº 10.607/2002).',
      meaningEn: 'Celebration of Christmas and universal celebration of peace and family.',
      type: 'nacional',
      typeLabel: 'Feriado Nacional',
      typeLabelEn: 'Federal Holiday',
    }
  ];

  return list.map(item => ({
    id: `br-${year}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
    name: item.name,
    nameEn: item.nameEn,
    date: item.date,
    dateStr: formatDateStr(item.date),
    day: item.date.getDate(),
    month: item.date.getMonth() + 1,
    year,
    country: 'BR' as CountryCode,
    countryName: 'Brasil',
    countryFlag: '🇧🇷',
    type: item.type,
    typeLabel: item.typeLabel,
    typeLabelEn: item.typeLabelEn,
    meaning: item.meaning,
    meaningEn: item.meaningEn,
  }));
}

/**
 * Returns all holidays for a given year sorted chronologically.
 */
export function getAllHolidaysForYear(year: number, country: 'ALL' | 'STP' | 'BR' = 'ALL'): Holiday[] {
  let holidays: Holiday[] = [];
  if (country === 'ALL' || country === 'STP') {
    holidays = holidays.concat(getStpHolidays(year));
  }
  if (country === 'ALL' || country === 'BR') {
    holidays = holidays.concat(getBrazilHolidays(year));
  }

  return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Checks if a specific date is a holiday in STP or BR.
 */
export function getHolidaysOnDate(targetDate: Date = new Date()): Holiday[] {
  const year = targetDate.getFullYear();
  const allHolidays = getAllHolidaysForYear(year, 'ALL');
  
  return allHolidays.filter(h => 
    h.date.getFullYear() === targetDate.getFullYear() &&
    h.date.getMonth() === targetDate.getMonth() &&
    h.date.getDate() === targetDate.getDate()
  );
}

/**
 * Computes remaining calendar days until a given holiday date from reference date.
 * Returns 0 if today, positive number for future days, negative for past days.
 */
export function getDaysDifference(holidayDate: Date, referenceDate: Date = new Date()): number {
  const d1 = new Date(holidayDate.getFullYear(), holidayDate.getMonth(), holidayDate.getDate());
  const d2 = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns upcoming holidays starting from referenceDate (including today if it's a holiday),
 * spanning across the current year and into next year if needed.
 */
export function getUpcomingHolidays(
  referenceDate: Date = new Date(),
  limit = 10,
  country: 'ALL' | 'STP' | 'BR' = 'ALL'
): Array<Holiday & { daysRemaining: number; isToday: boolean }> {
  const currentYear = referenceDate.getFullYear();
  const listThisYear = getAllHolidaysForYear(currentYear, country);
  const listNextYear = getAllHolidaysForYear(currentYear + 1, country);
  const combined = [...listThisYear, ...listNextYear];

  const filtered = combined
    .map(h => {
      const daysRemaining = getDaysDifference(h.date, referenceDate);
      return {
        ...h,
        daysRemaining,
        isToday: daysRemaining === 0,
      };
    })
    .filter(h => h.daysRemaining >= 0)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  return filtered.slice(0, limit);
}
