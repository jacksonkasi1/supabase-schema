# MCP Quick Start Guide

Get started with Model Context Protocol (MCP) in Tiger SQL in under 5 minutes! 🚀

## ✨ What is MCP?

MCP gives your AI assistant access to **real-time PostgreSQL knowledge** and **best practices** from expert sources. This means:

- ✅ Better schema designs (4× more constraints, 55% more indexes)
- ✅ Modern PostgreSQL features (PG17 patterns)
- ✅ Production-ready recommendations
- ✅ Always up-to-date documentation

## 🎯 Zero Configuration Start

**MCP works out of the box!** No setup required.

1. Start Tiger SQL:
   ```bash
   bun dev
   ```

2. Open the chat and try:
   ```
   Design a complete e-commerce database schema
   ```

3. Watch the AI use PostgreSQL best practices automatically! 🎉

The built-in `pg-aiguide` server (by Timescale) provides:
- Official PostgreSQL documentation search
- TimescaleDB knowledge
- Curated best practices

## 🎮 User Commands

Control MCP behavior with special commands in your messages:

### Force MCP Usage
```
[use-mcp] Create a users table
```
Use when you want guaranteed best practices.

### Skip MCP (Faster)
```
[skip-mcp] Add an email column
```
Use for simple, quick changes.

### Verbose Mode (Learning)
```
[mcp-verbose] Design a multi-tenant schema
```
See exactly what MCP knowledge was used.

### Server Selection
```
[use-server:pg-aiguide] How do I implement RLS?
```
Choose specific knowledge source (when you have multiple servers).

## 🔧 Adding Your Own MCP Server

Create `.mcp-config.json` in your project root:

```json
{
  "version": "1.0.0",
  "servers": [
    {
      "id": "my-custom-server",
      "name": "My Company MCP",
      "description": "Internal PostgreSQL standards",
      "transport": {
        "type": "http",
        "url": "https://mcp.mycompany.com"
      },
      "enabled": true,
      "priority": 75,
      "tags": ["postgres", "internal"],
      "toolNamespace": "company_"
    }
  ],
  "defaults": {
    "timeout": 10000,
    "retryAttempts": 2,
    "autoConnect": true
  }
}
```

Restart the app, and your server is connected! 🎊

## 🐛 Troubleshooting

### MCP Not Connecting?

Check browser console (F12):
```
✅ Good: [MCP Manager] Initialized successfully
❌ Bad: [MCP Connection] Failed to connect
```

**Solutions:**
1. Check internet connection
2. Verify https://mcp.tigerdata.com/docs is accessible
3. Try increasing timeout:
   ```bash
   MCP_TIMEOUT=30000 bun dev
   ```

### AI Not Using Best Practices?

Try forcing MCP:
```
[use-mcp] Create my schema
```

Check logs for:
```
[api/chat] Total tools: 15 { atomic: 12, mcp: 3 }
```

If `mcp: 0`, MCP didn't connect.

### Slow Responses?

1. Skip MCP for simple tasks:
   ```
   [skip-mcp] Rename table to users
   ```

2. Reduce timeout:
   ```bash
   MCP_TIMEOUT=5000 bun dev
   ```

## 📊 Verify MCP is Working

Open browser console and look for:

```
✅ [MCP Manager] Initializing...
✅ [MCP Registry] Initializing with 1 servers
✅ [MCP Connection] Connected to pg-aiguide with 3 tools
✅ [MCP Manager] Initialized successfully
```

Then check tool availability:
```
✅ [api/chat] Total tools: 15 { atomic: 12, mcp: 3 }
```

If you see these, MCP is operational! 🎉

## 🎓 Example Workflows

### Complex Schema Design
```
User: Design a SaaS multi-tenant database with row-level security

AI Process:
1. Queries pg_view_skill("multi-tenant-patterns")
2. Searches pg_semantic_search_postgres_docs("row level security")
3. Creates schema with:
   - tenants table
   - RLS policies
   - tenant_id columns everywhere
   - Proper indexes and constraints
```

### PostgreSQL Question
```
User: What's the best way to store time-series data?

AI Process:
1. Searches pg_semantic_search_tiger_docs("time-series")
2. Returns TimescaleDB recommendations
3. No schema changes (question only)
```

### Simple Modification
```
User: Add a phone column to users

AI Process:
1. Analyzes: "simple modify" → Skip MCP
2. Uses addColumn tool directly
3. Fast execution (< 1 second)
```

## 🔥 Pro Tips

### When to Use MCP

✅ **Always use for:**
- New schema designs
- Architecture decisions
- Security implementations
- Performance optimization
- Complex queries

❌ **Skip for:**
- Simple column adds
- Table renames
- Listing tables
- Basic CRUD

### Best Practices

1. **Let it decide automatically** - The router is smart!
2. **Use `[use-mcp]` when learning** - See best practices in action
3. **Use `[skip-mcp]` for speed** - When you know exactly what you want
4. **Check console logs** - Learn how decisions are made

## 📚 Learn More

- **Detailed Guide:** [docs/MCP_USAGE_GUIDE.md](docs/MCP_USAGE_GUIDE.md)
- **Architecture:** [docs/MCP_INTEGRATION_PLAN.md](docs/MCP_INTEGRATION_PLAN.md)
- **Completion Summary:** [docs/MCP_COMPLETION_SUMMARY.md](docs/MCP_COMPLETION_SUMMARY.md)
- **Examples:** [.mcp-config.example.json](.mcp-config.example.json)

## 🆘 Need Help?

1. Check [Troubleshooting](#-troubleshooting) above
2. Read [MCP Usage Guide](docs/MCP_USAGE_GUIDE.md)
3. Open [GitHub Issue](https://github.com/jacksonkasi1/tiger-sql/issues)
4. Join [Discussions](https://github.com/jacksonkasi1/tiger-sql/discussions)

## 🎉 That's It!

You're ready to design production-quality PostgreSQL schemas with AI + MCP!

**Happy Schema Building! 🚀**

---

**Quick Links:**
- [Vercel AI SDK MCP Docs](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools)
- [pg-aiguide GitHub](https://github.com/timescale/pg-aiguide)
- [Tiger SQL Repository](https://github.com/jacksonkasi1/tiger-sql)