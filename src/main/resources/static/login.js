'use strict';

(function(){
  const $ = (sel, root=document) => root.querySelector(sel);

  function isEmail(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function isUsername(v){ return /^[A-Za-z0-9_.-]{3,}$/.test(v); }

  function showError(el, msg){ el.textContent = msg || ''; }

  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const form = $('#loginForm');
    const accountEl = $('#account');
    const pwdEl = $('#password');
    const rememberEl = $('#remember');
    const togglePwdBtn = $('#togglePwd');
    const accountErr = $('#accountError');
    const pwdErr = $('#passwordError');
    const submitBtn = $('#submitBtn');
    const formMsg = $('#formMsg');

    // 记住我：预填账户
    try {
      const saved = localStorage.getItem('rememberAccount');
      if (saved) { accountEl.value = saved; rememberEl.checked = true; }
    } catch (_) {}

    // 显示/隐藏密码
    togglePwdBtn.addEventListener('click', () => {
      const isPwd = pwdEl.type === 'password';
      pwdEl.type = isPwd ? 'text' : 'password';
      togglePwdBtn.setAttribute('aria-pressed', String(isPwd));
    });

    function validate(){
      let ok = true;
      const acc = accountEl.value.trim();
      const pwd = pwdEl.value;
      // 账户校验
      if (!acc){ showError(accountErr, '请输入邮箱或用户名'); ok = false; }
      else if (!(isEmail(acc) || isUsername(acc))){ showError(accountErr, '格式不正确：请输入有效邮箱或不少于3位的用户名'); ok = false; }
      else showError(accountErr, '');
      // 密码校验
      if (!pwd){ showError(pwdErr, '请输入密码'); ok = false; }
      else if (pwd.length < 6){ showError(pwdErr, '密码长度不少于 6 位'); ok = false; }
      else showError(pwdErr, '');
      return ok;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      formMsg.textContent = '';
      if (!validate()) return;

      // 记住我
      try {
        if (rememberEl.checked) localStorage.setItem('rememberAccount', accountEl.value.trim());
        else localStorage.removeItem('rememberAccount');
      } catch (_) {}

      // 模拟登录过程
      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '正在登录…';
      formMsg.textContent = '正在校验账户信息…';

      setTimeout(() => {
        formMsg.textContent = '登录成功，正在跳转…';
        // 静态演示跳转到首页
        setTimeout(() => { window.location.href = 'index.html'; }, 500);
      }, 600);
    });
  });
})();

