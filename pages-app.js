import { createTower } from "./tower3d.js";
const $ = (id) => document.getElementById(id);
const nf = new Intl.NumberFormat("pt-BR", {minimumFractionDigits:1, maximumFractionDigits:1});
const fmt = (v) => nf.format(Number(v));
const names = ["Desligado", "Normal", "Máxima"];
const modes = ["LOCAL", "REMOTO", "MANUAL"];
let mode = 0, state = 0, temp = 18, manualPct = 0, fanPct = 0, pwm = 0, rpm = 0;
let tower = null, samples = [], alarms = new Set(), autoPhase = 0;
try { tower = createTower($("scene3d")); window.torre3d = tower; }
catch (e) { $("scene3d").textContent = `Modelo 3D indisponível: ${e.message}`; }
function eventLog(msg, cls="info") {
  const log=$("log"); log.querySelector(".empty")?.remove();
  const li=document.createElement("li"); li.className=cls;
  const tm=document.createElement("time"); tm.textContent=new Date().toLocaleTimeString("pt-BR");
  const sp=document.createElement("span"); sp.textContent=msg; li.append(tm,sp); log.prepend(li);
  while(log.children.length>250) log.lastChild.remove();
}
function toast(title,msg,kind="info") {
  const host=$("toasts"); if(!host) return;
  const node=document.createElement("div"); node.className=`toast ${kind}`; node.setAttribute("role",kind==="alarm"?"alert":"status");
  const b=document.createElement("b"); b.textContent=title;
  const p=document.createElement("p"); p.textContent=msg;
  const x=document.createElement("button"); x.className="icon-btn sm x"; x.textContent="×"; x.setAttribute("aria-label","Fechar aviso"); x.onclick=()=>node.remove();
  node.append(b,p,x); host.prepend(node); setTimeout(()=>node.remove(),9000);
}
function applyMode(next) {
  mode=next;
  document.querySelectorAll("#modeSeg button").forEach(b=>{
    const active=b.dataset.mode===modes[mode]; b.classList.toggle("active",active); b.setAttribute("aria-checked",String(active));
  });
  document.querySelectorAll(".pane[data-pane]").forEach(p=>p.hidden=p.dataset.pane!==modes[mode]);
  $("ctlSim").hidden = mode!==0;
  $("kMode").textContent=["Local","Remoto","Manual"][mode];
  $("kModeSub").textContent=["Temperatura simulada pelo potenciômetro","Temperatura definida nesta tela","Percentual da ventoinha definido nesta tela"][mode];
  eventLog(`Modo alterado para ${["Local","Remoto","Manual"][mode]}.`);
  render();
}
function calculate() {
  if(mode===2) {
    pwm=Math.floor(Math.max(0,Math.min(100,manualPct))*255/100);
    state=pwm===0?0:(pwm>=255?2:1);
  } else {
    if(state===0 && temp>=20) state=1;
    else if(state===1 && temp<18) state=0;
    else if(state===1 && temp>=35) state=2;
    else if(state===2 && temp<=33) state=1;
    if(state===0) pwm=0;
    else if(state===1) pwm=Math.max(191,Math.min(255,191+Math.floor((Math.floor(temp*10)-200)*64/150)));
    else pwm=255;
  }
  fanPct=Math.floor((pwm*100+127)/255);
  rpm=Math.floor(pwm*3000/255);
}
function setAlarm(id,active,title,msg) {
  const was=alarms.has(id);
  if(active&&!was){alarms.add(id);eventLog(`Alarme: ${title}. ${msg}`,"alarm");toast(title,msg,"alarm");}
  if(!active&&was){alarms.delete(id);eventLog(`${title} normalizada.`,"ok");}
}
function render() {
  calculate();
  $("linkPill").className="pill sim"; $("linkPill").querySelector("span").textContent="Demonstração web · Simulador";
  $("kTemp").textContent=fmt(temp); $("kTempBar").style.width=`${Math.min(100,temp)}%`;
  $("kTempBar").className="tbar-fill"+(temp>=35?" hot":temp<20?" cool":"");
  $("kPct").textContent=fanPct; $("kPctBar").style.width=`${fanPct}%`; $("kPwm").textContent=pwm;
  $("kRpm").textContent=rpm.toLocaleString("pt-BR"); $("kRpmBar").style.width=`${rpm/30}%`;
  $("kDot").className=`sdot s${state}`; $("kState").textContent=names[state];
  $("kStateSub").textContent=mode===2?"Saída definida no modo manual":state===0?"Liga quando atingir 20 °C":state===1?"LED verde · PWM proporcional a partir de 75%":"LED vermelho · rotação máxima";
  $("potVal").textContent=fmt(temp); $("simPotVal").textContent=fmt(temp); $("spTempVal").textContent=fmt($("spTemp").value); $("spFanVal").textContent=$("spFan").value;
  $("ledR").classList.toggle("on",state===2); $("ledA").classList.toggle("on",state===0); $("ledG").classList.toggle("on",state===1);
  $("lcd").textContent=`T:${temp.toFixed(1).padStart(5," ")}°C ${modes[mode]}\nPWM:${String(fanPct).padStart(3," ")}% ${["DESLIG.","NORMAL ","MAXIMA "][state]}`;
  tower?.update({temp,pct:fanPct,estado:state,online:true});
  $("bellCount").hidden=alarms.size===0; $("bellCount").textContent=alarms.size; $("btnBell").classList.toggle("ringing",alarms.size>0);
  setAlarm("alta",temp>=35,"Temperatura alta",`${fmt(temp)} °C. Ventoinha em ${fanPct}%.`);
  setAlarm("crit",temp>=60,"Temperatura crítica",`${fmt(temp)} °C. Verifique o processo simulado.`);
  const now=Date.now()/1000; samples.push({t:now,temp,pct:fanPct,pwm,rpm,estado:state,modo:mode,pot:temp,sim:true}); if(samples.length>5000)samples.shift(); drawChart();
}
// Controles de modo, setpoints e atalhos.
document.querySelectorAll("#modeSeg button").forEach(b=>{
  b.onclick=()=>applyMode(modes.indexOf(b.dataset.mode));
  b.addEventListener("keydown",e=>{if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;e.preventDefault();const a=[...document.querySelectorAll("#modeSeg button")];const i=a.indexOf(b);const j=e.key==="Home"?0:e.key==="End"?a.length-1:(i+(e.key==="ArrowRight"?1:a.length-1))%a.length;a[j].focus();a[j].click();});
});
$("simPot").oninput=()=>{temp=Number($("simPot").value);$("simPotVal").textContent=fmt(temp);$("simAuto").checked=false;render();};
$("spTemp").oninput=()=>{if(mode!==1)applyMode(1);temp=Number($("spTemp").value);render();};
$("spFan").oninput=()=>{if(mode!==2)applyMode(2);manualPct=Number($("spFan").value);render();};
document.querySelectorAll("[data-step]").forEach(b=>b.onclick=()=>{const el=b.dataset.target==="temp"?$("spTemp"):$ ("spFan");el.value=Math.max(Number(el.min),Math.min(Number(el.max),Number(el.value)+Number(b.dataset.step)));el.dispatchEvent(new Event("input"));});
document.querySelectorAll("[data-temp]").forEach(b=>b.onclick=()=>{$("spTemp").value=b.dataset.temp;temp=Number(b.dataset.temp);applyMode(1);});
document.querySelectorAll("[data-fan]").forEach(b=>b.onclick=()=>{$("spFan").value=b.dataset.fan;manualPct=Number(b.dataset.fan);applyMode(2);});
$("simAuto").onchange=()=>{if($("simAuto").checked)toast("Simulação automática","A temperatura vai variar suavemente no modo local.");};
// Tema, relógio e botões 3D.
$("btnTheme").onclick=()=>{const t=document.documentElement.dataset.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=t;try{localStorage.setItem("torre3d.tema",t);}catch{}tower?.setTheme(t);};
$("btnRotate").onclick=()=>{const b=$("btnRotate"),v=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",String(v));tower?.setAutoRotate(v);};
$("btnXray").onclick=()=>{const b=$("btnXray"),v=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",String(v));tower?.setXray(v);};
$("btnView").onclick=()=>tower?.resetView();
$("btnFull").onclick=()=>{const el=document.querySelector(".stage-panel");if(document.fullscreenElement)document.exitFullscreen();else el.requestFullscreen?.();};
$("btnColors").onclick=()=>{const p=$("colorPanel");p.hidden=!p.hidden;};
$("cpClose").onclick=()=>$("colorPanel").hidden=true;
$("cpReset").onclick=()=>{document.querySelectorAll("#cpList input[type=color]").forEach(i=>i.dispatchEvent(new Event("resetcolors")));toast("Cores da torre","As cores padrão serão restauradas ao recarregar a demonstração.");};
const colorDefs=[["Faixa","faixa","#175da5"],["Carcaça","carcaca","#e7e9ed"],["Moldura","moldura","#17191d"],["Tubulação","tubulacao","#a6b4c4"],["Água","agua","#58aeea"],["Enchimento","enchimento","#d88945"]];
colorDefs.forEach(([label,key,color])=>{const l=document.createElement("label");l.textContent=label;const i=document.createElement("input");i.type="color";i.value=color;i.oninput=()=>tower?.setColor(key,i.value);i.addEventListener("resetcolors",()=>{i.value=color;tower?.setColor(key,color);});l.append(i);$("cpList").append(l);});
$("btnBell").onclick=()=>{if(alarms.size){alarms.clear();render();toast("Alarmes reconhecidos","Avisos da simulação reconhecidos.");}else toast("Sem alarmes ativos","Nenhuma condição de alarme no momento.");};
$("btnClearLog").onclick=()=>{$("log").innerHTML='<li class="empty">Nenhum evento registrado.</li>';};
$("btnCsv").onclick=()=>{if(!samples.length)return toast("Sem leituras","Ajuste a temperatura para gerar dados.");const rows=["data_hora;temperatura_C;ventoinha_pct;pwm_0_255;rpm_estimado;estado;modo"];samples.forEach(s=>rows.push([new Date(s.t*1000).toLocaleString("pt-BR"),fmt(s.temp),s.pct,s.pwm,s.rpm,names[s.estado],modes[s.modo]].join(";")));const blob=new Blob(["\uFEFF"+rows.join("\r\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="torre_scada_demo.csv";a.click();URL.revokeObjectURL(a.href);toast("CSV exportado",`${samples.length} leituras simuladas.`);};
// Tendência simples: duas curvas com escala 0–100.
function drawChart(){const c=$("chart"),w=c.clientWidth,h=c.clientHeight;if(!w||!h)return;const dpr=window.devicePixelRatio||1;c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);const g=c.getContext("2d");g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);const L=34,R=10,T=8,B=20,pw=w-L-R,ph=h-T-B;const styles=getComputedStyle(document.documentElement);const grid=styles.getPropertyValue("--chart-grid").trim(),ink=styles.getPropertyValue("--ink-3").trim();for(let v=0;v<=100;v+=20){const y=T+ph-v/100*ph;g.strokeStyle=grid;g.beginPath();g.moveTo(L,y);g.lineTo(L+pw,y);g.stroke();g.fillStyle=ink;g.textAlign="right";g.fillText(v,L-5,y+4);}[[20,"--warn"],[35,"--alarm"],[60,"--alarm"]].forEach(([v,k])=>{g.strokeStyle=styles.getPropertyValue(k).trim();g.setLineDash([4,4]);const y=T+ph-v/100*ph;g.beginPath();g.moveTo(L,y);g.lineTo(L+pw,y);g.stroke();});g.setLineDash([]);const pts=samples.slice(-180);[["temp","--c-temp",2.1],["pct","--c-pwm",1.6]].forEach(([key,css,width])=>{g.strokeStyle=styles.getPropertyValue(css).trim();g.lineWidth=width;g.beginPath();pts.forEach((p,i)=>{const x=L+(i/Math.max(1,pts.length-1))*pw,y=T+ph-Math.max(0,Math.min(100,p[key]))/100*ph;i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();});}
window.addEventListener("resize",drawChart);
setInterval(()=>{$("clock").textContent=new Date().toLocaleTimeString("pt-BR");if(mode===0&&$("simAuto").checked){autoPhase+=0.025;temp=+(18+19*(0.5+0.5*Math.sin(autoPhase))).toFixed(1);$("simPot").value=temp;}render();},500);
$("hwMeta").textContent="Simulação local no navegador";
applyMode(0);temp=18;$("simPot").value=18;render();eventLog("Demonstração iniciada. Controles locais, remotos e manuais estão simulados.");
