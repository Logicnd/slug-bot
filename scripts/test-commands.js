const path = require('path');
const economy = require('../src/utils/economy');

class MockOptions {
  constructor(opts = {}) { this._opts = opts; }
  getSubcommand() { return this._opts.subcommand; }
  getString(name) { return this._opts[name]; }
}

class MockInteraction {
  constructor(userId = 'test-user', username = 'Tester', opts = {}) {
    this.user = { id: userId, username };
    this.replied = false;
    this.deferred = false;
    this.options = new MockOptions(opts);
  }

  async reply(payload) {
    this.replied = true;
    console.log('[reply]', payload && (payload.content || (payload.embeds ? '<embed>' : JSON.stringify(payload))));
  }

  async followUp(payload) {
    console.log('[followUp]', payload && (payload.content || (payload.embeds ? '<embed>' : JSON.stringify(payload))));
  }
}

async function run() {
  console.log('Using DATA_PATH:', economy.DATA_PATH);

  // ensure test user exists
  economy.setUser('test-user', { money: 100, goop: 5, jobs: { selected: null }, items: { slimes: 0 } });

  const cmds = [
    { name: 'search', path: '../src/commands/economy/search' },
    { name: 'attack', path: '../src/commands/economy/attack' },
    { name: 'work', path: '../src/commands/economy/work' },
    { name: 'leaderboard', path: '../src/commands/economy/leaderboard', opts: { metric: 'coins' } },
    { name: 'job-list', path: '../src/commands/economy/job', opts: { subcommand: 'list' } },
    { name: 'job-select', path: '../src/commands/economy/job', opts: { subcommand: 'select', id: 'farmer' } },
  ];

  for (const c of cmds) {
    try {
      console.log('\n--- Running', c.name);
      const command = require(c.path);
      const interaction = new MockInteraction('test-user', 'Tester', c.opts || {});
      await command.execute(interaction);
      console.log('OK');
    } catch (err) {
      console.error('ERROR running', c.name, err && err.stack ? err.stack : err);
    }
  }
}

run().catch((e) => console.error('Fatal test error:', e));
