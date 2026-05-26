# Database Deployment Notes

This application expects PostgreSQL and the `equipment` schema.

Before production deployment, place the actual database migration files or dump in this folder. The current backend only creates the schema in `backend/src/config/db.js`; it does not create every application table.

Recommended options:

1. Export the current working database:

   ```bash
   pg_dump -h SOURCE_HOST -U SOURCE_USER -d SOURCE_DB -Fc -f techtrack.dump
   ```

2. Restore it on the customer server:

   ```bash
   pg_restore -h TARGET_HOST -U TARGET_USER -d TARGET_DB techtrack.dump
   ```

3. Keep future SQL changes as numbered migrations, for example:

   ```text
   database/migrations/001_initial_schema.sql
   database/migrations/002_add_indexes.sql
   ```

Do not commit production dumps with real customer data.
