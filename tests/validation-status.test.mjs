import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consolidate, matchesObservation, restriction} from '../src/validation-status.mjs';
const base={path:'/c/f/pb/page',category:'reviewed-read-candidate',status:'business-error',constructor_commands:[302001],command_variant:null};
test('observations cannot validate a different command or excluded origin',()=>{assert(matchesObservation(base,{path:'c/f/pb/page',command:'302001'}));assert(!matchesObservation(base,{path:'c/f/pb/page',command:'309751'}));assert(!matchesObservation({...base,command_variant:'302001'},{path:base.path}));assert(!matchesObservation({...base,category:'nonproduction-or-other-origin'},{path:base.path,command:'302001'}));});
test('a later error retains functional evidence while reporting the current failure',()=>{const r=consolidate(base,[{path:base.path,command:'302001',status:'verified-read',error_code:'0'},{path:base.path,command:'302001',status:'business-error',error_code:'110003',error_message:'内部错误'}]);assert.equal(r.best_status,'verified-read');assert.equal(r.limitation.kind,'server-error-unresolved');assert.equal(r.latest_observation.error_code,'110003');});
test('business success alone cannot become functional evidence',()=>{assert.equal(consolidate(base,[{path:base.path,error_code:'0',status:'business-success'}]).best_status,'business-error');assert.equal(restriction(base,'response-schema-validated',{error_code:'0'}).kind,'functional-assertions-incomplete');});
test('explicit manager rejection and unknown internal errors remain distinct',()=>{assert.equal(restriction(base,'business-error',{error_code:'2121024',error_message:'the checkuser not a manager'}).kind,'moderator-role-required');assert.equal(restriction(base,'business-error',{error_code:'110003',error_message:'内部错误'}).kind,'server-error-unresolved');});
test('authorization does not manufacture request and rollback information',()=>{const r=restriction({path:'/c/c/post/add',category:'stateful-or-auth-action'},'not-executed-stateful',null);assert.equal(r.kind,'operation-and-restore-plan-needed');assert.equal(r.basis,'analysis');});

test('query variants use recorded candidate IDs instead of sharing path evidence',()=>{assert(!matchesObservation({...base,id:'other'},{path:base.path,candidate_ids:['expected'],command:'302001'}));assert(matchesObservation({...base,id:'expected'},{path:base.path,candidate_ids:['expected'],command:'302001'}));});
test('negative controls remain recorded without replacing the latest ordinary observation',()=>{const r=consolidate(base,[{path:base.path,status:'verified-read',error_code:'0'},{path:base.path,status:'business-error',error_code:'340001',negative_control:true}]);assert.equal(r.supplemental_observations.length,2);assert.equal(r.latest_observation.error_code,'0');});
test('explicit entitlement and duplicate completion responses do not become generic auth failures',()=>{assert.equal(restriction(base,'business-error',{error_code:'1990043',error_message:'高级会员权限'}).kind,'membership-required');assert.equal(restriction(base,'business-error',{error_code:'160002'}).kind,'already-completed');assert.equal(restriction({...base,execution_scope:'moderation-excluded-by-user'},'business-error',{error_code:'2121024'}).kind,'not-in-requested-scope');});

test('partial deletion and HTTP-to-HTTPS probes retain their actual limitations',()=>{assert.equal(restriction(base,'verified-state-change',{error_code:'0',incomplete_cleanup:true}).kind,'partial-deletion-semantics');assert.equal(restriction({...base,explicit_origin:'http://c.tieba.baidu.com'},'https-variant-verified',{error_code:'0',transport_upgraded_from_http:true}).kind,'http-source-https-variant-tested');});

test('an anonymous rejection is not evidence of restrictions on logged-in accounts',()=>{
 const row={...base,id:'sample',status:'not-executed-stateful'};
 const result=consolidate(row,[{path:base.path,candidate_ids:['sample'],status:'business-error',negative_control:true,error_code:'110001',http_status:200}]);
 assert.equal(result.best_status,'negative-control-response');
 assert.equal(result.limitation.kind,'anonymous-negative-control-only');
 assert.equal(result.latest_observation.error_code,'110001');
});

test('a mislabeled negative control cannot manufacture functional evidence',()=>{
 const result=consolidate({...base,status:'needs-request-construction'},[{path:base.path,status:'verified-read',negative_control:true,error_code:'0'}]);
 assert.equal(result.best_status,'negative-control-response');
 assert.equal(result.limitation.kind,'anonymous-negative-control-only');
});

test('tail membership rejection preserves its explicit cause',()=>{
 const result=restriction({path:'/c/u/tail/setTail'},'business-error',{error_code:'3110002',error_message:'对不起，您不是贴吧会员！'});
 assert.equal(result.kind,'membership-required');
 assert.equal(result.basis,'observed');
});

test('authenticated parameter controls preserve their distinct scope',()=>{
 const result=consolidate({...base,status:'needs-request-construction'},[{path:base.path,status:'business-error',negative_control:true,authenticated:true,error_code:'300000'}]);
 assert.equal(result.limitation.kind,'parameter-negative-control-only');
 assert.equal(result.best_status,'negative-control-response');
});

test('a new negative control does not erase historical business responses',()=>{
 const row={...base,status:'json-data-returned',attempts:[{error_code:'0',http_status:200,status:'json-data-returned'}]};
 const result=consolidate(row,[{path:base.path,status:'business-error',negative_control:true,authenticated:false,error_code:'110001'}]);
 assert.equal(result.best_status,'json-data-returned');
 assert.equal(result.latest_observation.error_code,'0');
 assert.equal(result.limitation.kind,'functional-assertions-incomplete');
});
