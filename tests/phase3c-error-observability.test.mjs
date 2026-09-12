// These existing tests exercise the production-safe contract explicitly.
process.env.NODE_ENV = "production";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
function load(path, mocks = {}) {
  const filename = resolve(root, path);
  const loadedModule = { exports: {} };
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  new Function("require", "module", "exports", js)((id) => {
    if (id in mocks) return mocks[id];
    if (id === "server-only") return {};
    if (id.startsWith("@/") || id.startsWith(".")) {
      const base = id.startsWith("@/") ? resolve(root, "src", id.slice(2)) : resolve(dirname(filename), id);
      for (const ext of [".ts", ".tsx"]) {
        try { readFileSync(base + ext); } catch { continue; }
        return load(base + ext, mocks);
      }
    }
    return require(id);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}


const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function capture(fn) { const original = console.error; const logs=[]; console.error=(...args)=>logs.push(args); try { return fn(logs); } finally { console.error=original; } }
test("unexpected API response and log share an opaque reference without private error data", async()=>{
 const { unexpectedErrorResponse }=load("src/libs/api/server-response.ts");
 let response; let logs;
 capture(items=>{logs=items; response=unexpectedErrorResponse("[POST /api/auth/login]",Object.assign(new Error("password=secret person@example.com"),{body:"provider-secret",code:"PGRST000"}),"登入失敗");});
 const body=await response.json(); assert.equal(response.status,500); assert.match(body.errorId,uuid); assert.equal(body.message,"登入失敗"); assert.ok(JSON.stringify(logs).includes(body.errorId)); assert.doesNotMatch(JSON.stringify({body,logs}),/password|secret|person@example/);
});
test("reporting is deduplicated on the same error object and bounded metadata is allowlisted",()=>capture(logs=>{
 const { reportUnexpectedError }=load("src/libs/observability/report.ts"); const error=Object.assign(new Error("raw-private"),{code:"23505",cause:{details:"email=private",code:"PGRST000"}});
 const a=reportUnexpectedError(error,{context:"api",route:"/api/users/private-id?token=secret",method:"POST",body:"private",user:{email:"private"}});
 assert.equal(reportUnexpectedError(error,{context:"api"}),a); assert.match(a,uuid); assert.equal(logs.length,1); assert.doesNotMatch(JSON.stringify(logs),/private|secret|token=|details/); assert.match(JSON.stringify(logs),/23505|PGRST000/);
}));
test("support reference exposes only UUID copy payload",()=>{const react=require("react"),render=require("react-dom/server").renderToStaticMarkup;const {ErrorReference}=load("src/components/ErrorReference.tsx");const id=crypto.randomUUID();const html=render(react.createElement(ErrorReference,{errorId:id}));assert.ok(html.includes(id));assert.match(html,/複製追蹤碼/);assert.doesNotMatch(html,/記錄時間|支援資訊/);});
test("API client preserves server reference without a second report and rejects private 500 messages",async()=>{
 const original=globalThis.fetch; const id=crypto.randomUUID(); globalThis.fetch=async()=>new Response(JSON.stringify({message:"SQL provider secret",errorId:id}),{status:500});
 try {const {apiClient}=load("src/libs/api/client.tsx"); await assert.rejects(()=>apiClient("/api/test"),error=>error.errorId===id && error.message.includes(id) && !error.message.includes("secret"));}finally{globalThis.fetch=original;}
});
test("expected HTTP errors keep their messages and have no incident reference",async()=>{
 const original=globalThis.fetch;try { const {apiClient}=load("src/libs/api/client.tsx");for(const status of [400,401,403,404,409,429]){globalThis.fetch=async()=>new Response(JSON.stringify({message:"預期拒絕",errorId:crypto.randomUUID()}),{status});await assert.rejects(()=>apiClient("/api/test"),e=>e.status===status&&e.message==="預期拒絕"&&!e.errorId);}}finally{globalThis.fetch=original;}
});
test("repository throws typed cause without duplicate logging",()=>capture(logs=>{
 const {throwRepositoryError,RepositoryError}=load("src/repositories/shared/errors.ts");assert.throws(()=>throwRepositoryError("讀取失敗",{code:"PGRST000",details:"private"}),RepositoryError);assert.equal(logs.length,0);
}));
test("error reference component contains selectable wrapping ID, clipboard success and failure UX",()=>{
 const s=read("src/components/ErrorReference.tsx");assert.match(read("src/components/CopyAction.tsx"),/writeText/);assert.match(s,/select-all/);assert.match(s,/wrap-anywhere/);assert.doesNotMatch(s,/location|searchParams|cookie|userAgent/);
});
test("render fallback shares reference UX without rendering error message, digest or stack",()=>{
 const s=read("src/components/UnexpectedErrorState.tsx");assert.match(s,/ErrorReference/);assert.match(s,/reset/);assert.doesNotMatch(s,/error\.(message|stack)/);assert.match(read("src/app/global-error.tsx"),/<html/); for(const group of ["(authenticated)","(admin)","(public)","(auth)"])assert.match(read("src/app/"+group+"/error.tsx"),/UnexpectedErrorState/);
});
test("all explicit API 500 paths converge on the reporting response helper",()=>{
 function walk(dir){return readdirSync(resolve(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(dir+"/"+e.name):[dir+"/"+e.name]);}for(const path of walk("src/app/api")){assert.doesNotMatch(read(path),/status:\s*500/,path);assert.doesNotMatch(read(path),/console\.error/,path);}
});

function allNodes(tree) { if (Array.isArray(tree)) return tree.flatMap(allNodes); if (!tree || typeof tree !== "object") return []; return [tree,...allNodes(tree.props?.children)]; }
function stateHarness(path, name, props) {
 const state=[];let cursor=0; const react=require("react"); const component=load(path,{react:{...react,useState(initial){const i=cursor++;if(!(i in state))state[i]=typeof initial==="function"?initial():initial;return [state[i],v=>{state[i]=typeof v==="function"?v(state[i]):v}];},useEffect() {},useRef(value){return {current:value};}}})[name];
 return ()=>{cursor=0;return allNodes(component(props));};
}
test("clipboard copies safe support information and handles denied permission without breaking retry",async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,"navigator");let copied;let fail=false;
 Object.defineProperty(globalThis,"navigator",{configurable:true,value:{clipboard:{writeText:async text=>{if(fail)throw Error("permission denied");copied=text;}}}});
 try {const id=crypto.randomUUID();const reference=stateHarness("src/components/ErrorReference.tsx","ErrorReference",{errorId:id})();const props=reference.find(n=>n.props?.label==="複製追蹤碼").props;const render=stateHarness("src/components/CopyAction.tsx","CopyAction",props);await render().find(n=>n.props?.onClick).props.onClick();assert.equal(copied,id);assert.doesNotMatch(copied,/permission|token|http|private/);assert.ok(render().some(n=>n.props?.children==="已複製"));fail=true;await render().find(n=>n.props?.onClick).props.onClick();assert.ok(render().some(n=>n.props?.children==="無法複製，請手動選取文字。"));}finally{if(original)Object.defineProperty(globalThis,"navigator",original);else delete globalThis.navigator;}
});
test("render retry remains callable and uses server ID without rendering raw error or digest",()=>{
 const id=crypto.randomUUID();let resets=0;const render=stateHarness("src/components/UnexpectedErrorState.tsx","UnexpectedErrorState",{error:Object.assign(new Error("raw-password-secret"),{digest:"app-error:"+id}),reset:()=>resets++});const tree=render();tree.find(n=>n.props?.children==="再試一次").props.onClick();assert.equal(resets,1);assert.ok(tree.some(n=>n.props?.errorId===id));assert.doesNotMatch(JSON.stringify(tree),/raw-password-secret|app-error:/);
});
test("server render boundary reports once and Next serializer transports the application UUID",()=>capture(logs=>{
 const {throwReportedRenderError}=load("src/libs/observability/server-render.ts");let safe;
 try{throwReportedRenderError(Object.assign(new Error("SQL secret body"),{code:"PGRST000"}),"/admin/users/private?token=secret");}catch(error){safe=error;}
 assert.match(safe.digest,/^app-error:/);const id=safe.digest.slice(10);assert.match(id,uuid);assert.doesNotMatch(safe.message,/secret|SQL/);assert.equal(logs.length,1);assert.ok(JSON.stringify(logs).includes(id));assert.doesNotMatch(JSON.stringify(logs),/private|token|secret/);
 const {onRequestError}=load("src/instrumentation.ts");const {createReactServerErrorHandler,createHTMLErrorHandler}=require("next/dist/server/app-render/create-error-handler.js");
 const errors=new Map();const rsc=createReactServerErrorHandler(false,false,errors,error=>onRequestError(error,{path:"/admin/users",method:"GET",headers:{}},{routeType:"render",routePath:"/admin/users",routerKind:"App Router"}));assert.equal(rsc(safe),"app-error:"+id);
 const html=createHTMLErrorHandler(false,false,errors,[],()=>{});assert.equal(html(safe),"app-error:"+id);assert.equal(logs.length,1);
 assert.throws(()=>throwReportedRenderError(safe,"/admin/users"),e=>e===safe);assert.equal(logs.length,1);
}));
test("Next redirects and expected notFound control flow do not become incidents",()=>capture(logs=>{
 const navigation=require("next/navigation");const {throwReportedRenderError}=load("src/libs/observability/server-render.ts");
 for(const signal of [()=>navigation.redirect("/login"),()=>navigation.notFound()]){let error;try{signal();}catch(e){error=e;}assert.throws(()=>throwReportedRenderError(error,"/admin"),e=>e===error);}assert.equal(logs.length,0);
}));
test("API catches infrastructure failures before authorization completes",async()=>{
 const {GET}=load("src/app/api/admin/board-games/route.ts",{
  "@/libs/api/verified-authorization":{authorizeVerifiedRequest:async()=>{throw new Error("private auth database");}},
  "@/libs/auth":{isAdminByUserId:async()=>true},"@/services/board-games/board-games.service":{boardGamesService:{}}
 });let response;capture(()=>{response=GET(new Request("http://localhost/api/admin/board-games"));});const body=await(await response).json();assert.match(body.errorId,uuid);assert.doesNotMatch(JSON.stringify(body),/database|private/);
});
test("real login validation and invalid credentials retain 400 and 401 without incidents",async()=>{
 const {InvalidCredentialsError}=load("src/services/auth/auth.errors.tsx");const {ZodError}=require("zod");let failure;
 const {POST}=load("src/app/api/auth/login/route.ts",{"@/services/auth/auth.service":{authService:{login:async()=>{throw failure;}}},"@/services/auth/auth.errors":{InvalidCredentialsError},"@/libs/auth":{SESSION_COOKIE_NAME:"test"},"@/libs/security/rate-limit":{getRequestIp:()=>"fixture",checkRateLimit:()=>({allowed:true})}});
 for(const [error,status]of [[new ZodError([]),400],[new InvalidCredentialsError(),401]]){failure=error;const response=await POST(new Request("http://localhost/api/auth/login",{method:"POST",body:"{}"}));const body=await response.json();assert.equal(response.status,status);assert.equal(body.errorId,undefined);}
});
test("provider failure keeps safe 503 and server reference",async()=>{
 const {TransactionalEmailDeliveryError}=load("src/libs/email/transactional-email.ts");const failure=new TransactionalEmailDeliveryError();failure.body="BREVO_API_KEY=private";
 const {POST}=load("src/app/api/auth/email-verification/resend/route.ts",{"@/libs/auth":{getCurrentUser:async()=>({id:"fixture"})},"@/libs/email/transactional-email":{TransactionalEmailDeliveryError},"@/services/email-verification/email-verification.service":{emailVerificationService:{request:async()=>{throw failure;}}}});
 const response=await POST();const body=await response.json();assert.equal(response.status,503);assert.match(body.errorId,uuid);assert.doesNotMatch(JSON.stringify(body),/BREVO|private|body/);
});
test("verification confirmation failure redirects to safe support page without token in URL",async()=>{
 const {POST}=load("src/app/api/auth/email-verification/confirm/route.ts",{"@/services/email-verification/email-verification.service":{emailVerificationService:{verify:async()=>{throw Error("private verification token");}}}});
 const form=new FormData();form.set("token","private-token");const response=await POST(new Request("http://localhost/api/auth/email-verification/confirm?token=private-token",{method:"POST",body:form}));assert.equal(response.status,303);const href=new URL(response.headers.get("location"));assert.equal(href.pathname,"/verify-email");assert.equal(href.searchParams.get("result"),"error");assert.match(href.searchParams.get("errorId"),uuid);assert.doesNotMatch(href.href,/private|token=/);
});
test("FormFeedback retains copy block for API reference strings and none for ordinary conflict",()=>{
 const react=require("react"),render=require("react-dom/server").renderToStaticMarkup;const {FormFeedback}=load("src/components/FormFeedback.tsx");const {errorMessageWithReference}=load("src/libs/observability/reference.ts");const id=crypto.randomUUID();const html=render(react.createElement(FormFeedback,{error:errorMessageWithReference("操作失敗",id)}));assert.ok(html.includes(id));assert.match(html,/複製追蹤碼/);assert.doesNotMatch(render(react.createElement(FormFeedback,{error:"社產編號已存在"})),/複製追蹤碼|錯誤追蹤碼/);
});
