const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
function load(file, imports = require) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const result = { exports: {} };
  new Function('require', 'module', 'exports', code)(imports, result, result.exports);
  return result.exports;
}
async function main() {
  const tools = load('src/lib/agent/tools.ts', name => name === './workspace-data' ? load('src/lib/agent/workspace-data.ts') : require(name)).CONTRACTOR_TOOLS;
  for (const name of ['read_crm', 'save_crm_opportunity', 'crm_add_client']) {
    assert.equal(tools.filter(t => t.name === name).length, 1);
  }
  const calls = [];
  const service = Object.fromEntries(['readCrm', 'saveOpportunity', 'addOpportunityClient'].map(name => [name, async (...args) => {
    calls.push({ name, args }); return { ok: true };
  }]));
  const { executeTool } = load('src/lib/agent/tool-handlers.ts', name => {
    if (name === '@/lib/crm/service') return service;
    if (name === '@/lib/supabase/admin') return { createSupabaseAdminClient: () => ({}) };
    return {};
  });
  await executeTool('member', 'read_crm', {}, 'owner');
  await executeTool('member', 'save_crm_opportunity', { id: 'lead', stage: 'quoted' }, 'owner');
  await executeTool('member', 'crm_add_client', { id: 'lead' }, 'owner');
  assert.deepEqual(calls, [
    { name: 'readCrm', args: ['owner'] },
    { name: 'saveOpportunity', args: ['owner', { id: 'lead', stage: 'quoted' }] },
    { name: 'addOpportunityClient', args: ['owner', 'lead'] },
  ]);
  service.saveOpportunity = async () => { throw new Error('Database unavailable'); };
  assert.deepEqual(JSON.parse(await executeTool('member', 'save_crm_opportunity', {}, 'owner')), { error: 'Database unavailable' });
  const prompt = load('src/lib/agent/types.ts').buildSystemPrompt();
  assert.ok(prompt.includes('CRM WORKFLOW'));
  assert.ok(prompt.includes('does not create or send an invoice'));
  for (const channel of ['whatsapp']) {
    const source = fs.readFileSync(`src/lib/${channel}/webhook.ts`, 'utf8');
    assert.ok(source.includes('processContractorMessage(userId, commandText, history, workspace.workspaceUserId)'));
  }
  console.log('CRM agent checks passed: tool registration, workspace-scoped dispatch, failed saves, prompt instructions and WhatsApp entry points.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
