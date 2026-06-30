# UNPUN Formula Board Design

## Product

Internal single-page dashboard for formula-development work at UNPUN INDUSTRY. The first screen is the project tracker, not a landing page.

## Principles

- Single-page dashboard: one project per card, sorted by urgency.
- Mobile shows compact cards first; details are inside the same card.
- Stage values are fixed so everyone tracks work the same way.
- Role flow: public customer phone lookup, CS/RD/MM/MD staff roles, RD logs with image, MM/MD can correct or delete project records, MD approves project end.
- Thai labels first.
- Status and deadlines must scan faster than decorative content.
- Local-first storage until the team needs shared multi-user sync.

## Tokens

```css
:root {
  --bg: #fbfbfa;
  --surface: #ffffff;
  --surface-2: #f7f7f4;
  --text: #08090b;
  --muted: #77756f;
  --line: #e7e5df;
  --primary: #3168b8;
  --primary-2: #eaf2ff;
  --amber: #f7d856;
  --red: #fa6b6d;
  --orange: #ffad67;
  --purple: #cf75b9;
  --green: #2aa463;
  --radius: 14px;
}
```

## Components

- Front page: login-gated board plus one action button named `จัดการ`.
- Manage dialog: project details, customer/user database, approvals.
- Card: project ID, project name, client name only; brief is readable only inside details by owner customer, assigned RD, Manager, or MD.
- Brief details render as labeled sections: MOQ, budget, product size, texture, scent, color, extracts, avoid list, concept, extra notes.
- Controls: native inputs, selects, range slider, and icon-like text buttons only where the command is clear.

## Workflow Stages

1. รับโจทย์
2. พัฒนาสูตร
3. รออนุมัติ
4. ส่งมอบ
5. สิ้นสุดโปรเจค
