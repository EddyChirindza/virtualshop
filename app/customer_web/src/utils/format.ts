export const money = (v: number | string) =>
  `${Number(v).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MT`;
