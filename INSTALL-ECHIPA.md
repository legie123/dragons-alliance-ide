# 🐉 Dragons Alliance IDE — Kit de instalare (echipă)

IDE nativ pentru Mac. Alege **una** din cele 2 metode.

> ⚠️ Doar **Mac cu Apple Silicon** (M1/M2/M3/M4). Nu merge pe Windows/Intel.

---

## ✅ Metoda 1 — Descarci aplicația gata făcută (recomandat, cel mai simplu)

1. Descarcă `.dmg`:
   👉 https://github.com/legie123/dragons-alliance-ide/releases/latest
2. Deschide fișierul `.dmg` → trage **Dragons Alliance IDE** în folderul **Applications**.
3. Prima dată: **click-dreapta pe app → Open** (o singură dată, apoi mereu normal).
   *Dacă Mac zice că nu poate verifica dezvoltatorul → tot click-dreapta → Open → Open.*
4. La prima pornire, aplicația îți zice singură ce mai ai de instalat (**Kit Setup**).

---

## 💻 Metoda 2 — Din cod sursă (pentru cine vrea ultima versiune)

Deschide **Terminal** și pastează linia asta (una singură):

```bash
git clone https://github.com/legie123/dragons-alliance-ide.git && cd dragons-alliance-ide && npm install && npm run start
```

**Ai nevoie întâi de** (o singură dată pe Mac nou):
- **Xcode tools:** `xcode-select --install`
- **Node.js 22:** descarcă de la https://nodejs.org (versiunea LTS)

---

## 🔧 Kit Setup — ce se instalează la prima pornire

Aplicația detectează singură ce ai și ce lipsește. Pentru putere maximă:

| Tool | La ce e | Cum instalezi |
|------|---------|---------------|
| **Claude Code** | Cloud / Agenți / GODMODE | `npm i -g @anthropic-ai/claude-code` |
| **RuFlo** | echipe de agenți AI | `npm i -g @ruvnet/ruflo` |
| **Graphify** | analiză cod live | `pip install graphifyy==0.4.23` |
| **Obsidian** | memorie / notițe | https://obsidian.md/download |
| **Google APIs** *(opțional)* | Drive / Calendar | din aplicație, butonul de sign-in |

Aplicația îți copiază comenzile astea direct — apeși un buton, nu tastezi nimic.

---

## ❓ Probleme des întâlnite

- **„Nu se poate deschide, dezvoltator neidentificat"** → click-dreapta pe app → **Open**.
- **Terminalele nu pornesc** → în Terminal, în folderul aplicației: `npm run postinstall`
- **Puterile apar stinse** → instalează tool-urile din tabel, apoi apasă **Recheck** în Kit Setup.

---

**Link-uri:**
- 📦 Descărcare: https://github.com/legie123/dragons-alliance-ide/releases/latest
- 📖 Cod + ghid: https://github.com/legie123/dragons-alliance-ide

Orice blocaj → scrie în grup. 🐉
