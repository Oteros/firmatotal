import fs from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const overrides=JSON.parse(await fs.readFile(path.join(root,'content/seo-overrides.json'),'utf8'));
const output=path.resolve(root,process.argv[2]||'dist');
const escapeHtml=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const key=value=>new URL(value,'https://example.invalid').pathname.replace(/\/$/,'')||'/';
const normalized=new Map(Object.entries(overrides).map(([route,data])=>[key(route),data]));
const found=new Set();
async function visit(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())await visit(file);
  else if(entry.isFile()&&entry.name.endsWith('.html')){
   let source=await fs.readFile(file,'utf8');
   const canonical=source.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];
   if(!canonical)continue;
   const route=key(canonical);const override=normalized.get(route);if(!override)continue;
   found.add(route);
   if(override.title){
    source=source.replace(/<title>[\s\S]*?<\/title>/i,`<title>${escapeHtml(override.title)}</title>`);
   }
   source=source.replace(/<meta\b[^>]*>/gi,tag=>{
    const name=tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1];
    const value=override.description&&['description','og:description','twitter:description'].includes(name)?override.description:override.title&&['og:title','twitter:title'].includes(name)?override.title:null;
    return value===null?tag:tag.replace(/content=(?:"[^"]*"|'[^']*')/i,`content="${escapeHtml(value)}"`);
   });
   await fs.writeFile(file,source);
  }
 }
}
await visit(output);
const missing=[...normalized.keys()].filter(route=>!found.has(route));
if(missing.length)throw new Error(`SEO overrides have no generated page: ${missing.join(', ')}`);
console.log(`Applied reviewed metadata to ${found.size} canonical pages.`);
