import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
const root = process.cwd();
function routeFiles(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap((entry)=>{const full=join(dir,entry.name); return entry.isDirectory()?routeFiles(full):full.endsWith("route.ts")?[full]:[];}); }
test("OpenAPI paths and methods match route handlers", () => {
  const file=join(root,"docs/api/openapi.yaml"); assert.equal(existsSync(file),true); const spec=readFileSync(file,"utf8").replace(/^\uFEFF/,""); assert.match(spec,/^openapi: 3\.1\.0/m); assert.match(spec,/cookieSession:/);
  const documented=new Map(); let current=null;
  for(const line of spec.split("\n")){const p=line.match(/^  ['"]([^'"]+)['"]:\s*$/); if(p){current=p[1]; if(!documented.has(current))documented.set(current,new Set()); continue;} const m=line.match(/^    (get|post|patch|put|delete):\s*$/); if(current&&m)documented.get(current).add(m[1].toUpperCase());}
  const actual=new Map(); for(const route of routeFiles(join(root,"src/app/api"))){const routePath="/api/"+relative(join(root,"src/app/api"),route).replaceAll("\\","/").replace(/\/route\.ts$/,"" ).replaceAll("[","{").replaceAll("]","}"); const methods=[...readFileSync(route,"utf8").matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)/g)].map((m)=>m[1]); actual.set(routePath,new Set([...(actual.get(routePath)??[]),...methods]));}
  assert.deepEqual([...documented.keys()].sort(),[...actual.keys()].sort()); for(const [path,methods] of actual) assert.deepEqual([...documented.get(path)].sort(),[...methods].sort(),path);
});
