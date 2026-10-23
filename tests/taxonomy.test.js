import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('evidence-based taxonomy reconciliation rules',()=>{
 execFileSync('python3',['-m','unittest','discover','-s','tests','-p','test_taxonomy.py'],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
});
