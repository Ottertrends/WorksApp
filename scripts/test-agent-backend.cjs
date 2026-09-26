const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const m={exports:{}}; new Function('require','module','exports',code)(name=>name in mocks?mocks[name]:require(name),m,m.exports); return m.exports;
}
const transport = load('src/lib/whatsapp/telnyx.ts');
test('delivery receipts distinguish delivered, failed, sent and unknown',()=>{
  assert.equal(transport.deliveryResult({to:[{status:'delivered'}]}),'delivered');
  assert.equal(transport.deliveryResult({to:[{status:'delivery_failed'}]}),'delivery-failed');
  assert.equal(transport.deliveryResult({to:[{status:'sent'}]}),'sent');
  assert.equal(transport.deliveryResult({to:[]}),'delivery-status-unknown');
  assert.equal(transport.deliveryResult({to:[{status:'delivered'}],errors:[{code:'x'}]}),'delivery-failed');
});
test('send retries only explicit throttling and returns the accepted ID',async()=>{
  const original=global.fetch,oldKey=process.env.TELNYX_API_KEY;process.env.TELNYX_API_KEY='test-only';let calls=0;
  try {global.fetch=async()=>++calls===1?new Response('{}',{status:429,headers:{'retry-after':'0'}}):Response.json({data:{id:'accepted'}});
    assert.equal(await transport.sendTelnyxWhatsAppText('+1','+2','hello'),'accepted');assert.equal(calls,2);
    calls=0;global.fetch=async()=>{calls++;return new Response('{}',{status:500});};
    await assert.rejects(transport.sendTelnyxWhatsAppText('+1','+2','hello'),/500/);assert.equal(calls,1);
    calls=0;global.fetch=async()=>{calls++;throw new Error('timeout');};
    await assert.rejects(transport.sendTelnyxWhatsAppText('+1','+2','hello'),/timeout/);assert.equal(calls,1);
  } finally {global.fetch=original;if(oldKey===undefined)delete process.env.TELNYX_API_KEY;else process.env.TELNYX_API_KEY=oldKey;}
});
function webhookFixture({duplicate=false,sendFailure=false,logFailure=false}={}) {
  const rows=[],jobs=[];let agentCalls=0,sends=0;
  const db={rpc:async()=>({error:null}),from(table){let op='select',row;const q={select(){return q;},eq(){return q;},neq(){return q;},order(){return q;},limit(){return q;},insert(x){op='insert';row=x;return q;},update(x){op='update';row=x;return q;},maybeSingle(){return Promise.resolve(result());},then(a,b){return Promise.resolve(result()).then(a,b);}};
    function result(){if(op==='insert'||op==='update') rows.push({table,op,...row});
      if(table==='profiles')return {data:{id:'actor'},error:null};
      if(table==='whatsapp_webhook_events')return {error:logFailure?{message:'offline'}:null};
      if(table==='messages'&&op==='insert'&&row.direction==='inbound')return duplicate?{error:{code:'23505'}}:{data:{id:'inbound'},error:null};
      if(table==='messages'&&op==='select')return {data:[],error:null};return {data:null,error:null};}
    return q;}};
  const route=load('src/lib/whatsapp/webhook.ts',{
    '@/lib/workspace/context':{resolveWorkspaceContext:async()=>({workspaceUserId:'actor'})},
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)},after:fn=>jobs.push(fn)},
    '@/lib/supabase/admin':{createSupabaseAdminClient:()=>db},
    '@/lib/whatsapp/bot-events':{logBotEvent:async()=>{}},
    '@/lib/agent/contractor-agent':{processContractorMessage:async()=>{agentCalls++;return {reply:'Hello'};}},
    '@/lib/whatsapp/telnyx':{...transport,sendTelnyxWhatsAppText:async()=>{sends++;if(sendFailure)throw new Error('rejected');return 'outbound-provider-id';}},
  });
  return {route,rows,jobs,get agentCalls(){return agentCalls;},get sends(){return sends;}};
}
const keys=crypto.generateKeyPairSync('ed25519');
function request(event='message.received',extra={}){const body=JSON.stringify({data:{event_type:event,payload:{id:'provider-inbound',from:{phone_number:'+15125550001'},to:[{phone_number:'+17377031190'}],text:'Hello',...extra}}});const timestamp=String(Math.floor(Date.now()/1000));return new Request('https://example.com/api/webhooks/whatsapp',{method:'POST',body,headers:{'telnyx-timestamp':timestamp,'telnyx-signature-ed25519':crypto.sign(null,Buffer.from(timestamp+'|'+body),keys.privateKey).toString('base64')}});}
async function signed(fn){const old=process.env.TELNYX_WEBHOOK_PUBLIC_KEY;process.env.TELNYX_WEBHOOK_PUBLIC_KEY=keys.publicKey.export({format:'pem',type:'spki'});try{await fn();}finally{if(old===undefined)delete process.env.TELNYX_WEBHOOK_PUBLIC_KEY;else process.env.TELNYX_WEBHOOK_PUBLIC_KEY=old;}}
test('unsigned webhook cannot invoke agent',async()=>{const f=webhookFixture();assert.equal((await f.route.POST(new Request('https://example.com',{method:'POST',body:'{}'}))).status,401);assert.equal(f.agentCalls,0);});
test('duplicate media callback is rejected before download or agent work',()=>signed(async()=>{const f=webhookFixture({duplicate:true});assert.equal((await f.route.POST(request('message.received',{media:[{url:'https://must-not-fetch.example/image.jpg'}]}))).status,200);for(const job of f.jobs)await job();assert.equal(f.agentCalls,0);assert.equal(f.sends,0);assert.ok(f.rows.some(r=>r.result==='duplicate-message'));}));
test('accepted reply stores provider ID; failed send creates no outbound success row',()=>signed(async()=>{for(const fail of [false,true]){const f=webhookFixture({sendFailure:fail});await f.route.POST(request());for(const job of f.jobs)await job();assert.equal(f.agentCalls,1);const sent=f.rows.filter(r=>r.direction==='outbound');assert.equal(sent.length,fail?0:1);if(!fail)assert.equal(sent[0].whatsapp_message_id,'outbound-provider-id');else assert.ok(f.rows.some(r=>r.result==='reply-failed'));}}));
test('delivery log persistence failure returns retryable 503',()=>signed(async()=>{const f=webhookFixture({logFailure:true});assert.equal((await f.route.POST(request('message.finalized',{to:[{status:'delivered'}]}))).status,503);assert.equal(f.agentCalls,0);}));
function agentFixture({miniTokens=0,usageError=false,messages=0,profileError=false}={}){
 let requests=0;const writes=[];
 const profileColumns=new Set(['zip_code','stripe_connect_account_id','stripe_connect_charges_enabled','subscription_plan','subscription_status','subscription_seats']);
 const db={from(table){const value=table==='profiles'?{subscription_plan:'free',zip_code:'78701'}:table==='api_usage'?[{mini_input_tokens:miniTokens,web_messages:messages}]:null;let error=table==='profiles'&&profileError?{code:'offline'}:null;const q={select(columns){if(table==='profiles'&&columns.split(',').some(column=>!profileColumns.has(column.trim())))error={code:'42703'};return q;},eq(){return q;},gte(){return q;},maybeSingle(){return Promise.resolve({data:error?null:value,error});},then(a,b){return Promise.resolve({data:value,error:usageError&&table==='api_usage'?{code:'offline'}:error}).then(a,b);}};return q;},async rpc(name,args){await new Promise(resolve=>setTimeout(resolve,5));writes.push({name,args});return {error:null};}};
 class FakeOpenAI{constructor(){this.chat={completions:{create:async()=>{requests++;return {choices:[{message:{content:'Hello'}}],usage:{prompt_tokens:100,completion_tokens:20}};}}};}}
 const fn=load('src/lib/agent/contractor-agent.ts',{
   openai:FakeOpenAI,'@/lib/billing/access':{isPremium:()=>false,maxMonthlyMessages:()=>50},
   '@/lib/supabase/admin':{createSupabaseAdminClient:()=>db},'@/lib/agent/tool-handlers':{executeTool:async()=>'{"ok":true}'},
   '@/lib/agent/model':{MINI_MODEL:'mini'},'@/lib/agent/model-router':{routeToModel:()=>({model:'mini',method:'heuristic-simple'})},
   '@/lib/agent/types':{buildSystemPrompt:()=>''},'@/lib/agent/tools':{CONTRACTOR_TOOLS:[]},
   '@/lib/workspace/context':{resolveWorkspaceContext:async()=>({workspaceUserId:'owner'})},
 }).processContractorMessage;
 return {fn,writes,get requests(){return requests;}};
}
test('mini tokens and shared message allowance block model spend at limit',async()=>{const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';try{for(const config of [{miniTokens:6500000},{messages:50},{usageError:true}]){const f=agentFixture(config);const result=await f.fn('actor','Hello',[]);assert.equal(f.requests,0);assert.equal(f.writes.length,0);assert.ok(result.limitReached||result.error);}}finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}});
test('agent awaits one accurate token and message usage write',async()=>{const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';try{const f=agentFixture();assert.equal((await f.fn('actor','Hello',[])).reply,'Hello');assert.equal(f.requests,1);assert.equal(f.writes.length,1);assert.equal(f.writes[0].args.p_mini_input,100);assert.equal(f.writes[0].args.p_mini_output,20);assert.equal(f.writes[0].args.p_web_messages,1);}finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}});
test('routing makes no classifier request and keeps complex work on capable model',()=>{const {routeToModel}=load('src/lib/agent/model-router.ts',{'./model':{DEFAULT_OPENAI_MODEL:'large',MINI_MODEL:'mini'}});assert.equal(routeToModel('hello').model,'mini');assert.equal(routeToModel('create a proposal').model,'large');assert.equal(routeToModel('please help with this unusual task').method,'fallback');});

test('production profile schema without city/state admits requests; real profile failures stay closed',async()=>{
 const old=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test';
 try {
  const healthy=agentFixture();
  assert.deepEqual(await healthy.fn('actor','Hello',[]),{reply:'Hello'});
  assert.equal(healthy.requests,1);
  const failed=agentFixture({profileError:true});
  assert.match((await failed.fn('actor','Hello',[])).error,/Unable to load agent profile: offline/);
  assert.equal(failed.requests,0);
  assert.equal(failed.writes.length,0);
 }finally{if(old===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=old;}
});
