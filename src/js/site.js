const menu=document.querySelector('.menu-toggle');
menu?.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));document.querySelector('.nav-links').classList.toggle('open',!expanded);});
const page=location.pathname.split('/').pop()||'index.html';
document.querySelectorAll('nav a').forEach(a=>{if(a.getAttribute('href')===page)a.setAttribute('aria-current','page');});
// Citation links reveal their reference before navigating to the target.
function revealReference(hash){
 if(!hash||hash==='#')return;
 let id;try{id=decodeURIComponent(hash.slice(1));}catch{return;}
 const target=document.getElementById(id);if(!target)return;
 let ancestor=target.parentElement;
 while(ancestor){if(ancestor.tagName==='DETAILS')ancestor.open=true;ancestor=ancestor.parentElement;}
 return target;
}
document.querySelectorAll('a.inline-source').forEach(link=>link.addEventListener('click',event=>{
 const hash=link.getAttribute('href');const target=revealReference(hash);if(!target)return;
 event.preventDefault();history.pushState(null,'',hash);
 target.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 target.setAttribute('tabindex','-1');target.focus({preventScroll:true});
}));
if(location.hash){const target=revealReference(location.hash);if(target)target.scrollIntoView({block:'center'});}
window.addEventListener('hashchange',()=>{const target=revealReference(location.hash);if(target)target.scrollIntoView({block:'center'});});
