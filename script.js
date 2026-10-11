


const $ = (id) => document.getElementById(id);

const NS = "network-policy-lab";

const PAIRS = [
  ["frontend", "backend"],
  ["frontend", "database"],
  ["backend", "database"],
  ["test-client", "backend"],
  ["test-client", "database"],
  ["outsider", "backend"]
];

const REPLY = {
  backend: "BACKEND: request received",
  database: "DATABASE: request received",
  frontend: "FRONTEND: request received"
};

let view = "tests";
let customText = null;

function pol() {
  return {
    denyAll: $("denyAll").checked,
    fb: $("fb").checked,
    bd: $("bd").checked,
    ob: $("ob").checked
  };
}

function isAllowed(p, src, dst) {
  const isolated =
    p.denyAll ||
    (dst === "backend" && (p.fb || p.ob)) ||
    (dst === "database" && p.bd);

  if (!isolated) return true;

  if (dst === "backend" && p.fb && src === "frontend") return true;
  if (dst === "backend" && p.ob && src === "outsider") return true;
  if (dst === "database" && p.bd && src === "backend") return true;

  return false;
}

function podName(src) {
  if (src === "frontend") return "deploy/frontend";
  if (src === "backend") return "backend-test";
  return src;
}

function cmd(src, dst) {
  if (src === "outsider") {
    return `$ kubectl exec -n other-ns outsider -- curl -m 5 -s http://${dst}.${NS}`;
  }

  return `$ kubectl exec ${podName(src)} -- curl -m 5 -s http://${dst}`;
}

function outputFor(p, src, dst) {
  return isAllowed(p, src, dst)
    ? (REPLY[dst] || `${dst.toUpperCase()}: request received`)
    : "command terminated with exit code 28\nBLOCKED: connection timed out";
}

function resultsText(p, pairs = PAIRS) {
  let text = "$ kubectl get networkpolicy\n";
  text += "=== SIMULATED CONNECTION TESTS ===\n\n";

  pairs.forEach(([src, dst]) => {
    text += `${cmd(src, dst)}\n`;
    text += `${src} -> ${dst}: `;
    text += isAllowed(p, src, dst) ? "ALLOWED\n" : "BLOCKED\n";
    text += outputFor(p, src, dst) + "\n\n";
  });

  return text.trim();
}

function policiesText(p) {
  const rows = [];

  if (p.denyAll) rows.push(["default-deny-ingress", "<none>"]);
  if (p.fb) rows.push(["allow-frontend-to-backend", "app=backend"]);
  if (p.bd) rows.push(["allow-backend-to-database", "app=database"]);
  if (p.ob) rows.push(["allow-other-namespace-to-backend", "app=backend"]);

  if (!rows.length) {
    return `$ kubectl get networkpolicy\nNo resources found in ${NS} namespace.`;
  }

  return "$ kubectl get networkpolicy\n\nNAME\t\t\t\tPOD-SELECTOR\n" +
    rows.map(([name, selector]) => `${name}\t${selector}`).join("\n");
}

function podsText() {
  return `$ kubectl get pods --show-labels
NAME                         READY  STATUS   LABELS
backend-test                 1/1    Running  app=backend
database                     1/1    Running  app=database
frontend                     1/1    Running  app=frontend
test-client                  1/1    Running  app=test-client
outsider (namespace other-ns) 1/1   Running  (no app label)`;
}

function describeText(p) {
  if (!p.denyAll && !p.fb && !p.bd && !p.ob) {
    return "Select at least one policy to see its simulated description.";
  }

  let text = "";

  if (p.denyAll) {
    text += `$ kubectl describe networkpolicy default-deny-ingress
Namespace: ${NS}
PodSelector: <none>
Policy Types: Ingress

`;
  }

  if (p.fb) {
    text += `$ kubectl describe networkpolicy allow-frontend-to-backend
Namespace: ${NS}
PodSelector: app=backend
Allowed source: app=frontend
Policy Types: Ingress

`;
  }

  if (p.bd) {
    text += `$ kubectl describe networkpolicy allow-backend-to-database
Namespace: ${NS}
PodSelector: app=database
Allowed source: app=backend
Policy Types: Ingress

`;
  }

  if (p.ob) {
    text += `$ kubectl describe networkpolicy allow-other-namespace-to-backend
Namespace: ${NS}
PodSelector: app=backend
Allowed namespace: other-ns
Policy Types: Ingress

`;
  }

  return text.trim();
}

function render() {
  const terminal = $("terminal");
  if (!terminal) return;

  if (customText !== null) {
    terminal.textContent = customText;
    return;
  }

  if (view === "tests") terminal.textContent = resultsText(pol());
  if (view === "policies") terminal.textContent = policiesText(pol());
  if (view === "pods") terminal.textContent = podsText();
  if (view === "describe") terminal.textContent = describeText(pol());
}

function setView(nextView) {
  view = nextView;
  customText = null;

  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === nextView);
  });

  render();
}

function updateTable(p) {
  const table = $("table");
  if (!table) return;

  let html = "<tr><th>Test</th><th>Result</th></tr>";

  PAIRS.forEach(([src, dst]) => {
    const allowed = isAllowed(p, src, dst);

    html += `<tr>
      <td>${src} → ${dst}</td>
      <td class="${allowed ? "ok" : "no"}">
        ${allowed ? "✅ Allowed" : "❌ Blocked"}
      </td>
    </tr>`;
  });

  table.innerHTML = html;
}

function highlight(src, dst) {
  document.querySelectorAll(".pod").forEach((pod) => {
    pod.classList.remove("active");
  });

  $(src)?.classList.add("active");
  $(dst)?.classList.add("active");
}

function runOne() {
  const p = pol();
  const src = $("src").value;
  const dst = $("dst").value;
  const allowed = isAllowed(p, src, dst);

  highlight(src, dst);

  $("result").className = allowed ? "ok" : "no";
  $("result").textContent =
    `${src} → ${dst}: ${allowed ? "✅ ALLOWED" : "❌ BLOCKED"}`;

  customText = `${cmd(src, dst)}\n${outputFor(p, src, dst)}`;

  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.remove("active");
  });

  render();
  updateTable(p);
}

function runAll() {
  customText = null;
  setView("tests");
  updateTable(pol());
}

function setPolicies(options = {}) {
  ["denyAll", "fb", "bd", "ob"].forEach((key) => {
    $(key).checked = !!options[key];
  });
}

["denyAll", "fb", "bd", "ob"].forEach((id) => {
  $(id).addEventListener("change", () => {
    customText = null;
    render();
    updateTable(pol());
  });
});

$("testBtn").addEventListener("click", runOne);
$("allBtn").addEventListener("click", runAll);

$("resetBtn").addEventListener("click", () => {
  setPolicies();
  $("result").textContent = "";
  customText = null;
  updateTable(pol());
  setView("tests");
});

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("uc1").addEventListener("click", () => {
  setPolicies({ denyAll: true, fb: true, bd: true });
  customText =
    "USE CASE: Restrict traffic between namespaces\n\n" +
    `${cmd("outsider", "backend")}\n` +
    `${outputFor(pol(), "outsider", "backend")}\n\n` +
    "The outsider is blocked because no selected policy allows it.";

  updateTable(pol());
  render();
});

$("uc2").addEventListener("click", () => {
  setPolicies({ denyAll: true, fb: true, bd: true });
  customText =
    "USE CASE: Workload isolation\n\n" +
    `${cmd("frontend", "database")}\n` +
    `${outputFor(pol(), "frontend", "database")}\n\n` +
    `${cmd("backend", "database")}\n` +
    `${outputFor(pol(), "backend", "database")}`;

  updateTable(pol());
  render();
});

$("bn1").addEventListener("click", () => {
  customText = `BOTTLENECK: Diagnosing blocked traffic

Exit code 28: request timed out
Exit code 7: connection failed
Exit code 6: DNS lookup failed

Diagnostic commands:
kubectl get networkpolicy
kubectl get pods --show-labels
kubectl describe networkpolicy <name>

These are simulated examples, not live cluster results.`;

  render();
});

$("bn2").addEventListener("click", () => {
  setPolicies({ denyAll: true });
  customText =
    "BOTTLENECK: Default-deny adoption\n\n" +
    resultsText(pol(), [
      ["frontend", "backend"],
      ["backend", "database"]
    ]) +
    "\n\nAdd the required allow policies and rerun the tests.";

  updateTable(pol());
  render();
});

// Show initial simulated results when the page opens.
updateTable(pol());
render();
