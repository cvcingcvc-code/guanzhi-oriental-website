/* =============================================================
   观止东方 · JS
   ============================================================= */
(function(){
  'use strict';
  var header=document.getElementById('header'),
      nav=document.getElementById('navLinks'),
      toggle=document.getElementById('navToggle'),
      links=nav.querySelectorAll('.nav-link');

  toggle.addEventListener('click',function(){
    var o=nav.classList.toggle('open');
    toggle.classList.toggle('on');
    toggle.setAttribute('aria-expanded',o);
    document.body.style.overflow=o?'hidden':'';
  });
  links.forEach(function(l){
    l.addEventListener('click',function(){
      nav.classList.remove('open');toggle.classList.remove('on');
      toggle.setAttribute('aria-expanded','false');document.body.style.overflow='';
    });
  });

  function onScroll(){
    var y=window.pageYOffset||document.documentElement.scrollTop;
    header.classList.toggle('scrolled',y>80);
    var cur='';
    document.querySelectorAll('section[id]').forEach(function(s){if(y>=s.offsetTop-160)cur=s.getAttribute('id');});
    links.forEach(function(l){l.classList.toggle('active',l.getAttribute('href')==='#'+cur);});
  }
  var tick=false;
  window.addEventListener('scroll',function(){if(!tick){requestAnimationFrame(function(){onScroll();tick=false;});tick=true;}});
  onScroll();

  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      var el=e.target;
      if(el.classList.contains('stagger')){Array.from(el.children).forEach(function(c,i){setTimeout(function(){c.classList.add('on');},i*90);});}
      el.classList.add('on');obs.unobserve(el);
    });
  },{threshold:.04,rootMargin:'0px 0px -50px 0px'});
  document.querySelectorAll('.reveal,.stagger').forEach(function(el){obs.observe(el);});

  document.querySelectorAll('a[href^="#"]').forEach(function(a){
    a.addEventListener('click',function(e){
      var id=this.getAttribute('href');if(id==='#')return;
      var t=document.querySelector(id);if(!t)return;
      if(!('scrollBehavior' in document.documentElement.style)){
        e.preventDefault();
        var s=window.pageYOffset,d=t.offsetTop-80,dist=d-s,t0=null;
        function step(ts){if(!t0)t0=ts;var p=Math.min((ts-t0)/650,1),ease=p===1?1:1-Math.pow(2,-10*p);window.scrollTo(0,s+dist*ease);if(p<1)requestAnimationFrame(step);}
        requestAnimationFrame(step);
      }
    });
  });

  var form=document.querySelector('form');
  if(form){
    var feedback=document.getElementById('formFeedback');
    var fields=['name','org','email'];
    var rules={name:{required:true,min:2,label:'姓名 / Name'},org:{required:false,label:'机构 / Organization'},email:{required:true,pattern:/^[^\s@]+@[^\s@]+\.[^\s@]+$/,label:'邮箱 / Email'}};

    function showError(field,msg){
      var el=document.getElementById(field);
      if(!el)return;
      var parent=el.closest('.field');
      if(!parent)return;
      parent.classList.add('error');parent.classList.remove('success');
      var err=parent.querySelector('.error-msg');
      if(!err){err=document.createElement('span');err.className='error-msg';parent.appendChild(err);}
      err.textContent=msg;
    }
    function clearError(field){
      var el=document.getElementById(field);
      if(!el)return;
      var parent=el.closest('.field');
      if(!parent)return;
      parent.classList.remove('error');
      var err=parent.querySelector('.error-msg');
      if(err)err.textContent='';
    }
    function showFeedback(type,msg){
      if(!feedback)return;
      feedback.className='form-feedback show '+type;
      feedback.textContent=msg;
    }
    function hideFeedback(){
      if(!feedback)return;
      feedback.className='form-feedback';
      feedback.textContent='';
    }

    fields.forEach(function(id){
      var el=document.getElementById(id);
      if(!el)return;
      el.addEventListener('blur',function(){
        var r=rules[id];
        if(!r)return;
        var v=el.value.trim();
        if(r.required&&!v){showError(id,r.label+' 为必填项 / required');}
        else if(r.min&&v.length<r.min){showError(id,r.label+' 至少 '+r.min+' 个字符');}
        else if(r.pattern&&!r.pattern.test(v)){showError(id,'请填写有效的邮箱地址');}
        else{clearError(id);el.closest('.field').classList.add('success');}
      });
      el.addEventListener('input',function(){
        if(el.closest('.field').classList.contains('error')){clearError(id);hideFeedback();}
      });
    });

    form.addEventListener('submit',function(e){
      e.preventDefault();
      var ok=true;
      fields.forEach(function(id){
        var el=document.getElementById(id);
        if(!el)return;
        var r=rules[id];
        if(!r)return;
        var v=el.value.trim();
        if(r.required&&!v){showError(id,r.label+' 为必填项 / required');ok=false;}
        else if(r.min&&v.length<r.min){showError(id,r.label+' 至少 '+r.min+' 个字符');ok=false;}
        else if(r.pattern&&!r.pattern.test(v)){showError(id,'请填写有效的邮箱地址');ok=false;}
      });
      if(!ok){showFeedback('error','请检查并修正上方标红的字段。');return;}
      var btn=form.querySelector('button[type="submit"]');
      if(btn){btn.disabled=true;btn.textContent='发送中…';}
      var data=new FormData(form);
      fetch(form.action,{method:'POST',body:data})
        .then(function(r){return r.json().then(function(j){return {ok:r.ok,status:r.status,body:j};});})
        .then(function(r){
          if(r.ok&&r.body.ok){
            showFeedback('success',r.body.message||'感谢留言！我们会在 2–3 个工作日内回复。\nThank you! We will reply within 2–3 business days.');
            form.reset();
            document.querySelectorAll('.field.success,.field.error').forEach(function(f){f.classList.remove('success','error');});
          }else{
            var msg=(r.body&&r.body.errors)?r.body.errors.join('\n'):'发送失败，请稍后重试或直接发送邮件至 contact@guanzhi-dongfang.com';
            showFeedback('error',msg);
          }
        })
        .catch(function(){
          showFeedback('error','网络异常，发送失败。请稍后重试，或直接发送邮件至 contact@guanzhi-dongfang.com');
        })
        .then(function(){
          if(btn){btn.disabled=false;btn.textContent='发送留言';}
        });
    });
  }
})();
