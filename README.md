## GooseNest

University of Waterloo degree planning and course scheduling app. Features a 3D prerequisite graph, degree template management, and term-based schedule planning.

Built with Next.js, PostgreSQL, Prisma, and Three.js. Uses my [course graph](https://github.com/VedantJoshi1409/UW_Course_Graph) for the graph data.

### Setup

Prerequisites: Node.js 18+, PostgreSQL

1. Install dependencies:
```
npm install
```

2. Create a `.env` file in the project root:
```
DATABASE_URL="postgresql://uw_user:password@localhost:5432/goose_nest"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

3. Create the database and run migrations:
```
createdb goose_nest
npx prisma migrate dev
```

4. Seed the database with UW course data:
```
npx prisma db seed
```

5. Start the dev server:
```
npm run dev
```

The app runs at `http://localhost:3000`. The degree planner and schedule planner work without authentication. Sign in with Google to persist data to the database.
