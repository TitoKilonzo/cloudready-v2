import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createClient } from '@libsql/client';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app=express();const PORT=Number(process.env.PORT||3001);const isProduction=process.env.NODE_ENV==='production';const JWT_SECRET=process.env.JWT_SECRET||(isProduction?'':'local_development_secret_change_me');if(!JWT_SECRET)throw new Error('JWT_SECRET must be configured in production.');
app.use(cors({origin:(process.env.CLIENT_ORIGIN||'http://localhost:5173').split(',').map(x=>x.trim()),credentials:true}));app.use(express.json({limit:'1mb'}));
const db=createClient({url:process.env.TURSO_DATABASE_URL||'file:./cloudready.db',authToken:process.env.TURSO_AUTH_TOKEN||undefined});
async function init(){await db.batch([
`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
`CREATE TABLE IF NOT EXISTS quiz_attempts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL, topic TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))`,
`CREATE TABLE IF NOT EXISTS study_plans (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE, target_date TEXT, daily_minutes INTEGER NOT NULL DEFAULT 45, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id))`,
`CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, category TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`
],'write');
const demoEnabled=process.env.ENABLE_DEMO_ACCOUNT==='true'||(!isProduction&&process.env.ENABLE_DEMO_ACCOUNT!=='false');if(demoEnabled){const demoEmail=String(process.env.DEMO_ACCOUNT_EMAIL||'').trim().toLowerCase();const demoPassword=String(process.env.DEMO_ACCOUNT_PASSWORD||'');if(demoEmail&&demoPassword){const existing=await db.execute({sql:'SELECT id FROM users WHERE email = ?',args:[demoEmail]});if(!existing.rows.length){const hash=await bcrypt.hash(demoPassword,12);await db.execute({sql:'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',args:['Demo Learner',demoEmail,hash]});}}else{console.warn('Demo account seeding skipped because DEMO_ACCOUNT_EMAIL and DEMO_ACCOUNT_PASSWORD are not configured.');}}}
function tokenFor(user){return jwt.sign({sub:String(user.id),email:user.email},JWT_SECRET,{expiresIn:'7d'});}function publicUser(row){return{id:Number(row.id),name:row.name,email:row.email};}
function auth(req,res,next){const header=req.headers.authorization||'';const token=header.startsWith('Bearer ')?header.slice(7):'';if(!token)return res.status(401).json({error:'Sign in to access this feature.'});try{req.claims=jwt.verify(token,JWT_SECRET);next();}catch{return res.status(401).json({error:'Your session has expired. Please sign in again.'});}}
app.get('/api/health',async(_req,res)=>{try{await db.execute('SELECT 1');res.json({status:'ok',service:'CloudReady API',database:'connected'});}catch{res.status(503).json({status:'error',service:'CloudReady API',database:'unavailable'});}});
app.post('/api/auth/signup',async(req,res)=>{try{const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');if(name.length<2||name.length>80)return res.status(400).json({error:'Enter a name between 2 and 80 characters.'});if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Enter a valid email address.'});if(password.length<8||password.length>128)return res.status(400).json({error:'Password must be at least 8 characters.'});const hash=await bcrypt.hash(password,12);const result=await db.execute({sql:'INSERT INTO users (name,email,password_hash) VALUES (?,?,?)',args:[name,email,hash]});const user={id:Number(result.lastInsertRowid),name,email};res.status(201).json({user,token:tokenFor(user)});}catch(e){if(String(e.message).includes('UNIQUE'))return res.status(409).json({error:'An account with this email already exists.'});res.status(500).json({error:'Could not create your account.'});}});
app.post('/api/auth/signin',async(req,res)=>{try{const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');const found=await db.execute({sql:'SELECT id,name,email,password_hash FROM users WHERE email = ?',args:[email]});const row=found.rows[0];if(!row||!(await bcrypt.compare(password,row.password_hash)))return res.status(401).json({error:'Email or password is incorrect.'});const user=publicUser(row);res.json({user,token:tokenFor(user)});}catch{res.status(500).json({error:'Could not sign in right now.'});}});
app.get('/api/me',auth,async(req,res)=>{const found=await db.execute({sql:'SELECT id,name,email FROM users WHERE id = ?',args:[Number(req.claims.sub)]});if(!found.rows[0])return res.status(404).json({error:'Account not found.'});res.json({user:publicUser(found.rows[0])});});
app.get('/api/progress',auth,async(req,res)=>{const result=await db.execute({sql:'SELECT id,score,total,topic,created_at FROM quiz_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 50',args:[Number(req.claims.sub)]});res.json({attempts:result.rows});});
app.post('/api/progress',auth,async(req,res)=>{const score=Number(req.body.score),total=Number(req.body.total),topic=String(req.body.topic||'Mixed practice').slice(0,120);if(!Number.isInteger(score)||!Number.isInteger(total)||total<1||score<0||score>total||total>200)return res.status(400).json({error:'Invalid practice result.'});await db.execute({sql:'INSERT INTO quiz_attempts (user_id,score,total,topic) VALUES (?,?,?,?)',args:[Number(req.claims.sub),score,total,topic]});res.status(201).json({saved:true});});
app.get('/api/plan',auth,async(req,res)=>{const result=await db.execute({sql:'SELECT target_date,daily_minutes,updated_at FROM study_plans WHERE user_id = ?',args:[Number(req.claims.sub)]});res.json({plan:result.rows[0]||null});});
app.put('/api/plan',auth,async(req,res)=>{const date=String(req.body.targetDate||'').slice(0,10),minutes=Number(req.body.dailyMinutes);if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))return res.status(400).json({error:'Enter a valid target date.'});if(![20,45,60,90].includes(minutes))return res.status(400).json({error:'Choose a supported daily study duration.'});await db.execute({sql:'INSERT INTO study_plans (user_id,target_date,daily_minutes,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET target_date=excluded.target_date,daily_minutes=excluded.daily_minutes,updated_at=CURRENT_TIMESTAMP',args:[Number(req.claims.sub),date||null,minutes]});res.json({saved:true});});
app.post('/api/feedback',async(req,res)=>{const name=String(req.body.name||'').trim(),email=String(req.body.email||'').trim(),category=String(req.body.category||'General feedback').slice(0,80),message=String(req.body.message||'').trim();if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||message.length<5||message.length>5000)return res.status(400).json({error:'Check the name, email, and message fields.'});await db.execute({sql:'INSERT INTO feedback (name,email,category,message) VALUES (?,?,?,?)',args:[name,email,category,message]});res.status(201).json({saved:true});});
const groq=process.env.GROQ_API_KEY?new OpenAI({apiKey:process.env.GROQ_API_KEY,baseURL:'https://api.groq.com/openai/v1'}):null;
const groqModel=process.env.GROQ_MODEL||'openai/gpt-oss-120b';
app.post('/api/study/:mode',async(req,res)=>{
 const mode=req.params.mode;
 if(!['summary','research'].includes(mode))return res.status(404).json({error:'Unknown study task.'});
 const topic=String(req.body.topic||'').trim().slice(0,300),content=String(req.body.content||'').trim().slice(0,12000);
 if(content.length<10)return res.status(400).json({error:'Add at least a few sentences or a specific question.'});
 if(!groq)return res.status(503).json({error:'The study assistant is not configured yet. Set GROQ_API_KEY in the server environment and restart the API.'});
 const system=mode==='summary'
  ?'You are a careful study assistant for beginner cloud learners. Summarize only the supplied material. Use clear headings, key points, short definitions, and 3 review questions. Do not invent facts or claim official certification guidance. If a statement is unclear, say so.'
  :'You are a careful research assistant for beginner cloud learners. Provide a structured overview of the requested cloud topic using your general knowledge. Separate established facts from suggestions, mention when details may change, suggest search terms and authoritative documentation sources to verify, and never invent URLs or citations. This response is not live web browsing.';
 const user=mode==='summary'
  ?`Summarize these study notes for revision.\n\n${content}`
  :`Research topic: ${topic||'Cloud fundamentals'}\nLearner context and specific question: ${content}\nProvide a beginner friendly overview, key terms, a practical example, common misunderstandings, and questions for further study.`;
 try{
   const response=await groq.chat.completions.create({model:groqModel,messages:[{role:'system',content:system},{role:'user',content:user}],temperature:0.3,max_tokens:1400});
  res.json({result:response.choices[0]?.message?.content||'No result was returned.'});
 }catch(error){
   const status=Number(error.status)||0,code=String(error.code||'').toLowerCase(),message=String(error.message||'').toLowerCase();
   console.error('Study assistant error:',{status,code});
   if(status===401||status===403)return res.status(502).json({error:'Groq rejected the configured API key or account permissions. Verify GROQ_API_KEY and Groq account access.'});
   if(status===400||status===404){
    if(code.includes('model')||message.includes('model')||message.includes('decommission'))return res.status(502).json({error:`The configured Groq model "${groqModel}" is unavailable. Set GROQ_MODEL to an active model in the server environment and restart the API.`});
    return res.status(502).json({error:'Groq rejected the request. Check the request settings and configured model.'});
   }
   if(status===429)return res.status(502).json({error:'Groq rate or usage limits were reached. Wait and try again, or check your Groq account limits.'});
   if(status>=500)return res.status(502).json({error:'Groq is temporarily unavailable. Please try again shortly.'});
   if(!status)return res.status(502).json({error:'The server could not connect to Groq. Check the server network connection and try again.'});
   res.status(502).json({error:'The study assistant request failed. Check the Groq server configuration and try again.'});
  }
});
app.use((err,req,res,next)=>{if(!req.path.startsWith('/api/'))return next(err);if(res.headersSent)return next(err);const status=Number(err.status)||500;if(status>=500)console.error(`API ${req.method} ${req.path} error:`,err.message);res.status(status).json({error:status>=500?'The server could not complete this request. Please try again.':err.message||'The request is invalid.'});});
const __dirname=path.dirname(fileURLToPath(import.meta.url));const dist=path.resolve(__dirname,'../dist');if(process.env.NODE_ENV==='production'){app.use(express.static(dist));app.get('/{*path}',(req,res)=>res.sendFile(path.join(dist,'index.html')));}
init().then(()=>app.listen(PORT,()=>console.log(`CloudReady API listening on ${PORT}`))).catch(err=>{console.error('Database initialization failed:',err.message);process.exit(1)});
