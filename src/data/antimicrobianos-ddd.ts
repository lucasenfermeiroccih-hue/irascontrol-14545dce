// Mock data: Antimicrobianos com DDD padrão OMS 2020
export interface AntimicrobianoRow {
  id: number;
  nome: string;
  apresentacao: string;
  dddPadrao: number; // em gramas
}

export const antimicrobianosBase: AntimicrobianoRow[] = [
  { id: 1, nome: "Amicacina", apresentacao: "500mg/2mL", dddPadrao: 1 },
  { id: 2, nome: "Amoxicilina + Clavulanato", apresentacao: "500mg+125mg", dddPadrao: 1.5 },
  { id: 3, nome: "Ampicilina", apresentacao: "1g", dddPadrao: 6 },
  { id: 4, nome: "Ampicilina + Sulbactam", apresentacao: "1g+0.5g", dddPadrao: 6 },
  { id: 5, nome: "Azitromicina", apresentacao: "500mg", dddPadrao: 0.5 },
  { id: 6, nome: "Cefazolina", apresentacao: "1g", dddPadrao: 3 },
  { id: 7, nome: "Cefepime", apresentacao: "1g", dddPadrao: 4 },
  { id: 8, nome: "Ceftazidima", apresentacao: "1g", dddPadrao: 4 },
  { id: 9, nome: "Ceftriaxona", apresentacao: "1g", dddPadrao: 2 },
  { id: 10, nome: "Ciprofloxacino", apresentacao: "400mg/200mL", dddPadrao: 0.8 },
  { id: 11, nome: "Claritromicina", apresentacao: "500mg", dddPadrao: 0.5 },
  { id: 12, nome: "Clindamicina", apresentacao: "600mg/4mL", dddPadrao: 1.8 },
  { id: 13, nome: "Colistimetato (Polimixina E)", apresentacao: "1MUI", dddPadrao: 3 },
  { id: 14, nome: "Daptomicina", apresentacao: "500mg", dddPadrao: 0.28 },
  { id: 15, nome: "Ertapenem", apresentacao: "1g", dddPadrao: 1 },
  { id: 16, nome: "Fluconazol", apresentacao: "200mg/100mL", dddPadrao: 0.2 },
  { id: 17, nome: "Gentamicina", apresentacao: "80mg/2mL", dddPadrao: 0.24 },
  { id: 18, nome: "Imipenem + Cilastatina", apresentacao: "500mg+500mg", dddPadrao: 2 },
  { id: 19, nome: "Levofloxacino", apresentacao: "500mg/100mL", dddPadrao: 0.5 },
  { id: 20, nome: "Linezolida", apresentacao: "600mg/300mL", dddPadrao: 1.2 },
  { id: 21, nome: "Meropenem", apresentacao: "1g", dddPadrao: 3 },
  { id: 22, nome: "Metronidazol", apresentacao: "500mg/100mL", dddPadrao: 1.5 },
  { id: 23, nome: "Micafungina", apresentacao: "100mg", dddPadrao: 0.1 },
  { id: 24, nome: "Oxacilina", apresentacao: "500mg", dddPadrao: 2 },
  { id: 25, nome: "Piperacilina + Tazobactam", apresentacao: "4g+0.5g", dddPadrao: 14 },
  { id: 26, nome: "Polimixina B", apresentacao: "500.000UI", dddPadrao: 1.5 },
  { id: 27, nome: "Sulfametoxazol + Trimetoprima", apresentacao: "400mg+80mg", dddPadrao: 1.92 },
  { id: 28, nome: "Teicoplanina", apresentacao: "400mg", dddPadrao: 0.4 },
  { id: 29, nome: "Tigeciclina", apresentacao: "50mg", dddPadrao: 0.1 },
  { id: 30, nome: "Vancomicina", apresentacao: "500mg", dddPadrao: 2 },
  { id: 31, nome: "Voriconazol", apresentacao: "200mg", dddPadrao: 0.4 },
  { id: 32, nome: "Anfotericina B", apresentacao: "50mg", dddPadrao: 0.035 },
  { id: 33, nome: "Caspofungina", apresentacao: "50mg", dddPadrao: 0.05 },
  { id: 34, nome: "Anidulafungina", apresentacao: "100mg", dddPadrao: 0.1 },
];

// Mock data para dashboard (múltiplos meses)
export interface DDDRegistroMensal {
  mes: string;
  ano: number;
  mesNumero: number;
  unidade: string;
  pacienteDia: number;
  antimicrobiano: string;
  quantidadeUnidades: number;
  totalMg: number;
  totalG: number;
  dddPadrao: number;
  valorAB: number;
  indicadorConsumo: number;
}

const unidades = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico"];
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const topAntimicrobianos = ["Meropenem", "Vancomicina", "Piperacilina + Tazobactam", "Cefepime", "Ceftriaxona", "Ciprofloxacino", "Metronidazol", "Linezolida"];

function randomRange(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export function generateMockDDDData(): DDDRegistroMensal[] {
  const data: DDDRegistroMensal[] = [];
  for (let ano = 2024; ano <= 2025; ano++) {
    const maxMes = ano === 2025 ? 6 : 12;
    for (let m = 0; m < maxMes; m++) {
      for (const unidade of unidades) {
        const pacienteDia = Math.round(randomRange(200, 600));
        for (const atm of topAntimicrobianos) {
          const base = antimicrobianosBase.find(a => a.nome === atm);
          const qty = Math.round(randomRange(10, 200));
          const mgPerUnit = parseFloat(base?.apresentacao?.match(/(\d+)/)?.[1] || "500");
          const totalMg = qty * mgPerUnit;
          const totalG = totalMg / 1000;
          const dddPadrao = base?.dddPadrao || 1;
          const valorAB = totalG / dddPadrao;
          const indicadorConsumo = pacienteDia > 0 ? (valorAB / pacienteDia) * 1000 : 0;

          data.push({
            mes: meses[m],
            ano,
            mesNumero: m + 1,
            unidade,
            pacienteDia,
            antimicrobiano: atm,
            quantidadeUnidades: qty,
            totalMg,
            totalG,
            dddPadrao,
            valorAB: Math.round(valorAB * 100) / 100,
            indicadorConsumo: Math.round(indicadorConsumo * 100) / 100,
          });
        }
      }
    }
  }
  return data;
}
