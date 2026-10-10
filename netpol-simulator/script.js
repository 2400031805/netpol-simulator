const $ = id => document.getElementById(id);

// Decide if src can reach dst, based on the toggled policies
function isAllowed(src, dst) {
  const denyAll = $("denyAll").checked;
  const fb = $("fb").checked;
  const bd = $("bd").checked;

  // A pod is "selected" by a policy if default-deny exists
  // or an allow policy targets it
  const selected = denyAll ||
    (dst === "backend" && fb) ||
    (dst === "database" && bd);

  if (!selected) return true; // no policy applies, so traffic is open

  // Policies are additive: allowed only if some allow rule matches
  if (dst === "backend" && fb && src === "frontend") return true;
  if (dst === "database" && bd && src === "backend") return true;
  return false;
}

function show(src, dst) {
  document.querySelectorAll(".pod").forEach(p => p.classList.remove("active"));
  $(src).classList.add("active");
  $(dst).classList.add("active");
  const ok = isAllowed(src, dst);
  $("result").className = ok ? "ok" : "no";
  $("result").textContent = `${src} → ${dst}: ${ok ? "✅ ALLOWED" : "❌ BLOCKED"}`;
}

$("testBtn").onclick = () => show($("src").value, $("dst").value);

$("allBtn").onclick = () => {
  const tests = [
    ["frontend", "backend"],
    ["frontend", "database"],
    ["backend", "database"],
    ["test-client", "backend"],
    ["test-client", "database"],
  ];
  let html = "<tr><th>Test</th><th>Result</th></tr>";
  tests.forEach(([s, d]) => {
    const ok = isAllowed(s, d);
    html += `<tr><td>${s} → ${d}</td><td class="${ok ? "ok" : "no"}">${ok ? "✅ Allowed" : "❌ Blocked"}</td></tr>`;
  });
  $("table").innerHTML = html;
};