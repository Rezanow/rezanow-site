module.exports = {
  rules: {
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'docs', 'style', 'refactor', 'test', 'build', 'ci', 'chore', 'revert']
    ]
  }
};
