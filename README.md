# cyber_buddy_web_bot

# 🛡️ CyberBuddy

### Understand. Investigate. Protect.

CyberBuddy is an AI-powered cybersecurity assistant designed to help users understand security concepts, investigate potential threats, assess vulnerabilities, and improve defensive security practices.

The project is being developed as a cybersecurity-focused SaaS application using Cloudflare Workers, Groq AI, and Cloudflare D1.

---

## 🎯 Project Vision

The goal of CyberBuddy is to build an intelligent cybersecurity assistant that makes security analysis and investigation more accessible.

CyberBuddy aims to help users:

- Understand cybersecurity concepts and vulnerabilities.
- Analyze OWASP API Security risks.
- Understand and investigate potential cyber threats.
- Prepare defensive incident-response strategies.
- Review security designs and identify weaknesses.
- Learn about AI and LLM application security.
- Understand prompt injection and API security.
- Receive practical security recommendations.

---

## ⚙️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Code Editor | Visual Studio Code |
| Backend | Cloudflare Workers |
| AI Provider | Groq API |
| AI Model | openai/gpt-oss-20b |
| Database | Cloudflare D1 (planned/integration in progress) |
| Authentication | Username + 6-digit PIN (planned/integration in progress) |
| Version Control | Git & GitHub |
| Hosting | GitHub Pages / Cloudflare |

---

## 🏗️ System Architecture

```text
             USER
               |
               v
       CYBERBUDDY FRONTEND
         HTML / CSS / JS
               |
               v
       CLOUDFLARE WORKER API
               |
        +------+------+
        |             |
        v             v
   CLOUDFLARE D1    GROQ API
   (User Data)        |
        |             v
        |          AI MODEL
        |             |
        +------<------+
               |
               v
         AI RESPONSE
               |
               v
             USER
