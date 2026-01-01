export const BAND_CONFIG = [
  { score: '5', label: 'Excellent', color: '#2e7d32' },
  { score: '4', label: 'Good', color: '#8bc34a' },
  { score: '3', label: 'Mediocre', color: '#ffeb3b' },
  { score: '2', label: 'Bad', color: '#ff9800' },
  { score: '1', label: 'Very Bad', color: '#ff6b6b' },
  { score: '0', label: 'Unqualified/Unacceptable', color: '#444444' },
  { score: 'unranked', label: 'Unranked', color: '#90caf9' },
];

export const METHOD_FAMILIES = [
  {
    name: 'Condorcet',
    methods: ['ranked_pairs', 'schulze']
  },
  {
    name: 'Rating',
    methods: ['score', 'approval']
  },
  {
    name: 'Runoff',
    methods: ['irv_stv', 'coombs']
  }
];

export const METHOD_NAME_MAP: {[key: string]: string} = {
  'ranked_pairs': 'Ranked Pairs',
  'schulze': 'Schulze',
  'score': 'Score',
  'approval': 'Approval',
  'irv_stv': 'IRV/STV',
  'coombs': 'Coombs'
};

