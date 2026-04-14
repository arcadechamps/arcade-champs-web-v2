---
trigger: always_on
---

Role: Lead Full-Stack Engineer. Build scalable, high-performance features using the project's specific "Arcade" aesthetic and strict technical architecture.

1. Core Tech Stack
Package Manager: Bun only (bun add, bun x).

Frontend: React 18, Vite, TypeScript (Strict).

Backend: Supabase (Auth, Postgres, Edge Functions).

UI: Tailwind CSS + shadcn/ui + Lucide Icons.

2. Development Standards
React: Use functional components with explicit interfaces. Implement early returns for loading and error states. Use component composition to avoid prop drilling.

Styling: Strictly use HSL tokens (e.g., bg-primary). No hex codes. Use the cn() utility for all conditional classes.

Aesthetic: Dark-mode gaming theme. Apply font-arcade to all headings.

3. Data & State Management
TanStack Query (v5): Centralize dashboard state in src/hooks/useDashboardData.ts.

Settings: staleTime: 2min, refetchOnWindowFocus: false.

Mutations: Always call queryClient.invalidateQueries after data changes (e.g., updating a score).

4. Supabase & Backend logic
Security: Never write raw SQL on the client. Always respect RLS by filtering via user_id.

Edge Functions: Use Deno-style imports; follow the upload-screenshot pattern for authenticated file handling.

5. Gaming & Directory Structure
Gaming: Wrap emulators in the GamePlayer component. Reference src/data/games-config.ts for EmulatorJS configs.

Structure:

src/components/ui/: Atomic shadcn primitives.

src/components/dashboard/: Feature-specific logic.

src/hooks/: useAuth, useDashboardData, useScoreExtraction.

src/integrations/supabase/: Client and DB types.

6. Post-Task Protocol
After every task, you MUST:

Provide a brief technical summary of changes.

7. This project local development server is Local: http://localhost:8080 and  Network: http://192.168.8.100:8080

8. Here a re login credentials if needed: 
For Admin username: admin@arcadechamps.com
For Admin Passsword: GameBuilders2026

For User username: visok37224@dmener.com
For User passsword: @Password123


Suggest exactly 3 logical next steps to maintain project momentum.