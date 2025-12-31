export const comparison = {
  headings: ['Method', 'Majority winner', 'Majority loser', 'Mutual majority', 'Condorcet winner', 'Condorcet loser', 'Smith', 'Smith-IIA', 'IIA/LIIA', 'Clone-proof', 'Monotone', 'Consistency', 'Participation', 'Reversal symmetry', 'Homogeneity', 'Later-no-harm', 'Later-no-help', 'No favorite betrayal', 'Ballot type'],
  data: {
    'Two round system': ['Two round system', 'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No', '', 'Yes', 'Yes', 'Yes', 'No', 'Single mark'],
    'Tideman alternative': ['Tideman alternative', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'No', '', 'No', 'No', 'No', 'Ranking'],
    'STAR': ['STAR', 'No', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'No', 'No', '', 'No', 'No', 'No', 'Scores'],
    'Sortition': ['Sortition', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'No', 'Yes', '', 'Yes', '', 'N/A', 'Yes', 'Yes', 'Yes', 'None'],
    'Score': ['Score', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Scores'],
    'Schulze': ['Schulze', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'No', 'No', 'Ranking'],
    'Ranked pairs': ['Ranked pairs', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'LIIA Only', 'Yes', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'No', 'No', 'Ranking'],
    'Random ballot': ['Random ballot', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', '', 'Yes', '', 'Yes', 'Yes', 'Yes', 'Yes', 'Single mark'],
    'Quadratic': ['Quadratic', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', '', 'Yes', '', '', 'N/A', 'N/A', 'No', 'Credits'],
    'Nanson': ['Nanson', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', '', 'No', 'No', 'No', 'Ranking'],
    'Minimax': ['Minimax', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No', 'Yes', 'No', 'No', 'No', '', 'No', 'No', 'No', 'Ranking'],
    'Majority Judgement': ['Majority Judgement', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'No', 'No', '', 'Yes', 'No', 'Yes', 'Yes', 'Scores'],
    'Kemeny': ['Kemeny', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'LIIA Only', 'No', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'No', 'No', 'Ranking'],
    'Instant-runoff': ['Instant-runoff', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'No', 'Ranking'],
    'First-past-the-post': ['First-past-the-post', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'Single mark'],
    'Copeland': ['Copeland', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'No', '', '', 'No', 'No', 'No', 'Ranking'],
    'Coombs': ['Coombs', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No', '', 'Yes', 'No', 'No', 'Yes', 'Ranking'],
    'Bucklin': ['Bucklin', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'No', 'No', 'No', 'Yes', 'No', 'Yes', 'No', 'Ranking'],
    'Borda': ['Borda', 'No', 'Yes', 'No', 'No', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Ranking'],
    'Black': ['Black', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'Yes', 'No', 'No', 'Yes', 'Yes', 'No', 'No', 'No', 'Ranking'],
    'Baldwin': ['Baldwin', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No', '', 'No', 'No', 'No', 'Ranking'],
    'Approval': ['Approval', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Approvals'],
    'Anti-plurality': ['Anti-plurality', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'Yes', 'Single mark'],
  }
} as const;


