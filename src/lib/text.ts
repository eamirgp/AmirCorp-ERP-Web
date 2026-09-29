/** Texto en minúsculas y sin tildes, para buscar igual que la API: "camara" encuentra "Cámara". */
export const normalizeText = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')

/** Si alguno de los textos contiene lo buscado, sin distinguir mayúsculas ni tildes. */
export const matchesText = (term: string, ...texts: string[]) => {
  const q = normalizeText(term)
  return texts.some((t) => normalizeText(t).includes(q))
}
