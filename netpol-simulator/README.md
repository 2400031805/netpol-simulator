markdown
# Kubernetes NetworkPolicy Simulator

A web app that simulates pod-to-pod isolation in a three-tier app
(frontend → backend → database).

**Live demo:** https://2400031805.github.io/netpol-simulator/netpol-simulator/

## Features
- Toggle policies: default-deny, allow-frontend-to-backend, allow-backend-to-database
- Test a single connection or run all tests
- Shows ✅ Allowed or ❌ Blocked

## Run locally (with backend)
npm install
node server.js
Open http://localhost:3000

## Tech
HTML, CSS, JavaScript, Node.js, Express
