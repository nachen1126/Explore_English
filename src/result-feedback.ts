/** Use the exact first-answer ratio, never the rounded display percentage. */
export function resultFeedback(score: number, total: number) {
  if (!Number.isInteger(score) || !Number.isInteger(total) || total <= 0 || score < 0 || score > total) return null;
  const ratio = score / total;
  if (score === total) return { title: 'Perfect recall!', description: 'You remembered every word on your first try.' };
  if (ratio >= .8) return { title: 'You know these words well!', description: 'Just a few words left to practise.' };
  if (ratio >= .6) return { title: 'A good start!', description: 'You remembered more than half. Keep practising the rest.' };
  if (ratio >= .4) return { title: 'Getting more familiar!', description: 'Review the tricky words and try again.' };
  return { title: 'Let’s practise together.', description: 'Take another look at the words, then give it another go.' };
}
