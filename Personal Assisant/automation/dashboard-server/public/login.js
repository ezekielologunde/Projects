document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  const err = document.getElementById("err");
  const btn = document.getElementById("submitBtn");
  err.textContent = "";
  btn.disabled = true;
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (res.ok) {
    document.getElementById("splash").classList.add("on");
    setTimeout(() => { window.location.href = "/"; }, 450);
  } else {
    btn.disabled = false;
    err.textContent = "wrong password";
    document.getElementById("password").value = "";
    document.getElementById("password").focus();
  }
});
